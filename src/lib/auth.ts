/**
 * Autenticação (Fase 8 — upgrade de anônima → e-mail/senha).
 *
 * O app entra sempre com uma sessão anônima (zero atrito, offline-friendly).
 * Quando o usuário cria uma conta, VINCULAMOS o e-mail à sessão anônima
 * (`linkWithCredential`) preservando o mesmo `uid` — ou seja, nenhum dado sob
 * `users/{uid}` é perdido na migração. Ao entrar em outro aparelho (ou após
 * reinstalar), o login com e-mail recupera o mesmo `uid` e, com ele, os dados.
 */
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from '@react-native-firebase/auth';

import { auth } from './firebase';
import { useAuthStore } from '@/store/auth-store';
import { useProfileStore } from '@/store/profile-store';

/** Inicia o observador de auth e garante um usuário logado. Retorna o unsubscribe. */
export function initAuth(): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      useAuthStore.getState().setUser(user.uid, user.isAnonymous, user.email);
      return;
    }
    // Sem usuário → cria sessão anônima (o gate mostra o login em cima dela).
    useAuthStore.getState().setStatus('signing-in');
    try {
      await signInAnonymously(auth);
    } catch (e) {
      useAuthStore.getState().setError(
        e instanceof Error ? e.message : 'Falha ao autenticar',
      );
    }
  });
}

/**
 * Cria a conta de e-mail. Se a sessão atual é anônima, VINCULA o e-mail a ela
 * (preserva o uid e os dados). Caso contrário, cria uma conta nova.
 */
export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    const cred = EmailAuthProvider.credential(email, password);
    const result = await linkWithCredential(current, cred);
    useAuthStore.getState().setUser(result.user.uid, false, result.user.email);
    return;
  }
  const result = await createUserWithEmailAndPassword(auth, email, password);
  useAuthStore.getState().setUser(result.user.uid, false, result.user.email);
}

/** Entra numa conta de e-mail já existente (recupera o uid e os dados). */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  useAuthStore.getState().setUser(result.user.uid, false, result.user.email);
}

/**
 * Sai da conta. Limpa o perfil em memória e volta para a sessão anônima
 * (o observador de auth reentra sozinho), levando o gate de volta ao login.
 */
export async function signOutUser(): Promise<void> {
  useProfileStore.getState().setLoaded(null, null);
  useProfileStore.getState().setStatus('loading');
  await signOut(auth);
}

/** Traduz códigos de erro do Firebase Auth para mensagens em PT-BR. */
export function authErrorMessage(e: unknown): string {
  const code =
    typeof e === 'object' && e !== null && 'code' in e
      ? String((e as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'Este e-mail já tem uma conta. Tente entrar.';
    case 'auth/weak-password':
      return 'A senha precisa ter pelo menos 6 caracteres.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/user-not-found':
      return 'Não existe conta com este e-mail. Crie uma.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique a internet e tente de novo.';
    default:
      return e instanceof Error ? e.message : 'Não foi possível concluir.';
  }
}
