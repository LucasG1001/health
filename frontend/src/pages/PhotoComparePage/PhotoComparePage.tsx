import { useMemo, useRef, useState } from "react";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon } from "../../components/Icon/icons";
import { usePhotos } from "../../hooks/usePhotos";
import { useMeasurements } from "../../hooks/useMeasurements";
import { diffDays } from "../../utils/dateUtils";
import { formatDate, formatKg, formatNumber, formatPct } from "../../utils/format";
import type { PhotoPose, ProgressPhoto } from "../../types/photo";
import type { Measurement } from "../../types/measurement";
import { POSE_LABELS } from "../../utils/format";
import styles from "./PhotoComparePage.module.css";

type Mode = "side" | "overlay";

function nearestMeasurement(measurements: Measurement[], date: string): Measurement | null {
  if (measurements.length === 0) return null;
  let best: Measurement | null = null;
  let bestDistance = Infinity;
  for (const measurement of measurements) {
    const distance = Math.abs(diffDays(measurement.measuredOn, date));
    if (distance < bestDistance) {
      best = measurement;
      bestDistance = distance;
    }
  }
  return best;
}

function PhotoPicker({
  photos,
  index,
  onIndexChange,
  label,
}: {
  photos: ProgressPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  label: string;
}) {
  const photo = photos[index];
  return (
    <div className={styles.picker}>
      <span className={styles.pickerLabel}>{label}</span>
      <div className={styles.pickerControls}>
        <button
          type="button"
          className={styles.pickerArrow}
          disabled={index <= 0}
          onClick={() => onIndexChange(index - 1)}
          aria-label="Foto anterior"
        >
          <ChevronLeftIcon className={styles.pickerArrowIcon} />
        </button>
        <span className={styles.pickerDate}>{photo ? formatDate(photo.takenOn) : "—"}</span>
        <button
          type="button"
          className={styles.pickerArrow}
          disabled={index >= photos.length - 1}
          onClick={() => onIndexChange(index + 1)}
          aria-label="Próxima foto"
        >
          <ChevronRightIcon className={styles.pickerArrowIcon} />
        </button>
      </div>
    </div>
  );
}

export function PhotoComparePage() {
  const { photos, loading } = usePhotos();
  const { measurements } = useMeasurements();
  const [pose, setPose] = useState<PhotoPose>("front");
  const [mode, setMode] = useState<Mode>("side");
  const [beforeIndex, setBeforeIndex] = useState(0);
  const [afterIndex, setAfterIndex] = useState<number | null>(null);
  const [reveal, setReveal] = useState(50);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const poseFiltered = useMemo(
    () => photos.filter((photo) => photo.pose === pose),
    [photos, pose]
  );

  const effectiveAfterIndex = afterIndex ?? Math.max(0, poseFiltered.length - 1);
  const before = poseFiltered[Math.min(beforeIndex, poseFiltered.length - 1)];
  const after = poseFiltered[Math.min(effectiveAfterIndex, poseFiltered.length - 1)];

  const beforeMeasure = before ? nearestMeasurement(measurements, before.takenOn) : null;
  const afterMeasure = after ? nearestMeasurement(measurements, after.takenOn) : null;

  const weightDelta =
    beforeMeasure?.weightKg != null && afterMeasure?.weightKg != null
      ? afterMeasure.weightKg - beforeMeasure.weightKg
      : null;
  const fatDelta =
    beforeMeasure?.bodyFatPct != null && afterMeasure?.bodyFatPct != null
      ? afterMeasure.bodyFatPct - beforeMeasure.bodyFatPct
      : null;
  const daysBetween = before && after ? diffDays(before.takenOn, after.takenOn) : null;

  const handleDrag = (clientX: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setReveal(Math.min(100, Math.max(0, pct)));
  };

  const changePose = (next: PhotoPose) => {
    setPose(next);
    setBeforeIndex(0);
    setAfterIndex(null);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Comparar fotos"
        backTo="/medidas/fotos"
        actions={
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={`${styles.modeOption} ${mode === "side" ? styles.modeActive : ""}`}
              onClick={() => setMode("side")}
            >
              Lado a lado
            </button>
            <button
              type="button"
              className={`${styles.modeOption} ${mode === "overlay" ? styles.modeActive : ""}`}
              onClick={() => setMode("overlay")}
            >
              Sobrepor
            </button>
          </div>
        }
      />

      <div className={styles.poseRow}>
        {(Object.keys(POSE_LABELS) as PhotoPose[]).map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.poseChip} ${pose === option ? styles.poseActive : ""}`}
            onClick={() => changePose(option)}
          >
            {POSE_LABELS[option]}
          </button>
        ))}
      </div>

      {!loading && poseFiltered.length < 2 ? (
        <EmptyState
          icon={<CameraIcon />}
          title="Fotos insuficientes"
          description={`Você precisa de ao menos 2 fotos de ${POSE_LABELS[pose].toLowerCase()} para comparar.`}
        />
      ) : (
        <>
          <div className={styles.pickers}>
            <PhotoPicker photos={poseFiltered} index={Math.min(beforeIndex, poseFiltered.length - 1)} onIndexChange={setBeforeIndex} label="Antes" />
            <PhotoPicker photos={poseFiltered} index={Math.min(effectiveAfterIndex, poseFiltered.length - 1)} onIndexChange={setAfterIndex} label="Depois" />
          </div>

          {mode === "side" ? (
            <div className={styles.sideBySide}>
              {[{ photo: before, measure: beforeMeasure }, { photo: after, measure: afterMeasure }].map(
                (item, i) =>
                  item.photo && (
                    <figure key={i} className={styles.compareCard}>
                      <img src={item.photo.url} alt={i === 0 ? "Antes" : "Depois"} />
                      <figcaption className={styles.compareCaption}>
                        {item.measure?.weightKg != null && <span>{formatKg(item.measure.weightKg)}</span>}
                        {item.measure?.bodyFatPct != null && <span>{formatPct(item.measure.bodyFatPct)}</span>}
                      </figcaption>
                    </figure>
                  )
              )}
            </div>
          ) : (
            before &&
            after && (
              <div
                ref={overlayRef}
                className={styles.overlay}
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  handleDrag(e.clientX);
                }}
                onPointerMove={(e) => {
                  if (e.buttons > 0) handleDrag(e.clientX);
                }}
              >
                <img src={before.url} alt="Antes" className={styles.overlayImage} />
                <img
                  src={after.url}
                  alt="Depois"
                  className={styles.overlayImage}
                  style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}
                />
                <div className={styles.handle} style={{ left: `${reveal}%` }}>
                  <span className={styles.handleGrip} />
                </div>
                <span className={`${styles.overlayTag} ${styles.tagLeft}`}>Antes</span>
                <span className={`${styles.overlayTag} ${styles.tagRight}`}>Depois</span>
              </div>
            )
          )}

          {(weightDelta !== null || fatDelta !== null || daysBetween !== null) && (
            <div className={styles.deltaRow}>
              {weightDelta !== null && (
                <span className={weightDelta <= 0 ? styles.deltaGood : styles.deltaBad}>
                  {weightDelta > 0 ? "+" : ""}
                  {formatNumber(weightDelta, 1)} kg
                </span>
              )}
              {fatDelta !== null && (
                <span className={fatDelta <= 0 ? styles.deltaGood : styles.deltaBad}>
                  {fatDelta > 0 ? "+" : ""}
                  {formatNumber(fatDelta, 1)} p.p. gordura
                </span>
              )}
              {daysBetween !== null && <span className={styles.deltaNeutral}>{Math.abs(daysBetween)} dias</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
