import type { ActivityLevel, BiologicalSex } from "../types/profile.js";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  intense: 1.725,
  athlete: 1.9,
};

export function calcAge(birthDate: string, today: Date = new Date()): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  let age = today.getFullYear() - (year ?? 0);
  const beforeBirthday =
    today.getMonth() + 1 < (month ?? 1) ||
    (today.getMonth() + 1 === (month ?? 1) && today.getDate() < (day ?? 1));
  if (beforeBirthday) age -= 1;
  return age;
}

export function calcBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return round1(weightKg / (heightM * heightM));
}

export function calcBmr(weightKg: number, heightCm: number, age: number, sex: BiologicalSex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

export function calcTdee(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);
}

export function calcEpley1Rm(weightKg: number, reps: number): number {
  if (reps <= 1) return round1(weightKg);
  return round1(weightKg * (1 + reps / 30));
}

export function calcProgressPct(start: number, current: number, target: number): number {
  if (start === target) return current === target ? 100 : 0;
  const pct = ((start - current) / (start - target)) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface BodyDerived {
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
}

export function deriveBodyMetrics(params: {
  weightKg: number | null;
  heightCm: number | null;
  birthDate: string | null;
  biologicalSex: BiologicalSex | null;
  activityLevel: ActivityLevel | null;
}): BodyDerived {
  const { weightKg, heightCm, birthDate, biologicalSex, activityLevel } = params;
  const bmi = weightKg && heightCm ? calcBmi(weightKg, heightCm) : null;
  const bmr =
    weightKg && heightCm && birthDate && biologicalSex
      ? calcBmr(weightKg, heightCm, calcAge(birthDate), biologicalSex)
      : null;
  const tdee = bmr && activityLevel ? calcTdee(bmr, activityLevel) : null;
  return { bmi, bmr, tdee };
}
