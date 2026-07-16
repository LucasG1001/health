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
        exerciseName: "Supino reto",
        muscleGroup: "chest",
        equipment: "Barra",
        imageUrl: null,
        machineSetting: null,
        position: 0,
        notes: null,
        sets: [makeSet("set-1"), makeSet("set-2")],
      },
      {
        id: "se-2",
        exerciseId: "ex-2",
        exerciseName: "Crucifixo",
        muscleGroup: "chest",
        equipment: "Halteres",
        imageUrl: null,
        machineSetting: null,
        position: 1,
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
    expect(next.prepareCued).toBe(false);
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
        prepareCued: true,
      },
    });
    expect(state.phase).toBe("resting");
    expect(state.restEndsAt).toBe(123456);
    expect(state.prepareCued).toBe(true);
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
        prepareCued: false,
      },
    });
    expect(state.phase).toBe("overview");
    expect(state.restEndsAt).toBeNull();
  });
});
