import { useCallback, useEffect, useState } from "react";
import { fetchSettings, updateSettings } from "../services/settingsService";
import type { Settings, SettingsInput } from "../types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchSettings()
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as configurações.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(async (input: SettingsInput) => {
    const updated = await updateSettings(input);
    setSettings(updated);
    return updated;
  }, []);

  return { settings, loading, error, save };
}
