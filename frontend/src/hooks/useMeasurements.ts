import { useCallback, useEffect, useState } from "react";
import { deleteMeasurement, fetchMeasurements } from "../services/measurementService";
import type { Measurement } from "../types/measurement";

export function useMeasurements() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchMeasurements()
      .then((data) => {
        if (active) setMeasurements(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as medições.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const reload = useCallback(() => {
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteMeasurement(id);
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const previous = measurements.length > 1 ? measurements[measurements.length - 2] : null;

  return { measurements, latest, previous, loading, error, reload, remove };
}
