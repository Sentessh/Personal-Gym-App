/**
 * Manipulação PURA da cópia de trabalho de um plano de dieta (DietPlan) no
 * editor: plano → refeições → itens (alimento + gramas). Sempre imutável.
 * Espelha o `workout-draft.ts` da Fase 2.
 */
import { timeToMinutes } from './date';
import { newId } from './id';
import type { DietPlan, Food, Meal, MealItem } from '@/types/domain';

export function emptyPlan(): DietPlan {
  return { id: '', name: '', createdAt: 0, updatedAt: 0, meals: [] };
}

/**
 * Reordena as refeições por horário (mais cedo primeiro); refeições sem hora
 * vão para o fim. Estável: empates mantêm a ordem de criação. Reatribui
 * `orderIndex` conforme a nova posição.
 */
export function sortMealsByTime(plan: DietPlan): DietPlan {
  const meals = plan.meals
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      const d = timeToMinutes(a.m.time) - timeToMinutes(b.m.time);
      return d !== 0 ? d : a.i - b.i;
    })
    .map(({ m }, idx) => (m.orderIndex === idx ? m : { ...m, orderIndex: idx }));
  return { ...plan, meals };
}

function reindex<T extends { orderIndex: number }>(arr: T[]): T[] {
  return arr.map((it, i) => (it.orderIndex === i ? it : { ...it, orderIndex: i }));
}

// ── Refeições ───────────────────────────────────────────────────────
export function addMeal(plan: DietPlan): DietPlan {
  const meal: Meal = {
    id: newId('m'),
    name: `Refeição ${plan.meals.length + 1}`,
    orderIndex: plan.meals.length,
    items: [],
  };
  return { ...plan, meals: [...plan.meals, meal] };
}

export function updateMeal(
  plan: DietPlan,
  mi: number,
  patch: Partial<Pick<Meal, 'name' | 'time'>>,
): DietPlan {
  return { ...plan, meals: plan.meals.map((m, i) => (i === mi ? { ...m, ...patch } : m)) };
}

export function removeMeal(plan: DietPlan, mi: number): DietPlan {
  return { ...plan, meals: reindex(plan.meals.filter((_, i) => i !== mi)) };
}

function mapMeal(plan: DietPlan, mi: number, fn: (m: Meal) => Meal): DietPlan {
  return { ...plan, meals: plan.meals.map((m, i) => (i === mi ? fn(m) : m)) };
}

// ── Itens (alimento + quantidade) ───────────────────────────────────
export function addItem(plan: DietPlan, mi: number, food: Food): DietPlan {
  const item: MealItem = {
    foodId: food.id,
    foodNameSnapshot: food.name,
    quantityGrams: 100,
  };
  return mapMeal(plan, mi, (m) => ({ ...m, items: [...m.items, item] }));
}

export function updateItem(
  plan: DietPlan,
  mi: number,
  ii: number,
  patch: Partial<Pick<MealItem, 'quantityGrams'>>,
): DietPlan {
  return mapMeal(plan, mi, (m) => ({
    ...m,
    items: m.items.map((it, i) => (i === ii ? { ...it, ...patch } : it)),
  }));
}

export function removeItem(plan: DietPlan, mi: number, ii: number): DietPlan {
  return mapMeal(plan, mi, (m) => ({ ...m, items: m.items.filter((_, i) => i !== ii) }));
}

/** Valida o plano antes de salvar. Retorna mensagem de erro ou null se ok. */
export function validatePlan(plan: DietPlan): string | null {
  if (!plan.name.trim()) return 'Dê um nome à dieta.';
  for (const m of plan.meals) {
    if (!m.name.trim()) return 'Toda refeição precisa de um nome.';
    for (const it of m.items) {
      if (!(it.quantityGrams > 0)) {
        return `Quantidade inválida em "${it.foodNameSnapshot}".`;
      }
    }
  }
  return null;
}
