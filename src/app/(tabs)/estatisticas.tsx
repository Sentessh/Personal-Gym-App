import { useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChart } from '@/components/bar-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing, Success } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/date';
import {
  calorieAdherenceSeries,
  exercisesInSummaries,
  loadSeries,
  weightSeries,
  workoutsPerWeek,
} from '@/lib/stats';
import { listBodyWeights } from '@/repositories/profile-repo';
import { listDaySummaries, type DaySummary } from '@/repositories/history-repo';
import type { BodyWeightEntry } from '@/types/domain';

type Period = '30' | '90' | 'all';
const PERIODS: { key: Period; label: string }[] = [
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: 'all', label: 'Tudo' },
];

function startForPeriod(p: Period): string {
  if (p === 'all') return '2000-01-01';
  const days = p === '30' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  return todayISO(d);
}

/** Aba Estatísticas (Fase 7) — 4 gráficos + seletor de período. */
export default function EstatisticasScreen() {
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>('30');
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadToken = useRef(0);

  const load = useCallback(async () => {
    const token = ++loadToken.current;
    const start = startForPeriod(period);
    const end = todayISO();
    setLoading(true);
    // Tudo vem de 2 queries leves: resumos do período (inclui carga máx/dia) + pesos.
    const [daySummaries, allWeights] = await Promise.all([
      listDaySummaries(start, end),
      listBodyWeights(),
    ]);
    if (loadToken.current !== token) return;
    setSummaries(daySummaries);
    setWeights(allWeights.filter((w) => w.date >= start && w.date <= end));
    setLoading(false);
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const exercises = exercisesInSummaries(summaries);
  const activeExercise =
    selectedExercise && exercises.includes(selectedExercise) ? selectedExercise : exercises[0];

  const weightPoints = weightSeries(weights);
  // Escala 0 → maior peso arredondado para cima na dezena (ex.: 82,4 → 90).
  const weightMax = weightPoints.length
    ? Math.ceil(Math.max(...weightPoints.map((p) => p.value)) / 10) * 10
    : undefined;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Estatísticas</ThemedText>
        </View>

        {/* Seletor de período */}
        <View style={styles.periodRow}>
          <View style={[styles.segment, { backgroundColor: theme.backgroundSelected }]}>
            {PERIODS.map((p) => {
              const active = p.key === period;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={[styles.seg, active && { backgroundColor: Accent }]}>
                  <ThemedText type="small" style={{ color: active ? '#ffffff' : theme.textSecondary }}>
                    {p.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.spacer} color={theme.text} />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <Section title="EVOLUÇÃO DO PESO (kg)">
              <BarChart
                data={weightPoints}
                maxValue={weightMax}
                color={theme.text}
                formatValue={(v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
              />
            </Section>

            <Section title="CARGA POR EXERCÍCIO (kg)">
              {exercises.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Nenhuma série registrada no período.
                </ThemedText>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chips}>
                    {exercises.map((ex) => {
                      const active = ex === activeExercise;
                      return (
                        <Pressable
                          key={ex}
                          onPress={() => setSelectedExercise(ex)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active ? Accent : theme.backgroundElement,
                            },
                          ]}>
                          <ThemedText
                            type="small"
                            style={{ color: active ? '#ffffff' : theme.text }}>
                            {ex}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <BarChart data={activeExercise ? loadSeries(summaries, activeExercise) : []} />
                </>
              )}
            </Section>

            <Section title="CONSTÂNCIA (treinos/semana)">
              <BarChart data={workoutsPerWeek(summaries)} color={Success} />
            </Section>

            <Section title="ADESÃO CALÓRICA (% do plano)">
              <BarChart
                data={calorieAdherenceSeries(summaries)}
                target={100}
                formatValue={(v) => `${Math.round(v)}%`}
                colorForValue={(v) => (v >= 100 ? Success : Accent)}
              />
            </Section>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {title}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        {children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  periodRow: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  segment: { flexDirection: 'row', borderRadius: Spacing.two, padding: 2 },
  seg: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Spacing.one + 2 },
  spacer: { marginTop: Spacing.five },
  content: { padding: Spacing.four, paddingTop: Spacing.two, gap: Spacing.four },
  section: { gap: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three },
  chips: { gap: Spacing.two, paddingBottom: Spacing.three },
  chip: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: 999 },
});
