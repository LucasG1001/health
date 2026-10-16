import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import { NumericInput } from "../../components/NumericInput/NumericInput";
import { ExerciseThumb } from "../../components/ExerciseThumb/ExerciseThumb";
import { CheckIcon, ChevronRightIcon, GripIcon, TrashIcon } from "../../components/Icon/icons";
import { fetchSplit, updateExercisePlan } from "../../services/splitService";
import { updateExercise } from "../../services/exerciseService";
import { MUSCLE_GROUP_LABELS, formatKg, formatNumber, repsTarget, totalLoadKg } from "../../utils/format";
import { parsePlanForm, planFormOf, planPatch, type PlanFormRaw } from "../../utils/planForm";
import { apiErrorMessage } from "../../utils/apiError";
import type { Split, SplitExercise } from "../../types/split";
import styles from "./ExerciseCard.module.css";

type EditField = "carga" | "series" | "reps";

interface ExerciseCardProps {
  splitId: string;
  exercise: SplitExercise;
  dragging: boolean;
  onDragStart: (e: PointerEvent<HTMLElement>) => void;
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
  onDragStart,
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

  // Enquanto um save está em voo nenhum outro tile entra em edição: a resposta remonta o
  // card e levaria junto o que estivesse sendo digitado.
  const startEdit = (field: EditField) => {
    if (!saving) setEditing(field);
  };

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
    const changes = planPatch(exercise, parsed.values);
    if (!changes) return;

    setSaving(true);
    let loadSaved = false;
    try {
      if (changes.load) {
        await updateExercise(exercise.exerciseId, changes.load);
        loadSaved = true;
      }
      onSaved(
        changes.plan
          ? await updateExercisePlan(splitId, exercise.id, changes.plan)
          : await fetchSplit(splitId)
      );
    } catch (err) {
      onError(apiErrorMessage(err, "Não foi possível salvar o exercício."));
      // A carga já foi gravada: voltar o formulário para o valor antigo faria o próximo
      // save regravá-lo por cima. Recarregar traz o estado real do servidor.
      if (loadSaved) {
        fetchSplit(splitId).then(onSaved, () => setForm(planFormOf(exercise)));
      } else {
        setForm(planFormOf(exercise));
      }
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
    >
      <div className={styles.head}>
        <button
          type="button"
          className={styles.grip}
          onPointerDown={onDragStart}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Arrastar para reordenar"
        >
          <GripIcon className={styles.gripIcon} />
        </button>

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
          onClick={onRemove}
          aria-label="Remover exercício do treino"
        >
          <TrashIcon className={styles.removeIcon} />
        </button>

        <button
          type="button"
          className={`${styles.check} ${done ? styles.checkDone : ""}`}
          onClick={() => onToggleCheck(!done)}
          aria-label={done ? "Desmarcar exercício de hoje" : "Marcar exercício como feito hoje"}
          aria-pressed={done}
        >
          <CheckIcon className={styles.checkIcon} />
        </button>
      </div>

      <div className={styles.tiles}>
        <div className={`${styles.tile} ${styles.tileAccent}`}>
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
            <button
              type="button"
              className={styles.tileButton}
              onClick={() => startEdit("carga")}
              aria-label="Editar carga"
            >
              <span className={`${styles.value} ${styles.valueAccent}`}>{formatKg(total)}</span>
            </button>
          )}
          <span className={styles.label}>
            {hasAdditional && editing !== "carga"
              ? `${formatNumber(exercise.workingWeightKg ?? 0, 1)} + ${formatNumber(exercise.additionalWeightKg, 1)} kg`
              : "carga"}
          </span>
        </div>

        <div className={styles.tile}>
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
            <button
              type="button"
              className={styles.tileButton}
              onClick={() => startEdit("series")}
              aria-label="Editar séries"
            >
              <span className={styles.value}>{exercise.plannedSets.length}</span>
            </button>
          )}
          <span className={styles.label}>séries</span>
        </div>

        <div className={styles.tile}>
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
            <button
              type="button"
              className={styles.tileButton}
              onClick={() => startEdit("reps")}
              aria-label="Editar repetições"
            >
              <span className={styles.value}>
                {repsTarget(first?.targetRepsMin ?? null, first?.targetRepsMax ?? null)}
              </span>
            </button>
          )}
          <span className={styles.label}>{saving ? "salvando…" : "reps"}</span>
        </div>
      </div>
    </article>
  );
}
