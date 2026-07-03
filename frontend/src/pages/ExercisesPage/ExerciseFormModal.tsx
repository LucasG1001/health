import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Modal } from "../../components/Modal/Modal";
import { createExercise } from "../../services/exerciseService";
import { MUSCLE_GROUP_LABELS } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { MuscleGroup } from "../../types/exercise";
import styles from "./ExerciseFormModal.module.css";

interface OutletContextValue {
  reload: () => void;
}

export function ExerciseFormModal() {
  const navigate = useNavigate();
  const { reload } = useOutletContext<OutletContextValue>();
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>("chest");
  const [equipment, setEquipment] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [machineSetting, setMachineSetting] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => navigate("/treino/exercicios");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Informe o nome do exercício.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createExercise({
        name: name.trim(),
        muscleGroup,
        equipment: equipment.trim() || null,
        imageUrl: imageUrl.trim() || null,
        machineSetting: machineSetting.trim() || null,
      });
      reload();
      close();
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível criar o exercício."));
      setSaving(false);
    }
  };

  return (
    <Modal title="Novo exercício" onClose={close} onSubmit={handleSubmit} submitDisabled={saving}>
      {error && <p className={styles.error}>{error}</p>}
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Nome</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Supino reto" required />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Grupo muscular</span>
        <select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}>
          {(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map((group) => (
            <option key={group} value={group}>{MUSCLE_GROUP_LABELS[group]}</option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Equipamento</span>
        <input type="text" value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Ex: Barra, Halteres, Máquina" />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>URL de imagem/GIF (opcional)</span>
        <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Ajuste do aparelho (opcional)</span>
        <input type="text" value={machineSetting} onChange={(e) => setMachineSetting(e.target.value)} placeholder="Ex: banco no furo 4" />
      </label>
    </Modal>
  );
}
