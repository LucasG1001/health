import { useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { Modal } from "../../components/Modal/Modal";
import { CheckIcon } from "../../components/Icon/icons";
import { useWorkoutSession } from "../../context/workoutSessionStore";
import { apiErrorMessage } from "../../utils/apiError";
import { currentWeekday } from "../../utils/dateUtils";
import type { Split } from "../../types/split";
import styles from "./StartSessionModal.module.css";

interface OutletContextValue {
  splits: Split[];
  splitsLoading: boolean;
  reloadSplits: () => void;
}

export function StartSessionModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { splits, splitsLoading } = useOutletContext<OutletContextValue>();
  const { start } = useWorkoutSession();

  const today = currentWeekday();
  const preselected = (location.state as { splitId?: string } | null)?.splitId ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (preselected) return preselected;
    const todaySplit = splits.find((split) => split.weekdays.includes(today));
    return todaySplit?.id ?? splits[0]?.id ?? null;
  });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => navigate("/treino");

  const handleSubmit = async () => {
    if (!selectedId) {
      setError("Escolha uma divisão para começar.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      await start(selectedId);
      navigate("/treino/sessao/ativa");
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível iniciar o treino."));
      setStarting(false);
    }
  };

  return (
    <Modal
      title="Iniciar treino"
      onClose={close}
      onSubmit={handleSubmit}
      submitLabel="Iniciar"
      submitDisabled={starting || selectedId === null}
    >
      {error && <p className={styles.error}>{error}</p>}
      {splitsLoading ? (
        <p className={styles.loading}>Carregando divisões…</p>
      ) : splits.length === 0 ? (
        <p className={styles.loading}>Nenhuma divisão criada ainda. Monte uma em Treino → Divisões.</p>
      ) : (
        <div className={styles.list}>
          {splits.map((split) => {
            const isToday = split.weekdays.includes(today);
            const isSelected = split.id === selectedId;
            return (
              <button
                key={split.id}
                type="button"
                className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}
                onClick={() => setSelectedId(split.id)}
              >
                <div className={styles.optionInfo}>
                  <span className={styles.optionName}>
                    {split.name}
                    {isToday && <span className={styles.todayChip}>Hoje</span>}
                  </span>
                  <span className={styles.optionMeta}>{split.exercises.length} exercícios</span>
                </div>
                {isSelected && <CheckIcon className={styles.checkIcon} />}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
