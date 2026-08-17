import { describe, expect, it } from "vitest";
import {
  initialSessionState,
  sessionReducer,
  type SessionState,
} from "./sessionMachine";
import type { SessionSet, WorkoutSession } from "../types/session";

function makeSet(id: string, completed = false): SessionSet {
  return {
    id,
    position: 0,
    setType: "working",
    variation: "normal",
    targetRepsMin: 12,
    targetRepsMax: null,
    restSeconds: 60,
    weightKg: 40,
    reps: completed ? 12 : null,
    rpe: null,
    rir: null,
    completedAt: completed ? "2026-07-03T10:00:00Z" : null,
  };
}

function makeSession(): WorkoutSession {
  return {
    id: "session-1",
    splitId: "split-1",
    splitName: "Treino A",
    status: "in_progress",
    startedAt: "2026-07-03T09:00:00Z",
    finishedAt: null,
    durationSeconds: null,
    totalVolumeKg: null,
    notes: null,
    exercises: [
      {
        id: "se-1",
        exerciseId: "ex-1",
        splitExerciseId: "sx-1",
        exerciseName: "Supino reto",
        muscleGroup: "chest",
        equipment: "Barra",
        imageUrl: null,
        machineSetting: null,
        workingWeightKg: 40,
        additionalWeightKg: null,
        position:0,
        notes: null,
        sets: [makeSet("set-1"), makeSet("set-2")],
      },
      {
        id: "se-2",
        exerciseId: "ex-2",
        splitExerciseId: "sx-2",
        exerciseName: "Crucifixo",
        muscleGroup: "chest",
        equipment: "Halteres",
        imageUrl: null,
        machineSetting: null,
        workingWeightKg: 40,
        additionalWeightKg: null,
        position:1,
        notes: null,
        sets: [makeSet("set-3")],
      },
    ],
  };
}

function startedState(): SessionState {
  const started = sessionReducer(initialSessionState, { type: "START", session: makeSession() });
  return sessionReducer(started, { type: "PLAY_EXERCISE", exerciseIndex: 0 });
}

