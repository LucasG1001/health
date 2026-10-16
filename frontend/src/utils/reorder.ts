export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/** Índice da primeira linha cuja metade de cima ainda está abaixo do ponteiro; senão, a última. */
export function targetIndexFor(y: number, rects: ({ top: number; height: number } | undefined)[]): number {
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    if (rect && y < rect.top + rect.height / 2) return i;
  }
  return rects.length - 1;
}

export function sameOrder(a: { id: string }[], b: { id: string }[]): boolean {
  return a.length === b.length && a.every((item, index) => item.id === b[index]!.id);
}
