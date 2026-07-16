/**
 * Gera um id local estável para entidades EMBUTIDAS (ex.: blocos de treino
 * dentro do documento da ficha). Não é um id de documento do Firestore —
 * serve para o React (`key`) e para casar snapshots do histórico (§3.7).
 */
export function newId(prefix = 'b'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
