import { create } from 'zustand';

import type { BodyWeightEntry, Profile } from '@/types/domain';

export type ProfileStatus = 'loading' | 'loaded' | 'error';

interface ProfileState {
  profile: Profile | null;
  latestWeight: BodyWeightEntry | null;
  status: ProfileStatus;
  error: string | null;
  /** Marca o resultado do bootstrap (perfil pode ser null = primeiro uso). */
  setLoaded: (profile: Profile | null, latestWeight: BodyWeightEntry | null) => void;
  setStatus: (status: ProfileStatus) => void;
  setError: (message: string) => void;
  setProfile: (profile: Profile) => void;
  setLatestWeight: (entry: BodyWeightEntry) => void;
}

/**
 * Estado do perfil do usuário e do peso mais recente.
 * Alimenta o gate de onboarding (perfil null → primeiro uso) e o cálculo
 * de g proteína/kg (peso mais recente) que chega na Fase 3.
 */
export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  latestWeight: null,
  status: 'loading',
  error: null,
  setLoaded: (profile, latestWeight) =>
    set({ profile, latestWeight, status: 'loaded', error: null }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ status: 'error', error }),
  setProfile: (profile) => set({ profile }),
  setLatestWeight: (latestWeight) => set({ latestWeight }),
}));
