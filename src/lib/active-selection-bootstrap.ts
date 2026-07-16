/**
 * Liga o listener em tempo real da seleção ativa ao store, uma vez que o
 * usuário está autenticado. Espelha o padrão de `initAuth`: retorna a função
 * de unsubscribe para o efeito de layout limpar ao desmontar.
 */
import { subscribeActiveSelection } from '@/repositories/active-selection-repo';
import { useActiveSelectionStore } from '@/store/active-selection-store';

export function initActiveSelection(): () => void {
  const store = useActiveSelectionStore.getState();
  try {
    return subscribeActiveSelection(
      (selection) => store.setSelection(selection),
      (error) => store.setError(error.message),
    );
  } catch (e) {
    store.setError(e instanceof Error ? e.message : 'Falha ao carregar seleção ativa');
    return () => {};
  }
}
