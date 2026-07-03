export type RecordType = "max_weight" | "max_set_volume";

export interface ExerciseBest {
  exerciseId: string;
  exerciseName: string;
  bestWeightKg: number | null;
  bestSetVolumeKg: number | null;
}

export interface CurrentRecord {
  exerciseId: string;
  recordType: RecordType;
  value: number;
}

export interface DetectedPr {
  exerciseId: string;
  exerciseName: string;
  recordType: RecordType;
  value: number;
  previousValue: number | null;
  isBaseline: boolean;
}

export function detectPrs(bests: ExerciseBest[], records: CurrentRecord[]): DetectedPr[] {
  const recordMap = new Map<string, number>();
  for (const record of records) {
    recordMap.set(`${record.exerciseId}:${record.recordType}`, record.value);
  }

  const detected: DetectedPr[] = [];
  for (const best of bests) {
    const candidates: { recordType: RecordType; value: number | null }[] = [
      { recordType: "max_weight", value: best.bestWeightKg },
      { recordType: "max_set_volume", value: best.bestSetVolumeKg },
    ];
    for (const candidate of candidates) {
      if (candidate.value == null || candidate.value <= 0) continue;
      const previous = recordMap.get(`${best.exerciseId}:${candidate.recordType}`) ?? null;
      if (previous === null) {
        detected.push({
          exerciseId: best.exerciseId,
          exerciseName: best.exerciseName,
          recordType: candidate.recordType,
          value: candidate.value,
          previousValue: null,
          isBaseline: true,
        });
      } else if (candidate.value > previous) {
        detected.push({
          exerciseId: best.exerciseId,
          exerciseName: best.exerciseName,
          recordType: candidate.recordType,
          value: candidate.value,
          previousValue: previous,
          isBaseline: false,
        });
      }
    }
  }
  return detected;
}
