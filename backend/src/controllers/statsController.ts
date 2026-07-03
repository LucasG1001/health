import { asyncHandler } from "../lib/asyncHandler.js";
import { parseDateRange } from "../lib/validation.js";
import { deriveBodyMetrics } from "../lib/calculations.js";
import { APP_TIMEZONE, todayLocalIso } from "../lib/dateUtils.js";
import { computeStreak } from "../services/streakService.js";
import * as measurementModel from "../models/measurementModel.js";
import * as profileModel from "../models/profileModel.js";
import * as sessionModel from "../models/sessionModel.js";
import * as splitModel from "../models/splitModel.js";
import * as statsModel from "../models/statsModel.js";
import type { ActivityLevel, BiologicalSex } from "../types/profile.js";

export const body = asyncHandler("Erro ao buscar a evolução corporal.", async (req, res) => {
  const { from, to } = parseDateRange(req);
  const [rows, profile] = await Promise.all([measurementModel.findAll(from, to), profileModel.get()]);

  res.json(
    rows.map((row) => {
      const derived = deriveBodyMetrics({
        weightKg: row.weight_kg,
        heightCm: profile?.height_cm ?? null,
        birthDate: profile?.birth_date ?? null,
        biologicalSex: (profile?.biological_sex as BiologicalSex | null) ?? null,
        activityLevel: (profile?.activity_level as ActivityLevel | null) ?? null,
      });
      return {
        date: row.measured_on,
        weightKg: row.weight_kg,
        bodyFatPct: row.body_fat_pct,
        waistCm: row.waist_cm,
        hipCm: row.hip_cm,
        armCm: row.arm_cm,
        thighCm: row.thigh_cm,
        chestCm: row.chest_cm,
        bmi: derived.bmi,
        bmr: derived.bmr,
        tdee: derived.tdee,
      };
    })
  );
});

export const volume = asyncHandler("Erro ao buscar o volume de treino.", async (req, res) => {
  const groupBy = req.query.groupBy === "month" ? "month" : "week";
  res.json(await statsModel.volumeByPeriod(groupBy));
});

export const gamification = asyncHandler("Erro ao buscar as conquistas.", async (_req, res) => {
  const [trainedDates, weekdays, badges, totalPrs, recentPrs, totalSessions] = await Promise.all([
    sessionModel.trainedDates(APP_TIMEZONE),
    splitModel.scheduledWeekdays(),
    statsModel.allBadges(),
    statsModel.totalRealPrs(),
    statsModel.recentPrs(10),
    statsModel.totalCompletedSessions(),
  ]);
  const streak = computeStreak(trainedDates, weekdays, todayLocalIso());

  res.json({
    currentStreak: streak.current,
    longestStreak: streak.longest,
    trainedDates,
    badges,
    totalPrs,
    recentPrs,
    totalSessions,
  });
});
