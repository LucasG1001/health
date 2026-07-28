import { z } from "zod";
import { DATE_RE } from "../lib/validation.js";

function isRealDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Data YYYY-MM-DD que existe de fato no calendário. Só o regex deixava passar
 * "2026-02-31", que o Postgres recusava depois com um erro genérico.
 */
export function isoDate(message: string) {
  return z.string().regex(DATE_RE, message).refine(isRealDate, { message });
}

export function pastIsoDate(message: string) {
  return isoDate(message).refine((value) => value <= new Date().toISOString().slice(0, 10), {
    message,
  });
}

/** URL http(s). z.url() sozinho aceita javascript: e data:, que vão para href/src. */
export function httpUrl(message: string, max = 1000) {
  return z
    .string()
    .max(max)
    .refine((value) => {
      try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, { message });
}
