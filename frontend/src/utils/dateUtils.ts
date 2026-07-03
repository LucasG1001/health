export function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
}

export function diffDays(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86400000);
}

export function currentWeekday(): number {
  return new Date().getDay();
}
