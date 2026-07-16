import type { SessionExercise, SessionSet, WorkoutSession } from "../types/session";

export type SessionPhase = "idle" | "overview" | "exercising" | "resting" | "interRest" | "exerciseDone";

export interface SessionState {
  session: WorkoutSession | null;
  phase: SessionPhase;
  currentExerciseIndex: number;
  currentSetIndex: number;
  restEndsAt: number | null;
  restTotalMs: number | null;
  prepareCued: boolean;
}

export interface SessionSnapshot {
  sessionId: string;
  phase: SessionPhase;
  currentExerciseIndex: number;
  currentSetIndex: number;
  restEndsAt: number | null;
  restTotalMs: number | null;
  prepareCued: boolean;
}

export type SessionAction =
  | { type: "HYDRATE"; session: WorkoutSession; snapshot: SessionSnapshot | null }
  | { type: "START"; session: WorkoutSession }
  | { type: "PLAY_EXERCISE"; exerciseIndex: number }
  | { type: "COMPLETE_SET"; set: SessionSet; restMs: number; interRestMs?: number; now: number }
  | { type: "REST_ENDED" }
  | { type: "SKIP_REST" }
  | { type: "EXTEND_REST"; ms: number }
  | { type: "PREPARE_CUED" }
  | { type: "NEXT_EXERCISE" }
  | { type: "BACK_TO_OVERVIEW" }
  | { type: "SET_UPDATED"; set: SessionSet }
  | { type: "SET_ADDED"; exerciseId: string; set: SessionSet }
  | { type: "SET_REMOVED"; setId: string }
  | { type: "EXERCISE_ADDED"; exercise: SessionExercise }
  | { type: "EXERCISE_REMOVED"; exerciseId: string }
  | { type: "MACHINE_SETTING_UPDATED"; exerciseId: string; machineSetting: string | null }
  | { type: "NOTES_UPDATED"; notes: string | null }
  | { type: "CLEAR" };

export const initialSessionState: SessionState = {
  session: null,
  phase: "idle",
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  restEndsAt: null,
  restTotalMs: null,
  prepareCued: false,
};

export function firstPendingSetIndex(exercise: SessionExercise): number {
  const index = exercise.sets.findIndex((set) => set.completedAt === null);
  return index === -1 ? 0 : index;
}

export function hasPendingSets(exercise: SessionExercise): boolean {
  return exercise.sets.some((set) => set.completedAt === null);
}

export function nextExerciseIndex(session: WorkoutSession, fromIndex: number): number | null {
  for (let i = fromIndex + 1; i < session.exercises.length; i++) {
    if (hasPendingSets(session.exercises[i]!)) return i;
  }
  for (let i = 0; i < session.exercises.length; i++) {
    if (i !== fromIndex && hasPendingSets(session.exercises[i]!)) return i;
  }
  return null;
}

export function currentExercise(state: SessionState): SessionExercise | null {
  return state.session?.exercises[state.currentExerciseIndex] ?? null;
}

export function currentSet(state: SessionState): SessionSet | null {
  return currentExercise(state)?.sets[state.currentSetIndex] ?? null;
}

export function completedSetsCount(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completedAt !== null).length,
    0
  );
}

export function totalSetsCount(session: WorkoutSession): number {
  return session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}

export function sessionVolumeKg(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce((sum, set) => {
        if (set.completedAt === null || set.setType !== "working") return sum;
        if (set.weightKg == null || set.reps == null) return sum;
        return sum + set.weightKg * set.reps;
      }, 0),
    0
  );
}

