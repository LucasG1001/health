import { useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { CameraIcon, CompareIcon, PlusIcon, TrashIcon } from "../../components/Icon/icons";
import { usePhotos } from "../../hooks/usePhotos";
import { POSE_LABELS, formatDate } from "../../utils/format";
import type { ProgressPhoto } from "../../types/photo";
import styles from "./PhotosPage.module.css";

export function PhotosPage() {
  const navigate = useNavigate();
  const { photos, loading, error, reload, remove } = usePhotos();
  const [deleting, setDeleting] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byDate = new Map<string, ProgressPhoto[]>();
    for (const photo of photos) {
      const group = byDate.get(photo.takenOn) ?? [];
      group.push(photo);
      byDate.set(photo.takenOn, group);
    }
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [photos]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Fotos de progresso"
        backTo="/medidas"
        actions={
          <>
            {photos.length > 1 && (
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => navigate("/medidas/fotos/comparar")}
              >
                <CompareIcon className={styles.buttonIcon} />
                Comparar
              </button>
            )}
            <button type="button" className={styles.primaryButton} onClick={() => navigate("/medidas/fotos/nova")}>
              <PlusIcon className={styles.buttonIcon} />
              Foto
            </button>
          </>
        }
      />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {!loading && photos.length === 0 && !error && (
        <EmptyState
          icon={<CameraIcon />}
          title="Nenhuma foto ainda"
          description="Tire fotos de frente, lado e costas para acompanhar sua evolução visual."
          action={
            <button type="button" className={styles.primaryButton} onClick={() => navigate("/medidas/fotos/nova")}>
              Adicionar primeira foto
            </button>
          }
        />
      )}

      <div className={styles.groups}>
        {groups.map(([date, groupPhotos]) => (
          <section key={date} className={styles.group}>
            <h2 className={styles.groupDate}>{formatDate(date)}</h2>
            <div className={styles.photoRow}>
              {groupPhotos.map((photo) => (
                <figure key={photo.id} className={styles.photoCard}>
                  <img src={photo.url} alt={`${POSE_LABELS[photo.pose]} em ${formatDate(photo.takenOn)}`} loading="lazy" />
                  <figcaption className={styles.caption}>
                    <span>{POSE_LABELS[photo.pose]}</span>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => setDeleting(photo.id)}
                      aria-label="Excluir foto"
                    >
                      <TrashIcon className={styles.deleteIcon} />
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>

      {deleting && (
        <ConfirmDialog
          title="Excluir foto"
          message="A foto será removida permanentemente."
          confirmLabel="Excluir"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await remove(deleting);
            setDeleting(null);
          }}
        />
      )}

      <Outlet context={{ reload }} />
    </div>
  );
}
