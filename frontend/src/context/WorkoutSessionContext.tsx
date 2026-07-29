import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import {
  initialSessionState,
  sessionReducer,
  toSnapshot,
  type SessionPhase,
  type SessionSnapshot,
} from "../utils/sessionMachine";
import { apiErrorMessage } from "../utils/apiError";
import { totalLoadKg } from "../utils/format";
import { INVALID, parseMaskedNumber, parseOptionalInteger } from "../utils/numberMask";
import * as sessionService from "../services/sessionService";
import * as exerciseService from "../services/exerciseService";
import * as splitService from "../services/splitService";
import { useSettings } from "../hooks/useSettings";
import { useAudioCue } from "../hooks/useAudioCue";
import { useRestTimer } from "../hooks/useRestTimer";
import { useWakeLock } from "../hooks/useWakeLock";
import {
  WorkoutSessionContext,
  type InterRestInput,
  type WorkoutSessionContextValue,
} from "./workoutSessionStore";

// v2: o snapshot perdeu o campo prepareCued; a chave nova evita ler o formato antigo.
const SNAPSHOT_KEY = "health.activeSession.v2";

const PHASES: SessionPhase[] = ["idle", "overview", "exercising", "resting", "interRest", "exerciseDone"];

function isSnapshot(value: unknown): value is SessionSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sessionId === "string" &&
    PHASES.includes(candidate.phase as SessionPhase) &&
    typeof candidate.currentExerciseIndex === "number" &&
    typeof candidate.currentSetIndex === "number" &&
    (candidate.restEndsAt === null || typeof candidate.restEndsAt === "number") &&
    (candidate.restTotalMs === null || typeof candidate.restTotalMs === "number")
  );
}

