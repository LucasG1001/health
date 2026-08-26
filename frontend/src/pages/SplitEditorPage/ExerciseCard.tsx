import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import { NumericInput } from "../../components/NumericInput/NumericInput";
import { ExerciseThumb } from "../../components/ExerciseThumb/ExerciseThumb";
import { CheckIcon, ChevronRightIcon, TrashIcon } from "../../components/Icon/icons";
import { updateExercisePlan } from "../../services/splitService";
import { updateExercise } from "../../services/exerciseService";
import { MUSCLE_GROUP_LABELS, formatKg, formatNumber, repsTarget, totalLoadKg } from "../../utils/format";
import { loadChanged, parsePlanForm, planFormOf, type PlanFormRaw } from "../../utils/planForm";
import { apiErrorMessage } from "../../utils/apiError";
import type { Split, SplitExercise } from "../../types/split";
import styles from "./ExerciseCard.module.css";

type EditField = "carga" | "series" | "reps";

interface ExerciseCardProps {
  splitId: string;
  exercise: SplitExercise;
  dragging: boolean;
  onPointerDown: (e: PointerEvent) => void;
  onOpen: () => void;
  onRemove: () => void;
  onToggleCheck: (checked: boolean) => void;
  onSaved: (split: Split) => void;
  onError: (message: string) => void;
}

export function ExerciseCard({
  splitId,
  exercise,
  dragging,
  onPointerDown,
  onOpen,
  onRemove,
  onToggleCheck,
  onSaved,
  onError,
}: ExerciseCardProps) {
  // Semeado por props uma vez: a lista remonta o card (a key inclui os valores do plano)
  // quando o servidor devolve a divisão salva, então não há setState em effect aqui.
  const [form, setForm] = useState<PlanFormRaw>(() => planFormOf(exercise));
  const [editing, setEditing] = useState<EditField | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (field: keyof PlanFormRaw, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const done = exercise.checkedToday;
  const total = totalLoadKg(exercise.workingWeightKg, exercise.additionalWeightKg);
  const hasAdditional = exercise.additionalWeightKg != null && exercise.additionalWeightKg !== 0;
  const first = exercise.plannedSets[0];

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  const save = async () => {
    setEditing(null);
    const parsed = parsePlanForm(form);
    if (!parsed.ok) {
      onError(parsed.error);
      setForm(planFormOf(exercise));
      return;
    }
    const values = parsed.values;
    setSaving(true);
    try {
      if (loadChanged(exercise, values)) {
        await updateExercise(exercise.exerciseId, {
          workingWeightKg: values.workingWeightKg,
          additionalWeightKg: values.additionalWeightKg,
        });
      }
      onSaved(
        await updateExercisePlan(splitId, exercise.id, {
          series: values.series,
          targetRepsMin: values.targetRepsMin,
          targetRepsMax: values.targetRepsMax,
        })
      );
    } catch (err) {
      onError(apiErrorMessage(err, "Não foi possível salvar o exercício."));
      setForm(planFormOf(exercise));
    } finally {
      setSaving(false);
    }
  };

  // Sair de um dos dois campos do bloco não pode salvar quando o foco só andou para o
  // campo vizinho (carga → adicional, reps mín → reps máx).
  const onGroupBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) void save();
  };

  return (
    <article
      className={`${styles.card} ${done ? styles.cardDone : ""} ${dragging ? styles.cardDragging : ""}`}
      onPointerDown={onPointerDown}
    >
      <div className={styles.head}>
        <button type="button" className={styles.body} onClick={onOpen}>
          <ExerciseThumb exercise={exercise} />
          <div className={styles.info}>
            <span className={styles.name}>{exercise.name}</span>
            <span className={styles.muscle}>
              {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
              {exercise.equipment ? ` · ${exercise.equipment}` : ""}
            </span>
          </div>
          <ChevronRightIcon className={styles.chevron} />
        </button>

        <button
          type="button"
          className={styles.remove}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          aria-label="Remover exercício do treino"
        >
          <TrashIcon className={styles.removeIcon} />
        </button>

        <button
          type="button"
          className={`${styles.check} ${done ? styles.checkDone : ""}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onToggleCheck(!done)}
          aria-label={done ? "Desmarcar exercício de hoje" : "Marcar exercício como feito hoje"}
          aria-pressed={done}
        >
          <CheckIcon className={styles.checkIcon} />
        </button>
      </div>

      <div className={styles.tiles} onPointerDown={(e) => e.stopPropagation()}>
        <div
          className={`${styles.tile} ${styles.tileAccent}`}
          onClick={() => setEditing("carga")}
          role="presentation"
        >
          {editing === "carga" ? (
            <div className={styles.pair} onBlur={onGroupBlur}>
              <NumericInput
                className={styles.pairInput}
                placeholder="—"
                value={form.weight}
                autoFocus
                onChange={(value) => patch("weight", value)}
                onKeyDown={onEditKeyDown}
                aria-label="Carga em kg"
              />
              <span className={styles.pairSign}>+</span>
              <NumericInput
                className={styles.pairInput}
                placeholder="—"
                value={form.additional}
                onChange={(value) => patch("additional", value)}
                onKeyDown={onEditKeyDown}
                aria-label="Peso adicional em kg"
              />
            </div>
          ) : (
            <span className={`${styles.value} ${styles.valueAccent}`}>{formatKg(total)}</span>
          )}
          <span className={styles.label}>
            {hasAdditional && editing !== "carga"
              ? `${formatNumber(exercise.workingWeightKg ?? 0, 1)} + ${formatNumber(exercise.additionalWeightKg, 1)} kg`
              : "carga"}
          </span>
        </div>

        <div className={styles.tile} onClick={() => setEditing("series")} role="presentation">
          {editing === "series" ? (
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              value={form.series}
              autoFocus
              onChange={(e) => patch("series", e.target.value)}
              onBlur={save}
              onKeyDown={onEditKeyDown}
              aria-label="Séries"
            />
          ) : (
            <span className={styles.value}>{exercise.plannedSets.length}</span>
          )}
          <span className={styles.label}>séries</span>
        </div>

        <div className={styles.tile} onClick={() => setEditing("reps")} role="presentation">
          {editing === "reps" ? (
            <div className={styles.pair} onBlur={onGroupBlur}>
              <input
                className={styles.pairInput}
                type="text"
                inputMode="numeric"
                value={form.repsMin}
                autoFocus
                onChange={(e) => patch("repsMin", e.target.value)}
                onKeyDown={onEditKeyDown}
                aria-label="Reps mínimas"
              />
              <span className={styles.pairSign}>-</span>
              <input
                className={styles.pairInput}
                type="text"
                inputMode="numeric"
                placeholder="máx"
                value={form.repsMax}
                onChange={(e) => patch("repsMax", e.target.value)}
                onKeyDown={onEditKeyDown}
                aria-label="Reps máximas"
              />
            </div>
          ) : (
            <span className={styles.value}>
              {repsTarget(first?.targetRepsMin ?? null, first?.targetRepsMax ?? null)}
            </span>
          )}
          <span className={styles.label}>{saving ? "salvando…" : "reps"}</span>
        </div>
      </div>
    </article>
  );
}
