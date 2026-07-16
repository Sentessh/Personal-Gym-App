/**
 * Cálculos nutricionais — módulo PURO (§5). Sem UI nem rede: recebe dados,
 * devolve números. Os totais são DERIVADOS de `food × quantity_grams` e nunca
 * armazenados no planejamento (§3.4), garantindo consistência ao editar.
 */
import type { DietPlan, Food, Meal } from '@/types/domain';

export interface Macros {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
}

export const ZERO_MACROS: Macros = { kcal: 0, carbs: 0, protein: 0, fat: 0 };

type PerHundred = Pick<
  Food,
  'kcalPer100g' | 'carbsPer100g' | 'proteinPer100g' | 'fatPer100g'
>;

/** Macros de um alimento numa dada quantidade em gramas. */
export function macrosForQuantity(food: PerHundred, grams: number): Macros {
  const factor = grams / 100;
  return {
    kcal: food.kcalPer100g * factor,
    carbs: food.carbsPer100g * factor,
    protein: food.proteinPer100g * factor,
    fat: food.fatPer100g * factor,
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    carbs: a.carbs + b.carbs,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
  };
}

/** Total de uma refeição; itens cujo alimento não está no mapa são ignorados. */
export function mealMacros(meal: Meal, foods: Map<string, Food>): Macros {
  return meal.items.reduce((acc, item) => {
    const food = foods.get(item.foodId);
    if (!food) return acc;
    return addMacros(acc, macrosForQuantity(food, item.quantityGrams));
  }, ZERO_MACROS);
}

/** Total do plano inteiro (soma das refeições). */
export function dietMacros(plan: DietPlan, foods: Map<string, Food>): Macros {
  return plan.meals.reduce((acc, m) => addMacros(acc, mealMacros(m, foods)), ZERO_MACROS);
}

/**
 * g de proteína por kg de peso corporal (regra-chave da dieta, §3.4).
 * Usa o peso mais recente; retorna null se não houver peso válido.
 */
export function proteinPerKg(
  proteinGrams: number,
  bodyWeightKg: number | null | undefined,
): number | null {
  if (!bodyWeightKg || bodyWeightKg <= 0) return null;
  return proteinGrams / bodyWeightKg;
}