function readSnapshot(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const [hydrating, setHydrating] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    const snapshot = readSnapshot();
    let active = true;
    sessionService
      .fetchActiveSession()
      .then((session) => {
        if (!active) return;
        if (session) {
          dispatch({ type: "HYDRATE", session, snapshot });
        } else {
          localStorage.removeItem(SNAPSHOT_KEY);
        }
      })
      .catch((err) => {
        if (active) setBootError(apiErrorMessage(err, "Não foi possível recuperar o treino em andamento."));
      })
      .finally(() => {
        if (active) setHydrating(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hydrating) return;
    const snapshot = toSnapshot(state);
    if (snapshot) {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      return;
    }
    // Se o boot falhou não sabemos se existe sessão ativa no servidor; apagar o snapshot
    // aqui perderia fase e restEndsAt de uma sessão que continua viva.
    if (bootError !== null && state.session === null) return;
    localStorage.removeItem(SNAPSHOT_KEY);
  }, [state, hydrating, bootError]);

  const start = useCallback(async (splitId: string) => {
    const session = await sessionService.startSession(splitId);
    setBootError(null);
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
      interRestMs?: number;
    }) => {
      const set = await sessionService.updateSessionSet(input.setId, {
        weightKg: input.weightKg,
        reps: input.reps,
        rpe: input.rpe ?? null,
        rir: input.rir ?? null,
        completed: true,
      });
      dispatch({
        type: "COMPLETE_SET",
        set,
        restMs: input.restMs,
        interRestMs: input.interRestMs,
        now: Date.now(),
      });
    },
    []
  );

  const skipRest = useCallback(() => dispatch({ type: "SKIP_REST" }), []);
  const extendRest = useCallback(() => dispatch({ type: "EXTEND_REST", ms: 15000 }), []);
  const nextExercise = useCallback(() => dispatch({ type: "NEXT_EXERCISE" }), []);

  // O descanso é cronometrado aqui, e não na tela do treino: sair da SplitEditorPage no meio
  // do descanso não pode interromper a contagem, os cues nem o wake lock.
  const resting = state.phase === "resting" || state.phase === "interRest";
  const { unlock, cueTick, cueGo } = useAudioCue({
    soundEnabled: settings?.soundEnabled ?? true,
    vibrationEnabled: settings?.vibrationEnabled ?? true,
  });
  const handleRestEnd = useCallback(() => {
    cueGo();
    // Na fase interRest o modal segue aberto aguardando a confirmação da carga; só o
    // descanso entre séries avança sozinho.
    if (state.phase === "resting") dispatch({ type: "REST_ENDED" });
  }, [cueGo, state.phase]);
  const { remainingMs: restRemainingMs, progress: restProgress } = useRestTimer({
    endsAt: resting ? state.restEndsAt : null,
    totalMs: state.restTotalMs,
    onTick: cueTick,
    onEnd: handleRestEnd,
  });
  useWakeLock((settings?.wakeLockEnabled ?? true) && state.session?.status === "in_progress");

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

  const removeExercise = useCallback(async (sessionExerciseId: string) => {
    await sessionService.removeSessionExercise(sessionExerciseId);
    dispatch({ type: "EXERCISE_REMOVED", exerciseId: sessionExerciseId });
  }, []);

  /** Recarrega a sessão do servidor sem perder fase nem contagem de descanso. */
  const refreshSession = useCallback(async () => {
    const session = await sessionService.fetchActiveSession();
    if (session) dispatch({ type: "SESSION_SYNCED", session });
  }, []);

  // Confirmação do descanso entre exercícios, para o exercício que acabou: a carga vale
  // também para as séries de hoje (é o peso que estava no aparelho), as reps só mudam o
  // alvo dos próximos treinos.
  const commitInterRest = useCallback(
    async (input: InterRestInput) => {
      const session = state.session;
      const exercise = session?.exercises[state.currentExerciseIndex] ?? null;
      if (session && exercise) {
        let touched = false;

        // Campo vazio significa "não alterar", para um toque errado não apagar a carga;
        // o adicional vazio significa "sem adicional".
        const working = parseMaskedNumber(input.working) ?? exercise.workingWeightKg;
        const additional = parseMaskedNumber(input.additional);
        if (
          exercise.exerciseId != null &&
          (working !== exercise.workingWeightKg || additional !== exercise.additionalWeightKg)
        ) {
          await exerciseService.updateExercise(exercise.exerciseId, {
            workingWeightKg: working,
            additionalWeightKg: additional,
          });
          const total = totalLoadKg(working, additional);
          for (const set of exercise.sets) {
            if (set.completedAt !== null && set.weightKg !== total) {
              await sessionService.updateSessionSet(set.id, { weightKg: total });
            }
          }
          touched = true;
        }

        // Reps mexem só no alvo: as séries já concluídas ficam com o que foi registrado
        // de fato, então o volume de hoje não muda retroativamente.
        const reps = parseOptionalInteger(input.reps, 1);
        const currentReps = exercise.sets[0]?.targetRepsMin ?? null;
        if (
          reps !== INVALID &&
          reps !== null &&
          reps !== currentReps &&
          session.splitId !== null &&
          exercise.splitExerciseId !== null
        ) {
          const currentMax = exercise.sets[0]?.targetRepsMax ?? null;
          await splitService.updateExercisePlan(session.splitId, exercise.splitExerciseId, {
            targetRepsMin: reps,
            // A faixa deixa de fazer sentido se o novo mínimo passa do máximo antigo.
            targetRepsMax: currentMax != null && currentMax >= reps ? currentMax : null,
          });
          touched = true;
        }

        if (touched) await refreshSession();
      }
      dispatch({ type: "NEXT_EXERCISE" });
    },
    [state.session, state.currentExerciseIndex, refreshSession]
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
      bootError,
      restRemainingMs,
      restProgress,
      unlock,
      start,
      playExercise,
      completeSet,
      skipRest,
      extendRest,
      nextExercise,
      editSet,
      removeExercise,
      refreshSession,
      commitInterRest,
      finish,
      discard,
    }),
    [
      state,
      hydrating,
      bootError,
      restRemainingMs,
      restProgress,
      unlock,
      start,
      playExercise,
      completeSet,
      skipRest,
      extendRest,
      nextExercise,
      editSet,
      removeExercise,
      refreshSession,
      commitInterRest,
      finish,
      discard,
    ]
  );

  return <WorkoutSessionContext.Provider value={value}>{children}</WorkoutSessionContext.Provider>;
}
