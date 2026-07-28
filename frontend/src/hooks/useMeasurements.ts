import { deleteMeasurement, fetchMeasurements } from "../services/measurementService";
import { useResource } from "./useResource";
import type { Measurement } from "../types/measurement";

export function useMeasurements() {
  const { data: measurements, loading, error, reload, remove } = useResource<Measurement>(
    fetchMeasurements,
    "Não foi possível carregar as medições.",
    deleteMeasurement,
    "Não foi possível excluir a medição."
  );

  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const previous = measurements.length > 1 ? measurements[measurements.length - 2] : null;

  return { measurements, latest, previous, loading, error, reload, remove };
}
