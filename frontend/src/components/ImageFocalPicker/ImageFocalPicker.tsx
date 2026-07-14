import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { imageFocalStyle } from "../../utils/format";
import styles from "./ImageFocalPicker.module.css";

export interface FocalValue {
  focalX: number;
  focalY: number;
  zoom: number;
}

interface ImageFocalPickerProps extends FocalValue {
  src: string;
  onChange: (value: FocalValue) => void;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function ImageFocalPicker({ src, focalX, focalY, zoom, onChange }: ImageFocalPickerProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, y: e.clientY, fx: focalX, fy: focalY };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    const start = drag.current;
    if (!el || !start) return;
    const rect = el.getBoundingClientRect();
    const dx = ((e.clientX - start.x) / rect.width) * 100;
    const dy = ((e.clientY - start.y) / rect.height) * 100;
    onChange({ focalX: clamp(start.fx - dx), focalY: clamp(start.fy - dy), zoom });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    drag.current = null;
  };

  return (
    <div className={styles.wrapper}>
      <div
        ref={frameRef}
        className={styles.frame}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          className={styles.image}
          src={src}
          alt=""
          draggable={false}
          style={imageFocalStyle({ imageFocalX: focalX, imageFocalY: focalY, imageZoom: zoom })}
        />
        <span className={styles.hint}>Arraste para posicionar</span>
      </div>
      <label className={styles.zoomRow}>
        <span className={styles.zoomLabel}>Zoom</span>
        <input
          className={styles.zoomSlider}
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => onChange({ focalX, focalY, zoom: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
