import { useDismiss } from "../../hooks/useDismiss";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useDismiss(onCancel);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onCancel();
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick} role="alertdialog" aria-label={title} aria-modal="true">
      <div className={styles.dialog}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${styles.confirmButton} ${danger ? styles.danger : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
