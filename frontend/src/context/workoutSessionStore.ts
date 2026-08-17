import { createContext, useContext } from "react";
import type { SessionState } from "../utils/sessionMachine";
import type { SessionSet, WorkoutSession, FinishResponse } from "../types/session";

/** Campos do painel de descanso, como texto: vazio significa "não alterar". */
export interface InterRestInput {
  working: string;
  additional: string;
  reps: string;
}

export interface WorkoutSessionContextValue {
  state: SessionState;
  hydrating: boolean;
  bootError: string | null;
  unlock: () => void;
  start: (splitId: string) => Promise<WorkoutSession>;
  playExercise: (exerciseIndex: number) => void;
  completeSet: (input: {
    /** A série atual: o estado otimista é aplicado sobre ela e desfeito se a rede falhar. */
    set: SessionSet;
    weightKg: number | null;
    reps: number | null;
    rpe?: number | null;
    rir?: number | null;
    restMs: number;
    interRestMs?: number;
  }) => Promise<void>;
  skipRest: () => void;
  extendRest: () => void;
  nextExercise: () => void;
  editSet: (setId: string, patch: { weightKg?: number | null; reps?: number | null; rpe?: number | null; completed?: boolean }) => Promise<void>;
  /** Conclui todas as séries pendentes do exercício em uma requisição. */
  concludeExercise: (
    sessionExerciseId: string,
    fallback: { weightKg: number | null; reps: number | null }
  ) => Promise<void>;
  /** Reabre todas as séries concluídas do exercício em uma requisição. */
  reopenExercise: (sessionExerciseId: string) => Promise<void>;
  removeExercise: (sessionExerciseId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  commitInterRest: (input: InterRestInput) => Promise<void>;
  finish: () => Promise<FinishResponse>;
  discard: () => Promise<void>;
}

export const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(null);

export function useWorkoutSession(): WorkoutSessionContextValue {
  const context = useContext(WorkoutSessionContext);
  if (!context) {
    throw new Error("useWorkoutSession deve ser usado dentro de WorkoutSessionProvider");
  }
  return context;
}

export interface RestCountdown {
  remainingMs: number;
  progress: number;
}

/**
 * A contagem muda 4×/s: fica em um contexto separado para que só quem mostra o relógio
 * re-renderize nesse ritmo — a lista de exercícios não.
 */
export const RestTimerContext = createContext<RestCountdown>({ remainingMs: 0, progress: 0 });

export function useRestCountdown(): RestCountdown {
  return useContext(RestTimerContext);
}
