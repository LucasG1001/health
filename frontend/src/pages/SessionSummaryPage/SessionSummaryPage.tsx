import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { StatCard } from "../../components/StatCard/StatCard";
import { ErrorBanner } from "../../components/ErrorBanner/ErrorBanner";
import { Loading } from "../../components/Loading/Loading";
import { fetchSession, updateSessionNotes } from "../../services/sessionService";
import { apiErrorMessage } from "../../utils/apiError";
import { completedSetsCount, totalSetsCount } from "../../utils/sessionMachine";
import { formatDuration, formatKg } from "../../utils/format";
import type { FinishSummary, WorkoutSession } from "../../types/session";
import styles from "./SessionSummaryPage.module.css";

export function SessionSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const summary = (location.state as { summary?: FinishSummary } | null)?.summary ?? null;

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchSession(id)
      .then((data) => {
        if (!active) return;
        setSession(data);
        setNotes(data.notes ?? "");
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar a sessão.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(
    () => () => {
      if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
    },
    []
  );

  const durationSeconds = summary?.durationSeconds ?? session?.durationSeconds ?? null;
  const totalVolumeKg = summary?.totalVolumeKg ?? session?.totalVolumeKg ?? null;
  const completedSets = summary?.completedSets ?? (session ? completedSetsCount(session) : null);
  const plannedSets = summary?.plannedSets ?? (session ? totalSetsCount(session) : null);

  const handleSaveNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    setError(null);
    try {
      await updateSessionNotes(id, notes.trim() === "" ? null : notes.trim());
      setNotesSaved(true);
      savedTimerRef.current = window.setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível salvar as anotações."));
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Resumo do treino" subtitle={session?.splitName} backTo="/treino" />

      {error && <ErrorBanner message={error} />}
      {loading && !session ? (
        <Loading />
      ) : (
        <>
          <div className={styles.statsGrid}>
            <StatCard label="Duração" value={formatDuration(durationSeconds)} />
            <StatCard
              label="Volume total"
              value={formatKg(totalVolumeKg)}
            />
            <StatCard
              label="Séries"
              value={completedSets != null && plannedSets != null ? `${completedSets}/${plannedSets}` : "—"}
            />
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Anotações</h2>
            <textarea
              className={styles.notes}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Como foi o treino? Registre observações para a próxima sessão."
            />
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSaveNotes}
              disabled={savingNotes}
            >
              {notesSaved ? "Salvo!" : "Salvar anotações"}
            </button>
          </section>

          <button type="button" className={styles.homeButton} onClick={() => navigate("/treino")}>
            Voltar ao início
          </button>
        </>
      )}
    </div>
  );
}
