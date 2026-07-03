import { useCallback, useEffect, useState } from "react";
import { fetchProfile, updateProfile } from "../services/profileService";
import type { Profile, ProfileInput } from "../types/profile";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchProfile()
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar o perfil.");
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

  const save = useCallback(async (input: ProfileInput) => {
    const updated = await updateProfile(input);
    setProfile(updated);
    return updated;
  }, []);

  return { profile, loading, error, reload, save };
}
