import { useEffect, type RefObject } from "react";

export function useDismiss(
  onDismiss: () => void,
  outsideRef?: RefObject<HTMLElement | null>,
  active = true
): void {
  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (outsideRef?.current && !outsideRef.current.contains(e.target as Node)) onDismiss();
    };

    document.addEventListener("keydown", onKey);
    if (outsideRef) document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (outsideRef) document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onDismiss, outsideRef, active]);
}
