/**
 * Repositório de Treino (planejamento, §3.3 / §3.8).
 * Cada ficha é UM único documento em users/{uid}/workoutPlans/{planId} com
 * blocos → seções → exercícios embutidos (leitura/escrita como unidade).
 *
 * O catálogo `exercises` (autocomplete) é alimentado automaticamente a partir
 * dos nomes usados nas fichas ao salvar — cresce com o uso, sem seed manual.
 */
import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from '@react-native-firebase/firestore';

import { Collections } from '@/constants/firestore-paths';
import type { ExerciseCatalogItem, WorkoutPlan } from '@/types/domain';
import { requireUid, userCollection, userSubDoc } from './base';

/** Normaliza um nome para id de catálogo / busca (sem acento, minúsculo). */
function slug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapPlan(id: string, data: Omit<WorkoutPlan, 'id'>): WorkoutPlan {
  return { id, ...data };
}

/** Converte a cópia de trabalho em documento: remove id/undefined e reindexa. */
function toDocData(plan: WorkoutPlan, now: number): Omit<WorkoutPlan, 'id'> {
  return {
    name: plan.name.trim(),
    ...(plan.notes?.trim() ? { notes: plan.notes.trim() } : {}),
    createdAt: plan.createdAt || now,
    updatedAt: now,
    blocks: plan.blocks.map((b, bi) => ({
      id: b.id,
      name: b.name.trim(),
      orderIndex: bi,
      sections: b.sections.map((s, si) => ({
        muscleGroup: s.muscleGroup.trim(),
        orderIndex: si,
        exercises: s.exercises.map((e, ei) => ({
          exerciseName: e.exerciseName.trim(),
          setsCount: e.setsCount,
          modality: e.modality,
          orderIndex: ei,
          // Firestore RN rejeita `undefined` — só inclui se preenchido.
          ...(e.targetReps?.trim() ? { targetReps: e.targetReps.trim() } : {}),
          ...(e.targetLoad != null ? { targetLoad: e.targetLoad } : {}),
        })),
      })),
    })),
  };
}

export async function listWorkoutPlans(): Promise<WorkoutPlan[]> {
  const uid = requireUid();
  const snap = await getDocs(
    query(userCollection(uid, Collections.workoutPlans), orderBy('updatedAt', 'desc')),
  );
  return snap.docs.map((d) => mapPlan(d.id, d.data() as Omit<WorkoutPlan, 'id'>));
}

export async function getWorkoutPlan(planId: string): Promise<WorkoutPlan | null> {
  const uid = requireUid();
  const snap = await getDoc(userSubDoc(uid, Collections.workoutPlans, planId));
  if (!snap.exists()) return null;
  return mapPlan(snap.id, snap.data() as Omit<WorkoutPlan, 'id'>);
}

/** Cria (id vazio) ou sobrescreve a ficha inteira; devolve o id do documento. */
export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<string> {
  const uid = requireUid();
  const data = toDocData(plan, Date.now());

  let id = plan.id;
  if (id) {
    await setDoc(userSubDoc(uid, Collections.workoutPlans, id), data);
  } else {
    const ref = await addDoc(userCollection(uid, Collections.workoutPlans), data);
    id = ref.id;
  }

  await upsertCatalog(uid, plan);
  return id;
}

export async function deleteWorkoutPlan(planId: string): Promise<void> {
  const uid = requireUid();
  await deleteDoc(userSubDoc(uid, Collections.workoutPlans, planId));
}

/** Busca no catálogo por prefixo/substring (client-side; catálogo pessoal, pequeno). */
export async function searchExercises(queryText: string): Promise<ExerciseCatalogItem[]> {
  const uid = requireUid();
  const snap = await getDocs(
    query(userCollection(uid, Collections.exercises), orderBy('name')),
  );
  const all = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ExerciseCatalogItem, 'id'>),
  }));
  const q = slug(queryText);
  if (!q) return all.slice(0, 8);
  return all.filter((e) => slug(e.name).includes(q)).slice(0, 8);
}

/** Grava (merge) cada exercício da ficha no catálogo, deduplicado por slug. */
async function upsertCatalog(uid: string, plan: WorkoutPlan): Promise<void> {
  const seen = new Map<string, ExerciseCatalogItem>();
  for (const b of plan.blocks) {
    for (const s of b.sections) {
      for (const e of s.exercises) {
        const name = e.exerciseName.trim();
        const key = slug(name);
        if (!key || seen.has(key)) continue;
        seen.set(key, {
          id: key,
          name,
          ...(s.muscleGroup.trim() ? { defaultMuscleGroup: s.muscleGroup.trim() } : {}),
        });
      }
    }
  }
  await Promise.all(
    [...seen.values()].map(({ id, ...value }) =>
      setDoc(userSubDoc(uid, Collections.exercises, id), value, { merge: true }),
    ),
  );
}
