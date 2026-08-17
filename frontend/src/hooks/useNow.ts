import { useEffect, useState } from "react";

/** `until` desliga o intervalo depois do instante informado (ver useRestTimer). */
export function useNow(active: boolean, intervalMs = 1000, until: number | null = null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    let interval: number | undefined;
    const update = () => {
      const value = Date.now();
      setNow(value);
      // Passado o fim previsto não há mais o que contar: manter o tick vivo re-renderizaria
      // quem observa o relógio várias vezes por segundo à toa.
      if (until !== null && value >= until && interval !== undefined) {
        clearInterval(interval);
        interval = undefined;
      }
    };
    const timeout = window.setTimeout(update, 0);
    interval = window.setInterval(update, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearTimeout(timeout);
      if (interval !== undefined) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [active, intervalMs, until]);

  return now;
}
