import { deletePhoto, fetchPhotos } from "../services/photoService";
import { useResource } from "./useResource";
import type { ProgressPhoto } from "../types/photo";

export function usePhotos() {
  const { data: photos, loading, error, reload, remove } = useResource<ProgressPhoto>(
    fetchPhotos,
    "Não foi possível carregar as fotos.",
    deletePhoto,
    "Não foi possível excluir a foto."
  );

  return { photos, loading, error, reload, remove };
}
