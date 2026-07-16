/**
 * Helpers PUROS da aba "Meu Dia" (Fase 5): derivam o dia a partir da seleção
 * ativa. Sem UI nem rede.
 *
 * Snapshots (§3.7): ao marcar refeições/séries, congelam-se nome e kcal
 * planejadas no momento — o histórico não muda se o plano for editado depois.
 */
import { mealMacros } from './nutrition';
import type {
  DietPlan,
  Food,
  MealCheck,
  Modality,
  SetLog,
  WorkoutBlock,
} from '@/types/domain';

/**
 * Lista de refeições do dia a partir da dieta ativa, preservando o estado
 * (checked) já salvo. `plannedKcalSnapshot` é congelado no momento da leitura.
 */
export function deriveMealChecks(
  diet: DietPlan,
  foods: Map<string, Food>,
  stored: MealCheck[],
): MealCheck[] {
  const byId = new Map(stored.map((c) => [c.mealId, c]));
  return diet.meals.map((meal) => {
    const prev = byId.get(meal.id);
    const checked = prev?.checked ?? false;
    return {
      mealId: meal.id,
      mealNameSnapshot: meal.name,
      plannedKcalSnapshot: Math.round(mealMacros(meal, foods).kcal),
      checked,
      checkedAt: checked ? prev?.checkedAt ?? Date.now() : null,
    };
  });
}

/** kcal consumidas (refeições marcadas) e planejadas (todas). */
export function calorieProgress(checks: MealCheck[]): { consumed: number; planned: number } {
  return checks.reduce(
    (acc, c) => ({
      consumed: acc.consumed + (c.checked ? c.plannedKcalSnapshot : 0),
      planned: acc.planned + c.plannedKcalSnapshot,
    }),
    { consumed: 0, planned: 0 },
  );
}

/** Maior carga por exercício entre as séries CONCLUÍDAS (resumo p/ Estatísticas). */
export function sessionMaxLoads(sets: SetLog[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sets) {
    if (!s.completed || s.weightUsed == null) continue;
    out[s.exerciseNameSnapshot] = Math.max(out[s.exerciseNameSnapshot] ?? 0, s.weightUsed);
  }
  return out;
}

/** Exercício com suas séries planejadas, para o modo de execução. */
export interface ExecGroup {
  key: string;
  muscleGroup: string;
  exerciseName: string;
  modality: Modality;
  targetReps?: string;
  sets: SetLog[];
}

/**
 * Gera os grupos (exercício → séries) de um bloco. Cada série vira um SetLog
 * com id determinístico (estável para upsert incremental) e carga sugerida
 * pré-preenchida a partir de `targetLoad`.
 */
export function plannedGroupsForBlock(block: WorkoutBlock): ExecGroup[] {
  const groups: ExecGroup[] = [];
  block.sections.forEach((section, si) => {
    section.exercises.forEach((ex, ei) => {
      const sets: SetLog[] = [];
      for (let n = 1; n <= ex.setsCount; n++) {
        sets.push({
          id: `s${si}e${ei}n${n}`,
          exerciseNameSnapshot: ex.exerciseName,
          modalitySnapshot: ex.modality,
          setNumber: n,
          weightUsed: ex.targetLoad ?? null,
          repsDone: null,
          completed: false,
          completedAt: null,
        });
      }
      groups.push({
        key: `s${si}e${ei}`,
        muscleGroup: section.muscleGroup,
        exerciseName: ex.exerciseName,
        modality: ex.modality,
        ...(ex.targetReps ? { targetReps: ex.targetReps } : {}),
        sets,
      });
    });
  });
  return groups;
}
