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
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url TEXT;
  `);

  await pool.query(`
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_focal_x NUMERIC NOT NULL DEFAULT 50;
  `);

  await pool.query(`
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_focal_y NUMERIC NOT NULL DEFAULT 50;
  `);

  await pool.query(`
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_zoom NUMERIC NOT NULL DEFAULT 1;
  `);

  await pool.query(`
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS working_weight_kg NUMERIC(6,2);
  `);

  // Peso extra somado à pilha (rodinha/anilha do aparelho). A carga levantada é a soma
  // das duas parcelas, que é o número exibido no card do exercício.
  await pool.query(`
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS additional_weight_kg NUMERIC(6,2);
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
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (split_id, exercise_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS split_exercises_split_idx ON split_exercises (split_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS planned_sets (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      split_exercise_id    UUID NOT NULL REFERENCES split_exercises(id) ON DELETE CASCADE,
      position             INTEGER NOT NULL DEFAULT 0,
      target_reps_min      INTEGER NOT NULL,
      target_reps_max      INTEGER,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS planned_sets_se_idx ON planned_sets (split_exercise_id);
  `);

  // Um registro por exercício marcado como feito no dia. A chave é (split_id, exercise_id)
  // e não split_exercises.id porque essas linhas são recriadas a cada reordenação da
  // divisão, o que levaria o check do dia embora na cascata.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercise_checks (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      split_id     UUID NOT NULL REFERENCES workout_splits(id) ON DELETE CASCADE,
      exercise_id  UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      checked_on   DATE NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (split_id, exercise_id, checked_on)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS exercise_checks_date_idx ON exercise_checks (checked_on);
  `);

  // Sobras de features removidas (ExerciseDB, PRs, gamificação, execução cronometrada de
  // sessão) e de séries planejadas que nunca chegaram a ser gravadas. Nada abaixo tem
  // leitor no código.
  await pool.query(`DROP TABLE IF EXISTS user_badges;`);
  await pool.query(`DROP TABLE IF EXISTS badges;`);
  await pool.query(`DROP TABLE IF EXISTS personal_records;`);
  await pool.query(`DROP TABLE IF EXISTS catalog_exercises;`);

  await pool.query(`DROP INDEX IF EXISTS exercises_external_idx;`);
  await pool.query(`ALTER TABLE exercises DROP COLUMN IF EXISTS external_id;`);

  await pool.query(`ALTER TABLE split_exercises DROP COLUMN IF EXISTS working_weight_kg;`);

  await pool.query(`
    ALTER TABLE planned_sets
      DROP COLUMN IF EXISTS set_type,
      DROP COLUMN IF EXISTS variation,
      DROP COLUMN IF EXISTS suggested_weight_kg,
      DROP COLUMN IF EXISTS rest_seconds;
  `);

  // Aquecimento planejado não existe, então este descanso nunca era aplicado.
  await pool.query(`ALTER TABLE settings DROP COLUMN IF EXISTS rest_warmup_seconds;`);

  // FK sem índice: apagar um exercício varria a tabela filha inteira.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS split_exercises_exercise_idx ON split_exercises (exercise_id);
  `);

  // A execução cronometrada de sessão saiu: o treino agora é consulta de carga/reps mais
  // um check por exercício no dia (exercise_checks). Sem sessão não há volume nem duração.
  await pool.query(`DROP TABLE IF EXISTS session_sets;`);
  await pool.query(`DROP TABLE IF EXISTS session_exercises;`);
  await pool.query(`DROP TABLE IF EXISTS workout_sessions;`);

  // O descanso era cronometrado a partir daqui; sem timer o número não tem leitor.
  await pool.query(`ALTER TABLE split_exercises DROP COLUMN IF EXISTS rest_seconds;`);

  await pool.query(`
    ALTER TABLE settings
      DROP COLUMN IF EXISTS sound_enabled,
      DROP COLUMN IF EXISTS vibration_enabled,
      DROP COLUMN IF EXISTS wake_lock_enabled,
      DROP COLUMN IF EXISTS rest_working_seconds;
  `);
}
