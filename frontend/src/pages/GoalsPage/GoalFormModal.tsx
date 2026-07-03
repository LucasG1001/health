import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Modal } from "../../components/Modal/Modal";
import { createGoal } from "../../services/goalService";
import { apiErrorMessage } from "../../utils/apiError";
import { todayIso } from "../../utils/dateUtils";
import styles from "./GoalFormModal.module.css";

interface OutletContextValue {
  reload: () => void;
}

export function GoalFormModal() {
  const navigate = useNavigate();
  const { reload } = useOutletContext<OutletContextValue>();
  const [targetWeight, setTargetWeight] = useState("");
  const [targetBodyFat, setTargetBodyFat] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => navigate("/medidas/metas");

  const parse = (raw: string): number | null => {
    if (raw.trim() === "") return null;
    const parsed = Number(raw.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSubmit = async () => {
    const targetWeightKg = parse(targetWeight);
    const targetBodyFatPct = parse(targetBodyFat);
    if (targetWeightKg == null && targetBodyFatPct == null) {
      setError("Defina um peso alvo e/ou um % de gordura alvo.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createGoal({ targetWeightKg, targetBodyFatPct, targetDate: targetDate || null });
      reload();
      close();
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível criar a meta."));
      setSaving(false);
    }
  };

  return (
    <Modal title="Nova meta" onClose={close} onSubmit={handleSubmit} submitDisabled={saving}>
      {error && <p className={styles.error}>{error}</p>}
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Peso alvo (kg)</span>
        <input type="text" inputMode="decimal" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="Ex: 78" />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>% de gordura alvo</span>
        <input type="text" inputMode="decimal" value={targetBodyFat} onChange={(e) => setTargetBodyFat(e.target.value)} placeholder="Ex: 15" />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Data prevista</span>
        <input type="date" min={todayIso()} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </label>
      <p className={styles.hint}>O progresso é calculado a partir da sua medição mais recente.</p>
    </Modal>
  );
}
