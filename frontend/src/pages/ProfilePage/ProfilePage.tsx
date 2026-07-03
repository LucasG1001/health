import { useEffect, useState } from "react";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { useProfile } from "../../hooks/useProfile";
import { ACTIVITY_LABELS, BLOOD_TYPES, formatKcal, formatNumber } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { ActivityLevel, BiologicalSex, BloodType } from "../../types/profile";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { profile, loading, error, save } = useProfile();

  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | "">("");
  const [bloodType, setBloodType] = useState<BloodType | "">("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">("");
  const [allergies, setAllergies] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [injuries, setInjuries] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setHeightCm(profile.heightCm != null ? String(profile.heightCm).replace(".", ",") : "");
    setBirthDate(profile.birthDate ?? "");
    setBiologicalSex(profile.biologicalSex ?? "");
    setBloodType(profile.bloodType ?? "");
    setActivityLevel(profile.activityLevel ?? "");
    setAllergies(profile.allergies ?? "");
    setMedicalConditions(profile.medicalConditions ?? "");
    setMedications(profile.medications ?? "");
    setInjuries(profile.injuries ?? "");
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setSaveError(null);
    try {
      const heightParsed = heightCm.trim() === "" ? null : Number(heightCm.replace(",", "."));
      await save({
        heightCm: heightParsed != null && !Number.isNaN(heightParsed) ? heightParsed : null,
        birthDate: birthDate || null,
        biologicalSex: biologicalSex || null,
        bloodType: bloodType || null,
        activityLevel: activityLevel || null,
        allergies: allergies.trim() || null,
        medicalConditions: medicalConditions.trim() || null,
        medications: medications.trim() || null,
        injuries: injuries.trim() || null,
      });
      setFeedback("Perfil salvo.");
    } catch (err) {
      setSaveError(apiErrorMessage(err, "Não foi possível salvar o perfil."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Perfil" backTo="/medidas" />

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Carregando…</p>}

      {!loading && (
        <form className={styles.form} onSubmit={handleSubmit}>
          {(profile?.bmi != null || profile?.bmr != null) && (
            <div className={styles.derived}>
              {profile.age != null && <span>{profile.age} anos</span>}
              {profile.bmi != null && <span>IMC {formatNumber(profile.bmi, 1)}</span>}
              {profile.bmr != null && <span>TMB {formatKcal(profile.bmr)}</span>}
              {profile.tdee != null && <span>Gasto {formatKcal(profile.tdee)}/dia</span>}
            </div>
          )}

          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Altura (cm)</span>
              <input type="text" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="175" />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Data de nascimento</span>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Sexo biológico</span>
              <select value={biologicalSex} onChange={(e) => setBiologicalSex(e.target.value as BiologicalSex | "")}>
                <option value="">Selecione</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Tipo sanguíneo</span>
              <select value={bloodType} onChange={(e) => setBloodType(e.target.value as BloodType | "")}>
                <option value="">Selecione</option>
                {BLOOD_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Nível de atividade física</span>
            <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel | "")}>
              <option value="">Selecione</option>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                <option key={level} value={level}>{ACTIVITY_LABELS[level]}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Alergias</span>
            <textarea rows={2} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Ex: dipirona, amendoim…" />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Condições médicas</span>
            <textarea rows={2} value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} placeholder="Ex: hipertensão…" />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Medicamentos em uso</span>
            <textarea rows={2} value={medications} onChange={(e) => setMedications(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Lesões / restrições físicas</span>
            <textarea rows={2} value={injuries} onChange={(e) => setInjuries(e.target.value)} placeholder="Ex: condromalácia no joelho direito…" />
          </label>

          {saveError && <p className={styles.errorText}>{saveError}</p>}
          {feedback && <p className={styles.feedback}>{feedback}</p>}

          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? "Salvando…" : "Salvar perfil"}
          </button>
        </form>
      )}
    </div>
  );
}
