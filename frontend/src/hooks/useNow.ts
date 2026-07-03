import { useEffect, useState } from "react";

export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const update = () => setNow(Date.now());
    const timeout = setTimeout(update, 0);
    const interval = setInterval(update, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [active, intervalMs]);

  return now;
}
