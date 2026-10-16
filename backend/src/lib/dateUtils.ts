export const APP_TIMEZONE = process.env.TZ || "America/Sao_Paulo";

export function todayLocalIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date());
}
