import { addDays } from "./dateUtils";
import { formatDate, totalLoadKg } from "./format";
import type { LoadLogEntry } from "../types/loadLog";

export interface LoadChange {
  oldValue: number | null;
  newValue: number | null;
}

/** Um save: as linhas do log com o mesmo exercício e o mesmo instante. */
export interface LoadLogItem {
  key: string;
  exerciseId: string | null;
  exerciseName: string;
  thumb: Pick<LoadLogEntry, "imageUrl" | "imageFocalX" | "imageFocalY" | "imageZoom">;
  changedAt: string;
  working: LoadChange | null;
  additional: LoadChange | null;
  /** Só quando o save mudou as duas parcelas: com uma só, a outra não está no log. */
  total: LoadChange | null;
}

export interface LoadLogDay {
  day: string;
  label: string;
  items: LoadLogItem[];
}

export function localDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

function dayLabel(day: string, today: string): string {
  if (day === today) return "Hoje";
  if (day === addDays(today, -1)) return "Ontem";
  return formatDate(day);
}

/**
 * Espera as entradas do mais novo para o mais velho, como vêm da API. `today` e `dayOf`
 * entram por parâmetro para o agrupamento ser puro (render) e testável em qualquer fuso.
 */
export function groupLoadLog(
  entries: LoadLogEntry[],
  today: string,
  dayOf: (iso: string) => string = localDay
): LoadLogDay[] {
  const items: LoadLogItem[] = [];
  for (const entry of entries) {
    const key = `${entry.exerciseId ?? entry.exerciseName}@${entry.changedAt}`;
    let item = items[items.length - 1];
    if (!item || item.key !== key) {
      item = {
        key,
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        thumb: entry,
        changedAt: entry.changedAt,
        working: null,
        additional: null,
        total: null,
      };
      items.push(item);
    }
    const change = { oldValue: entry.oldValue, newValue: entry.newValue };
    if (entry.field === "workingWeightKg") item.working = change;
    else item.additional = change;
  }

  const days: LoadLogDay[] = [];
  for (const item of items) {
    if (item.working && item.additional) {
      item.total = {
        oldValue: totalLoadKg(item.working.oldValue, item.additional.oldValue),
        newValue: totalLoadKg(item.working.newValue, item.additional.newValue),
      };
    }
    const day = dayOf(item.changedAt);
    const last = days[days.length - 1];
    if (last && last.day === day) last.items.push(item);
    else days.push({ day, label: dayLabel(day, today), items: [item] });
  }
  return days;
}

export type ChangeDirection = "up" | "down" | "set" | "cleared";

export function describeChange(change: LoadChange): { direction: ChangeDirection; delta: number | null } {
  if (change.newValue === null) return { direction: "cleared", delta: null };
  if (change.oldValue === null) return { direction: "set", delta: null };
  const delta = Math.round((change.newValue - change.oldValue) * 100) / 100;
  return { direction: delta >= 0 ? "up" : "down", delta };
}
