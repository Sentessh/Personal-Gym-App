import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing, Success } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatISODate } from '@/lib/date';
import {
  getDailyLog,
  listSessionsWithSets,
  type SessionWithSets,
} from '@/repositories/history-repo';
import type { DailyLog, Modality, SetLog } from '@/types/domain';

const MODALITY_LABEL: Record<Modality, string> = {
  NORMAL: 'Normal',
  MUSCLE_ROUND: 'Muscle Round',
  LOW_VOLUME: 'Low Volume',
};

/** Detalhe do dia (Fase 6) — lê dailyLogs/{data} + sessões/séries do histórico. */
export default function DiaDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const theme = useTheme();

  const [log, setLog] = useState<DailyLog | null>(null);
  const [sessions, setSessions] = useState<SessionWithSets[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [dailyLog, withSets] = await Promise.all([
          getDailyLog(date),
          listSessionsWithSets(date),
        ]);
        if (!active) return;
        setLog(dailyLog);
        setSessions(withSets);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [date]);

  const checks = log?.mealChecks ?? [];
  const mealsChecked = checks.filter((c) => c.checked).length;
  const consumedKcal = checks.reduce((a, c) => a + (c.checked ? c.plannedKcalSnapshot : 0), 0);
  const plannedKcal = checks.reduce((a, c) => a + c.plannedKcalSnapshot, 0);
  const nothing = !loading && !log && sessions.length === 0;

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ title: formatISODate(date) }} />
      <SafeAreaView style={styles.root} edges={['bottom']}>
        {loading ? (
          <ActivityIndicator style={styles.spacer} color={theme.text} />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {nothing ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhum registro neste dia.
              </ThemedText>
            ) : null}

            {log?.isRestDay ? (
              <ThemedView type="backgroundElement" style={styles.restBadge}>
                <Ionicons name="bed-outline" size={18} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Dia de descanso
                </ThemedText>
              </ThemedView>
            ) : null}

            {/* Treino realizado */}
            {sessions.length > 0 ? (
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  TREINO
                </ThemedText>
                {sessions.map(({ session, sets }) => (
                  <ThemedView key={session.id} type="backgroundElement" style={styles.card}>
                    <View style={styles.sessionHead}>
                      <ThemedText type="smallBold">{session.blockNameSnapshot}</ThemedText>
                      <Ionicons
                        name={session.finishedAt ? 'checkmark-done' : 'time-outline'}
                        size={18}
                        color={session.finishedAt ? Success : theme.textSecondary}
                      />
                    </View>
                    {groupSets(sets).map((g) => (
                      <View key={g.name} style={styles.exercise}>
                        <ThemedText type="small">
                          {g.name}
                          <ThemedText type="small" themeColor="textSecondary">
                            {'  '}· {MODALITY_LABEL[g.modality]}
                          </ThemedText>
                        </ThemedText>
                        <View style={styles.setsWrap}>
                          {g.sets.map((s) => (
                            <ThemedText
                              key={s.id}
                              type="small"
                              themeColor="textSecondary"
                              style={[styles.setChip, s.completed && { color: Success }]}>
                              {s.setNumber}ª {formatSet(s)}
                            </ThemedText>
                          ))}
                        </View>
                      </View>
                    ))}
                  </ThemedView>
                ))}
              </View>
            ) : null}

            {/* Adesão à dieta */}
            {checks.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sessionHead}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    DIETA
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {mealsChecked}/{checks.length} · {consumedKcal}/{plannedKcal} kcal
                  </ThemedText>
                </View>
                <ThemedView type="backgroundElement" style={styles.card}>
                  {checks.map((c, i) => (
                    <View
                      key={c.mealId}
                      style={[styles.mealRow, i < checks.length - 1 && styles.divider]}>
                      <Ionicons
                        name={c.checked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={c.checked ? Accent : theme.textSecondary}
                      />
                      <ThemedText type="small" style={styles.mealName}>
                        {c.mealNameSnapshot}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {c.plannedKcalSnapshot} kcal
                      </ThemedText>
                    </View>
                  ))}
                </ThemedView>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function formatSet(s: SetLog): string {
  const w = s.weightUsed != null ? `${s.weightUsed} kg` : '—';
  const r = s.repsDone != null ? `${s.repsDone} reps` : '—';
  return `${w} × ${r}`;
}

/** Agrupa as séries por exercício (ordem de aparição), ordenando por nº da série. */
function groupSets(sets: SetLog[]): { name: string; modality: Modality; sets: SetLog[] }[] {
  const sorted = [...sets].sort((a, b) => a.id.localeCompare(b.id));
  const groups: { name: string; modality: Modality; sets: SetLog[] }[] = [];
  const index = new Map<string, number>();
  for (const s of sorted) {
    const key = s.exerciseNameSnapshot;
    if (!index.has(key)) {
      index.set(key, groups.length);
      groups.push({ name: key, modality: s.modalitySnapshot, sets: [] });
    }
    groups[index.get(key)!].sets.push(s);
  }
  groups.forEach((g) => g.sets.sort((a, b) => a.setNumber - b.setNumber));
  return groups;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { marginTop: Spacing.five },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  section: { gap: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.three },
  sessionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exercise: { gap: Spacing.one },
  setsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  setChip: {},
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  mealName: { flex: 1 },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
});
