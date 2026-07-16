/**
 * Agregações PURAS das Estatísticas (§5, Fase 7). Sem UI nem rede: recebem os
 * dados brutos do histórico e devolvem pontos prontos para os gráficos.
 */
import { todayISO } from './date';
import type { DaySummary } from '@/repositories/history-repo';
import type { BodyWeightEntry } from '@/types/domain';

export interface ChartPoint {
  label: string;
  value: number;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Data (local) da segunda-feira da semana de `iso` — chave/label de semana. */
function weekMondayISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const mondayOffset = (dt.getDay() + 6) % 7; // 0 = segunda
  dt.setDate(dt.getDate() - mondayOffset);
  return todayISO(dt);
}

/** Evolução do peso corporal (ascendente por data). */
export function weightSeries(entries: BodyWeightEntry[]): ChartPoint[] {
  return [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ label: shortDate(e.date), value: e.weightKg }));
}

/** Adesão calórica por dia: % consumido/planejado (só dias com plano). */
export function calorieAdherenceSeries(summaries: DaySummary[]): ChartPoint[] {
  return summaries
    .filter((s) => s.plannedKcal > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      label: shortDate(s.date),
      value: Math.round((s.consumedKcal / s.plannedKcal) * 100),
    }));
}

/** Constância: número de dias treinados por semana. */
export function workoutsPerWeek(summaries: DaySummary[]): ChartPoint[] {
  const byWeek = new Map<string, number>();
  for (const s of summaries) {
    if (!s.hasWorkout) continue;
    const key = weekMondayISO(s.date);
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monday, count]) => ({ label: shortDate(monday), value: count }));
}

/** Exercícios com carga registrada no período (para o seletor do gráfico de carga). */
export function exercisesInSummaries(summaries: DaySummary[]): string[] {
  const names = new Set<string>();
  for (const s of summaries) for (const name of Object.keys(s.maxLoads)) names.add(name);
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Evolução de carga de um exercício: a maior carga do dia (pré-agregada no
 * resumo do dia ao finalizar o treino) — reflete a progressão real de peso.
 */
export function loadSeries(summaries: DaySummary[], exerciseName: string): ChartPoint[] {
  return summaries
    .filter((s) => s.maxLoads[exerciseName] != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ label: shortDate(s.date), value: s.maxLoads[exerciseName] }));
}
