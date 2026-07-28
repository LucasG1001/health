import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Modal } from "../../components/Modal/Modal";
import { PoseSelector } from "../../components/PoseSelector/PoseSelector";
import { uploadPhoto } from "../../services/photoService";
import { apiErrorMessage } from "../../utils/apiError";
import { todayIso } from "../../utils/dateUtils";
import type { PhotoPose } from "../../types/photo";
import styles from "./PhotoUploadModal.module.css";

interface OutletContextValue {
  reload: () => void;
}

export function PhotoUploadModal() {
  const navigate = useNavigate();
  const { reload } = useOutletContext<OutletContextValue>();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [takenOn, setTakenOn] = useState(todayIso());
  const [pose, setPose] = useState<PhotoPose>("front");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => navigate("/medidas/fotos");

  const previewRef = useRef<string | null>(null);

  const handleFile = (selected: File | null) => {
    setFile(selected);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const next = selected ? URL.createObjectURL(selected) : null;
    previewRef.current = next;
    setPreview(next);
  };

  // Sem isto o último blob ficava vazado ao fechar o modal.
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const handleSubmit = async () => {
    if (!file) {
      setError("Selecione ou tire uma foto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await uploadPhoto({ file, takenOn, pose });
      reload();
      close();
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível enviar a foto."));
      setSaving(false);
    }
  };

  return (
    <Modal title="Nova foto" onClose={close} onSubmit={handleSubmit} submitDisabled={saving || !file} submitLabel={saving ? "Enviando…" : "Salvar"}>
      {error && <p className={styles.error}>{error}</p>}

      <label className={styles.fileInput}>
        {preview ? (
          <img src={preview} alt="Pré-visualização" className={styles.preview} />
        ) : (
          <span className={styles.filePlaceholder}>Toque para tirar ou escolher a foto</span>
        )}
        {/* Sem `capture`: com ele o Android abre a câmera direto e o rótulo promete
            "ou escolher", o que ficava impossível. */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          hidden
        />
      </label>

      <PoseSelector value={pose} onChange={setPose} />

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Data</span>
        <input type="date" value={takenOn} max={todayIso()} onChange={(e) => setTakenOn(e.target.value)} required />
      </label>
    </Modal>
  );
}
