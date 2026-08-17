import { DumbbellIcon } from "../Icon/icons";
import { imageFocalStyle } from "../../utils/format";
import styles from "./ExerciseThumb.module.css";

interface ThumbExercise {
  imageUrl: string | null;
  imageFocalX: number;
  imageFocalY: number;
  imageZoom: number;
}

interface ExerciseThumbProps {
  exercise: ThumbExercise;
  /** "sm" é a variante do seletor de exercícios (48px, fundo de destaque). */
  size?: "sm" | "md";
}

export function ExerciseThumb({ exercise, size = "md" }: ExerciseThumbProps) {
  const edge = size === "sm" ? 48 : 64;
  return (
    <div className={`${styles.thumb} ${size === "sm" ? styles.sm : styles.md}`}>
      {exercise.imageUrl ? (
        <img
          src={exercise.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          width={edge}
          height={edge}
          style={imageFocalStyle(exercise)}
        />
      ) : (
        <DumbbellIcon className={styles.icon} />
      )}
    </div>
  );
}
