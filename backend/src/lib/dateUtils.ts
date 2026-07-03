export const APP_TIMEZONE = process.env.TZ || "America/Sao_Paulo";

export function todayLocalIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date());
}

export function previousDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}
