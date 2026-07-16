/**
 * Export/Import de todos os dados do usuário em JSON (R12 — saída de emergência
 * e transferência manual entre aparelhos, sem depender de login).
 *
 * Preserva os `id` dos documentos para manter as referências (seleção ativa →
 * planos, etc.). Sem dependências nativas: o app apenas gera/consome a string
 * JSON; compartilhar/colar fica a cargo da UI (Share nativo do RN).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from '@react-native-firebase/firestore';

import { Collections, ConfigDocs } from '@/constants/firestore-paths';
import { now } from '@/lib/date';
import { requireUid, userCollection, userDoc, userSubDoc } from '@/repositories/base';

const BACKUP_VERSION = 1;

type DocRec = { id: string; [key: string]: unknown };
type SessionRec = DocRec & { sets: DocRec[] };
type DailyLogRec = DocRec & { sessions: SessionRec[] };

export interface BackupData {
  version: number;
  exportedAt: number;
  profile: Record<string, unknown> | null;
  activeSelection: Record<string, unknown> | null;
  bodyWeightLog: DocRec[];
  exercises: DocRec[];
  foods: DocRec[];
  workoutPlans: DocRec[];
  dietPlans: DocRec[];
  dailyLogs: DailyLogRec[];
}

const FLAT_COLLECTIONS = [
  Collections.bodyWeightLog,
  Collections.exercises,
  Collections.foods,
  Collections.workoutPlans,
  Collections.dietPlans,
] as const;

function toRec(d: { id: string; data: () => unknown }): DocRec {
  return { id: d.id, ...(d.data() as Record<string, unknown>) };
}

async function readCollection(uid: string, name: string): Promise<DocRec[]> {
  const snap = await getDocs(userCollection(uid, name));
  return snap.docs.map(toRec);
}

// ── Limpeza (compartilhada com o import e a ferramenta de seed) ─────
export async function wipeAllUserData(): Promise<void> {
  const uid = requireUid();

  for (const name of [...FLAT_COLLECTIONS]) {
    const snap = await getDocs(userCollection(uid, name));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }

  await deleteDoc(userSubDoc(uid, Collections.config, ConfigDocs.activeSelection)).catch(
    () => undefined,
  );

  const days = await getDocs(userCollection(uid, Collections.dailyLogs));
  for (const day of days.docs) {
    const sessions = await getDocs(collection(day.ref, Collections.sessions));
    for (const session of sessions.docs) {
      const sets = await getDocs(collection(session.ref, Collections.sets));
      await Promise.all(sets.docs.map((s) => deleteDoc(s.ref)));
      await deleteDoc(session.ref);
    }
    await deleteDoc(day.ref);
  }
}

// ── Export ──────────────────────────────────────────────────────────
export async function exportAllData(): Promise<BackupData> {
  const uid = requireUid();

  const [profileSnap, activeSnap] = await Promise.all([
    getDoc(userDoc(uid)),
    getDoc(userSubDoc(uid, Collections.config, ConfigDocs.activeSelection)),
  ]);
  const [bodyWeightLog, exercises, foods, workoutPlans, dietPlans] = await Promise.all(
    FLAT_COLLECTIONS.map((name) => readCollection(uid, name)),
  );

  const dayDocs = await getDocs(userCollection(uid, Collections.dailyLogs));
  const dailyLogs: DailyLogRec[] = await Promise.all(
    dayDocs.docs.map(async (day) => {
      const sessionsSnap = await getDocs(collection(day.ref, Collections.sessions));
      const sessions: SessionRec[] = await Promise.all(
        sessionsSnap.docs.map(async (s) => {
          const setsSnap = await getDocs(collection(s.ref, Collections.sets));
          return { ...toRec(s), sets: setsSnap.docs.map(toRec) };
        }),
      );
      return { ...toRec(day), sessions };
    }),
  );

  return {
    version: BACKUP_VERSION,
    exportedAt: now(),
    profile: profileSnap.exists() ? (profileSnap.data() as Record<string, unknown>) : null,
    activeSelection: activeSnap.exists() ? (activeSnap.data() as Record<string, unknown>) : null,
    bodyWeightLog,
    exercises,
    foods,
    workoutPlans,
    dietPlans,
    dailyLogs,
  };
}

// ── Import ──────────────────────────────────────────────────────────
/** Faz o parse + valida o formato de um backup colado. Lança em caso de erro. */
export function parseBackup(json: string): BackupData {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('JSON inválido.');
  }
  const d = data as Partial<BackupData>;
  if (!d || typeof d !== 'object' || d.version !== BACKUP_VERSION || !Array.isArray(d.dailyLogs)) {
    throw new Error('Este texto não é um backup válido do app.');
  }
  return d as BackupData;
}

async function writeCollection(uid: string, name: string, recs: DocRec[]): Promise<void> {
  await Promise.all(
    recs.map(({ id, ...fields }) => setDoc(userSubDoc(uid, name, id), fields)),
  );
}

/** APAGA os dados atuais e grava os do backup, preservando ids. */
export async function importAllData(data: BackupData): Promise<void> {
  const uid = requireUid();
  await wipeAllUserData();

  if (data.profile) await setDoc(userDoc(uid), data.profile, { merge: true });
  if (data.activeSelection) {
    await setDoc(userSubDoc(uid, Collections.config, ConfigDocs.activeSelection), data.activeSelection);
  }

  await Promise.all([
    writeCollection(uid, Collections.bodyWeightLog, data.bodyWeightLog ?? []),
    writeCollection(uid, Collections.exercises, data.exercises ?? []),
    writeCollection(uid, Collections.foods, data.foods ?? []),
    writeCollection(uid, Collections.workoutPlans, data.workoutPlans ?? []),
    writeCollection(uid, Collections.dietPlans, data.dietPlans ?? []),
  ]);

  for (const day of data.dailyLogs ?? []) {
    const { id: dayId, sessions, ...dayFields } = day;
    const dayRef = userSubDoc(uid, Collections.dailyLogs, dayId);
    await setDoc(dayRef, dayFields);
    for (const session of sessions ?? []) {
      const { id: sessionId, sets, ...sessionFields } = session;
      const sessionRef = doc(collection(dayRef, Collections.sessions), sessionId);
      await setDoc(sessionRef, sessionFields);
      await Promise.all(
        (sets ?? []).map(({ id: setId, ...setFields }) =>
          setDoc(doc(collection(sessionRef, Collections.sets), setId), setFields),
        ),
      );
    }
  }
}
