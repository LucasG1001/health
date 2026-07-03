import { useState } from "react";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { useSettings } from "../../hooks/useSettings";
import { FREQUENCY_LABELS } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { Settings, SettingsInput, WeighInFrequency } from "../../types/settings";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  const { settings, loading, error, save } = useSettings();

  return (
    <div className={styles.page}>
      <PageHeader title="Configurações" backTo="/treino" />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {!loading && <SettingsForm settings={settings} save={save} />}
    </div>
  );
}

interface SettingsFormProps {
  settings: Settings | null;
  save: (input: SettingsInput) => Promise<Settings>;
}

function SettingsForm({ settings, save }: SettingsFormProps) {
  const [weighInFrequency, setWeighInFrequency] = useState<WeighInFrequency>(
    settings?.weighInFrequency ?? "weekly"
  );
  const [waterGoal, setWaterGoal] = useState(
    settings?.waterGoalMl != null ? String(settings.waterGoalMl) : ""
  );
  const [calorieGoal, setCalorieGoal] = useState(
    settings?.calorieGoalKcal != null ? String(settings.calorieGoalKcal) : ""
  );
  const [soundEnabled, setSoundEnabled] = useState(settings?.soundEnabled ?? true);
  const [vibrationEnabled, setVibrationEnabled] = useState(settings?.vibrationEnabled ?? true);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(settings?.wakeLockEnabled ?? true);
  const [restWarmup, setRestWarmup] = useState(String(settings?.restWarmupSeconds ?? 45));
  const [restWorking, setRestWorking] = useState(String(settings?.restWorkingSeconds ?? 90));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const parseInteger = (raw: string): number | null => {
    if (raw.trim() === "") return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setSaveError(null);
    try {
      const warmup = parseInteger(restWarmup);
      const working = parseInteger(restWorking);
      await save({
        weighInFrequency,
        waterGoalMl: parseInteger(waterGoal),
        calorieGoalKcal: parseInteger(calorieGoal),
        soundEnabled,
        vibrationEnabled,
        wakeLockEnabled,
        ...(warmup != null ? { restWarmupSeconds: warmup } : {}),
        ...(working != null ? { restWorkingSeconds: working } : {}),
      });
      setFeedback("Configurações salvas.");
    } catch (err) {
      setSaveError(apiErrorMessage(err, "Não foi possível salvar as configurações."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Medidas</h2>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Frequência de pesagem</span>
          <select
            value={weighInFrequency}
            onChange={(e) => setWeighInFrequency(e.target.value as WeighInFrequency)}
          >
            {(Object.keys(FREQUENCY_LABELS) as WeighInFrequency[]).map((frequency) => (
              <option key={frequency} value={frequency}>
                {FREQUENCY_LABELS[frequency]}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Meta de água (ml/dia)</span>
            <input
              type="text"
              inputMode="numeric"
              value={waterGoal}
              onChange={(e) => setWaterGoal(e.target.value)}
              placeholder="Ex: 3000"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Meta de calorias (kcal/dia)</span>
            <input
              type="text"
              inputMode="numeric"
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(e.target.value)}
              placeholder="Ex: 2500"
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Treino</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Descanso aquecimento (s)</span>
            <input
              type="text"
              inputMode="numeric"
              value={restWarmup}
              onChange={(e) => setRestWarmup(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Descanso série válida (s)</span>
            <input
              type="text"
              inputMode="numeric"
              value={restWorking}
              onChange={(e) => setRestWorking(e.target.value)}
            />
          </label>
        </div>

        <label className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Som</span>
            <span className={styles.toggleHint}>Bipes de aviso e fim de descanso</span>
          </div>
          <input
            type="checkbox"
            className={styles.toggle}
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
          />
        </label>
        <label className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Vibração</span>
            <span className={styles.toggleHint}>Vibra no aviso de 10s e no fim do descanso</span>
          </div>
          <input
            type="checkbox"
            className={styles.toggle}
            checked={vibrationEnabled}
            onChange={(e) => setVibrationEnabled(e.target.checked)}
          />
        </label>
        <label className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Manter tela ligada</span>
            <span className={styles.toggleHint}>Impede o bloqueio da tela durante o treino</span>
          </div>
          <input
            type="checkbox"
            className={styles.toggle}
            checked={wakeLockEnabled}
            onChange={(e) => setWakeLockEnabled(e.target.checked)}
          />
        </label>
      </section>

      {saveError && <p className={styles.errorText}>{saveError}</p>}
      {feedback && <p className={styles.feedback}>{feedback}</p>}

      <button type="submit" className={styles.saveButton} disabled={saving}>
        {saving ? "Salvando…" : "Salvar configurações"}
      </button>
    </form>
  );
}
