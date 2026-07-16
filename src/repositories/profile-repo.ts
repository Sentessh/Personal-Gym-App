/**
 * Repositório de Perfil e Peso Corporal (§3.2).
 * O perfil é gravado nos campos do próprio doc `users/{uid}`; o peso corporal
 * vive na subcoleção `bodyWeightLog` (histórico, base do gráfico de peso e do
 * cálculo de g proteína/kg — que usa sempre o registro mais recente).
 */
import {
  addDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from '@react-native-firebase/firestore';

import { Collections } from '@/constants/firestore-paths';
import type { BodyWeightEntry, Profile } from '@/types/domain';
import { requireUid, userCollection, userDoc } from './base';

export async function getProfile(): Promise<Profile | null> {
  const uid = requireUid();
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<Profile>;
  // O doc users/{uid} só é um "perfil de fato" quando tem nome + createdAt.
  if (!data?.name || typeof data.createdAt !== 'number') return null;
  return data as Profile;
}

/** Cria o perfil no primeiro uso (define createdAt). */
export async function createProfile(data: {
  name: string;
  heightCm?: number;
}): Promise<Profile> {
  const uid = requireUid();
  const profile: Profile = {
    name: data.name,
    createdAt: Date.now(),
    // Firestore RN rejeita `undefined` — só inclui a altura se informada.
    ...(data.heightCm != null ? { heightCm: data.heightCm } : {}),
  };
  await setDoc(userDoc(uid), profile, { merge: true });
  return profile;
}

/** Atualiza campos editáveis do perfil sem tocar em createdAt. */
export async function updateProfile(
  data: Partial<Pick<Profile, 'name' | 'heightCm'>>,
): Promise<void> {
  const uid = requireUid();
  const patch: Record<string, unknown> = {};
  if (data.name != null) patch.name = data.name;
  if (data.heightCm != null) patch.heightCm = data.heightCm;
  await setDoc(userDoc(uid), patch, { merge: true });
}

export async function addBodyWeight(
  entry: Omit<BodyWeightEntry, 'id'>,
): Promise<string> {
  const uid = requireUid();
  const ref = await addDoc(
    userCollection(uid, Collections.bodyWeightLog),
    entry,
  );
  return ref.id;
}

/** Registro de peso mais recente (por data desc). Base do cálculo prot/kg. */
export async function getLatestBodyWeight(): Promise<BodyWeightEntry | null> {
  const uid = requireUid();
  const snap = await getDocs(
    query(
      userCollection(uid, Collections.bodyWeightLog),
      orderBy('date', 'desc'),
      limit(1),
    ),
  );
  const d = snap.docs[0];
  return d ? { id: d.id, ...(d.data() as Omit<BodyWeightEntry, 'id'>) } : null;
}

/** Histórico completo de peso, mais recente primeiro. */
export async function listBodyWeights(): Promise<BodyWeightEntry[]> {
  const uid = requireUid();
  const snap = await getDocs(
    query(
      userCollection(uid, Collections.bodyWeightLog),
      orderBy('date', 'desc'),
    ),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<BodyWeightEntry, 'id'>),
  }));
}
