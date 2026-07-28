import { describe, expect, it } from "vitest";
import {
  initialRestCueState,
  nextRestCue,
  restProgress,
  restRemainingMs,
  type RestCueState,
} from "./restTimerCues";

describe("nextRestCue", () => {
  it("anuncia o fim de um descanso que já havia expirado antes da primeira avaliação", () => {
    // Regressão: reload (ou volta para a tela) depois do descanso ter estourado.
    // O restante já chega em 0, então não existe transição 1 → 0 para observar.
    const result = nextRestCue(initialRestCueState, 1_700_000_000_000, 0);
    expect(result.ended).toBe(true);
    expect(result.next.endedEndsAt).toBe(1_700_000_000_000);
  });

  it("anuncia o fim apenas uma vez para o mesmo endsAt", () => {
    const first = nextRestCue(initialRestCueState, 500, 0);
    const second = nextRestCue(first.next, 500, 0);
    expect(first.ended).toBe(true);
    expect(second.ended).toBe(false);
  });

  it("volta a anunciar quando o descanso é estendido", () => {
    const ended = nextRestCue(initialRestCueState, 500, 0);
    const extended = nextRestCue(ended.next, 15_500, 0);
    expect(extended.ended).toBe(true);
  });

  it("não anuncia nada sem descanso ativo", () => {
    const result = nextRestCue(initialRestCueState, null, 0);
    expect(result).toEqual({ next: initialRestCueState, tickSecondsLeft: null, ended: false });
  });

  it("emite um tick por segundo nos últimos 10s", () => {
    let state: RestCueState = initialRestCueState;
    const ticks: number[] = [];
    for (const remaining of [10_000, 9_800, 9_400, 9_000, 8_900]) {
      const result = nextRestCue(state, 1_000, remaining);
      state = result.next;
      if (result.tickSecondsLeft !== null) ticks.push(result.tickSecondsLeft);
    }
    expect(ticks).toEqual([10, 9]);
  });

  it("não emite tick acima da janela de contagem", () => {
    const result = nextRestCue(initialRestCueState, 1_000, 10_001);
    expect(result.tickSecondsLeft).toBeNull();
    expect(result.ended).toBe(false);
  });

  it("não confunde tick com fim: em 0 não emite tick", () => {
    const result = nextRestCue(initialRestCueState, 1_000, 0);
    expect(result.tickSecondsLeft).toBeNull();
    expect(result.ended).toBe(true);
  });
});

describe("restRemainingMs", () => {
  it("é zero sem descanso ativo", () => {
    expect(restRemainingMs(null, 60_000, 1_000)).toBe(0);
  });

  it("nunca é negativo", () => {
    expect(restRemainingMs(1_000, 60_000, 5_000)).toBe(0);
  });

  it("limita o restante ao total quando o relógio compartilhado está atrasado", () => {
    // now congelado muito atrás: endsAt - now daria 500s para um descanso de 60s.
    expect(restRemainingMs(500_000, 60_000, 0)).toBe(60_000);
  });

  it("sem total conhecido devolve o restante bruto", () => {
    expect(restRemainingMs(5_000, null, 1_000)).toBe(4_000);
  });
});

describe("restProgress", () => {
  it("vai de 0 a 1 conforme o descanso corre", () => {
    expect(restProgress(60_000, 60_000)).toBe(0);
    expect(restProgress(30_000, 60_000)).toBe(0.5);
    expect(restProgress(0, 60_000)).toBe(1);
  });

  it("é 0 sem total", () => {
    expect(restProgress(1_000, null)).toBe(0);
    expect(restProgress(1_000, 0)).toBe(0);
  });
});
