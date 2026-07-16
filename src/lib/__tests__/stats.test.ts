import { describe, expect, it } from '@jest/globals';
import {
  calorieAdherenceSeries,
  exercisesInSummaries,
  loadSeries,
  weightSeries,
  workoutsPerWeek,
} from '@/lib/stats';
import type { DaySummary } from '@/repositories/history-repo';
import type { BodyWeightEntry } from '@/types/domain';

const day = (date: string, over: Partial<DaySummary> = {}): DaySummary => ({
  date,
  isRestDay: false,
  hasWorkout: false,
  mealsPlanned: 0,
  mealsChecked: 0,
  consumedKcal: 0,
  plannedKcal: 0,
  maxLoads: {},
  ...over,
});

describe('stats', () => {
  it('weightSeries ordena por data ascendente', () => {
    const w: BodyWeightEntry[] = [
      { id: '1', date: '2026-07-10', weightKg: 80 },
      { id: '2', date: '2026-07-01', weightKg: 82 },
    ];
    expect(weightSeries(w).map((p) => p.value)).toEqual([82, 80]);
  });

  it('calorieAdherenceSeries calcula % e pula dias sem plano', () => {
    const out = calorieAdherenceSeries([
      day('2026-07-01', { plannedKcal: 2000, consumedKcal: 1000 }),
      day('2026-07-02', { plannedKcal: 0 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(50);
  });

  it('workoutsPerWeek agrupa por semana (segunda)', () => {
    // 06/07 e 08/07 na mesma semana; 13/07 na seguinte.
    const out = workoutsPerWeek([
      day('2026-07-06', { hasWorkout: true }),
      day('2026-07-08', { hasWorkout: true }),
      day('2026-07-13', { hasWorkout: true }),
      day('2026-07-09', { hasWorkout: false }),
    ]);
    expect(out.map((p) => p.value)).toEqual([2, 1]);
  });

  it('exercisesInSummaries une e ordena', () => {
    expect(
      exercisesInSummaries([
        day('2026-07-01', { maxLoads: { Supino: 60 } }),
        day('2026-07-02', { maxLoads: { Agachamento: 80, Supino: 62 } }),
      ]),
    ).toEqual(['Agachamento', 'Supino']);
  });

  it('loadSeries filtra por exercício e ordena por data', () => {
    const out = loadSeries(
      [
        day('2026-07-03', { maxLoads: { Supino: 64 } }),
        day('2026-07-01', { maxLoads: { Supino: 60 } }),
        day('2026-07-02', { maxLoads: { Agachamento: 80 } }),
      ],
      'Supino',
    );
    expect(out.map((p) => p.value)).toEqual([60, 64]);
  });
});
