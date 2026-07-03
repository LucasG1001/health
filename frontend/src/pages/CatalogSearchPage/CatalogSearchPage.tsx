import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { CheckIcon, DumbbellIcon, PlusIcon } from "../../components/Icon/icons";
import { importExercise, searchCatalog } from "../../services/catalogService";
import { MUSCLE_GROUP_LABELS } from "../../utils/format";
import { apiErrorMessage } from "../../utils/apiError";
import type { CatalogExercise } from "../../types/catalog";
import type { MuscleGroup } from "../../types/exercise";
import styles from "./CatalogSearchPage.module.css";

export function CatalogSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | "all">("all");
  const [results, setResults] = useState<CatalogExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);
      searchCatalog({
        q: query.trim() || undefined,
        muscleGroup: group === "all" ? undefined : group,
        limit: 60,
      })
        .then((data) => setResults(data))
        .catch((err) => setError(apiErrorMessage(err, "Não foi possível buscar exercícios.")))
        .finally(() => setLoading(false));
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, group]);

  const handleImport = async (item: CatalogExercise) => {
    setImporting(item.id);
    setError(null);
    try {
      await importExercise(item.id);
      setImported((prev) => new Set(prev).add(item.id));
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível adicionar o exercício."));
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Buscar exercícios"
        subtitle="Base ExerciseDB (free-exercise-db)"
        backTo="/treino/exercicios"
      />

      <input
        type="search"
        className={styles.search}
        placeholder="Buscar por nome (em inglês)… ex: bench press"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className={styles.chips}>
        <button
          type="button"
          className={`${styles.chip} ${group === "all" ? styles.chipActive : ""}`}
          onClick={() => setGroup("all")}
        >
          Todos
        </button>
        {(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.chip} ${group === option ? styles.chipActive : ""}`}
            onClick={() => setGroup(option)}
          >
            {MUSCLE_GROUP_LABELS[option]}
          </button>
        ))}
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <p className={styles.loading}>Buscando… (a primeira busca sincroniza o catálogo)</p>}

      <div className={styles.list}>
        {results.map((item) => {
          const alreadyImported = item.importedExerciseId !== null || imported.has(item.id);
          return (
            <article key={item.id} className={styles.card}>
              <div className={styles.thumb}>
                {item.imageUrls[0] ? (
                  <img src={item.imageUrls[0]} alt="" loading="lazy" />
                ) : (
                  <DumbbellIcon className={styles.thumbIcon} />
                )}
              </div>
              <div className={styles.cardInfo}>
                <span className={styles.cardName}>{item.name}</span>
                <span className={styles.cardMeta}>
                  {MUSCLE_GROUP_LABELS[item.muscleGroup]}
                  {item.equipment ? ` · ${item.equipment}` : ""}
                </span>
              </div>
              <button
                type="button"
                className={`${styles.addButton} ${alreadyImported ? styles.added : ""}`}
                disabled={alreadyImported || importing === item.id}
                onClick={() => handleImport(item)}
                aria-label={alreadyImported ? "Já adicionado" : "Adicionar"}
              >
                {alreadyImported ? <CheckIcon className={styles.addIcon} /> : <PlusIcon className={styles.addIcon} />}
              </button>
            </article>
          );
        })}
      </div>

      {!loading && results.length === 0 && !error && (
        <p className={styles.noResults}>Nenhum exercício encontrado para esta busca.</p>
      )}

      <button type="button" className={styles.manualLink} onClick={() => navigate("/treino/exercicios/novo")}>
        Não achou? Criar exercício manualmente
      </button>
    </div>
  );
}
