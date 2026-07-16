import { create } from 'zustand';

export type AuthStatus = 'loading' | 'signing-in' | 'authenticated' | 'error';

interface AuthState {
  uid: string | null;
  /** true = sessão anônima (ainda sem conta de e-mail). Gate mostra o login. */
  isAnonymous: boolean;
  email: string | null;
  status: AuthStatus;
  error: string | null;
  setUser: (uid: string, isAnonymous: boolean, email: string | null) => void;
  setStatus: (status: AuthStatus) => void;
  setError: (message: string) => void;
}

/** Estado de autenticação (uid + se a conta já foi vinculada a um e-mail). */
export const useAuthStore = create<AuthState>((set) => ({
  uid: null,
  isAnonymous: true,
  email: null,
  status: 'loading',
  error: null,
  setUser: (uid, isAnonymous, email) =>
    set({ uid, isAnonymous, email, status: 'authenticated', error: null }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ status: 'error', error }),
}));
