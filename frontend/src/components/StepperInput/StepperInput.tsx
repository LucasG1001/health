import { useRef } from "react";
import { MinusIcon, PlusIcon } from "../Icon/icons";
import styles from "./StepperInput.module.css";

interface StepperInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  label?: string;
  unit?: string;
}

export function StepperInput({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 2000,
  decimals = 0,
  label,
  unit,
}: StepperInputProps) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clamp = (next: number) => Math.min(max, Math.max(min, Number(next.toFixed(decimals))));

  const bump = (direction: 1 | -1) => {
    onChange(clamp((value ?? 0) + direction * step));
  };

  const stopHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (holdInterval.current) clearInterval(holdInterval.current);
    holdTimer.current = null;
    holdInterval.current = null;
  };

  const startHold = (direction: 1 | -1) => {
    bump(direction);
    holdTimer.current = setTimeout(() => {
      holdInterval.current = setInterval(() => bump(direction), 120);
    }, 450);
  };

  const handleInput = (raw: string) => {
    if (raw === "") {
      onChange(null);
      return;
    }
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isNaN(parsed)) onChange(clamp(parsed));
  };

  return (
    <div className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          aria-label="Diminuir"
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          <MinusIcon className={styles.buttonIcon} />
        </button>
        <div className={styles.valueWrap}>
          <input
            className={styles.input}
            type="text"
            inputMode="decimal"
            value={value == null ? "" : String(value).replace(".", ",")}
            onChange={(e) => handleInput(e.target.value)}
            aria-label={label}
          />
          {unit && <span className={styles.unit}>{unit}</span>}
        </div>
        <button
          type="button"
          className={styles.button}
          aria-label="Aumentar"
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          <PlusIcon className={styles.buttonIcon} />
        </button>
      </div>
    </div>
  );
}
