export interface BodyStatPoint {
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  chestCm: number | null;
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
}

export interface VolumePoint {
  period: string;
  totalVolumeKg: number;
  sessionCount: number;
}

export interface BadgeWithAward {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  awardedAt: string | null;
}

export interface RecentPr {
  id: string;
  exerciseId: string;
  exerciseName: string;
  recordType: string;
  value: number;
  previousValue: number | null;
  achievedAt: string;
}

export interface Gamification {
  currentStreak: number;
  longestStreak: number;
  trainedDates: string[];
  badges: BadgeWithAward[];
  totalPrs: number;
  recentPrs: RecentPr[];
  totalSessions: number;
}
