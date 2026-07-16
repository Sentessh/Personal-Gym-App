import { describe, expect, it } from '@jest/globals';
import {
  addMacros,
  dietMacros,
  macrosForQuantity,
  mealMacros,
  proteinPerKg,
  ZERO_MACROS,
} from '@/lib/nutrition';
import type { DietPlan, Food, Meal } from '@/types/domain';

const food = (id: string, kcal: number, c: number, p: number, f: number): Food => ({
  id,
  name: id,
  kcalPer100g: kcal,
  carbsPer100g: c,
  proteinPer100g: p,
  fatPer100g: f,
  source: 'taco',
});

describe('nutrition', () => {
  it('macrosForQuantity escala pela quantidade em gramas', () => {
    const m = macrosForQuantity(food('frango', 159, 0, 32, 2.5), 150);
    expect(m.kcal).toBeCloseTo(238.5);
    expect(m.protein).toBeCloseTo(48);
    expect(m.fat).toBeCloseTo(3.75);
    expect(m.carbs).toBe(0);
  });

  it('mealMacros soma itens e ignora alimentos ausentes no mapa', () => {
    const foods = new Map<string, Food>([['a', food('a', 100, 10, 5, 2)]]);
    const meal: Meal = {
      id: 'm',
      name: 'Refeição',
      orderIndex: 0,
      items: [
        { foodId: 'a', foodNameSnapshot: 'a', quantityGrams: 200 },
        { foodId: 'sumiu', foodNameSnapshot: '?', quantityGrams: 100 },
      ],
    };
    const m = mealMacros(meal, foods);
    expect(m.kcal).toBeCloseTo(200);
    expect(m.protein).toBeCloseTo(10);
    expect(m.carbs).toBeCloseTo(20);
  });

  it('dietMacros soma todas as refeições', () => {
    const foods = new Map<string, Food>([['a', food('a', 100, 0, 0, 0)]]);
    const plan: DietPlan = {
      id: 'p',
      name: 'x',
      createdAt: 0,
      updatedAt: 0,
      meals: [
        { id: 'm1', name: 'A', orderIndex: 0, items: [{ foodId: 'a', foodNameSnapshot: 'a', quantityGrams: 100 }] },
        { id: 'm2', name: 'B', orderIndex: 1, items: [{ foodId: 'a', foodNameSnapshot: 'a', quantityGrams: 50 }] },
      ],
    };
    expect(dietMacros(plan, foods).kcal).toBeCloseTo(150);
  });

  it('proteinPerKg protege contra peso inválido', () => {
    expect(proteinPerKg(150, 75)).toBeCloseTo(2);
    expect(proteinPerKg(100, null)).toBeNull();
    expect(proteinPerKg(100, 0)).toBeNull();
  });

  it('addMacros parte do zero', () => {
    expect(addMacros(ZERO_MACROS, { kcal: 1, carbs: 2, protein: 3, fat: 4 })).toEqual({
      kcal: 1,
      carbs: 2,
      protein: 3,
      fat: 4,
    });
  });
});
