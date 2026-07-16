import { describe, expect, it } from '@jest/globals';
import {
  addItem,
  addMeal,
  emptyPlan,
  removeItem,
  removeMeal,
  sortMealsByTime,
  updateItem,
  updateMeal,
  validatePlan,
} from '@/lib/diet-draft';
import type { DietPlan, Food } from '@/types/domain';

const food = (id: string): Food => ({
  id,
  name: `Food ${id}`,
  kcalPer100g: 100,
  carbsPer100g: 0,
  proteinPer100g: 0,
  fatPer100g: 0,
  source: 'taco',
});

describe('diet-draft', () => {
  it('addMeal numera e indexa em sequência', () => {
    let plan = emptyPlan();
    plan = addMeal(plan);
    plan = addMeal(plan);
    expect(plan.meals.map((m) => m.name)).toEqual(['Refeição 1', 'Refeição 2']);
    expect(plan.meals.map((m) => m.orderIndex)).toEqual([0, 1]);
  });

  it('addItem usa o snapshot do nome e 100g padrão', () => {
    let plan = addMeal(emptyPlan());
    plan = addItem(plan, 0, food('a'));
    expect(plan.meals[0].items[0]).toMatchObject({
      foodId: 'a',
      foodNameSnapshot: 'Food a',
      quantityGrams: 100,
    });
  });

  it('updateItem e removeItem alteram a refeição certa', () => {
    let plan = addItem(addMeal(emptyPlan()), 0, food('a'));
    plan = updateItem(plan, 0, 0, { quantityGrams: 250 });
    expect(plan.meals[0].items[0].quantityGrams).toBe(250);
    plan = removeItem(plan, 0, 0);
    expect(plan.meals[0].items).toHaveLength(0);
  });

  it('removeMeal reindexa', () => {
    let plan = addMeal(addMeal(addMeal(emptyPlan())));
    plan = updateMeal(plan, 1, { name: 'Meio' });
    plan = removeMeal(plan, 0);
    expect(plan.meals.map((m) => m.orderIndex)).toEqual([0, 1]);
    expect(plan.meals[0].name).toBe('Meio');
  });

  it('sortMealsByTime ordena por horário; sem hora vai por último', () => {
    const plan: DietPlan = {
      id: '',
      name: 'x',
      createdAt: 0,
      updatedAt: 0,
      meals: [
        { id: 'm1', name: 'Almoço', time: '12:00', orderIndex: 0, items: [] },
        { id: 'm2', name: 'Café', time: '07:00', orderIndex: 1, items: [] },
        { id: 'm3', name: 'SemHora', orderIndex: 2, items: [] },
      ],
    };
    const sorted = sortMealsByTime(plan);
    expect(sorted.meals.map((m) => m.name)).toEqual(['Café', 'Almoço', 'SemHora']);
    expect(sorted.meals.map((m) => m.orderIndex)).toEqual([0, 1, 2]);
  });

  it('validatePlan detecta problemas e aceita plano válido', () => {
    expect(validatePlan(emptyPlan())).toMatch(/nome/i);

    const semNomeRefeicao = addMeal({ ...emptyPlan(), name: 'Dieta' });
    semNomeRefeicao.meals[0].name = '';
    expect(validatePlan(semNomeRefeicao)).toMatch(/refeição/i);

    let ok = addItem(addMeal({ ...emptyPlan(), name: 'Dieta' }), 0, food('a'));
    expect(validatePlan(ok)).toBeNull();

    ok = updateItem(ok, 0, 0, { quantityGrams: 0 });
    expect(validatePlan(ok)).toMatch(/quantidade/i);
  });
});
