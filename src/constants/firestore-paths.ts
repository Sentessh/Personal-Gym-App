/**
 * Nomes centralizados de coleções e documentos do Firestore (§3.8).
 * Estrutura: users/{uid}/<coleção>/...
 */

export const Collections = {
  bodyWeightLog: 'bodyWeightLog',
  exercises: 'exercises',
  foods: 'foods',
  workoutPlans: 'workoutPlans',
  dietPlans: 'dietPlans',
  dailyLogs: 'dailyLogs',
  config: 'config',
  // Subcoleções de dailyLogs/{date}
  sessions: 'sessions',
  // Subcoleção de sessions/{sessionId}
  sets: 'sets',
} as const;

/** Documentos singleton dentro de users/{uid}. */
export const ConfigDocs = {
  activeSelection: 'activeSelection',
} as const;
