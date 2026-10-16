import { DomainError } from "../models/errors.js";

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_NOT_NULL_VIOLATION = "23502";
export const PG_CHECK_VIOLATION = "23514";
export const PG_INVALID_TEXT_REPRESENTATION = "22P02";
export const PG_INVALID_DATETIME_FORMAT = "22007";
export const PG_DATETIME_FIELD_OVERFLOW = "22008";

export function pgErrorCode(error: unknown): string | null {
  if (error instanceof Error && "code" in error && typeof error.code === "string") return error.code;
  return null;
}

export function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === PG_UNIQUE_VIOLATION;
}

const TRANSLATED: Record<string, { message: string; status: number }> = {
  [PG_FOREIGN_KEY_VIOLATION]: { message: "Registro relacionado não encontrado.", status: 400 },
  [PG_NOT_NULL_VIOLATION]: { message: "Campo obrigatório não informado.", status: 400 },
  [PG_CHECK_VIOLATION]: { message: "Valores inválidos para este registro.", status: 400 },
  [PG_INVALID_TEXT_REPRESENTATION]: { message: "Valor em formato inválido.", status: 400 },
  [PG_INVALID_DATETIME_FORMAT]: { message: "Data inválida.", status: 400 },
  [PG_DATETIME_FIELD_OVERFLOW]: { message: "Data inválida.", status: 400 },
};

// Nomes gerados pelo Postgres para as constraints sem nome explícito do migrate.ts.
const BY_CONSTRAINT: Record<string, string> = {
  split_exercises_exercise_id_fkey: "Exercício não encontrado.",
  goals_check: "Defina um peso alvo e/ou um % de gordura alvo.",
};

function constraintOf(error: unknown): string | null {
  if (error instanceof Error && "constraint" in error && typeof error.constraint === "string") {
    return error.constraint;
  }
  return null;
}

/**
 * Traduz erros do Postgres que representam entrada inválida em respostas 4xx.
 * Sem isso um UUID malformado, uma data inexistente ou uma violação de CHECK viravam
 * 500 opacos, indistinguíveis de banco fora do ar.
 */
export function toDomainError(error: unknown): DomainError | null {
  const code = pgErrorCode(error);
  if (code === null) return null;
  const translated = TRANSLATED[code];
  if (!translated) return null;
  const constraint = constraintOf(error);
  const message = (constraint && BY_CONSTRAINT[constraint]) || translated.message;
  return new DomainError(message, translated.status);
}
