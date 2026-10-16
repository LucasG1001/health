import type { Split } from "../types/split";

/**
 * Aplica a divisão devolvida por um save sem desfazer checks que ainda estão em voo: a
 * resposta de um save de plano pode ter sido montada antes do INSERT do check e viria com
 * o exercício desmarcado. A chave é exerciseId porque os ids de split_exercises mudam a
 * cada reordenação.
 */
export function applyServerSplit(server: Split, pendingChecks: ReadonlyMap<string, boolean>): Split {
  if (pendingChecks.size === 0) return server;
  return {
    ...server,
    exercises: server.exercises.map((exercise) => {
      const pending = pendingChecks.get(exercise.exerciseId);
      return pending === undefined || pending === exercise.checkedToday
        ? exercise
        : { ...exercise, checkedToday: pending };
    }),
  };
}
