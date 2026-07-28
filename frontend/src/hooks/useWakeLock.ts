import { useEffect } from "react";

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let cancelled = false;
    let requesting = false;
    let sentinel: WakeLockSentinel | null = null;

    const request = async () => {
      if (cancelled || requesting) return;
      if (sentinel && !sentinel.released) return;
      requesting = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) {
          next.release().catch(() => undefined);
          return;
        }
        sentinel = next;
      } catch {
        sentinel = null;
      } finally {
        requesting = false;
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
      sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [active]);
}
