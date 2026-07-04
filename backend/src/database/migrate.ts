import { pool } from "./connection.js";

export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      singleton           BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (singleton),
      height_cm           NUMERIC(5,1),
      blood_type          TEXT,
      birth_date          DATE,
      biological_sex      TEXT,
      activity_level      TEXT,
      allergies           TEXT,
      medical_conditions  TEXT,
      medications         TEXT,
      injuries            TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      singleton             BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (singleton),
      weigh_in_frequency    TEXT NOT NULL DEFAULT 'weekly'
                              CHECK (weigh_in_frequency IN ('daily','weekly','biweekly','monthly','off')),
      water_goal_ml         INTEGER,
      calorie_goal_kcal     INTEGER,
      sound_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
      vibration_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
      wake_lock_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
      rest_warmup_seconds   INTEGER NOT NULL DEFAULT 60,
      rest_working_seconds  INTEGER NOT NULL DEFAULT 90,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS body_measurements (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      measured_on   DATE NOT NULL UNIQUE,
      weight_kg     NUMERIC(5,2),
      body_fat_pct  NUMERIC(4,1),
      waist_cm      NUMERIC(5,1),
      hip_cm        NUMERIC(5,1),
      arm_cm        NUMERIC(5,1),
      thigh_cm      NUMERIC(5,1),
      chest_cm      NUMERIC(5,1),
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS goals (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      target_weight_kg     NUMERIC(5,2),
      target_body_fat_pct  NUMERIC(4,1),
      target_date          DATE,
      start_weight_kg      NUMERIC(5,2),
      start_body_fat_pct   NUMERIC(4,1),
      status               TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','achieved','abandoned')),
      achieved_at          TIMESTAMPTZ,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (target_weight_kg IS NOT NULL OR target_body_fat_pct IS NOT NULL)
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS goals_active_idx ON goals ((TRUE)) WHERE status = 'active';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress_photos (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      taken_on    DATE NOT NULL,
      pose        TEXT NOT NULL CHECK (pose IN ('front','side','back')),
      file_path   TEXT NOT NULL,
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS progress_photos_date_idx ON progress_photos (taken_on);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name             TEXT NOT NULL,
      muscle_group     TEXT NOT NULL,
      equipment        TEXT,
      image_path       TEXT,
      image_url        TEXT,
      machine_setting  TEXT,
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS exercises_name_idx ON exercises (LOWER(name));
  `);

  await pool.query(`
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS external_id TEXT;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS exercises_external_idx ON exercises (external_id)
      WHERE external_id IS NOT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS catalog_exercises (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id   TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      muscle_group  TEXT NOT NULL,
      primary_muscle TEXT,
      equipment     TEXT,
      level         TEXT,
      category      TEXT,
      image_urls    TEXT[] NOT NULL DEFAULT '{}',
      instructions  TEXT,
      synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS catalog_exercises_group_idx ON catalog_exercises (muscle_group);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workout_splits (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      weekdays    INTEGER[] NOT NULL DEFAULT '{}',
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS split_exercises (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      split_id      UUID NOT NULL REFERENCES workout_splits(id) ON DELETE CASCADE,
      exercise_id   UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      position      INTEGER NOT NULL DEFAULT 0,
      rest_seconds  INTEGER,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (split_id, exercise_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS split_exercises_split_idx ON split_exercises (split_id);
  `);

  await pool.query(`
    ALTER TABLE split_exercises ADD COLUMN IF NOT EXISTS working_weight_kg NUMERIC(6,2);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS planned_sets (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      split_exercise_id    UUID NOT NULL REFERENCES split_exercises(id) ON DELETE CASCADE,
      position             INTEGER NOT NULL DEFAULT 0,
      set_type             TEXT NOT NULL DEFAULT 'working' CHECK (set_type IN ('warmup','working')),
      variation            TEXT NOT NULL DEFAULT 'normal'
                             CHECK (variation IN ('normal','drop_set','bi_set','superset','rest_pause')),
      target_reps_min      INTEGER NOT NULL,
      target_reps_max      INTEGER,
      suggested_weight_kg  NUMERIC(6,2),
      rest_seconds         INTEGER,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS planned_sets_se_idx ON planned_sets (split_exercise_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      split_id          UUID REFERENCES workout_splits(id) ON DELETE SET NULL,
      split_name        TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
      started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at       TIMESTAMPTZ,
      duration_seconds  INTEGER,
      total_volume_kg   NUMERIC(12,2),
      notes             TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_active_idx
      ON workout_sessions ((TRUE)) WHERE status = 'in_progress';
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS workout_sessions_started_idx ON workout_sessions (started_at);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_exercises (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id     UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      exercise_id    UUID REFERENCES exercises(id) ON DELETE SET NULL,
      exercise_name  TEXT NOT NULL,
      position       INTEGER NOT NULL DEFAULT 0,
      notes          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS session_exercises_session_idx ON session_exercises (session_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS session_exercises_exercise_idx ON session_exercises (exercise_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_sets (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_exercise_id  UUID NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
      position             INTEGER NOT NULL DEFAULT 0,
      set_type             TEXT NOT NULL DEFAULT 'working' CHECK (set_type IN ('warmup','working')),
      variation            TEXT NOT NULL DEFAULT 'normal'
                             CHECK (variation IN ('normal','drop_set','bi_set','superset','rest_pause')),
      target_reps_min      INTEGER,
      target_reps_max      INTEGER,
      rest_seconds         INTEGER,
      weight_kg            NUMERIC(6,2),
      reps                 INTEGER,
      rpe                  NUMERIC(3,1),
      rir                  SMALLINT,
      completed_at         TIMESTAMPTZ,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS session_sets_se_idx ON session_sets (session_exercise_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS personal_records (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      exercise_id     UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      session_id      UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      record_type     TEXT NOT NULL CHECK (record_type IN ('max_weight','max_set_volume')),
      value           NUMERIC(10,2) NOT NULL,
      previous_value  NUMERIC(10,2),
      achieved_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS personal_records_ex_idx ON personal_records (exercise_id, record_type);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS personal_records_session_idx ON personal_records (session_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS badges (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code         TEXT NOT NULL UNIQUE,
      name         TEXT NOT NULL,
      description  TEXT NOT NULL,
      icon         TEXT NOT NULL,
      category     TEXT NOT NULL CHECK (category IN ('sessions','streak','pr','volume')),
      threshold    NUMERIC(12,2) NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      badge_id    UUID NOT NULL UNIQUE REFERENCES badges(id) ON DELETE CASCADE,
      session_id  UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
      awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
