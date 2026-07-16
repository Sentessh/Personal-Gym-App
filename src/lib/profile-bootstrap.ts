/**
 * Carrega o perfil e o peso mais recente para o store, uma vez que o usuário
 * está autenticado. O resultado decide o gate de onboarding (§4.7):
 * perfil null → primeira execução → fluxo de onboarding.
 */
import { getLatestBodyWeight, getProfile } from '@/repositories/profile-repo';
import { useProfileStore } from '@/store/profile-store';

export async function bootstrapProfile(): Promise<void> {
  const store = useProfileStore.getState();
  store.setStatus('loading');
  try {
    const [profile, latestWeight] = await Promise.all([
      getProfile(),
      getLatestBodyWeight(),
    ]);
    store.setLoaded(profile, latestWeight);
  } catch (e) {
    store.setError(
      e instanceof Error ? e.message : 'Falha ao carregar o perfil',
    );
  }
}
