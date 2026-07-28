import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "./ErrorBoundary.module.css";

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Sem isto qualquer exceção durante o render apagava o app inteiro, deixando a tela em
 * branco e sem nenhuma pista do que aconteceu.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Erro não tratado no render:", error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className={styles.page} role="alert">
        <h1 className={styles.title}>Algo deu errado</h1>
        <p className={styles.message}>
          A tela não conseguiu carregar. Recarregue o app; se continuar, o detalhe abaixo ajuda a
          identificar o problema.
        </p>
        <pre className={styles.detail}>{error.message}</pre>
        <button type="button" className={styles.button} onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    );
  }
}
