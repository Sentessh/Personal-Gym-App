import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { now, todayISO } from '@/lib/date';
import { plannedGroupsForBlock, sessionMaxLoads } from '@/lib/day-model';
import { parseDecimal } from '@/lib/number';
import {
  finishWorkoutSession,
  listSetLogs,
  startWorkoutSession,
  upsertSetLog,
} from '@/repositories/history-repo';
import { getWorkoutPlan } from '@/repositories/workout-repo';
import type { Modality, SetLog, WorkoutBlock } from '@/types/domain';

const MODALITY_LABEL: Record<Modality, string> = {
  NORMAL: 'Normal',
  MUSCLE_ROUND: 'Muscle Round',
  LOW_VOLUME: 'Low Volume',
};

/**
 * Modo de EXECUÇÃO de treino (Fase 5, R7). Gera as séries planejadas do bloco
 * ativo e persiste cada série assim que marcada/editada (1 doc por série).
 * A sessão só é criada no Firestore ao primeiro toque — sair sem marcar nada
 * não polui o histórico.
 */
export default function SessaoScreen() {
  const { planId, blockId, sessionId } = useLocalSearchParams<{
    planId: string;
    blockId: string;
    sessionId?: string;
  }>();
  const router = useRouter();
  const theme = useTheme();

  const [block, setBlock] = useState<WorkoutBlock | null>(null);
  const [loading, setLoading] = useState(true);
  // Só as séries que o usuário tocou; o restante vem do plano (baseById).
  const [overrides, setOverrides] = useState<Record<string, SetLog>>({});
  const [finishing, setFinishing] = useState(false);

  // Cria a sessão no máximo uma vez, mesmo com toques concorrentes.
  const sessionPromise = useRef<Promise<string> | null>(null);

  const groups = useMemo(() => (block ? plannedGroupsForBlock(block) : []), [block]);
  const baseById = useMemo(() => {
    const map: Record<string, SetLog> = {};
    groups.forEach((g) => g.sets.forEach((s) => (map[s.id] = s)));
    return map;
  }, [groups]);

  const setOf = (id: string): SetLog => overrides[id] ?? baseById[id];

  useEffect(() => {
    // Retomando uma sessão "em andamento": reaproveita o id em vez de criar outra.
    if (sessionId) sessionPromise.current = Promise.resolve(sessionId);
    let active = true;
    (async () => {
      try {
        const plan = planId ? await getWorkoutPlan(planId) : null;
        const found = plan?.blocks.find((b) => b.id === blockId) ?? null;
        if (!active) return;
        setBlock(found);
        // Retomando: carrega as séries já salvas e mescla como overrides.
        if (sessionId && found) {
          const saved = await listSetLogs(todayISO(), sessionId);
          if (active && saved.length) {
            setOverrides((prev) => {
              const next = { ...prev };
              saved.forEach((s) => (next[s.id] = s));
              return next;
            });
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [planId, blockId, sessionId]);

  function ensureSession(): Promise<string> {
    if (!sessionPromise.current && block) {
      sessionPromise.current = startWorkoutSession(todayISO(), {
        workoutBlockId: block.id,
        blockNameSnapshot: block.name,
        startedAt: now(),
        finishedAt: null,
      });
    }
    return sessionPromise.current ?? Promise.reject(new Error('Bloco indisponível.'));
  }

  function updateLocal(next: SetLog) {
    setOverrides((prev) => ({ ...prev, [next.id]: next }));
  }

  async function commit(next: SetLog) {
    updateLocal(next);
    try {
      const sessionId = await ensureSession();
      await upsertSetLog(todayISO(), sessionId, next);
    } catch {
      // Cache offline reflete localmente; falha real é rara. UI não trava.
    }
  }

  function toggleDone(set: SetLog) {
    const completed = !set.completed;
    commit({ ...set, completed, completedAt: completed ? now() : null });
  }

  async function finish() {
    setFinishing(true);
    try {
      if (sessionPromise.current) {
        const sessionId = await sessionPromise.current;
        const allSets = Object.keys(baseById).map((id) => setOf(id));
        await finishWorkoutSession(todayISO(), sessionId, now(), sessionMaxLoads(allSets));
      }
      router.back();
    } catch {
      setFinishing(false);
      Alert.alert('Erro', 'Não foi possível finalizar o treino.');
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (!block) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={{ title: 'Treino' }} />
        <ThemedText type="default" themeColor="textSecondary">
          Bloco não encontrado.
        </ThemedText>
      </ThemedView>
    );
  }

  const totalCount = Object.keys(baseById).length;
  const doneCount = Object.keys(baseById).filter((id) => setOf(id).completed).length;

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ title: block.name }} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.root} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {groups.map((group) => (
              <ThemedView key={group.key} type="backgroundElement" style={styles.exerciseCard}>
                <View>
                  <ThemedText type="smallBold">{group.exerciseName}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {group.muscleGroup} · {MODALITY_LABEL[group.modality]}
                    {group.targetReps ? ` · ${group.targetReps} reps` : ''}
                  </ThemedText>
                </View>

                {group.sets.map((planned) => {
                  const set = setOf(planned.id);
                  return (
                    <View key={set.id} style={styles.setRow}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.setLabel}>
                        {set.setNumber}ª
                      </ThemedText>
                      <View style={styles.setField}>
                        <TextField
                          label=""
                          value={set.weightUsed != null ? String(set.weightUsed) : ''}
                          onChangeText={(t) =>
                            updateLocal({ ...set, weightUsed: parseDecimal(t) ?? null })
                          }
                          onBlur={() => commit(setOf(set.id))}
                          keyboardType="decimal-pad"
                          placeholder="kg"
                          style={styles.numInput}
                        />
                      </View>
                      <View style={styles.setField}>
                        <TextField
                          label=""
                          value={set.repsDone != null ? String(set.repsDone) : ''}
                          onChangeText={(t) =>
                            updateLocal({
                              ...set,
                              repsDone: t.trim() ? parseInt(t, 10) || 0 : null,
                            })
                          }
                          onBlur={() => commit(setOf(set.id))}
                          keyboardType="number-pad"
                          placeholder="reps"
                          style={styles.numInput}
                        />
                      </View>
                      <Pressable onPress={() => toggleDone(set)} hitSlop={8}>
                        <Ionicons
                          name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={28}
                          color={set.completed ? Accent : theme.textSecondary}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </ThemedView>
            ))}
          </ScrollView>

          <ThemedView style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.progress}>
              {doneCount} de {totalCount} séries concluídas
            </ThemedText>
            <PrimaryButton title="Finalizar treino" onPress={finish} loading={finishing} />
          </ThemedView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  exerciseCard: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  setLabel: { width: 28 },
  setField: { flex: 1 },
  numInput: { textAlign: 'center', paddingVertical: Spacing.two },
  footer: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  progress: { textAlign: 'center' },
});
