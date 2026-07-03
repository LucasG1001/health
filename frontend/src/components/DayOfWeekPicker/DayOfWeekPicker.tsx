import { WEEKDAY_LABELS, WEEKDAY_NAMES } from "../../utils/format";
import styles from "./DayOfWeekPicker.module.css";

interface DayOfWeekPickerProps {
  value: number[];
  onChange: (weekdays: number[]) => void;
}

export function DayOfWeekPicker({ value, onChange }: DayOfWeekPickerProps) {
  const toggle = (day: number) => {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  };

  return (
    <div className={styles.container}>
      {WEEKDAY_LABELS.map((label, day) => (
        <button
          key={day}
          type="button"
          title={WEEKDAY_NAMES[day]}
          aria-label={WEEKDAY_NAMES[day]}
          aria-pressed={value.includes(day)}
          className={`${styles.day} ${value.includes(day) ? styles.active : ""}`}
          onClick={() => toggle(day)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
