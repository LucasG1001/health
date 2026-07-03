import type { MuscleGroup } from "../types/exercise";
import type { SetVariation } from "../types/split";
import type { ActivityLevel, BloodType } from "../types/profile";
import type { WeighInFrequency } from "../types/settings";

export function formatKg(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}

export function formatCm(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm`;
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

export function formatKcal(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kcal`;
}

export function formatClock(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  return `${minutes}min`;
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Peito",
  back: "Costas",
  shoulders: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebraço",
  quads: "Quadríceps",
  hamstrings: "Posterior",
  glutes: "Glúteos",
  calves: "Panturrilha",
  abs: "Abdômen",
  other: "Outro",
};

export const VARIATION_LABELS: Record<SetVariation, string> = {
  normal: "Normal",
  drop_set: "Drop set",
  bi_set: "Bi-set",
  superset: "Superset",
  rest_pause: "Rest-pause",
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentário",
  light: "Leve (1-3x/semana)",
  moderate: "Moderado (3-5x/semana)",
  intense: "Intenso (6-7x/semana)",
  athlete: "Atleta (2x/dia)",
};

export const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const FREQUENCY_LABELS: Record<WeighInFrequency, string> = {
  daily: "Diária",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  off: "Desativado",
};

export const FREQUENCY_DAYS: Record<WeighInFrequency, number | null> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  off: null,
};

export function bmiLabel(bmi: number | null | undefined): string {
  if (bmi == null) return "";
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Peso normal";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 35) return "Obesidade I";
  if (bmi < 40) return "Obesidade II";
  return "Obesidade III";
}

export function repsTarget(min: number | null, max: number | null): string {
  if (min == null) return "—";
  if (max != null && max !== min) return `${min}-${max}`;
  return String(min);
}
