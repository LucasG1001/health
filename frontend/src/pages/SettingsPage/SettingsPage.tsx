import { useState } from "react";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { ErrorBanner } from "../../components/ErrorBanner/ErrorBanner";
import { Loading } from "../../components/Loading/Loading";
import { useSettings } from "../../hooks/useSettings";
import { FREQUENCY_LABELS } from "../../utils/format";
import { INVALID, parseOptionalInteger } from "../../utils/numberMask";
import { apiErrorMessage } from "../../utils/apiError";
import type { Settings, SettingsInput, WeighInFrequency } from "../../types/settings";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  const { settings, loading, error, reload, save } = useSettings();

  return (
    <div className={styles.page}>
      <PageHeader title="Configurações" backTo="/treino" />

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && <Loading />}

      {/* Sem as configurações carregadas o formulário só teria defaults, e salvar
          sobrescreveria as configurações reais do servidor. */}
      {!loading && settings && <SettingsForm settings={settings} save={save} />}
    </div>
  );
}

interface SettingsFormProps {
  settings: Settings;
  save: (input: SettingsInput) => Promise<Settings>;
}

function SettingsForm({ settings, save }: SettingsFormProps) {
  const [weighInFrequency, setWeighInFrequency] = useState<WeighInFrequency>(settings.weighInFrequency);
  const [waterGoal, setWaterGoal] = useState(
    settings.waterGoalMl != null ? String(settings.waterGoalMl) : ""
  );
  const [calorieGoal, setCalorieGoal] = useState(
    settings.calorieGoalKcal != null ? String(settings.calorieGoalKcal) : ""
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSaveError(null);

    // Antes um valor inválido virava null (apagando a meta) ou era omitido em silêncio,
    // e o feedback ainda dizia "salvas".
    const water = parseOptionalInteger(waterGoal);
    const calories = parseOptionalInteger(calorieGoal);
    if (water === INVALID || calories === INVALID) {
      setSaveError("Use apenas números inteiros positivos.");
      return;
    }

    setSaving(true);
    try {
      await save({
        weighInFrequency,
        waterGoalMl: water,
        calorieGoalKcal: calories,
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

      {saveError && <p className={styles.errorText}>{saveError}</p>}
      {feedback && <p className={styles.feedback}>{feedback}</p>}

      <button type="submit" className={styles.saveButton} disabled={saving}>
        {saving ? "Salvando…" : "Salvar configurações"}
      </button>
    </form>
  );
}
