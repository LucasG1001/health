import { nextDay, previousDay, weekdayOf } from "../lib/dateUtils.js";

export interface StreakResult {
  current: number;
  longest: number;
}

const MAX_LOOKBACK_DAYS = 3660;

export function computeStreak(
  trainedDates: string[],
  scheduledWeekdays: number[],
  today: string
): StreakResult {
  if (trainedDates.length === 0) return { current: 0, longest: 0 };

  const trained = new Set(trainedDates);
  const scheduled = new Set(scheduledWeekdays.length > 0 ? scheduledWeekdays : [0, 1, 2, 3, 4, 5, 6]);
  const isScheduled = (date: string) => scheduled.has(weekdayOf(date));

  let current = 0;
  let cursor = today;
  if (isScheduled(today) && !trained.has(today)) {
    cursor = previousDay(today);
  }
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    if (isScheduled(cursor)) {
      if (!trained.has(cursor)) break;
      current += 1;
    }
    cursor = previousDay(cursor);
  }

  let longest = 0;
  let run = 0;
  const first = trainedDates.reduce((min, date) => (date < min ? date : min), trainedDates[0]!);
  for (let date = first; date <= today; date = nextDay(date)) {
    if (!isScheduled(date)) continue;
    if (trained.has(date)) {
      run += 1;
      if (run > longest) longest = run;
    } else if (date !== today) {
      run = 0;
    }
  }

  return { current, longest };
}
