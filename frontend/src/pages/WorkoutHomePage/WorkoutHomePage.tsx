import { Link, Outlet, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import {
  ChartIcon,
  DumbbellIcon,
  FlameIcon,
  GearIcon,
  ListIcon,
  PlayIcon,
  StarIcon,
} from "../../components/Icon/icons";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { useSplits } from "../../hooks/useSplits";
import { useGamification } from "../../hooks/useGamification";
import { useSessionHistory } from "../../hooks/useSessionHistory";
import { currentWeekday } from "../../utils/dateUtils";
import { formatDateTime, formatDuration, formatKg, formatNumber } from "../../utils/format";
import styles from "./WorkoutHomePage.module.css";

export function WorkoutHomePage() {
  const navigate = useNavigate();
  const { state } = useWorkoutSession();
  const { splits, loading: splitsLoading, reload: reloadSplits } = useSplits();
  const { gamification } = useGamification();
  const { sessions } = useSessionHistory(5);

  const sessionActive = state.session !== null && state.session.status === "in_progress";
  const today = currentWeekday();
  const todaySplits = splits.filter((split) => split.weekdays.includes(today));

  return (
    <div className={styles.page}>
      <PageHeader
        title="Treino"
        actions={
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => navigate("/configuracoes")}
            aria-label="Configurações"
          >
            <GearIcon className={styles.iconButtonIcon} />
          </button>
        }
      />

      {gamification && (
        <div className={styles.gamificationRow}>
          <div className={styles.streakCard}>
            <FlameIcon className={styles.streakIcon} />
            <div className={styles.streakInfo}>
              <span className={styles.streakValue}>{gamification.currentStreak}</span>
              <span className={styles.streakLabel}>
                dias de sequência{gamification.longestStreak > 0 ? ` · recorde ${gamification.longestStreak}` : ""}
              </span>
            </div>
          </div>
          <div className={styles.prCard}>
            <StarIcon className={styles.prIcon} />
            <div className={styles.streakInfo}>
              <span className={styles.streakValue}>{gamification.totalPrs}</span>
              <span className={styles.streakLabel}>recordes pessoais</span>
            </div>
          </div>
        </div>
      )}

      {sessionActive ? (
        <button type="button" className={styles.resumeCard} onClick={() => navigate("/treino/sessao/ativa")}>
          <PlayIcon className={styles.resumeIcon} />
          <div className={styles.resumeInfo}>
            <span className={styles.resumeTitle}>Treino em andamento</span>
            <span className={styles.resumeMeta}>{state.session!.splitName} — toque para continuar</span>
          </div>
        </button>
      ) : (
        <section className={styles.todaySection}>
          <h2 className={styles.sectionTitle}>Treino de hoje</h2>
          {splitsLoading ? (
            <p className={styles.loading}>Carregando…</p>
          ) : todaySplits.length > 0 ? (
            <div className={styles.todayList}>
              {todaySplits.map((split) => (
                <button
                  key={split.id}
                  type="button"
                  className={styles.todayCard}
                  onClick={() => navigate("/treino/iniciar", { state: { splitId: split.id } })}
                >
                  <div className={styles.todayInfo}>
                    <span className={styles.todayName}>{split.name}</span>
                    <span className={styles.todayMeta}>{split.exercises.length} exercícios</span>
                  </div>
                  <span className={styles.todayPlay}>
                    <PlayIcon className={styles.todayPlayIcon} />
                  </span>
                </button>
              ))}
            </div>
          ) : splits.length > 0 ? (
            <div className={styles.restDay}>
              <p>Hoje é dia de descanso. Quer treinar mesmo assim?</p>
              <button type="button" className={styles.ghostButton} onClick={() => navigate("/treino/iniciar")}>
                Escolher divisão
              </button>
            </div>
          ) : (
            <EmptyState
              icon={<DumbbellIcon />}
              title="Comece montando seu treino"
              description="Crie suas divisões (A, B, C…) com exercícios e protocolo de séries."
              action={
                <button type="button" className={styles.primaryButton} onClick={() => navigate("/treino/divisoes/nova")}>
                  Criar primeira divisão
                </button>
              }
            />
          )}
        </section>
      )}

      {sessions.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Últimos treinos</h2>
          <div className={styles.recentList}>
            {sessions.map((session) => (
              <Link key={session.id} to={`/treino/historico/${session.id}`} className={styles.recentRow}>
                <span className={styles.recentName}>{session.splitName}</span>
                <span className={styles.recentMeta}>
                  {formatDateTime(session.startedAt)} · {formatDuration(session.durationSeconds)} ·{" "}
                  {session.totalVolumeKg != null ? `${formatNumber(session.totalVolumeKg)} kg` : formatKg(null)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav className={styles.quickNav}>
        <Link to="/treino/divisoes" className={styles.quickNavItem}>
          <ListIcon className={styles.quickNavIcon} />
          Divisões
        </Link>
        <Link to="/treino/exercicios" className={styles.quickNavItem}>
          <DumbbellIcon className={styles.quickNavIcon} />
          Exercícios
        </Link>
        <Link to="/treino/historico" className={styles.quickNavItem}>
          <ChartIcon className={styles.quickNavIcon} />
          Histórico
        </Link>
      </nav>

      {gamification && gamification.badges.some((badge) => badge.awardedAt !== null) && (
        <section>
          <h2 className={styles.sectionTitle}>Conquistas recentes</h2>
          <div className={styles.badgeStrip}>
            {gamification.badges
              .filter((badge) => badge.awardedAt !== null)
              .slice(-6)
              .map((badge) => (
                <span key={badge.id} className={styles.badgeChip} title={badge.description}>
                  {badge.name}
                </span>
              ))}
          </div>
        </section>
      )}

      <Outlet context={{ splits, splitsLoading, reloadSplits }} />
    </div>
  );
}
