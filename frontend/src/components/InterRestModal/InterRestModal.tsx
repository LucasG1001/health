import { useState } from "react";
import { NumericInput } from "../NumericInput/NumericInput";
import { ChevronRightIcon, DumbbellIcon } from "../Icon/icons";
import { useRestTimer } from "../../hooks/useRestTimer";
import { formatClock, formatKg } from "../../utils/format";
import { parseMaskedNumber } from "../../utils/numberMask";
import styles from "./InterRestModal.module.css";

interface InterRestModalProps {
  endsAt: number | null;
  totalMs: number | null;
  finishedName: string;
  nextName: string;
  nextImageUrl: string | null;
  initialWeight: string;
  onCueTick: () => void;
  onCueEnd: () => void;
  onExtend: () => void;
  onAdvance: (weightMasked: string) => void;
  saving: boolean;
}

export function InterRestModal({
  endsAt,
  totalMs,
  finishedName,
  nextName,
  nextImageUrl,
  initialWeight,
  onCueTick,
  onCueEnd,
  onExtend,
  onAdvance,
  saving,
}: InterRestModalProps) {
  const [weight, setWeight] = useState(initialWeight);

  const { remainingMs, progress } = useRestTimer({
    endsAt,
    totalMs,
    onTick: onCueTick,
    onEnd: () => {
      onCueEnd();
      onAdvance(weight);
    },
  });

  const initialNum = parseMaskedNumber(initialWeight);
  const currentNum = parseMaskedNumber(weight);
  const delta = initialNum != null && currentNum != null ? currentNum - initialNum : null;
  const improved = delta != null && delta > 0;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Descanso entre exercícios">
      <div className={styles.modal}>
        <div className={styles.timerBlock}>
          <span className={styles.timer}>{formatClock(remainingMs)}</span>
          <span className={styles.timerLabel}>Descanse antes do próximo</span>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>

        <div className={styles.nextBlock}>
          <div className={styles.nextThumb}>
            {nextImageUrl ? (
              <img src={nextImageUrl} alt="" loading="lazy" />
            ) : (
              <DumbbellIcon className={styles.nextThumbIcon} />
            )}
          </div>
          <div className={styles.nextInfo}>
            <span className={styles.nextLabel}>Próximo</span>
            <span className={styles.nextName}>{nextName}</span>
          </div>
          <ChevronRightIcon className={styles.nextChevron} />
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Carga de {finishedName} (kg)</span>
          <NumericInput value={weight} onChange={setWeight} aria-label="Nova carga em kg" />
          <span className={`${styles.hint} ${improved ? styles.hintImproved : ""}`}>
            {improved ? `+${formatKg(delta)} 💪` : "Aumentou a carga? Atualize aqui."}
          </span>
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onExtend} disabled={saving}>
            +15s
          </button>
          <button type="button" className={styles.primary} onClick={() => onAdvance(weight)} disabled={saving}>
            Próximo exercício
            <ChevronRightIcon className={styles.primaryIcon} />
          </button>
        </div>
      </div>
    </div>
  );
}
