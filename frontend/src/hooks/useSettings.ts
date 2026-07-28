import { useCallback, useEffect, useState } from "react";
import { fetchSettings, updateSettings } from "../services/settingsService";
import { apiErrorMessage } from "../utils/apiError";
import type { Settings, SettingsInput } from "../types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchSettings()
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch((err) => {
        if (active) setError(apiErrorMessage(err, "Não foi possível carregar as configurações."));
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
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  const save = useCallback(async (input: SettingsInput) => {
    const updated = await updateSettings(input);
    setSettings(updated);
    return updated;
  }, []);

  return { settings, loading, error, reload, save };
}
