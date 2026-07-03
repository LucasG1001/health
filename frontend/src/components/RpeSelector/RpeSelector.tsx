import styles from "./RpeSelector.module.css";

const RPE_OPTIONS = [6, 7, 8, 9, 10];

interface RpeSelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export function RpeSelector({ value, onChange }: RpeSelectorProps) {
  return (
    <div className={styles.container}>
      <span className={styles.label}>RPE</span>
      <div className={styles.options}>
        {RPE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.chip} ${value === option ? styles.active : ""}`}
            onClick={() => onChange(value === option ? null : option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
