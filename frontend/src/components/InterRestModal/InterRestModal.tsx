import { useState } from "react";
import { NumericInput } from "../NumericInput/NumericInput";
import { useRestTimer } from "../../hooks/useRestTimer";
import { formatClock, formatKg } from "../../utils/format";
import { parseMaskedNumber } from "../../utils/numberMask";
import styles from "./InterRestModal.module.css";

interface InterRestModalProps {
  endsAt: number | null;
  totalMs: number | null;
  finishedName: string;
  initialWeight: string;
  onCueTick: () => void;
  onCueEnd: () => void;
  onExtend: () => void;
  onCommitWeight: (weightMasked: string) => void;
  onDone: (weightMasked: string) => void;
  saving: boolean;
}

export function InterRestModal({
  endsAt,
  totalMs,
  finishedName,
  initialWeight,
  onCueTick,
  onCueEnd,
  onExtend,
  onCommitWeight,
  onDone,
  saving,
}: InterRestModalProps) {
  const [weight, setWeight] = useState(initialWeight);

  const { remainingMs, progress } = useRestTimer({
    endsAt,
    totalMs,
    onTick: onCueTick,
    onEnd: onCueEnd,
  });

  const initialNum = parseMaskedNumber(initialWeight);
  const currentNum = parseMaskedNumber(weight);
  const delta = initialNum != null && currentNum != null ? currentNum - initialNum : null;
  const improved = delta != null && delta > 0;

  return (
    <div className={styles.panel} role="region" aria-label="Descanso entre exercícios">
      <div className={styles.timerBlock}>
        <span className={styles.timer}>{formatClock(remainingMs)}</span>
        <span className={styles.timerLabel}>Descanse antes do próximo</span>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Carga de {finishedName} (kg)</span>
        <NumericInput
          value={weight}
          onChange={setWeight}
          onBlur={() => onCommitWeight(weight)}
          aria-label="Nova carga em kg"
        />
        <span className={`${styles.hint} ${improved ? styles.hintImproved : ""}`}>
          {improved ? `+${formatKg(delta)} 💪` : "Aumentou a carga? Atualize aqui."}
        </span>
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onExtend} disabled={saving}>
          +15s
        </button>
        <button type="button" className={styles.primary} onClick={() => onDone(weight)} disabled={saving}>
          Concluir
        </button>
      </div>
    </div>
  );
}
