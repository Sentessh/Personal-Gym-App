import { describe, expect, it } from '@jest/globals';
import {
  addBlock,
  addExercise,
  addSection,
  emptyPlan,
  removeBlock,
  removeExercise,
  updateBlock,
  updateExercise,
  updateSection,
  validatePlan,
} from '@/lib/workout-draft';

describe('workout-draft', () => {
  it('addBlock nomeia Treino A, B… e indexa', () => {
    let plan = emptyPlan();
    plan = addBlock(plan);
    plan = addBlock(plan);
    expect(plan.blocks.map((b) => b.name)).toEqual(['Treino A', 'Treino B']);
    expect(plan.blocks.map((b) => b.orderIndex)).toEqual([0, 1]);
  });

  it('addExercise cria com padrões (3 séries, NORMAL)', () => {
    let plan = addSection(addBlock(emptyPlan()), 0);
    plan = addExercise(plan, 0, 0);
    const ex = plan.blocks[0].sections[0].exercises[0];
    expect(ex.setsCount).toBe(3);
    expect(ex.modality).toBe('NORMAL');
    expect(ex.orderIndex).toBe(0);
  });

  it('update* alteram os nós certos', () => {
    let plan = addExercise(addSection(addBlock(emptyPlan()), 0), 0, 0);
    plan = updateBlock(plan, 0, { name: 'Push' });
    plan = updateSection(plan, 0, 0, { muscleGroup: 'Peito' });
    plan = updateExercise(plan, 0, 0, 0, { exerciseName: 'Supino', setsCount: 4 });
    expect(plan.blocks[0].name).toBe('Push');
    expect(plan.blocks[0].sections[0].muscleGroup).toBe('Peito');
    expect(plan.blocks[0].sections[0].exercises[0]).toMatchObject({
      exerciseName: 'Supino',
      setsCount: 4,
    });
  });

  it('removeBlock/removeExercise reindexam', () => {
    let plan = addBlock(addBlock(emptyPlan()));
    plan = removeBlock(plan, 0);
    expect(plan.blocks.map((b) => b.orderIndex)).toEqual([0]);

    let p2 = addExercise(addExercise(addSection(addBlock(emptyPlan()), 0), 0, 0), 0, 0);
    p2 = removeExercise(p2, 0, 0, 0);
    expect(p2.blocks[0].sections[0].exercises.map((e) => e.orderIndex)).toEqual([0]);
  });

  it('validatePlan cobre nome, bloco, grupo, exercício e séries', () => {
    expect(validatePlan(emptyPlan())).toMatch(/nome/i);

    let plan = updateExercise(
      addExercise(addSection(addBlock({ ...emptyPlan(), name: 'Ficha' }), 0), 0, 0),
      0,
      0,
      0,
      { exerciseName: 'Supino' },
    );
    plan = updateSection(plan, 0, 0, { muscleGroup: 'Peito' });
    expect(validatePlan(plan)).toBeNull();

    const semSeries = updateExercise(plan, 0, 0, 0, { setsCount: 0 });
    expect(validatePlan(semSeries)).toMatch(/séries/i);
  });
});
