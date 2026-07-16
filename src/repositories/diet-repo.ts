/**
 * Repositório de Dieta (planejamento + alimentos, §3.4 / §3.8).
 * Cada plano é UM documento em users/{uid}/dietPlans/{planId} com refeições →
 * itens embutidos.
 *
 * Alimentos: a base TACO é EMBARCADA (bundle, `@/data/foods`) e pesquisada em
 * memória; alimentos `custom` do usuário ficam em users/{uid}/foods. A busca
 * mescla as duas fontes.
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
import { TACO_FOODS } from '@/data/foods';
import type { DietPlan, Food } from '@/types/domain';
import { requireUid, userCollection, userSubDoc } from './base';

/** Dados para criar um alimento personalizado (valores por 100 g). */
export type NewFoodData = Pick<
  Food,
  'name' | 'kcalPer100g' | 'carbsPer100g' | 'proteinPer100g' | 'fatPer100g'
>;

function slug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ── Planos de dieta ─────────────────────────────────────────────────
function mapPlan(id: string, data: Omit<DietPlan, 'id'>): DietPlan {
  return { id, ...data };
}

function toDocData(plan: DietPlan, now: number): Omit<DietPlan, 'id'> {
  return {
    name: plan.name.trim(),
    createdAt: plan.createdAt || now,
    updatedAt: now,
    meals: plan.meals.map((m, mi) => ({
      id: m.id,
      name: m.name.trim(),
      orderIndex: mi,
      ...(m.time?.trim() ? { time: m.time.trim() } : {}),
      items: m.items.map((it) => ({
        foodId: it.foodId,
        foodNameSnapshot: it.foodNameSnapshot,
        quantityGrams: it.quantityGrams,
      })),
    })),
  };
}

export async function listDietPlans(): Promise<DietPlan[]> {
  const uid = requireUid();
  const snap = await getDocs(
    query(userCollection(uid, Collections.dietPlans), orderBy('updatedAt', 'desc')),
  );
  return snap.docs.map((d) => mapPlan(d.id, d.data() as Omit<DietPlan, 'id'>));
}

export async function getDietPlan(planId: string): Promise<DietPlan | null> {
  const uid = requireUid();
  const snap = await getDoc(userSubDoc(uid, Collections.dietPlans, planId));
  if (!snap.exists()) return null;
  return mapPlan(snap.id, snap.data() as Omit<DietPlan, 'id'>);
}

export async function saveDietPlan(plan: DietPlan): Promise<string> {
  const uid = requireUid();
  const data = toDocData(plan, Date.now());
  let id = plan.id;
  if (id) {
    await setDoc(userSubDoc(uid, Collections.dietPlans, id), data);
  } else {
    const ref = await addDoc(userCollection(uid, Collections.dietPlans), data);
    id = ref.id;
  }
  return id;
}

export async function deleteDietPlan(planId: string): Promise<void> {
  const uid = requireUid();
  await deleteDoc(userSubDoc(uid, Collections.dietPlans, planId));
}

// ── Alimentos (TACO embarcada + custom no Firestore) ────────────────
async function listCustomFoods(): Promise<Food[]> {
  const uid = requireUid();
  const snap = await getDocs(userCollection(uid, Collections.foods));
  return snap.docs.map((d) => ({
    id: d.id,
    source: 'custom' as const,
    ...(d.data() as Omit<Food, 'id' | 'source'>),
  }));
}

/** Todos os alimentos disponíveis (bundle + custom) para montar o mapa de cálculo. */
export async function getAllFoods(): Promise<Food[]> {
  const custom = await listCustomFoods();
  return [...TACO_FOODS, ...custom];
}

/** Busca por substring (sem acento) mesclando TACO e custom; até 20 resultados. */
export async function searchFoods(queryText: string): Promise<Food[]> {
  const all = await getAllFoods();
  const q = slug(queryText);
  const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (!q) return sorted.slice(0, 20);
  return sorted.filter((f) => slug(f.name).includes(q)).slice(0, 20);
}

export async function addCustomFood(data: NewFoodData): Promise<Food> {
  const uid = requireUid();
  const payload = {
    name: data.name.trim(),
    kcalPer100g: data.kcalPer100g,
    carbsPer100g: data.carbsPer100g,
    proteinPer100g: data.proteinPer100g,
    fatPer100g: data.fatPer100g,
    source: 'custom' as const,
  };
  const ref = await addDoc(userCollection(uid, Collections.foods), payload);
  return { id: ref.id, ...payload };
}
