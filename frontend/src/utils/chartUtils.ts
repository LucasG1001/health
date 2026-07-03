import { addDays, todayIso } from "./dateUtils";

export type Period = "week" | "month" | "year" | "all";

export const PERIOD_LABELS: Record<Period, string> = {
  week: "Semana",
  month: "Mês",
  year: "Ano",
  all: "Tudo",
};

const PERIOD_DAYS: Record<Exclude<Period, "all">, number> = {
  week: 7,
  month: 30,
  year: 365,
};

export function periodStart(period: Period): string | null {
  if (period === "all") return null;
  return addDays(todayIso(), -PERIOD_DAYS[period]);
}

export function filterByPeriod<T extends { date: string }>(data: T[], period: Period): T[] {
  const start = periodStart(period);
  if (!start) return data;
  return data.filter((point) => point.date >= start);
}
