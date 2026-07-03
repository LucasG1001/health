import { useCallback, useEffect, useState } from "react";
import { deletePhoto, fetchPhotos } from "../services/photoService";
import type { ProgressPhoto } from "../types/photo";

export function usePhotos() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchPhotos()
      .then((data) => {
        if (active) setPhotos(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as fotos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const reload = useCallback(() => {
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const remove = useCallback(async (id: string) => {
    await deletePhoto(id);
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  }, []);

  return { photos, loading, error, reload, remove };
}
