import type { Measurement } from "../types/measurement";

/**
 * As `n` medições mais recentes que têm o campo preenchido, da mais nova para a mais velha.
 * Uma medição só de cintura não pode zerar o card de peso nem o lembrete de pesagem.
 * Espera a lista em ordem crescente de data, como vem da API.
 */
export function lastWith<K extends keyof Measurement>(
  measurements: Measurement[],
  key: K,
  n = 1
): Measurement[] {
  const found: Measurement[] = [];
  for (let i = measurements.length - 1; i >= 0 && found.length < n; i--) {
    if (measurements[i]![key] != null) found.push(measurements[i]!);
  }
  return found;
}
