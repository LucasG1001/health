import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import {
  initialSessionState,
  sessionReducer,
  toSnapshot,
  type SessionSnapshot,
} from "../utils/sessionMachine";
import * as sessionService from "../services/sessionService";
import * as exerciseService from "../services/exerciseService";
import { WorkoutSessionContext, type WorkoutSessionContextValue } from "./workoutSessionStore";
import type { SetType, SetVariation } from "../types/split";

const SNAPSHOT_KEY = "health.activeSession.v1";

function readSnapshot(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as SessionSnapshot) : null;
  } catch {
    return null;
  }
}

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let active = true;
    sessionService
      .fetchActiveSession()
      .then((session) => {
        if (!active) return;
        if (session) {
          dispatch({ type: "HYDRATE", session, snapshot: readSnapshot() });
        } else {
          localStorage.removeItem(SNAPSHOT_KEY);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrating(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const snapshot = toSnapshot(state);
    if (snapshot) {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    } else {
      localStorage.removeItem(SNAPSHOT_KEY);
    }
  }, [state]);

  const start = useCallback(async (splitId: string) => {
    const session = await sessionService.startSession(splitId);
    dispatch({ type: "START", session });
    return session;
  }, []);

  const playExercise = useCallback((exerciseIndex: number) => {
    dispatch({ type: "PLAY_EXERCISE", exerciseIndex });
  }, []);

  const completeSet = useCallback(
    async (input: {
      setId: string;
      weightKg: number | null;
      reps: number | null;
      rpe?: number | null;
      rir?: number | null;
      restMs: number;
    }) => {
      const set = await sessionService.updateSessionSet(input.setId, {
        weightKg: input.weightKg,
        reps: input.reps,
        rpe: input.rpe ?? null,
        rir: input.rir ?? null,
        completed: true,
      });
      dispatch({ type: "COMPLETE_SET", set, restMs: input.restMs, now: Date.now() });
    },
    []
  );

  const skipRest = useCallback(() => dispatch({ type: "SKIP_REST" }), []);
  const extendRest = useCallback(() => dispatch({ type: "EXTEND_REST", ms: 15000 }), []);
  const restEnded = useCallback(() => dispatch({ type: "REST_ENDED" }), []);
  const prepareCued = useCallback(() => dispatch({ type: "PREPARE_CUED" }), []);
  const nextExercise = useCallback(() => dispatch({ type: "NEXT_EXERCISE" }), []);
  const backToOverview = useCallback(() => dispatch({ type: "BACK_TO_OVERVIEW" }), []);

  const editSet = useCallback(
    async (
      setId: string,
      patch: { weightKg?: number | null; reps?: number | null; rpe?: number | null; completed?: boolean }
    ) => {
      const set = await sessionService.updateSessionSet(setId, patch);
      dispatch({ type: "SET_UPDATED", set });
    },
    []
  );

  const addExtraSet = useCallback(
    async (sessionExerciseId: string, input?: { setType?: SetType; variation?: SetVariation }) => {
      const set = await sessionService.addSessionSet(sessionExerciseId, input ?? {});
      dispatch({ type: "SET_ADDED", exerciseId: sessionExerciseId, set });
      return set;
    },
    []
  );

  const removeSet = useCallback(async (setId: string) => {
    await sessionService.deleteSessionSet(setId);
    dispatch({ type: "SET_REMOVED", setId });
  }, []);

  const addExercise = useCallback(
    async (exerciseId: string) => {
      if (!state.session) return;
      const exercise = await sessionService.addSessionExercise(state.session.id, exerciseId);
      dispatch({ type: "EXERCISE_ADDED", exercise });
    },
    [state.session]
  );

  const removeExercise = useCallback(async (sessionExerciseId: string) => {
    await sessionService.removeSessionExercise(sessionExerciseId);
    dispatch({ type: "EXERCISE_REMOVED", exerciseId: sessionExerciseId });
  }, []);

  const updateMachineSetting = useCallback(async (exerciseId: string, machineSetting: string | null) => {
    await exerciseService.updateExercise(exerciseId, { machineSetting });
    dispatch({ type: "MACHINE_SETTING_UPDATED", exerciseId, machineSetting });
  }, []);

  const updateNotes = useCallback(
    async (notes: string | null) => {
      if (!state.session) return;
      await sessionService.updateSessionNotes(state.session.id, notes);
      dispatch({ type: "NOTES_UPDATED", notes });
    },
    [state.session]
  );

  const finish = useCallback(async () => {
    if (!state.session) throw new Error("Nenhum treino em andamento.");
    const response = await sessionService.finishSession(state.session.id);
    dispatch({ type: "CLEAR" });
    return response;
  }, [state.session]);

  const discard = useCallback(async () => {
    if (!state.session) return;
    await sessionService.discardSession(state.session.id);
    dispatch({ type: "CLEAR" });
  }, [state.session]);

  const value = useMemo<WorkoutSessionContextValue>(
    () => ({
      state,
      hydrating,
      start,
      playExercise,
      completeSet,
      skipRest,
      extendRest,
      restEnded,
      prepareCued,
      nextExercise,
      backToOverview,
      editSet,
      addExtraSet,
      removeSet,
      addExercise,
      removeExercise,
      updateMachineSetting,
      updateNotes,
      finish,
      discard,
    }),
    [
      state,
      hydrating,
      start,
      playExercise,
      completeSet,
      skipRest,
      extendRest,
      restEnded,
      prepareCued,
      nextExercise,
      backToOverview,
      editSet,
      addExtraSet,
      removeSet,
      addExercise,
      removeExercise,
      updateMachineSetting,
      updateNotes,
      finish,
      discard,
    ]
  );

  return <WorkoutSessionContext.Provider value={value}>{children}</WorkoutSessionContext.Provider>;
}
