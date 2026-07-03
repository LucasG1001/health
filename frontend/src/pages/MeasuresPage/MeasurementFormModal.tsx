import { useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Modal } from "../../components/Modal/Modal";
import { createMeasurement, updateMeasurement } from "../../services/measurementService";
import { todayIso } from "../../utils/dateUtils";
import { apiErrorMessage } from "../../utils/apiError";
import type { Measurement } from "../../types/measurement";
import styles from "./MeasurementFormModal.module.css";

interface OutletContextValue {
  reload: () => void;
  measurements: Measurement[];
}

interface NumericField {
  key: "weightKg" | "bodyFatPct" | "waistCm" | "hipCm" | "armCm" | "thighCm" | "chestCm";
  label: string;
  unit: string;
}

const FIELDS: NumericField[] = [
  { key: "weightKg", label: "Peso", unit: "kg" },
  { key: "bodyFatPct", label: "% Gordura", unit: "%" },
  { key: "waistCm", label: "Cintura", unit: "cm" },
  { key: "hipCm", label: "Quadril", unit: "cm" },
  { key: "armCm", label: "Braço", unit: "cm" },
  { key: "thighCm", label: "Coxa", unit: "cm" },
  { key: "chestCm", label: "Peito", unit: "cm" },
];

export function MeasurementFormModal() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { reload, measurements } = useOutletContext<OutletContextValue>();
  const editing = id ? measurements.find((m) => m.id === id) : undefined;

  const [measuredOn, setMeasuredOn] = useState(editing?.measuredOn ?? todayIso());
  const [values, setValues] = useState<Record<NumericField["key"], string>>(() => {
    const initial = {} as Record<NumericField["key"], string>;
    for (const field of FIELDS) {
      const current = editing?.[field.key];
      initial[field.key] = current != null ? String(current).replace(".", ",") : "";
    }
    return initial;
  });
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => navigate("/medidas");

  const parseField = (raw: string): number | null => {
    if (raw.trim() === "") return null;
    const parsed = Number(raw.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      measuredOn,
      weightKg: parseField(values.weightKg),
      bodyFatPct: parseField(values.bodyFatPct),
      waistCm: parseField(values.waistCm),
      hipCm: parseField(values.hipCm),
      armCm: parseField(values.armCm),
      thighCm: parseField(values.thighCm),
      chestCm: parseField(values.chestCm),
      notes: notes.trim() || null,
    };
    try {
      if (editing) {
        await updateMeasurement(editing.id, payload);
      } else {
        await createMeasurement(payload);
      }
      reload();
      close();
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar a medição."));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? "Editar medição" : "Nova medição"}
      onClose={close}
      onSubmit={handleSubmit}
      submitDisabled={saving}
    >
      {error && <p className={styles.error}>{error}</p>}
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Data</span>
        <input type="date" value={measuredOn} max={todayIso()} onChange={(e) => setMeasuredOn(e.target.value)} required />
      </label>
      <div className={styles.grid}>
        {FIELDS.map((field) => (
          <label key={field.key} className={styles.field}>
            <span className={styles.fieldLabel}>
              {field.label} {field.unit && <em className={styles.unit}>({field.unit})</em>}
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="—"
              value={values[field.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Anotações</span>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </label>
    </Modal>
  );
}
