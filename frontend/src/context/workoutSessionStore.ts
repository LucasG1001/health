import { createContext, useContext } from "react";
import type { SessionState } from "../utils/sessionMachine";
import type { WorkoutSession, FinishResponse } from "../types/session";

export interface WorkoutSessionContextValue {
  state: SessionState;
  hydrating: boolean;
  bootError: string | null;
  restRemainingMs: number;
  restProgress: number;
  unlock: () => void;
  start: (splitId: string) => Promise<WorkoutSession>;
  playExercise: (exerciseIndex: number) => void;
  completeSet: (input: {
    setId: string;
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
  removeExercise: (sessionExerciseId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  commitInterRest: (workingMasked: string, additionalMasked: string) => Promise<void>;
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