describe("sessionReducer", () => {
  it("inicia na visão geral e entra em exercising no play", () => {
    const state = startedState();
    expect(state.phase).toBe("exercising");
    expect(state.currentExerciseIndex).toBe(0);
    expect(state.currentSetIndex).toBe(0);
  });

  it("vai para resting com restEndsAt absoluto ao completar série com séries pendentes", () => {
    const state = startedState();
    const now = 1_000_000;
    const next = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: { ...makeSet("set-1", true) },
      restMs: 60000,
      now,
    });
    expect(next.phase).toBe("resting");
    expect(next.restEndsAt).toBe(now + 60000);
  });

  it("vai para exerciseDone ao completar a última série do exercício", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-1", true),
      restMs: 60000,
      now: 0,
    });
    state = sessionReducer(state, { type: "SKIP_REST" });
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-2", true),
      restMs: 60000,
      now: 0,
    });
    expect(state.phase).toBe("exerciseDone");
    expect(state.restEndsAt).toBeNull();
  });

  it("vai para interRest ao concluir o exercício quando há próximo e interRestMs", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-1", true),
      restMs: 60000,
      now: 0,
    });
    state = sessionReducer(state, { type: "SKIP_REST" });
    const now = 5000;
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-2", true),
      restMs: 60000,
      interRestMs: 90000,
      now,
    });
    expect(state.phase).toBe("interRest");
    expect(state.restEndsAt).toBe(now + 90000);
    expect(state.restTotalMs).toBe(90000);
    expect(state.currentExerciseIndex).toBe(0);
  });

  it("vai para exerciseDone (não interRest) no último exercício mesmo com interRestMs", () => {
    const session = makeSession();
    session.exercises[0]!.sets = [makeSet("set-1", true), makeSet("set-2", true)];
    let state = sessionReducer(initialSessionState, { type: "START", session });
    state = sessionReducer(state, { type: "PLAY_EXERCISE", exerciseIndex: 1 });
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-3", true),
      restMs: 60000,
      interRestMs: 90000,
      now: 0,
    });
    expect(state.phase).toBe("exerciseDone");
    expect(state.restEndsAt).toBeNull();
  });

  it("EXTEND_REST soma 15s durante o interRest", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-1", true),
      restMs: 60000,
      now: 0,
    });
    state = sessionReducer(state, { type: "SKIP_REST" });
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-2", true),
      restMs: 60000,
      interRestMs: 90000,
      now: 1000,
    });
    state = sessionReducer(state, { type: "EXTEND_REST", ms: 15000 });
    expect(state.phase).toBe("interRest");
    expect(state.restEndsAt).toBe(1000 + 90000 + 15000);
    expect(state.restTotalMs).toBe(105000);
  });

  it("NEXT_EXERCISE a partir do interRest avança para o próximo exercício", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-1", true),
      restMs: 60000,
      now: 0,
    });
    state = sessionReducer(state, { type: "SKIP_REST" });
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-2", true),
      restMs: 60000,
      interRestMs: 90000,
      now: 0,
    });
    expect(state.phase).toBe("interRest");
    state = sessionReducer(state, { type: "NEXT_EXERCISE" });
    expect(state.phase).toBe("exercising");
    expect(state.currentExerciseIndex).toBe(1);
    expect(state.restEndsAt).toBeNull();
  });

  it("REST_ENDED libera a próxima série pendente", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-1", true),
      restMs: 60000,
      now: 0,
    });
    state = sessionReducer(state, { type: "REST_ENDED" });
    expect(state.phase).toBe("exercising");
    expect(state.currentSetIndex).toBe(1);
  });

  it("EXTEND_REST soma 15s ao término", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-1", true),
      restMs: 60000,
      now: 1000,
    });
    state = sessionReducer(state, { type: "EXTEND_REST", ms: 15000 });
    expect(state.restEndsAt).toBe(1000 + 60000 + 15000);
    expect(state.restTotalMs).toBe(75000);
  });

  it("NEXT_EXERCISE pula para o próximo exercício com séries pendentes", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-1", true),
      restMs: 60000,
      now: 0,
    });
    state = sessionReducer(state, { type: "SKIP_REST" });
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-2", true),
      restMs: 60000,
      now: 0,
    });
    state = sessionReducer(state, { type: "NEXT_EXERCISE" });
    expect(state.currentExerciseIndex).toBe(1);
    expect(state.phase).toBe("exercising");
  });

  it("NEXT_EXERCISE volta para overview quando não resta nada", () => {
    const session = makeSession();
    session.exercises[0]!.sets = [makeSet("set-1", true), makeSet("set-2", true)];
    session.exercises[1]!.sets = [makeSet("set-3", true)];
    let state = sessionReducer(initialSessionState, { type: "START", session });
    state = sessionReducer(state, { type: "NEXT_EXERCISE" });
    expect(state.phase).toBe("overview");
  });

  it("SESSION_SYNCED preserva a fase e a contagem de descanso", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-1", true),
      restMs: 60000,
      now: 1_000,
    });
    expect(state.phase).toBe("resting");

    // O plano mudou no meio do treino: a série pendente agora pede 10 reps.
    const synced = makeSession();
    synced.exercises[0]!.sets = [
      makeSet("set-1", true),
      { ...makeSet("set-2"), targetRepsMin: 10 },
    ];
    state = sessionReducer(state, { type: "SESSION_SYNCED", session: synced });

    expect(state.phase).toBe("resting");
    expect(state.restEndsAt).toBe(61_000);
    expect(state.restTotalMs).toBe(60_000);
    expect(state.session!.exercises[0]!.sets[1]!.targetRepsMin).toBe(10);
  });

  it("SESSION_SYNCED reconcilia a fase quando o plano tira as séries pendentes", () => {
    let state = startedState();
    expect(state.phase).toBe("exercising");
    const synced = makeSession();
    synced.exercises[0]!.sets = [makeSet("set-1", true)];
    state = sessionReducer(state, { type: "SESSION_SYNCED", session: synced });
    expect(state.phase).toBe("exerciseDone");
    expect(state.currentSetIndex).toBe(0);
  });

  it("SESSION_SYNCED faz clamp do índice quando o exercício perde séries", () => {
    let state = startedState();
    state = sessionReducer(state, { type: "REST_ENDED" });
    state = { ...state, currentSetIndex: 1 };
    const synced = makeSession();
    synced.exercises[0]!.sets = [makeSet("set-1")];
    state = sessionReducer(state, { type: "SESSION_SYNCED", session: synced });
    expect(state.currentSetIndex).toBe(0);
  });

  it("SESSION_SYNCED ignora sessão diferente da atual", () => {
    const state = startedState();
    const other = { ...makeSession(), id: "outra" };
    const next = sessionReducer(state, { type: "SESSION_SYNCED", session: other });
    expect(next).toBe(state);
  });

  it("HYDRATE restaura fase e timer do snapshot da mesma sessão", () => {
    const session = makeSession();
    const state = sessionReducer(initialSessionState, {
      type: "HYDRATE",
      session,
      snapshot: {
        sessionId: "session-1",
        phase: "resting",
        currentExerciseIndex: 0,
        currentSetIndex: 1,
        restEndsAt: 123456,
        restTotalMs: 60000,
      },
    });
    expect(state.phase).toBe("resting");
    expect(state.restEndsAt).toBe(123456);
  });

  it("HYDRATE ignora snapshot de outra sessão", () => {
    const session = makeSession();
    const state = sessionReducer(initialSessionState, {
      type: "HYDRATE",
      session,
      snapshot: {
        sessionId: "outra",
        phase: "resting",
        currentExerciseIndex: 0,
        currentSetIndex: 1,
        restEndsAt: 123456,
        restTotalMs: 60000,
      },
    });
    expect(state.phase).toBe("overview");
    expect(state.restEndsAt).toBeNull();
  });

  it("HYDRATE limita currentSetIndex às séries existentes", () => {
    const session = makeSession();
    const state = sessionReducer(initialSessionState, {
      type: "HYDRATE",
      session,
      snapshot: {
        sessionId: "session-1",
        phase: "exercising",
        currentExerciseIndex: 1,
        currentSetIndex: 7,
        restEndsAt: null,
        restTotalMs: null,
      },
    });
    expect(state.currentExerciseIndex).toBe(1);
    expect(state.currentSetIndex).toBe(0);
  });

  it("SET_UPDATED vai para exerciseDone quando as séries do exercício atual acabam", () => {
    let state = startedState();
    state = sessionReducer(state, { type: "SET_UPDATED", set: makeSet("set-1", true) });
    expect(state.phase).toBe("exercising");
    state = sessionReducer(state, { type: "SET_UPDATED", set: makeSet("set-2", true) });
    expect(state.phase).toBe("exerciseDone");
    expect(state.restEndsAt).toBeNull();
  });

  it("SET_UPDATED reabre o exercício quando uma série volta a ficar pendente", () => {
    let state = startedState();
    state = sessionReducer(state, { type: "SET_UPDATED", set: makeSet("set-1", true) });
    state = sessionReducer(state, { type: "SET_UPDATED", set: makeSet("set-2", true) });
    expect(state.phase).toBe("exerciseDone");
    state = sessionReducer(state, { type: "SET_UPDATED", set: makeSet("set-2") });
    expect(state.phase).toBe("exercising");
    expect(state.currentSetIndex).toBe(1);
  });

  it("SET_UPDATED não interrompe um descanso em andamento", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-1", true),
      restMs: 60000,
      now: 1_000,
    });
    expect(state.phase).toBe("resting");
    state = sessionReducer(state, { type: "SET_UPDATED", set: makeSet("set-2", true) });
    expect(state.phase).toBe("resting");
    expect(state.restEndsAt).toBe(61_000);
  });

  it("SET_UPDATED em outro exercício não muda a fase do atual", () => {
    let state = startedState();
    state = sessionReducer(state, { type: "SET_UPDATED", set: makeSet("set-3", true) });
    expect(state.phase).toBe("exercising");
    expect(state.currentExerciseIndex).toBe(0);
  });

  it("SETS_UPDATED conclui o exercício inteiro de uma vez", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "SETS_UPDATED",
      sets: [makeSet("set-1", true), makeSet("set-2", true)],
    });
    expect(state.phase).toBe("exerciseDone");
    expect(state.session!.exercises[0]!.sets.every((set) => set.completedAt !== null)).toBe(true);
  });

  it("SETS_UPDATED desfazendo a série do descanso cancela a contagem", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "COMPLETE_SET",
      set: makeSet("set-1", true),
      restMs: 60000,
      now: 1_000,
    });
    expect(state.phase).toBe("resting");
    // Rollback de um check otimista que falhou na rede.
    state = sessionReducer(state, { type: "SETS_UPDATED", sets: [makeSet("set-1")] });
    expect(state.phase).toBe("exercising");
    expect(state.restEndsAt).toBeNull();
    expect(state.currentSetIndex).toBe(0);
  });

  it("SETS_UPDATED preserva a identidade dos exercícios não afetados", () => {
    const state = startedState();
    const before = state.session!.exercises[1]!;
    const next = sessionReducer(state, { type: "SETS_UPDATED", sets: [makeSet("set-1", true)] });
    expect(next.session!.exercises[1]).toBe(before);
    expect(next.session!.exercises[0]).not.toBe(state.session!.exercises[0]);
  });

  it("SETS_UPDATED com lista vazia não altera o estado", () => {
    const state = startedState();
    expect(sessionReducer(state, { type: "SETS_UPDATED", sets: [] })).toBe(state);
  });

  it("EXERCISE_LOAD_UPDATED troca a carga do exercício do catálogo", () => {
    let state = startedState();
    state = sessionReducer(state, {
      type: "EXERCISE_LOAD_UPDATED",
      exerciseId: "ex-1",
      workingWeightKg: 50,
      additionalWeightKg: 2.5,
    });
    expect(state.session!.exercises[0]!.workingWeightKg).toBe(50);
    expect(state.session!.exercises[0]!.additionalWeightKg).toBe(2.5);
    expect(state.session!.exercises[1]!.workingWeightKg).toBe(40);
  });

  it("TARGET_REPS_UPDATED muda só o alvo das séries pendentes", () => {
    let state = startedState();
    state = sessionReducer(state, { type: "SETS_UPDATED", sets: [makeSet("set-1", true)] });
    state = sessionReducer(state, {
      type: "TARGET_REPS_UPDATED",
      sessionExerciseId: "se-1",
      targetRepsMin: 8,
      targetRepsMax: null,
    });
    const sets = state.session!.exercises[0]!.sets;
    expect(sets[0]!.targetRepsMin).toBe(12);
    expect(sets[1]!.targetRepsMin).toBe(8);
  });
});
