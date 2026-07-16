import { useShallow } from 'zustand/react/shallow';

import { useProfileStore } from '@/store/profile-store';

/** Estado do perfil para a UI (perfil, peso mais recente, status). */
export function useProfile() {
  return useProfileStore(
    useShallow((s) => ({
      profile: s.profile,
      latestWeight: s.latestWeight,
      status: s.status,
      error: s.error,
    })),
  );
}
