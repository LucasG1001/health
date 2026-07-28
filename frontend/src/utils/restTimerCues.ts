export const COUNTDOWN_FROM_MS = 10000;

export interface RestCueState {
  endedEndsAt: number | null;
  tickedEndsAt: number | null;
  tickedSecondsLeft: number;
}

export interface RestCueResult {
  next: RestCueState;
  tickSecondsLeft: number | null;
  ended: boolean;
}

export const initialRestCueState: RestCueState = {
  endedEndsAt: null,
  tickedEndsAt: null,
  tickedSecondsLeft: -1,
};

/**
 * Decide, para um instante do descanso, se há cue de contagem e se a borda de fim
 * ainda não foi anunciada. A borda é identificada pelo próprio `endsAt`, e não pelo
 * restante: um descanso que expirou antes deste mount precisa ser anunciado na
 * primeira avaliação, senão a fase fica presa em "resting".
 */
export function nextRestCue(prev: RestCueState, endsAt: number | null, remainingMs: number): RestCueResult {
  if (endsAt === null) {
    return { next: prev, tickSecondsLeft: null, ended: false };
  }

  let next = prev;
  let tickSecondsLeft: number | null = null;

  if (remainingMs > 0 && remainingMs <= COUNTDOWN_FROM_MS) {
    const secondsLeft = Math.ceil(remainingMs / 1000);
    if (prev.tickedEndsAt !== endsAt || prev.tickedSecondsLeft !== secondsLeft) {
      tickSecondsLeft = secondsLeft;
      next = { ...next, tickedEndsAt: endsAt, tickedSecondsLeft: secondsLeft };
    }
  }

  const ended = remainingMs === 0 && prev.endedEndsAt !== endsAt;
  if (ended) {
    next = { ...next, endedEndsAt: endsAt };
  }

  return { next, tickSecondsLeft, ended };
}

export function restRemainingMs(endsAt: number | null, totalMs: number | null, now: number): number {
  if (endsAt === null) return 0;
  // O relógio compartilhado congela enquanto não há descanso, então o primeiro frame de um
  // descanso novo pode vir de um `now` velho; o teto em totalMs evita exibir tempo inflado.
  const cap = totalMs ?? Number.POSITIVE_INFINITY;
  return Math.min(cap, Math.max(0, endsAt - now));
}

export function restProgress(remainingMs: number, totalMs: number | null): number {
  if (!totalMs || totalMs <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - remainingMs / totalMs));
}