function replaceSet(session: WorkoutSession, updated: SessionSet): WorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === updated.id ? updated : set)),
    })),
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "HYDRATE": {
      const { session, snapshot } = action;
      if (snapshot && snapshot.sessionId === session.id) {
        const exerciseIndex = Math.min(snapshot.currentExerciseIndex, session.exercises.length - 1);
        return {
          session,
          phase: snapshot.phase === "idle" ? "overview" : snapshot.phase,
          currentExerciseIndex: Math.max(0, exerciseIndex),
          currentSetIndex: snapshot.currentSetIndex,
          restEndsAt: snapshot.restEndsAt,
          restTotalMs: snapshot.restTotalMs,
          prepareCued: snapshot.prepareCued,
        };
      }
      return { ...initialSessionState, session, phase: "overview" };
    }

    case "START":
      return { ...initialSessionState, session: action.session, phase: "overview" };

    case "PLAY_EXERCISE": {
      if (!state.session) return state;
      const exercise = state.session.exercises[action.exerciseIndex];
      if (!exercise) return state;
      return {
        ...state,
        phase: hasPendingSets(exercise) ? "exercising" : "exerciseDone",
        currentExerciseIndex: action.exerciseIndex,
        currentSetIndex: firstPendingSetIndex(exercise),
        restEndsAt: null,
        restTotalMs: null,
        prepareCued: false,
      };
    }

    case "COMPLETE_SET": {
      if (!state.session) return state;
      const session = replaceSet(state.session, action.set);
      const exercise = session.exercises[state.currentExerciseIndex];
      if (!exercise) return { ...state, session };
      if (!hasPendingSets(exercise)) {
        const next = nextExerciseIndex(session, state.currentExerciseIndex);
        if (next !== null && action.interRestMs && action.interRestMs > 0) {
          return {
            ...state,
            session,
            phase: "interRest",
            restEndsAt: action.now + action.interRestMs,
            restTotalMs: action.interRestMs,
            prepareCued: false,
          };
        }
        return {
          ...state,
          session,
          phase: "exerciseDone",
          restEndsAt: null,
          restTotalMs: null,
          prepareCued: false,
        };
      }
      return {
        ...state,
        session,
        phase: "resting",
        restEndsAt: action.now + action.restMs,
        restTotalMs: action.restMs,
        prepareCued: false,
      };
    }

    case "REST_ENDED":
    case "SKIP_REST": {
      if (!state.session) return state;
      const exercise = state.session.exercises[state.currentExerciseIndex];
      if (!exercise || !hasPendingSets(exercise)) {
        return { ...state, phase: "exerciseDone", restEndsAt: null, restTotalMs: null, prepareCued: false };
      }
      return {
        ...state,
        phase: "exercising",
        currentSetIndex: firstPendingSetIndex(exercise),
        restEndsAt: null,
        restTotalMs: null,
        prepareCued: false,
      };
    }

    case "EXTEND_REST": {
      if ((state.phase !== "resting" && state.phase !== "interRest") || state.restEndsAt === null) return state;
      return {
        ...state,
        restEndsAt: state.restEndsAt + action.ms,
        restTotalMs: (state.restTotalMs ?? 0) + action.ms,
        prepareCued: false,
      };
    }

    case "PREPARE_CUED":
      return { ...state, prepareCued: true };

    case "NEXT_EXERCISE": {
      if (!state.session) return state;
      const next = nextExerciseIndex(state.session, state.currentExerciseIndex);
      if (next === null) {
        return { ...state, phase: "overview", restEndsAt: null, restTotalMs: null, prepareCued: false };
      }
      const exercise = state.session.exercises[next]!;
      return {
        ...state,
        phase: "exercising",
        currentExerciseIndex: next,
        currentSetIndex: firstPendingSetIndex(exercise),
        restEndsAt: null,
        restTotalMs: null,
        prepareCued: false,
      };
    }

    case "BACK_TO_OVERVIEW":
      return { ...state, phase: "overview", restEndsAt: null, restTotalMs: null, prepareCued: false };

    case "SET_UPDATED": {
      if (!state.session) return state;
      return { ...state, session: replaceSet(state.session, action.set) };
    }

    case "SET_ADDED": {
      if (!state.session) return state;
      const session = {
        ...state.session,
        exercises: state.session.exercises.map((exercise) =>
          exercise.id === action.exerciseId
            ? { ...exercise, sets: [...exercise.sets, action.set] }
            : exercise
        ),
      };
      const exerciseIndex = session.exercises.findIndex((exercise) => exercise.id === action.exerciseId);
      if (exerciseIndex === state.currentExerciseIndex && state.phase === "exerciseDone") {
        const exercise = session.exercises[exerciseIndex]!;
        return {
          ...state,
          session,
          phase: "exercising",
          currentSetIndex: firstPendingSetIndex(exercise),
        };
      }
      return { ...state, session };
    }

    case "SET_REMOVED": {
      if (!state.session) return state;
      const session = {
        ...state.session,
        exercises: state.session.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.filter((set) => set.id !== action.setId),
        })),
      };
      const exercise = session.exercises[state.currentExerciseIndex];
      const currentSetIndex = exercise
        ? Math.min(state.currentSetIndex, Math.max(0, exercise.sets.length - 1))
        : 0;
      return { ...state, session, currentSetIndex };
    }

    case "EXERCISE_ADDED": {
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, exercises: [...state.session.exercises, action.exercise] },
      };
    }

    case "EXERCISE_REMOVED": {
      if (!state.session) return state;
      const exercises = state.session.exercises.filter((exercise) => exercise.id !== action.exerciseId);
      return {
        ...state,
        session: { ...state.session, exercises },
        phase: "overview",
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        restEndsAt: null,
        restTotalMs: null,
        prepareCued: false,
      };
    }

    case "MACHINE_SETTING_UPDATED": {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          exercises: state.session.exercises.map((exercise) =>
            exercise.exerciseId === action.exerciseId
              ? { ...exercise, machineSetting: action.machineSetting }
              : exercise
          ),
        },
      };
    }

    case "NOTES_UPDATED": {
      if (!state.session) return state;
      return { ...state, session: { ...state.session, notes: action.notes } };
    }

    case "CLEAR":
      return initialSessionState;

    default:
      return state;
  }
}

export function toSnapshot(state: SessionState): SessionSnapshot | null {
  if (!state.session || state.phase === "idle") return null;
  return {
    sessionId: state.session.id,
    phase: state.phase,
    currentExerciseIndex: state.currentExerciseIndex,
    currentSetIndex: state.currentSetIndex,
    restEndsAt: state.restEndsAt,
    restTotalMs: state.restTotalMs,
    prepareCued: state.prepareCued,
  };
}
