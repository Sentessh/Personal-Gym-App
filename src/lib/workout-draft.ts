/**
 * Manipulação PURA da "cópia de trabalho" de uma ficha (WorkoutPlan) no editor.
 * Toda função recebe o plano atual e devolve um NOVO plano (imutável) — sem
 * tocar em rede nem em estado global. Fácil de testar e desacoplado da UI.
 *
 * Estrutura editada: ficha → blocos (Treino A/B) → seções (grupo muscular) →
 * exercícios (séries + modalidade). O `orderIndex` é sempre a posição no array.
 */
import { newId } from './id';
import type {
  PlannedExercise,
  WorkoutBlock,
  WorkoutPlan,
  WorkoutSection,
} from '@/types/domain';

const BLOCK_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function emptyPlan(): WorkoutPlan {
  return { id: '', name: '', createdAt: 0, updatedAt: 0, blocks: [] };
}

function emptyExercise(orderIndex: number): PlannedExercise {
  return { exerciseName: '', setsCount: 3, modality: 'NORMAL', orderIndex };
}

/** Recalcula orderIndex = posição após remoções/reordenações. */
function reindex<T extends { orderIndex: number }>(arr: T[]): T[] {
  return arr.map((it, i) => (it.orderIndex === i ? it : { ...it, orderIndex: i }));
}

// ── Blocos ──────────────────────────────────────────────────────────
export function addBlock(plan: WorkoutPlan): WorkoutPlan {
  const letter = BLOCK_LETTERS[plan.blocks.length] ?? String(plan.blocks.length + 1);
  const block: WorkoutBlock = {
    id: newId(),
    name: `Treino ${letter}`,
    orderIndex: plan.blocks.length,
    sections: [],
  };
  return { ...plan, blocks: [...plan.blocks, block] };
}

export function updateBlock(
  plan: WorkoutPlan,
  bi: number,
  patch: Partial<Pick<WorkoutBlock, 'name'>>,
): WorkoutPlan {
  return { ...plan, blocks: plan.blocks.map((b, i) => (i === bi ? { ...b, ...patch } : b)) };
}

export function removeBlock(plan: WorkoutPlan, bi: number): WorkoutPlan {
  return { ...plan, blocks: reindex(plan.blocks.filter((_, i) => i !== bi)) };
}

function mapBlock(
  plan: WorkoutPlan,
  bi: number,
  fn: (b: WorkoutBlock) => WorkoutBlock,
): WorkoutPlan {
  return { ...plan, blocks: plan.blocks.map((b, i) => (i === bi ? fn(b) : b)) };
}

// ── Seções (grupo muscular) ─────────────────────────────────────────
export function addSection(plan: WorkoutPlan, bi: number): WorkoutPlan {
  return mapBlock(plan, bi, (b) => ({
    ...b,
    sections: [...b.sections, { muscleGroup: '', orderIndex: b.sections.length, exercises: [] }],
  }));
}

export function updateSection(
  plan: WorkoutPlan,
  bi: number,
  si: number,
  patch: Partial<Pick<WorkoutSection, 'muscleGroup'>>,
): WorkoutPlan {
  return mapBlock(plan, bi, (b) => ({
    ...b,
    sections: b.sections.map((s, i) => (i === si ? { ...s, ...patch } : s)),
  }));
}

export function removeSection(plan: WorkoutPlan, bi: number, si: number): WorkoutPlan {
  return mapBlock(plan, bi, (b) => ({
    ...b,
    sections: reindex(b.sections.filter((_, i) => i !== si)),
  }));
}

function mapSection(
  plan: WorkoutPlan,
  bi: number,
  si: number,
  fn: (s: WorkoutSection) => WorkoutSection,
): WorkoutPlan {
  return mapBlock(plan, bi, (b) => ({
    ...b,
    sections: b.sections.map((s, i) => (i === si ? fn(s) : s)),
  }));
}

// ── Exercícios ──────────────────────────────────────────────────────
export function addExercise(plan: WorkoutPlan, bi: number, si: number): WorkoutPlan {
  return mapSection(plan, bi, si, (s) => ({
    ...s,
    exercises: [...s.exercises, emptyExercise(s.exercises.length)],
  }));
}

export function updateExercise(
  plan: WorkoutPlan,
  bi: number,
  si: number,
  ei: number,
  patch: Partial<PlannedExercise>,
): WorkoutPlan {
  return mapSection(plan, bi, si, (s) => ({
    ...s,
    exercises: s.exercises.map((e, i) => (i === ei ? { ...e, ...patch } : e)),
  }));
}

export function removeExercise(
  plan: WorkoutPlan,
  bi: number,
  si: number,
  ei: number,
): WorkoutPlan {
  return mapSection(plan, bi, si, (s) => ({
    ...s,
    exercises: reindex(s.exercises.filter((_, i) => i !== ei)),
  }));
}

/** Valida a ficha antes de salvar. Retorna mensagem de erro ou null se ok. */
export function validatePlan(plan: WorkoutPlan): string | null {
  if (!plan.name.trim()) return 'Dê um nome à ficha.';
  for (const b of plan.blocks) {
    if (!b.name.trim()) return 'Todo bloco precisa de um nome.';
    for (const s of b.sections) {
      if (!s.muscleGroup.trim()) return 'Todo grupo muscular precisa de um nome.';
      for (const e of s.exercises) {
        if (!e.exerciseName.trim()) return 'Todo exercício precisa de um nome.';
        if (!(e.setsCount > 0)) return `Séries inválidas em "${e.exerciseName.trim()}".`;
      }
    }
  }
  return null;
}
