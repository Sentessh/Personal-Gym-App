/**
 * Base de alimentos EMBARCADA (bundle) — starter curado (§ Fase 3).
 *
 * ⚠️ Conjunto reduzido de alimentos comuns com valores por 100 g. NÃO é a TACO
 * completa — deve ser substituído pela tabela oficial (NEPA/Unicamp) depois,
 * preservando os `id` já usados (fichas de dieta referenciam alimentos por id).
 *
 * Fica no bundle (não no Firestore) porque é dado de referência estático:
 * busca em memória, instantânea e offline, sem custo de leitura. Alimentos
 * `custom` do usuário ficam em users/{uid}/foods (ver diet-repo).
 */
import rawTaco from '@/assets/data/taco.json';
import type { Food } from '@/types/domain';

export const TACO_FOODS: Food[] = (rawTaco as Omit<Food, 'source'>[]).map((f) => ({
  ...f,
  source: 'taco' as const,
}));
