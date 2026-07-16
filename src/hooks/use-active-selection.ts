import { useShallow } from 'zustand/react/shallow';

import { useActiveSelectionStore } from '@/store/active-selection-store';

/** Seleção ativa (treino/dieta vigentes) para a UI. */
export function useActiveSelection() {
  return useActiveSelectionStore(
    useShallow((s) => ({
      activeWorkoutPlanId: s.activeWorkoutPlanId,
      activeDietPlanId: s.activeDietPlanId,
      status: s.status,
    })),
  );
}
