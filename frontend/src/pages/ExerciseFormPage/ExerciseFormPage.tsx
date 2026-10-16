import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { YouTubeEmbed } from "../../components/YouTubeEmbed/YouTubeEmbed";
import { ImageFocalPicker } from "../../components/ImageFocalPicker/ImageFocalPicker";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { ErrorBanner } from "../../components/ErrorBanner/ErrorBanner";
import { Loading } from "../../components/Loading/Loading";
import { DumbbellIcon, TrashIcon } from "../../components/Icon/icons";
import {
  createExercise,
  deleteExercise,
  fetchExercise,
  updateExercise,
  uploadExerciseImage,
} from "../../services/exerciseService";
import { MUSCLE_GROUP_LABELS } from "../../utils/format";
import { parseYouTubeId } from "../../utils/youtube";
import { apiErrorMessage } from "../../utils/apiError";
import { compressImage } from "../../utils/imageCompress";
import type { Exercise, MuscleGroup } from "../../types/exercise";
import styles from "./ExerciseFormPage.module.css";

export function ExerciseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchExercise(id)
      .then((data) => {
        if (active) setExercise(data);
      })
      .catch((err) => {
        if (active) setLoadError(apiErrorMessage(err, "Não foi possível carregar o exercício."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);

  const retry = () => {
    setLoadError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  const confirmDelete = async () => {
    if (!id || removing) return;
    setRemoving(true);
    try {
      await deleteExercise(id);
      navigate("/treino/exercicios");
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "Não foi possível excluir o exercício."));
      setDeleting(false);
      setRemoving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={id ? "Editar exercício" : "Novo exercício"}
        backTo="/treino/exercicios"
        actions={
          id && exercise ? (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => setDeleting(true)}
              aria-label="Excluir exercício"
            >
              <TrashIcon className={styles.deleteIcon} />
            </button>
          ) : undefined
        }
      />

      {deleteError && <div className={styles.error}>{deleteError}</div>}
      {loadError && <ErrorBanner message={loadError} onRetry={retry} />}
      {loading && <Loading />}

      {/* Em edição o formulário só existe com o exercício carregado: com os defaults, salvar
          apagaria equipamento, vídeo e instruções e trocaria o grupo muscular no servidor. */}
      {!id && <ExerciseForm exercise={null} />}
      {id && !loading && exercise && <ExerciseForm key={exercise.id} exercise={exercise} />}

      {deleting && id && (
        <ConfirmDialog
          title="Excluir exercício"
          message="O exercício sai do seu catálogo e dos treinos em que aparece."
          confirmLabel="Excluir"
          danger
          busy={removing}
          onCancel={() => setDeleting(false)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function ExerciseForm({ exercise }: { exercise: Exercise | null }) {
  const navigate = useNavigate();
  const isEdit = exercise !== null;

  const [name, setName] = useState(exercise?.name ?? "");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(exercise?.muscleGroup ?? "chest");
  const [equipment, setEquipment] = useState(exercise?.equipment ?? "");
  const [machineSetting, setMachineSetting] = useState(exercise?.machineSetting ?? "");
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl ?? "");
  const [instructions, setInstructions] = useState(exercise?.notes ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(exercise?.imageUrl ?? null);
  const [focalX, setFocalX] = useState(exercise?.imageFocalX ?? 50);
  const [focalY, setFocalY] = useState(exercise?.imageFocalY ?? 50);
  const [zoom, setZoom] = useState(exercise?.imageZoom ?? 1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewRef = useRef<string | null>(null);
  const createdIdRef = useRef<string | null>(null);

  const pickSeq = useRef(0);

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    // Duas escolhas seguidas: a compressão da primeira pode terminar depois da segunda e
    // trocar a imagem escolhida pela anterior.
    const seq = ++pickSeq.current;
    const reduced = await compressImage(file);
    if (seq !== pickSeq.current) return;
    setImageFile(reduced);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const next = URL.createObjectURL(reduced);
    previewRef.current = next;
    setPreviewUrl(next);
    setFocalX(50);
    setFocalY(50);
    setZoom(1);
  };

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Informe o nome do exercício.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      muscleGroup,
      equipment: equipment.trim() || null,
      machineSetting: machineSetting.trim() || null,
      videoUrl: videoUrl.trim() || null,
      notes: instructions.trim() || null,
      imageFocalX: focalX,
      imageFocalY: focalY,
      imageZoom: zoom,
    };
    let savedId = createdIdRef.current;
    try {
      if (savedId === null) {
        const saved = isEdit ? await updateExercise(exercise.id, payload) : await createExercise(payload);
        savedId = saved.id;
        // O exercício já existe: sem guardar o id, uma falha no upload da imagem fazia
        // o próximo "Cadastrar" criar uma segunda cópia.
        if (!isEdit) createdIdRef.current = saved.id;
      } else {
        await updateExercise(savedId, payload);
      }
      if (imageFile) {
        await uploadExerciseImage(savedId, imageFile);
      }
      navigate("/treino/exercicios");
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar o exercício."));
      setSaving(false);
    }
  };

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      {previewUrl ? (
        <div className={styles.imageEditor}>
          <ImageFocalPicker
            src={previewUrl}
            focalX={focalX}
            focalY={focalY}
            zoom={zoom}
            onChange={(v) => {
              setFocalX(v.focalX);
              setFocalY(v.focalY);
              setZoom(v.zoom);
            }}
          />
          <label className={styles.changeImage}>
            Trocar imagem
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      ) : (
        <label className={styles.imageCard}>
          <span className={styles.imagePlaceholder}>
            <DumbbellIcon className={styles.placeholderIcon} />
            Toque para adicionar imagem
          </span>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
          />
        </label>
      )}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Nome</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Supino reto com barra"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Grupo muscular</span>
        <select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}>
          {(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map((group) => (
            <option key={group} value={group}>
              {MUSCLE_GROUP_LABELS[group]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Equipamento</span>
        <input
          type="text"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          placeholder="Ex: Barra, Halteres, Máquina"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Ajuste do aparelho</span>
        <input
          type="text"
          value={machineSetting}
          onChange={(e) => setMachineSetting(e.target.value)}
          placeholder="Ex: banco no furo 4, encosto 45°"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Vídeo (link do YouTube)</span>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtu.be/…"
        />
      </label>

      {videoUrl.trim() !== "" && parseYouTubeId(videoUrl) && (
        <YouTubeEmbed url={videoUrl} title={name || "Prévia do vídeo"} />
      )}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Como executar</span>
        <textarea
          className={styles.textarea}
          rows={5}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Descreva a execução correta, dicas de postura, respiração…"
        />
      </label>

      <button type="button" className={styles.saveButton} onClick={handleSave} disabled={saving}>
        {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar exercício"}
      </button>
    </>
  );
}
