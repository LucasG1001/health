import { useCallback, useState } from "react";

/**
 * Fluxo de "pedir confirmação → excluir". Mantém o diálogo aberto quando a exclusão
 * falha, para que a mensagem de erro não desapareça junto com ele.
 */
export function useConfirmDelete(remove: (id: string) => Promise<boolean>) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const request = useCallback((id: string) => setPendingId(id), []);
  const cancel = useCallback(() => setPendingId(null), []);

  const confirm = useCallback(async () => {
    if (pendingId === null || removing) return;
    setRemoving(true);
    try {
      if (await remove(pendingId)) setPendingId(null);
    } finally {
      setRemoving(false);
    }
  }, [pendingId, remove, removing]);

  return { pendingId, removing, request, cancel, confirm };
}
