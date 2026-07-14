import { Fragment } from "react";
import { CheckIcon } from "../Icon/icons";
import styles from "./SetStepper.module.css";

interface SetStepperProps {
  total: number;
  completed: number;
  restProgress: number | null;
}

export function SetStepper({ total, completed, restProgress }: SetStepperProps) {
  if (total <= 0) return null;

  return (
    <div className={styles.stepper}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < completed;
        const connectorFill =
          i < completed - 1 ? 1 : i === completed - 1 ? restProgress ?? 1 : 0;
        return (
          <Fragment key={i}>
            <span className={`${styles.node} ${filled ? styles.nodeFilled : ""}`}>
              {filled ? <CheckIcon className={styles.check} /> : i + 1}
            </span>
            {i < total - 1 && (
              <span className={styles.connector}>
                <span
                  className={styles.connectorFill}
                  style={{ width: `${Math.round(connectorFill * 100)}%` }}
                />
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
