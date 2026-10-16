export type LoadField = "working_weight_kg" | "additional_weight_kg";

export interface LoadLogRow {
  id: string;
  exercise_id: string | null;
  exercise_name: string;
  field: LoadField;
  old_value: number | null;
  new_value: number | null;
  changed_at: Date;
  image_path: string | null;
  image_url: string | null;
  image_focal_x: number | null;
  image_focal_y: number | null;
  image_zoom: number | null;
}

export interface LoadLogEntry {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  imageUrl: string | null;
  imageFocalX: number;
  imageFocalY: number;
  imageZoom: number;
  field: "workingWeightKg" | "additionalWeightKg";
  oldValue: number | null;
  newValue: number | null;
  changedAt: Date;
}
