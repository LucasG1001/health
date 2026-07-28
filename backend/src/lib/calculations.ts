import { todayLocalIso } from "./dateUtils.js";
import type { ActivityLevel, BiologicalSex } from "../types/profile.js";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  intense: 1.725,
  athlete: 1.9,
};

/** `onIso` em YYYY-MM-DD; o padrão é hoje no fuso da aplicação, não no do processo. */
export function calcAge(birthDate: string, onIso: string = todayLocalIso()): number {
  const [birthYear = 0, birthMonth = 1, birthDay = 1] = birthDate.split("-").map(Number);
  const [year = 0, month = 1, day = 1] = onIso.split("-").map(Number);
  let age = year - birthYear;
  const beforeBirthday = month < birthMonth || (month === birthMonth && day < birthDay);
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
  /** Data da medição (YYYY-MM-DD): a idade usada é a da época, não a de hoje. */
  onIso?: string;
}): BodyDerived {
  const { weightKg, heightCm, birthDate, biologicalSex, activityLevel, onIso } = params;
  const bmi = weightKg != null && heightCm != null && heightCm > 0 ? calcBmi(weightKg, heightCm) : null;
  const bmr =
    weightKg != null && heightCm != null && birthDate != null && biologicalSex != null
      ? calcBmr(weightKg, heightCm, calcAge(birthDate, onIso), biologicalSex)
      : null;
  const tdee = bmr != null && activityLevel != null ? calcTdee(bmr, activityLevel) : null;
  return { bmi, bmr, tdee };
}
