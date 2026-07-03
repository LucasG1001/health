import { pool } from "./connection.js";

interface BadgeSeed {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: "sessions" | "streak" | "pr" | "volume";
  threshold: number;
}

const BADGES: BadgeSeed[] = [
  { code: "first_session", name: "Primeiro treino", description: "Concluiu o primeiro treino.", icon: "play", category: "sessions", threshold: 1 },
  { code: "sessions_10", name: "10 treinos", description: "Concluiu 10 treinos.", icon: "medal", category: "sessions", threshold: 10 },
  { code: "sessions_50", name: "50 treinos", description: "Concluiu 50 treinos.", icon: "medal", category: "sessions", threshold: 50 },
  { code: "sessions_100", name: "100 treinos", description: "Concluiu 100 treinos.", icon: "trophy", category: "sessions", threshold: 100 },
  { code: "sessions_250", name: "250 treinos", description: "Concluiu 250 treinos.", icon: "trophy", category: "sessions", threshold: 250 },
  { code: "streak_7", name: "Semana em chamas", description: "Manteve 7 dias de sequência de treinos.", icon: "flame", category: "streak", threshold: 7 },
  { code: "streak_30", name: "Mês implacável", description: "Manteve 30 dias de sequência de treinos.", icon: "flame", category: "streak", threshold: 30 },
  { code: "streak_90", name: "Trimestre de ferro", description: "Manteve 90 dias de sequência de treinos.", icon: "flame", category: "streak", threshold: 90 },
  { code: "first_pr", name: "Primeiro recorde", description: "Bateu o primeiro recorde pessoal.", icon: "star", category: "pr", threshold: 1 },
  { code: "pr_10", name: "10 recordes", description: "Bateu 10 recordes pessoais.", icon: "star", category: "pr", threshold: 10 },
  { code: "pr_50", name: "50 recordes", description: "Bateu 50 recordes pessoais.", icon: "star", category: "pr", threshold: 50 },
  { code: "pr_100", name: "100 recordes", description: "Bateu 100 recordes pessoais.", icon: "crown", category: "pr", threshold: 100 },
  { code: "volume_5000", name: "5 toneladas", description: "Levantou 5.000 kg de volume em um único treino.", icon: "weight", category: "volume", threshold: 5000 },
  { code: "volume_10000", name: "10 toneladas", description: "Levantou 10.000 kg de volume em um único treino.", icon: "weight", category: "volume", threshold: 10000 },
  { code: "volume_20000", name: "20 toneladas", description: "Levantou 20.000 kg de volume em um único treino.", icon: "weight", category: "volume", threshold: 20000 },
];

export async function seedBadges(): Promise<void> {
  for (const badge of BADGES) {
    await pool.query(
      `INSERT INTO badges (code, name, description, icon, category, threshold)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO NOTHING`,
      [badge.code, badge.name, badge.description, badge.icon, badge.category, badge.threshold]
    );
  }
}
