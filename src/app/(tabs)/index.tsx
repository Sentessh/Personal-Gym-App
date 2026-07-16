import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing } from '@/constants/theme';
import { useActiveSelection } from '@/hooks/use-active-selection';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { now, todayISO } from '@/lib/date';
import { calorieProgress, deriveMealChecks } from '@/lib/day-model';
import { getAllFoods, getDietPlan } from '@/repositories/diet-repo';
import {
  getDailyLog,
  listSessions,
  setDailyMealChecks,
} from '@/repositories/history-repo';
import { getWorkoutPlan } from '@/repositories/workout-repo';
import type {
  DietPlan,
  MealCheck,
  WorkoutPlan,
  WorkoutSessionLog,
} from '@/types/domain';

/** Aba central "Meu Dia" (rota index) — dashboard do dia da seleção ativa. */
export default function MeuDiaScreen() {
  const theme = useTheme();
  const { profile } = useProfile();
  const { activeWorkoutPlanId, activeDietPlanId } = useActiveSelection();

  const [diet, setDiet] = useState<DietPlan | null>(null);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [checks, setChecks] = useState<MealCheck[]>([]);
  const [sessions, setSessions] = useState<WorkoutSessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickingBlock, setPickingBlock] = useState(false);

  const load = useCallback(async () => {
    const [foodsArr, dietPlan, workoutPlan, daily, todaySessions] = await Promise.all([
      getAllFoods(),
      activeDietPlanId ? getDietPlan(activeDietPlanId) : Promise.resolve(null),
      activeWorkoutPlanId ? getWorkoutPlan(activeWorkoutPlanId) : Promise.resolve(null),
      getDailyLog(todayISO()),
      listSessions(todayISO()),
    ]);
    const fmap = new Map(foodsArr.map((f) => [f.id, f]));
    setDiet(dietPlan);
    setWorkout(workoutPlan);
    setSessions(todaySessions);
    setChecks(dietPlan ? deriveMealChecks(dietPlan, fmap, daily?.mealChecks ?? []) : []);
    setLoading(false);
  }, [activeDietPlanId, activeWorkoutPlanId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggleMeal(mealId: string) {
    const next = checks.map((c) =>
      c.mealId === mealId
        ? { ...c, checked: !c.checked, checkedAt: !c.checked ? now() : null }
        : c,
    );
    setChecks(next);
    try {
      await setDailyMealChecks(todayISO(), activeDietPlanId, next);
    } catch {
      // Cache offline reflete localmente; não trava a UI.
    }
  }

  const progress = calorieProgress(checks);
  const hasNothingActive = !diet && !workout;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.greeting}>
            <ThemedText type="small" themeColor="textSecondary">
              Olá,
            </ThemedText>
            <ThemedText type="subtitle">{profile?.name ?? 'Atleta'}</ThemedText>
          </View>
          <Pressable
            accessibilityLabel="Abrir perfil"
            onPress={() => router.push('/perfil')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.profileButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.dimmed,
            ]}>
            <Ionicons name="person-outline" size={22} color={theme.text} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.spacer} color={theme.text} />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {hasNothingActive ? (
              <ThemedView type="backgroundElement" style={styles.emptyCard}>
                <Ionicons name="sparkles-outline" size={40} color={theme.textSecondary} />
                <ThemedText type="default" style={styles.emptyTitle}>
                  Defina seu dia
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Marque um treino e uma dieta como ativos para montar seu dia aqui.
                </ThemedText>
                <View style={styles.emptyBtns}>
                  <PrimaryButton
                    title="Escolher treino"
                    onPress={() => router.push('/treino')}
                    variant="secondary"
                  />
                  <PrimaryButton
                    title="Escolher dieta"
                    onPress={() => router.push('/dieta')}
                    variant="secondary"
                  />
                </View>
              </ThemedView>
            ) : null}

            {/* Bloco Refeições */}
            {diet ? (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    REFEIÇÕES · {diet.name}
                  </ThemedText>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {progress.consumed} / {progress.planned} kcal
                  </ThemedText>
                </View>
                {checks.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    A dieta ativa não tem refeições.
                  </ThemedText>
                ) : (
                  <ThemedView type="backgroundElement" style={styles.card}>
                    {checks.map((c, i) => (
                      <Pressable
                        key={c.mealId}
                        onPress={() => toggleMeal(c.mealId)}
                        style={[styles.mealRow, i < checks.length - 1 && styles.divider]}>
                        <Ionicons
                          name={c.checked ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={c.checked ? Accent : theme.textSecondary}
                        />
                        <ThemedText
                          type="default"
                          style={[styles.mealName, c.checked && styles.mealDone]}>
                          {c.mealNameSnapshot}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {c.plannedKcalSnapshot} kcal
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ThemedView>
                )}
              </View>
            ) : null}

            {/* Bloco Treino */}
            {workout ? (
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  TREINO · {workout.name}
                </ThemedText>

                {sessions.length > 0 ? (
                  <ThemedView type="backgroundElement" style={styles.card}>
                    {sessions.map((s, i) => {
                      // Sessão "em andamento" cujo bloco ainda existe no treino ativo → retomável.
                      const resumeBlock = s.finishedAt
                        ? undefined
                        : workout.blocks.find((b) => b.id === s.workoutBlockId);
                      const rowStyle = [
                        styles.sessionRow,
                        i < sessions.length - 1 && styles.divider,
                      ];
                      const content = (
                        <>
                          <Ionicons
                            name={s.finishedAt ? 'checkmark-done' : 'time-outline'}
                            size={20}
                            color={s.finishedAt ? Accent : theme.textSecondary}
                          />
                          <ThemedText type="small" style={styles.mealName}>
                            {s.blockNameSnapshot}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {s.finishedAt ? 'concluído' : 'em andamento'}
                          </ThemedText>
                          {resumeBlock ? (
                            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                          ) : null}
                        </>
                      );
                      return resumeBlock ? (
                        <Pressable
                          key={s.id}
                          style={rowStyle}
                          onPress={() =>
                            router.push({
                              pathname: '/sessao',
                              params: {
                                planId: workout.id,
                                blockId: resumeBlock.id,
                                sessionId: s.id,
                              },
                            })
                          }>
                          {content}
                        </Pressable>
                      ) : (
                        <View key={s.id} style={rowStyle}>
                          {content}
                        </View>
                      );
                    })}
                  </ThemedView>
                ) : null}

                {pickingBlock ? (
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.pickHint}>
                      Qual bloco você vai treinar?
                    </ThemedText>
                    {workout.blocks.length === 0 ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        O treino ativo não tem blocos.
                      </ThemedText>
                    ) : (
                      workout.blocks.map((b, i) => (
                        <Pressable
                          key={b.id}
                          onPress={() => {
                            setPickingBlock(false);
                            router.push({
                              pathname: '/sessao',
                              params: { planId: workout.id, blockId: b.id },
                            });
                          }}
                          style={[styles.blockRow, i < workout.blocks.length - 1 && styles.divider]}>
                          <ThemedText type="default">{b.name}</ThemedText>
                          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                        </Pressable>
                      ))
                    )}
                  </ThemedView>
                ) : (
                  <PrimaryButton title="Iniciar treino" onPress={() => setPickingBlock(true)} />
                )}
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  greeting: { flex: 1 },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.6 },
  spacer: { marginTop: Spacing.five },
  content: { padding: Spacing.four, gap: Spacing.four },
  section: { gap: Spacing.two },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  mealName: { flex: 1 },
  mealDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  pickHint: { paddingTop: Spacing.three },
  emptyCard: {
    borderRadius: Spacing.two,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: { marginTop: Spacing.one },
  emptyText: { textAlign: 'center' },
  emptyBtns: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
});
