import { useEffect, useRef, useState } from "react";

const COUNTDOWN_FROM_MS = 10000;
const TICK_MS = 250;

interface UseRestTimerOptions {
  endsAt: number | null;
  totalMs: number | null;
  onTick?: (secondsLeft: number) => void;
  onEnd: () => void;
}

export function useRestTimer({ endsAt, totalMs, onTick, onEnd }: UseRestTimerOptions) {
  const [now, setNow] = useState(() => Date.now());
  const callbacksRef = useRef({ onTick, onEnd });

  useEffect(() => {
    callbacksRef.current = { onTick, onEnd };
  }, [onTick, onEnd]);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setNow(Date.now());
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [endsAt]);

  const remainingMs = endsAt === null ? 0 : Math.max(0, endsAt - now);

  const edgeRef = useRef<{ endsAt: number | null; lastSecond: number; ended: boolean }>({
    endsAt: null,
    lastSecond: -1,
    ended: false,
  });
  useEffect(() => {
    if (endsAt === null) {
      edgeRef.current = { endsAt: null, lastSecond: -1, ended: false };
      return;
    }
    if (edgeRef.current.endsAt !== endsAt) {
      edgeRef.current = { endsAt, lastSecond: Math.ceil(remainingMs / 1000), ended: false };
      return;
    }
    const secondsLeft = Math.ceil(remainingMs / 1000);
    if (
      remainingMs > 0 &&
      remainingMs <= COUNTDOWN_FROM_MS &&
      secondsLeft !== edgeRef.current.lastSecond
    ) {
      edgeRef.current.lastSecond = secondsLeft;
      callbacksRef.current.onTick?.(secondsLeft);
    }
    if (!edgeRef.current.ended && remainingMs === 0) {
      edgeRef.current.ended = true;
      callbacksRef.current.onEnd();
    }
  }, [endsAt, remainingMs]);

  const progress = totalMs && totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0;
  const preparing = remainingMs > 0 && remainingMs <= COUNTDOWN_FROM_MS;

  return { remainingMs, progress, preparing };
}
