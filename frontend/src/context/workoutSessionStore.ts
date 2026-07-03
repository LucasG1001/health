import { createContext, useContext } from "react";
import type { SessionState } from "../utils/sessionMachine";
import type { SessionSet, WorkoutSession, FinishResponse } from "../types/session";
import type { SetType, SetVariation } from "../types/split";

export interface WorkoutSessionContextValue {
  state: SessionState;
  hydrating: boolean;
  start: (splitId: string) => Promise<WorkoutSession>;
  playExercise: (exerciseIndex: number) => void;
  completeSet: (input: {
    setId: string;
    weightKg: number | null;
    reps: number | null;
    rpe?: number | null;
    rir?: number | null;
    restMs: number;
  }) => Promise<void>;
  skipRest: () => void;
  extendRest: () => void;
  restEnded: () => void;
  prepareCued: () => void;
  nextExercise: () => void;
  backToOverview: () => void;
  editSet: (setId: string, patch: { weightKg?: number | null; reps?: number | null; rpe?: number | null; completed?: boolean }) => Promise<void>;
  addExtraSet: (sessionExerciseId: string, input?: { setType?: SetType; variation?: SetVariation }) => Promise<SessionSet>;
  removeSet: (setId: string) => Promise<void>;
  addExercise: (exerciseId: string) => Promise<void>;
  removeExercise: (sessionExerciseId: string) => Promise<void>;
  updateMachineSetting: (exerciseId: string, machineSetting: string | null) => Promise<void>;
  updateNotes: (notes: string | null) => Promise<void>;
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
