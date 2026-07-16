import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing, Success } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/date';
import { listDaySummaries, type DaySummary } from '@/repositories/history-repo';

/** Aba Calendário (Fase 6) — grade mensal colorida + acesso ao detalhe do dia. */
export default function CalendarioScreen() {
  const theme = useTheme();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [marks, setMarks] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { year, month } = cursor;
    const start = todayISO(new Date(year, month, 1));
    const end = todayISO(new Date(year, month + 1, 0));
    const summaries = await listDaySummaries(start, end);
    setMarks(new Map(summaries.map((s) => [s.date, dotsFor(s, theme.textSecondary)])));
    setLoading(false);
  }, [cursor, theme.textSecondary]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Calendário</ThemedText>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <MonthCalendar
            year={cursor.year}
            month={cursor.month}
            marks={marks}
            onSelectDay={(date) => router.push(`/dia/${date}`)}
            onPrev={() => shift(-1)}
            onNext={() => shift(1)}
          />

          {loading ? <ActivityIndicator style={styles.spacer} color={theme.text} /> : null}

          <View style={styles.legend}>
            <LegendItem color={Success} label="Treinado" />
            <LegendItem color={theme.textSecondary} label="Descanso" />
            <LegendItem color={Accent} label="Dieta" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Marcadores do dia: um quadradinho por atividade (treino verde + dieta azul + descanso cinza). */
function dotsFor(s: DaySummary, restColor: string): string[] {
  const dots: string[] = [];
  if (s.hasWorkout) dots.push(Success);
  if (s.mealsChecked > 0) dots.push(Accent);
  if (s.isRestDay) dots.push(restColor);
  return dots;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
  spacer: { marginTop: Spacing.three },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
    marginTop: Spacing.four,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
