/**
 * Repositório da Seleção Ativa (regra de negócio central, §3.5).
 * Doc singleton em users/{uid}/config/activeSelection.
 */
import { getDoc, onSnapshot, setDoc } from '@react-native-firebase/firestore';

import { Collections, ConfigDocs } from '@/constants/firestore-paths';
import type { ActiveSelection } from '@/types/domain';
import { requireUid, userSubDoc } from './base';

function activeSelectionRef(uid: string) {
  return userSubDoc(uid, Collections.config, ConfigDocs.activeSelection);
}

export async function getActiveSelection(): Promise<ActiveSelection | null> {
  const uid = requireUid();
  const snap = await getDoc(activeSelectionRef(uid));
  return snap.exists() ? (snap.data() as ActiveSelection) : null;
}

/**
 * Assina o doc de seleção ativa em tempo real (§5 — a UI reage a mudanças no
 * banco, online ou offline). Retorna a função de unsubscribe.
 */
export function subscribeActiveSelection(
  onChange: (selection: ActiveSelection | null) => void,
  onError?: (error: Error) => void,
): () => void {
  const uid = requireUid();
  return onSnapshot(
    activeSelectionRef(uid),
    (snap) => onChange(snap.exists() ? (snap.data() as ActiveSelection) : null),
    (error) => onError?.(error as Error),
  );
}

export async function setActiveSelection(
  patch: Partial<Pick<ActiveSelection, 'activeWorkoutPlanId' | 'activeDietPlanId'>>,
): Promise<void> {
  const uid = requireUid();
  await setDoc(
    activeSelectionRef(uid),
    { ...patch, updatedAt: Date.now() },
    { merge: true },
  );
}
