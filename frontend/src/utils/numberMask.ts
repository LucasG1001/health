export function maskDecimalInput(raw: string, decimals = 1): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (digits === "") return "";
  const padded = digits.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, padded.length - decimals);
  const fracPart = padded.slice(padded.length - decimals);
  const intGrouped = Number(intPart).toLocaleString("pt-BR");
  return decimals > 0 ? `${intGrouped},${fracPart}` : intGrouped;
}

export function numberToMask(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function parseMaskedNumber(masked: string, decimals = 1): number | null {
  const digits = masked.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (digits === "") return null;
  const parsed = Number(digits) / 10 ** decimals;
  return Number.isNaN(parsed) ? null : parsed;
}

/** Devolvido por parseOptionalInteger quando o texto não é um inteiro válido. */
export const INVALID = Symbol("invalid");

/**
 * Campo inteiro opcional: vazio é null (limpar o valor), texto inválido é INVALID —
 * para que a tela recuse o save em vez de gravar null ou omitir o campo em silêncio.
 */
export function parseOptionalInteger(raw: string, min = 0): number | null | typeof INVALID {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return INVALID;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= min ? parsed : INVALID;
}

export function parseRequiredInteger(raw: string, min = 0): number | typeof INVALID {
  const parsed = parseOptionalInteger(raw, min);
  return parsed === null ? INVALID : parsed;
}
