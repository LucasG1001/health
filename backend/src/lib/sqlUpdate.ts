export function buildUpdateSet<T extends object>(
  patch: T,
  columnMap: Record<keyof T, string>
): { sets: string[]; values: unknown[]; nextIndex: number } {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  for (const [key, column] of Object.entries(columnMap) as [keyof T, string][]) {
    const value = patch[key];
    if (value !== undefined) {
      sets.push(`${column} = $${i++}`);
      values.push(value);
    }
  }

  return { sets, values, nextIndex: i };
}
