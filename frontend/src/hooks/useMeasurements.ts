import { deleteMeasurement, fetchMeasurements } from "../services/measurementService";
import { useResource } from "./useResource";
import { lastWith } from "../utils/measurements";
import type { Measurement } from "../types/measurement";

export function useMeasurements() {
  const { data: measurements, loading, error, reload, remove } = useResource<Measurement>(
    fetchMeasurements,
    "Não foi possível carregar as medições.",
    deleteMeasurement,
    "Não foi possível excluir a medição."
  );

  // Peso, IMC, TMB e TDEE saem da última pesagem, não da última medição qualquer.
  const [latest = null, previous = null] = lastWith(measurements, "weightKg", 2);
  const [latestBodyFat = null] = lastWith(measurements, "bodyFatPct");

  return { measurements, latest, previous, latestBodyFat, loading, error, reload, remove };
}
