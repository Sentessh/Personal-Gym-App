import { useShallow } from 'zustand/react/shallow';

import { useAuthStore } from '@/store/auth-store';

/** Estado de autenticação da UI (uid, status, se é anônimo, e-mail, erro). */
export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      uid: s.uid,
      status: s.status,
      isAnonymous: s.isAnonymous,
      email: s.email,
      error: s.error,
    })),
  );
}
