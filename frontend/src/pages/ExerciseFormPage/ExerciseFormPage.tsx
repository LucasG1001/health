import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { YouTubeEmbed } from "../../components/YouTubeEmbed/YouTubeEmbed";
import { DumbbellIcon } from "../../components/Icon/icons";
import {
  createExercise,
  fetchExercise,
  updateExercise,
  uploadExerciseImage,
} from "../../services/exerciseService";
import { MUSCLE_GROUP_LABELS } from "../../utils/format";
import { parseYouTubeId } from "../../utils/youtube";
import { apiErrorMessage } from "../../utils/apiError";
import type { MuscleGroup } from "../../types/exercise";
import styles from "./ExerciseFormPage.module.css";

export function ExerciseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>("chest");
  const [equipment, setEquipment] = useState("");
  const [machineSetting, setMachineSetting] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchExercise(id)
      .then((exercise) => {
        if (!active) return;
        setName(exercise.name);
        setMuscleGroup(exercise.muscleGroup);
        setEquipment(exercise.equipment ?? "");
        setMachineSetting(exercise.machineSetting ?? "");
        setVideoUrl(exercise.videoUrl ?? "");
        setInstructions(exercise.notes ?? "");
        setPreviewUrl(exercise.imageUrl);
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err, "Não foi possível carregar o exercício."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const onPickImage = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

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
    };
    try {
      const saved = isEdit
        ? await updateExercise(id!, payload)
        : await createExercise(payload);
      if (imageFile) {
        await uploadExerciseImage(saved.id, imageFile);
      }
      navigate("/treino/exercicios");
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar o exercício."));
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title={isEdit ? "Editar exercício" : "Novo exercício"} backTo="/treino/exercicios" />

      {error && <div className={styles.error}>{error}</div>}
      {loading ? (
        <p className={styles.loading}>Carregando…</p>
      ) : (
        <>
          <label className={styles.imageCard}>
            {previewUrl ? (
              <img src={previewUrl} alt="" />
            ) : (
              <span className={styles.imagePlaceholder}>
                <DumbbellIcon className={styles.placeholderIcon} />
                Toque para adicionar imagem
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
            />
          </label>

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
      )}
    </div>
  );
}
