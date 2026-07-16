/**
 * Repositório de Histórico / Execução (§3.6 / §3.8).
 * dailyLogs/{YYYY-MM-DD} (com mealChecks embutidos) + subcoleções
 * sessions/{id}/sets/{id}. Base para Meu Dia (Fase 5), Calendário e Estatísticas.
 *
 * Persistência incremental: cada série é 1 doc em `sets`, gravada assim que
 * marcada — não se perde progresso se o app fechar no meio (R7).
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import { Collections } from '@/constants/firestore-paths';
import type { DailyLog, MealCheck, SetLog, WorkoutSessionLog } from '@/types/domain';
import { requireUid, userCollection, userSubDoc } from './base';

function dailyRef(uid: string, date: string) {
  return userSubDoc(uid, Collections.dailyLogs, date);
}
function sessionsCol(uid: string, date: string) {
  return collection(dailyRef(uid, date), Collections.sessions);
}
function sessionRef(uid: string, date: string, sessionId: string) {
  return doc(sessionsCol(uid, date), sessionId);
}
function setRef(uid: string, date: string, sessionId: string, setId: string) {
  return doc(collection(sessionRef(uid, date, sessionId), Collections.sets), setId);
}

// ── Dia + checklist de refeições ────────────────────────────────────
export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const uid = requireUid();
  const snap = await getDoc(dailyRef(uid, date));
  if (!snap.exists()) return null;
  const d = snap.data() as Partial<DailyLog> | undefined;
  return {
    date,
    isRestDay: d?.isRestDay ?? false,
    dietPlanId: d?.dietPlanId ?? null,
    mealChecks: d?.mealChecks ?? [],
    ...(d?.notes != null ? { notes: d.notes } : {}),
  };
}

export async function setDailyMealChecks(
  date: string,
  dietPlanId: string | null,
  mealChecks: MealCheck[],
): Promise<void> {
  const uid = requireUid();
  await setDoc(dailyRef(uid, date), { date, dietPlanId, mealChecks }, { merge: true });
}

// ── Sessões de treino ───────────────────────────────────────────────
export async function startWorkoutSession(
  date: string,
  session: Omit<WorkoutSessionLog, 'id'>,
): Promise<string> {
  const uid = requireUid();
  // Garante o doc do dia sem sobrescrever mealChecks; `hasWorkout` marca o dia
  // como "treinado" para o Calendário ler sem varrer subcoleções (Fase 6).
  await setDoc(
    dailyRef(uid, date),
    { date, isRestDay: false, hasWorkout: true },
    { merge: true },
  );
  const ref = await addDoc(sessionsCol(uid, date), session);
  return ref.id;
}

export async function finishWorkoutSession(
  date: string,
  sessionId: string,
  finishedAt: number,
  /** Maior carga por exercício desta sessão — agregada no dailyLog p/ Estatísticas. */
  sessionMaxLoads: Record<string, number> = {},
): Promise<void> {
  const uid = requireUid();
  await setDoc(sessionRef(uid, date, sessionId), { finishedAt }, { merge: true });
  if (Object.keys(sessionMaxLoads).length > 0) {
    await mergeDailyMaxLoads(uid, date, sessionMaxLoads);
  }
}

/**
 * Funde (por MAX) as cargas máximas da sessão no resumo do dia. Assim o gráfico
 * de carga é lido direto do dailyLog (via listDaySummaries), sem varrer `sets`.
 */
async function mergeDailyMaxLoads(
  uid: string,
  date: string,
  sessionMaxLoads: Record<string, number>,
): Promise<void> {
  const ref = dailyRef(uid, date);
  const snap = await getDoc(ref);
  const existing =
    (snap.exists()
      ? (snap.data() as { workoutMaxLoads?: Record<string, number> }).workoutMaxLoads
      : undefined) ?? {};
  const merged = { ...existing };
  for (const [name, weight] of Object.entries(sessionMaxLoads)) {
    merged[name] = Math.max(merged[name] ?? 0, weight);
  }
  await setDoc(ref, { workoutMaxLoads: merged }, { merge: true });
}

export async function listSessions(date: string): Promise<WorkoutSessionLog[]> {
  const uid = requireUid();
  const snap = await getDocs(sessionsCol(uid, date));
  return snap.docs.map((s) => ({
    id: s.id,
    ...(s.data() as Omit<WorkoutSessionLog, 'id'>),
  }));
}

// ── Séries (1 doc por série; escrita incremental, R7) ───────────────
export async function upsertSetLog(
  date: string,
  sessionId: string,
  set: SetLog,
): Promise<void> {
  const uid = requireUid();
  const { id, ...data } = set;
  await setDoc(setRef(uid, date, sessionId, id), data as FirebaseFirestoreTypes.DocumentData, {
    merge: true,
  });
}

export async function listSetLogs(date: string, sessionId: string): Promise<SetLog[]> {
  const uid = requireUid();
  const snap = await getDocs(collection(sessionRef(uid, date, sessionId), Collections.sets));
  return snap.docs.map((s) => ({ id: s.id, ...(s.data() as Omit<SetLog, 'id'>) }));
}

export interface SessionWithSets {
  session: WorkoutSessionLog;
  sets: SetLog[];
}

/** Sessões do dia, cada uma com suas séries — usado no detalhe do Calendário. */
export async function listSessionsWithSets(date: string): Promise<SessionWithSets[]> {
  const sessions = await listSessions(date);
  return Promise.all(
    sessions.map(async (session) => ({ session, sets: await listSetLogs(date, session.id) })),
  );
}

// ── Resumo por período (Calendário Fase 6 + Estatísticas Fase 7) ────
export interface DaySummary {
  date: string; // YYYY-MM-DD
  isRestDay: boolean;
  hasWorkout: boolean;
  mealsPlanned: number;
  mealsChecked: number;
  consumedKcal: number;
  plannedKcal: number;
  /** Maior carga por exercício no dia (exerciseNameSnapshot → kg). */
  maxLoads: Record<string, number>;
}

/**
 * Lê os dailyLogs de um intervalo (inclusive) para colorir a grade do mês.
 * Uma leve consulta por range no campo `date` (id = data) — sem tocar nas
 * subcoleções (usa o flag `hasWorkout`).
 */
export async function listDaySummaries(
  startDate: string,
  endDate: string,
): Promise<DaySummary[]> {
  const uid = requireUid();
  const snap = await getDocs(
    query(
      userCollection(uid, Collections.dailyLogs),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date'),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data() as {
      isRestDay?: boolean;
      hasWorkout?: boolean;
      mealChecks?: MealCheck[];
      workoutMaxLoads?: Record<string, number>;
    };
    const checks = data.mealChecks ?? [];
    return {
      date: d.id,
      isRestDay: data.isRestDay ?? false,
      hasWorkout: data.hasWorkout ?? false,
      mealsPlanned: checks.length,
      mealsChecked: checks.filter((c) => c.checked).length,
      consumedKcal: checks.reduce((a, c) => a + (c.checked ? c.plannedKcalSnapshot : 0), 0),
      plannedKcal: checks.reduce((a, c) => a + c.plannedKcalSnapshot, 0),
      maxLoads: data.workoutMaxLoads ?? {},
    };
  });
}
