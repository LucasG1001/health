import { useState } from "react";
import { NumericInput } from "../NumericInput/NumericInput";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { formatClock, formatKg, totalLoadKg } from "../../utils/format";
import { numberToMask, parseMaskedNumber } from "../../utils/numberMask";
import { apiErrorMessage } from "../../utils/apiError";
import type { SessionExercise } from "../../types/session";
import styles from "./InterRestModal.module.css";

/**
 * Vive no nível do app (junto da ActiveSessionBar), não na tela do treino: assim ir ver
 * outro exercício no meio do descanso não desmonta o painel nem zera o que foi digitado.
 */
export function InterRestModal() {
  const { state } = useWorkoutSession();
  const exercise =
    state.phase === "interRest" ? state.session?.exercises[state.currentExerciseIndex] ?? null : null;
  if (!exercise) return null;
  // A key re-semeia os campos se o exercício atual mudar sem o painel fechar.
  return <InterRestPanel key={exercise.id} exercise={exercise} />;
}

function InterRestPanel({ exercise }: { exercise: SessionExercise }) {
  const { restRemainingMs, restProgress, extendRest, commitInterRest } = useWorkoutSession();
  const [working, setWorking] = useState(numberToMask(exercise.workingWeightKg));
  const [additional, setAdditional] = useState(numberToMask(exercise.additionalWeightKg));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const before = totalLoadKg(exercise.workingWeightKg, exercise.additionalWeightKg);
  const after = totalLoadKg(
    parseMaskedNumber(working) ?? exercise.workingWeightKg,
    parseMaskedNumber(additional)
  );
  const delta = before != null && after != null ? after - before : null;
  const improved = delta != null && delta > 0;

  const handleDone = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await commitInterRest(working, additional);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar a carga."));
      setSaving(false);
    }
  };

  return (
    <div className={styles.panel} role="region" aria-label="Descanso entre exercícios">
      <div className={styles.timerBlock}>
        <span className={styles.timer}>{formatClock(restRemainingMs)}</span>
        <span className={styles.timerLabel}>Descanse antes do próximo</span>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${Math.round(restProgress * 100)}%` }} />
        </div>
      </div>

      <div className={styles.loadRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Carga (kg)</span>
          <NumericInput
            value={working}
            onChange={setWorking}
            aria-label={`Carga de ${exercise.exerciseName} em kg`}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Adicional (kg)</span>
          <NumericInput
            value={additional}
            onChange={setAdditional}
            aria-label={`Peso adicional de ${exercise.exerciseName} em kg`}
          />
        </label>
      </div>

      <span className={`${styles.hint} ${improved ? styles.hintImproved : ""}`}>
        {improved
          ? `${exercise.exerciseName}: +${formatKg(delta)} 💪`
          : `${exercise.exerciseName} — total ${formatKg(after)}`}
      </span>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={extendRest} disabled={saving}>
          +15s
        </button>
        <button type="button" className={styles.primary} onClick={handleDone} disabled={saving}>
          {saving ? "Salvando…" : "Concluir"}
        </button>
      </div>
    </div>
  );
}
