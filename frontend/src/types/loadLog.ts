export type LoadLogField = "workingWeightKg" | "additionalWeightKg";

export interface LoadLogEntry {
  id: string;
  /** null quando o exercício foi excluído; o nome fica guardado no log. */
  exerciseId: string | null;
  exerciseName: string;
  imageUrl: string | null;
  imageFocalX: number;
  imageFocalY: number;
  imageZoom: number;
  field: LoadLogField;
  oldValue: number | null;
  newValue: number | null;
  changedAt: string;
}
