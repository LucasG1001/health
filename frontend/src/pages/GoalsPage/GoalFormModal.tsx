import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Modal } from "../../components/Modal/Modal";
import { NumericInput } from "../../components/NumericInput/NumericInput";
import { createGoal } from "../../services/goalService";
import { apiErrorMessage } from "../../utils/apiError";
import { parseMaskedNumber } from "../../utils/numberMask";
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

  const handleSubmit = async () => {
    const targetWeightKg = parseMaskedNumber(targetWeight);
    const targetBodyFatPct = parseMaskedNumber(targetBodyFat);
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
        <NumericInput value={targetWeight} onChange={setTargetWeight} placeholder="Ex: 78,0" />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>% de gordura alvo</span>
        <NumericInput value={targetBodyFat} onChange={setTargetBodyFat} placeholder="Ex: 15,0" />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Data prevista</span>
        <input type="date" min={todayIso()} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </label>
      <p className={styles.hint}>O progresso é calculado a partir da sua medição mais recente.</p>
    </Modal>
  );
}
