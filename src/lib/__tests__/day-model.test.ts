import { describe, expect, it } from '@jest/globals';
import {
  calorieProgress,
  deriveMealChecks,
  plannedGroupsForBlock,
  sessionMaxLoads,
} from '@/lib/day-model';
import type { DietPlan, Food, MealCheck, SetLog, WorkoutBlock } from '@/types/domain';

const foods = new Map<string, Food>([
  ['a', { id: 'a', name: 'Arroz', kcalPer100g: 200, carbsPer100g: 0, proteinPer100g: 0, fatPer100g: 0, source: 'taco' }],
]);

const dietWithOneMeal: DietPlan = {
  id: 'p',
  name: 'x',
  createdAt: 0,
  updatedAt: 0,
  meals: [
    { id: 'm1', name: 'Café', orderIndex: 0, items: [{ foodId: 'a', foodNameSnapshot: 'Arroz', quantityGrams: 100 }] },
  ],
};

const set = (over: Partial<SetLog>): SetLog => ({
  id: 'x',
  exerciseNameSnapshot: 'Supino',
  modalitySnapshot: 'NORMAL',
  setNumber: 1,
  weightUsed: null,
  repsDone: null,
  completed: false,
  completedAt: null,
  ...over,
});

describe('deriveMealChecks', () => {
  it('preserva o estado marcado e congela a kcal planejada', () => {
    const stored: MealCheck[] = [
      { mealId: 'm1', mealNameSnapshot: 'Café', plannedKcalSnapshot: 999, checked: true, checkedAt: 123 },
    ];
    const out = deriveMealChecks(dietWithOneMeal, foods, stored);
    expect(out[0].checked).toBe(true);
    expect(out[0].checkedAt).toBe(123);
    expect(out[0].plannedKcalSnapshot).toBe(200); // recalculado do plano atual
  });

  it('refeição nova começa desmarcada', () => {
    const out = deriveMealChecks(dietWithOneMeal, foods, []);
    expect(out[0].checked).toBe(false);
    expect(out[0].checkedAt).toBeNull();
  });
});

describe('calorieProgress', () => {
  it('soma consumido (marcados) e planejado (todos)', () => {
    const checks: MealCheck[] = [
      { mealId: '1', mealNameSnapshot: 'A', plannedKcalSnapshot: 300, checked: true, checkedAt: 1 },
      { mealId: '2', mealNameSnapshot: 'B', plannedKcalSnapshot: 500, checked: false, checkedAt: null },
    ];
    expect(calorieProgress(checks)).toEqual({ consumed: 300, planned: 800 });
  });
});

describe('plannedGroupsForBlock', () => {
  it('gera séries com id determinístico, snapshots e carga sugerida', () => {
    const block: WorkoutBlock = {
      id: 'b',
      name: 'A',
      orderIndex: 0,
      sections: [
        {
          muscleGroup: 'Peito',
          orderIndex: 0,
          exercises: [{ exerciseName: 'Supino', setsCount: 2, modality: 'NORMAL', targetLoad: 60, orderIndex: 0 }],
        },
      ],
    };
    const groups = plannedGroupsForBlock(block);
    expect(groups).toHaveLength(1);
    expect(groups[0].sets.map((s) => s.id)).toEqual(['s0e0n1', 's0e0n2']);
    expect(groups[0].sets[0]).toMatchObject({
      exerciseNameSnapshot: 'Supino',
      modalitySnapshot: 'NORMAL',
      setNumber: 1,
      weightUsed: 60,
    });
  });
});

describe('sessionMaxLoads', () => {
  it('pega a maior carga entre séries concluídas, ignorando incompletas/sem peso', () => {
    const out = sessionMaxLoads([
      set({ exerciseNameSnapshot: 'Supino', completed: true, weightUsed: 60 }),
      set({ exerciseNameSnapshot: 'Supino', completed: true, weightUsed: 64 }),
      set({ exerciseNameSnapshot: 'Supino', completed: false, weightUsed: 100 }),
      set({ exerciseNameSnapshot: 'Agacho', completed: true, weightUsed: 80 }),
      set({ exerciseNameSnapshot: 'Agacho', completed: true, weightUsed: null }),
    ]);
    expect(out).toEqual({ Supino: 64, Agacho: 80 });
  });
});
