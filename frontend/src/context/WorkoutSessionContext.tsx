import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
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
  RestTimerContext,
  WorkoutSessionContext,
  type InterRestInput,
  type WorkoutSessionContextValue,
} from "./workoutSessionStore";
import type { SessionExercise, SessionSet, WorkoutSession } from "../types/session";

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

function findSet(session: WorkoutSession | null, setId: string): SessionSet | null {
  if (!session) return null;
  for (const exercise of session.exercises) {
    const set = exercise.sets.find((item) => item.id === setId);
    if (set) return set;
  }
  return null;
}

function findExercise(session: WorkoutSession | null, id: string): SessionExercise | null {
  return session?.exercises.find((exercise) => exercise.id === id) ?? null;
}

type SetPatch = { weightKg?: number | null; reps?: number | null; rpe?: number | null; completed?: boolean };

function applyPatch(set: SessionSet, patch: SetPatch): SessionSet {
  return {
    ...set,
    ...(patch.weightKg !== undefined ? { weightKg: patch.weightKg } : null),
    ...(patch.reps !== undefined ? { reps: patch.reps } : null),
    ...(patch.rpe !== undefined ? { rpe: patch.rpe } : null),
    ...(patch.completed === true ? { completedAt: set.completedAt ?? new Date().toISOString() } : null),
    ...(patch.completed === false ? { completedAt: null } : null),
  };
}

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const [hydrating, setHydrating] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const { settings } = useSettings();

  // As ações otimistas precisam da série anterior para desfazer a mudança se a rede falhar,
  // sem que isso entre nas deps dos callbacks (recriá-los invalidaria a memoização da lista).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

  // Marcar a série é otimista: o check aparece e o descanso começa no toque, não depois do
  // round-trip (que em rede móvel atrasava a contagem em segundos). Se a API falhar, a série
  // volta ao estado anterior e o reducer cancela o descanso.
  const completeSet = useCallback(
    async (input: {
      set: SessionSet;
      weightKg: number | null;
      reps: number | null;
      rpe?: number | null;
      rir?: number | null;
      restMs: number;
      interRestMs?: number;
    }) => {
      const patch = {
        weightKg: input.weightKg,
        reps: input.reps,
        rpe: input.rpe ?? null,
        rir: input.rir ?? null,
        completed: true as const,
      };
      dispatch({
        type: "COMPLETE_SET",
        set: { ...applyPatch(input.set, patch), rir: patch.rir },
        restMs: input.restMs,
        interRestMs: input.interRestMs,
        now: Date.now(),
      });
      try {
        const set = await sessionService.updateSessionSet(input.set.id, patch);
        dispatch({ type: "SETS_UPDATED", sets: [set] });
      } catch (error) {
        dispatch({ type: "SETS_UPDATED", sets: [input.set] });
        throw error;
      }
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

  const editSet = useCallback(async (setId: string, patch: SetPatch) => {
    const previous = findSet(stateRef.current.session, setId);
    if (previous) dispatch({ type: "SETS_UPDATED", sets: [applyPatch(previous, patch)] });
    try {
      const set = await sessionService.updateSessionSet(setId, patch);
      dispatch({ type: "SETS_UPDATED", sets: [set] });
    } catch (error) {
      if (previous) dispatch({ type: "SETS_UPDATED", sets: [previous] });
      throw error;
    }
  }, []);

  // Concluir/reabrir um exercício inteiro é uma requisição só: antes era um PUT por série,
  // em série, com a tela travada até o último.
  const concludeExercise = useCallback(
    async (sessionExerciseId: string, fallback: { weightKg: number | null; reps: number | null }) => {
      const exercise = findExercise(stateRef.current.session, sessionExerciseId);
      const pending = exercise?.sets.filter((set) => set.completedAt === null) ?? [];
      if (pending.length === 0) return;
      const completedAt = new Date().toISOString();
      dispatch({
        type: "SETS_UPDATED",
        sets: pending.map((set) => ({
          ...set,
          weightKg: set.weightKg ?? fallback.weightKg,
          reps: set.reps ?? set.targetRepsMin ?? fallback.reps,
          completedAt,
        })),
      });
      try {
        const sets = await sessionService.updateSessionSets(sessionExerciseId, {
          scope: "pending",
          completed: true,
          weightKg: fallback.weightKg,
          reps: fallback.reps,
        });
        dispatch({ type: "SETS_UPDATED", sets });
      } catch (error) {
        dispatch({ type: "SETS_UPDATED", sets: pending });
        throw error;
      }
    },
    []
  );

  const reopenExercise = useCallback(async (sessionExerciseId: string) => {
    const exercise = findExercise(stateRef.current.session, sessionExerciseId);
    const done = exercise?.sets.filter((set) => set.completedAt !== null) ?? [];
    if (done.length === 0) return;
    dispatch({ type: "SETS_UPDATED", sets: done.map((set) => ({ ...set, completedAt: null })) });
    try {
      const sets = await sessionService.updateSessionSets(sessionExerciseId, {
        scope: "completed",
        completed: false,
      });
      dispatch({ type: "SETS_UPDATED", sets });
    } catch (error) {
      dispatch({ type: "SETS_UPDATED", sets: done });
      throw error;
    }
  }, []);

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
        // Tudo em paralelo e sem recarregar a sessão depois: o painel encadeava uma
        // requisição por série concluída mais um GET da sessão inteira.
        const tasks: Promise<unknown>[] = [];

        // Campo vazio significa "não alterar", para um toque errado não apagar a carga;
        // o adicional vazio significa "sem adicional".
        const working = parseMaskedNumber(input.working) ?? exercise.workingWeightKg;
        const additional = parseMaskedNumber(input.additional);
        if (
          exercise.exerciseId != null &&
          (working !== exercise.workingWeightKg || additional !== exercise.additionalWeightKg)
        ) {
          const exerciseId = exercise.exerciseId;
          const total = totalLoadKg(working, additional);
          dispatch({
            type: "EXERCISE_LOAD_UPDATED",
            exerciseId,
            workingWeightKg: working,
            additionalWeightKg: additional,
          });
          dispatch({
            type: "SETS_UPDATED",
            sets: exercise.sets
              .filter((set) => set.completedAt !== null && set.weightKg !== total)
              .map((set) => ({ ...set, weightKg: total })),
          });
          tasks.push(
            exerciseService.updateExercise(exerciseId, {
              workingWeightKg: working,
              additionalWeightKg: additional,
            }),
            sessionService
              .updateSessionSets(exercise.id, { scope: "completed", weightKg: total })
              .then((sets) => dispatch({ type: "SETS_UPDATED", sets }))
          );
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
          // A faixa deixa de fazer sentido se o novo mínimo passa do máximo antigo.
          const targetRepsMax = currentMax != null && currentMax >= reps ? currentMax : null;
          dispatch({
            type: "TARGET_REPS_UPDATED",
            sessionExerciseId: exercise.id,
            targetRepsMin: reps,
            targetRepsMax,
          });
          tasks.push(
            splitService.updateExercisePlan(session.splitId, exercise.splitExerciseId, {
              targetRepsMin: reps,
              targetRepsMax,
            })
          );
        }

        if (tasks.length > 0) {
          try {
            await Promise.all(tasks);
          } catch (error) {
            dispatch({ type: "SETS_UPDATED", sets: exercise.sets });
            if (exercise.exerciseId != null) {
              dispatch({
                type: "EXERCISE_LOAD_UPDATED",
                exerciseId: exercise.exerciseId,
                workingWeightKg: exercise.workingWeightKg,
                additionalWeightKg: exercise.additionalWeightKg,
              });
            }
            throw error;
          }
        }
      }
      dispatch({ type: "NEXT_EXERCISE" });
    },
    [state.session, state.currentExerciseIndex]
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
      unlock,
      start,
      playExercise,
      completeSet,
      skipRest,
      extendRest,
      nextExercise,
      editSet,
      concludeExercise,
      reopenExercise,
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
      unlock,
      start,
      playExercise,
      completeSet,
      skipRest,
      extendRest,
      nextExercise,
      editSet,
      concludeExercise,
      reopenExercise,
      removeExercise,
      refreshSession,
      commitInterRest,
      finish,
      discard,
    ]
  );

  const countdown = useMemo(
    () => ({ remainingMs: restRemainingMs, progress: restProgress }),
    [restRemainingMs, restProgress]
  );

  return (
    <WorkoutSessionContext.Provider value={value}>
      <RestTimerContext.Provider value={countdown}>{children}</RestTimerContext.Provider>
    </WorkoutSessionContext.Provider>
  );
}
