import { asyncHandler } from "../lib/asyncHandler.js";
import { respondValidationError } from "../lib/validation.js";
import { calcAge, deriveBodyMetrics } from "../lib/calculations.js";
import { profileUpdateSchema } from "../schemas/profile.js";
import * as profileModel from "../models/profileModel.js";
import * as measurementModel from "../models/measurementModel.js";
import type { ActivityLevel, BiologicalSex, BloodType, Profile, ProfileRow } from "../types/profile.js";

type LatestWithWeight = Awaited<ReturnType<typeof measurementModel.findLatestWithWeight>>;

function toProfile(row: ProfileRow | null, latest: LatestWithWeight): Profile {
  const weightKg = latest?.weight_kg ?? null;
  const derived = deriveBodyMetrics({
    weightKg,
    heightCm: row?.height_cm ?? null,
    birthDate: row?.birth_date ?? null,
    biologicalSex: (row?.biological_sex as BiologicalSex | null) ?? null,
    activityLevel: (row?.activity_level as ActivityLevel | null) ?? null,
  });

  return {
    heightCm: row?.height_cm ?? null,
    bloodType: (row?.blood_type as BloodType | null) ?? null,
    birthDate: row?.birth_date ?? null,
    biologicalSex: (row?.biological_sex as BiologicalSex | null) ?? null,
    activityLevel: (row?.activity_level as ActivityLevel | null) ?? null,
    allergies: row?.allergies ?? null,
    medicalConditions: row?.medical_conditions ?? null,
    medications: row?.medications ?? null,
    injuries: row?.injuries ?? null,
    age: row?.birth_date ? calcAge(row.birth_date) : null,
    bmi: derived.bmi,
    bmr: derived.bmr,
    tdee: derived.tdee,
    latestWeightKg: weightKg,
    updatedAt: row?.updated_at ?? null,
  };
}

export const get = asyncHandler("Erro ao buscar o perfil.", async (_req, res) => {
  const [row, latest] = await Promise.all([
    profileModel.get(),
    measurementModel.findLatestWithWeight(),
  ]);
  res.json(toProfile(row, latest));
});

export const update = asyncHandler("Erro ao salvar o perfil.", async (req, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const [row, latest] = await Promise.all([
    profileModel.upsert(parsed.data),
    measurementModel.findLatestWithWeight(),
  ]);
  res.json(toProfile(row, latest));
});
