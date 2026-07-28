import { useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Modal } from "../../components/Modal/Modal";
import { NumericInput } from "../../components/NumericInput/NumericInput";
import { createMeasurement, updateMeasurement } from "../../services/measurementService";
import { todayIso } from "../../utils/dateUtils";
import { apiErrorMessage } from "../../utils/apiError";
import { numberToMask, parseMaskedNumber } from "../../utils/numberMask";
import type { Measurement } from "../../types/measurement";
import styles from "./MeasurementFormModal.module.css";

interface OutletContextValue {
  reload: () => void;
  measurements: Measurement[];
  loading: boolean;
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
  const { reload, measurements, loading } = useOutletContext<OutletContextValue>();
  const close = () => navigate("/medidas");

  // Em reload direto de /medidas/m/:id a lista do pai ainda está vazia. Sem esperar por
  // ela o formulário abria em branco e o submit criava uma medição nova em vez de editar.
  if (id) {
    const editing = measurements.find((measurement) => measurement.id === id);
    if (loading) {
      return (
        <Modal title="Editar medição" onClose={close}>
          <p className={styles.loading}>Carregando…</p>
        </Modal>
      );
    }
    if (!editing) {
      return (
        <Modal title="Editar medição" onClose={close}>
          <p className={styles.error}>Medição não encontrada.</p>
        </Modal>
      );
    }
    return <MeasurementForm editing={editing} reload={reload} close={close} />;
  }

  return <MeasurementForm editing={null} reload={reload} close={close} />;
}

interface MeasurementFormProps {
  editing: Measurement | null;
  reload: () => void;
  close: () => void;
}

function MeasurementForm({ editing, reload, close }: MeasurementFormProps) {
  const [measuredOn, setMeasuredOn] = useState(editing?.measuredOn ?? todayIso());
  const [values, setValues] = useState<Record<NumericField["key"], string>>(() => {
    const initial = {} as Record<NumericField["key"], string>;
    for (const field of FIELDS) {
      initial[field.key] = numberToMask(editing?.[field.key]);
    }
    return initial;
  });
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const payload = {
      measuredOn,
      weightKg: parseMaskedNumber(values.weightKg),
      bodyFatPct: parseMaskedNumber(values.bodyFatPct),
      waistCm: parseMaskedNumber(values.waistCm),
      hipCm: parseMaskedNumber(values.hipCm),
      armCm: parseMaskedNumber(values.armCm),
      thighCm: parseMaskedNumber(values.thighCm),
      chestCm: parseMaskedNumber(values.chestCm),
      notes: notes.trim() || null,
    };
    if (FIELDS.every((field) => payload[field.key] == null) && payload.notes === null) {
      setError("Preencha pelo menos uma medida.");
      return;
    }
    setSaving(true);
    setError(null);
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
            <NumericInput
              placeholder="—"
              value={values[field.key]}
              onChange={(masked) => setValues((prev) => ({ ...prev, [field.key]: masked }))}
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
