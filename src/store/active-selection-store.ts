import { create } from 'zustand';

import type { ActiveSelection } from '@/types/domain';

export type ActiveSelectionStatus = 'loading' | 'loaded' | 'error';

interface ActiveSelectionState {
  activeWorkoutPlanId: string | null;
  activeDietPlanId: string | null;
  status: ActiveSelectionStatus;
  error: string | null;
  setSelection: (selection: ActiveSelection | null) => void;
  setError: (message: string) => void;
}

/**
 * Estado da SELEÇÃO ATIVA (regra de negócio central, §3.5). Alimentado por um
 * listener em tempo real do doc users/{uid}/config/activeSelection — é a fonte
 * que a aba "Meu Dia" (Fase 5) usa para montar o dia.
 */
export const useActiveSelectionStore = create<ActiveSelectionState>((set) => ({
  activeWorkoutPlanId: null,
  activeDietPlanId: null,
  status: 'loading',
  error: null,
  setSelection: (selection) =>
    set({
      activeWorkoutPlanId: selection?.activeWorkoutPlanId ?? null,
      activeDietPlanId: selection?.activeDietPlanId ?? null,
      status: 'loaded',
      error: null,
    }),
  setError: (error) => set({ status: 'error', error }),
}));
