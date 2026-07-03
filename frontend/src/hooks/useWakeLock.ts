import { useEffect, useRef } from "react";

export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let cancelled = false;

    const request = async () => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release().catch(() => undefined);
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        sentinelRef.current = null;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinelRef.current?.release().catch(() => undefined);
      sentinelRef.current = null;
    };
  }, [active]);
}
