import { useId, type ReactNode } from "react";
import { useDismiss } from "../../hooks/useDismiss";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import styles from "./Modal.module.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  /** Ausente para modais apenas informativos: o botão de salvar não é renderizado. */
  onSubmit?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  children: ReactNode;
}

export function Modal({
  title,
  onClose,
  onSubmit,
  submitLabel = "Salvar",
  submitDisabled = false,
  children,
}: ModalProps) {
  useDismiss(onClose);
  const dialogRef = useFocusTrap<HTMLFormElement>();
  const titleId = useId();

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit?.();
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <form
        ref={dialogRef}
        className={styles.modal}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            {onSubmit ? "Cancelar" : "Fechar"}
          </button>
          {onSubmit && (
            <button type="submit" className={styles.saveButton} disabled={submitDisabled}>
              {submitLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
