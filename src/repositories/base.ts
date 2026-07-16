/**
 * Helpers de referência para o Firestore.
 * Toda a árvore de dados vive sob users/{uid} (§3.8).
 *
 * A UI nunca importa daqui diretamente — usa os repositórios de domínio,
 * que retornam tipos de `@/types/domain`, isolando o backend (R12).
 */
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from '@react-native-firebase/firestore';

import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth-store';

/** uid do usuário autenticado; lança se ainda não autenticado. */
export function requireUid(): string {
  const uid = useAuthStore.getState().uid;
  if (!uid) {
    throw new Error('Usuário não autenticado (uid ausente).');
  }
  return uid;
}

/** Documento raiz do usuário: users/{uid}. */
export function userDoc(uid: string): DocumentReference {
  return doc(db, 'users', uid);
}

/** Coleção sob o usuário: users/{uid}/{name}. */
export function userCollection(uid: string, name: string): CollectionReference {
  return collection(userDoc(uid), name);
}

/** Documento sob o usuário: users/{uid}/{collectionName}/{docId}. */
export function userSubDoc(
  uid: string,
  collectionName: string,
  docId: string,
): DocumentReference {
  return doc(userCollection(uid, collectionName), docId);
}
