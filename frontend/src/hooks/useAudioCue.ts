import { useCallback, useEffect, useRef } from "react";

interface UseAudioCueOptions {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!sharedContext) sharedContext = new AudioContext();
  return sharedContext;
}

export function useAudioCue({ soundEnabled, vibrationEnabled }: UseAudioCueOptions) {
  const optionsRef = useRef({ soundEnabled, vibrationEnabled });

  useEffect(() => {
    optionsRef.current = { soundEnabled, vibrationEnabled };
  }, [soundEnabled, vibrationEnabled]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && sharedContext?.state === "suspended") {
        sharedContext.resume().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const unlock = useCallback(() => {
    const context = getContext();
    if (context?.state === "suspended") {
      context.resume().catch(() => undefined);
    }
  }, []);

  const beep = useCallback((frequency: number, durationMs: number, delayMs = 0) => {
    if (!optionsRef.current.soundEnabled) return;
    const context = getContext();
    if (!context) return;

    const startAt = context.currentTime + delayMs / 1000;
    const stopAt = startAt + durationMs / 1000;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.05);
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!optionsRef.current.vibrationEnabled) return;
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  }, []);

  const cuePrepare = useCallback(() => {
    beep(880, 120);
    beep(880, 120, 200);
    vibrate([150, 80, 150]);
  }, [beep, vibrate]);

  const cueTick = useCallback(() => {
    beep(880, 90);
    vibrate(60);
  }, [beep, vibrate]);

  const cueGo = useCallback(() => {
    beep(1320, 350);
    vibrate(400);
  }, [beep, vibrate]);

  return { unlock, cuePrepare, cueTick, cueGo };
}
