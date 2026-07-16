import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { CollapsibleCard } from '@/components/collapsible-card';
import { ExerciseNameInput } from '@/components/exercise-name-input';
import { ModalityPicker } from '@/components/modality-picker';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Danger, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseDecimal } from '@/lib/number';
import {
  addBlock,
  addExercise,
  addSection,
  emptyPlan,
  removeBlock,
  removeExercise,
  removeSection,
  updateBlock,
  updateExercise,
  updateSection,
  validatePlan,
} from '@/lib/workout-draft';
import {
  getWorkoutPlan,
  saveWorkoutPlan,
} from '@/repositories/workout-repo';
import type { WorkoutPlan } from '@/types/domain';

/**
 * Editor de ficha (Fase 2) — tela única com edição em cascata:
 * ficha → blocos (Treino A/B) → seções (grupo muscular) → exercícios.
 * Trabalha sobre uma cópia local do plano e grava tudo num único documento.
 */
export default function FichaEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const router = useRouter();
  const theme = useTheme();

  const [plan, setPlan] = useState<WorkoutPlan>(() => emptyPlan());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isNew) return;
    let active = true;
    (async () => {
      try {
        const p = await getWorkoutPlan(id);
        if (active && p) {
          setPlan(p);
          setExpanded(new Set(p.blocks.map((b) => b.id)));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, isNew]);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleAddBlock() {
    const next = addBlock(plan);
    const created = next.blocks[next.blocks.length - 1];
    setPlan(next);
    // Já abre o bloco recém-criado para edição.
    setExpanded((e) => new Set(e).add(created.id));
  }

  async function handleSave() {
    const msg = validatePlan(plan);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveWorkoutPlan(plan);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  }

  function confirmRemoveBlock(bi: number, name: string) {
    Alert.alert('Excluir bloco', `Remover "${name || 'bloco'}" e tudo dentro dele?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => setPlan((p) => removeBlock(p, bi)) },
    ]);
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ title: isNew ? 'Nova ficha' : 'Editar ficha' }} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.root} edges={['bottom']}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <TextField
              label="Nome da ficha"
              value={plan.name}
              onChangeText={(name) => setPlan((p) => ({ ...p, name }))}
              placeholder="Ex.: Hipertrofia Verão"
              autoCapitalize="sentences"
            />
            <TextField
              label="Observações — opcional"
              value={plan.notes ?? ''}
              onChangeText={(notes) => setPlan((p) => ({ ...p, notes }))}
              placeholder="Notas gerais da ficha"
              multiline
            />

            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={styles.sectionLabel}>
              BLOCOS
            </ThemedText>

            {plan.blocks.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhum bloco ainda. Adicione um Treino A para começar.
              </ThemedText>
            ) : (
              plan.blocks.map((block, bi) => (
                <CollapsibleCard
                  key={block.id}
                  title={block.name}
                  subtitle={`${block.sections.length} grupo(s) muscular(es)`}
                  expanded={expanded.has(block.id)}
                  onToggle={() => toggle(block.id)}
                  onDelete={() => confirmRemoveBlock(bi, block.name)}>
                  <TextField
                    label="Nome do bloco"
                    value={block.name}
                    onChangeText={(name) => setPlan((p) => updateBlock(p, bi, { name }))}
                    placeholder="Ex.: Treino A"
                  />

                  {block.sections.map((section, si) => {
                    const key = `${block.id}:${si}`;
                    return (
                      <CollapsibleCard
                        key={key}
                        tone="backgroundSelected"
                        title={section.muscleGroup || 'Grupo muscular'}
                        subtitle={`${section.exercises.length} exercício(s)`}
                        expanded={expanded.has(key)}
                        onToggle={() => toggle(key)}
                        onDelete={() => setPlan((p) => removeSection(p, bi, si))}>
                        <TextField
                          label="Grupo muscular / foco"
                          value={section.muscleGroup}
                          onChangeText={(muscleGroup) =>
                            setPlan((p) => updateSection(p, bi, si, { muscleGroup }))
                          }
                          placeholder="Ex.: Peito"
                          autoCapitalize="sentences"
                        />

                        {section.exercises.map((ex, ei) => (
                          <ThemedView
                            key={ei}
                            type="backgroundElement"
                            style={styles.exercise}>
                            <ExerciseNameInput
                              value={ex.exerciseName}
                              onChangeText={(exerciseName) =>
                                setPlan((p) =>
                                  updateExercise(p, bi, si, ei, { exerciseName }),
                                )
                              }
                              onPickMuscleGroup={(mg) =>
                                setPlan((p) =>
                                  section.muscleGroup.trim()
                                    ? p
                                    : updateSection(p, bi, si, { muscleGroup: mg }),
                                )
                              }
                            />
                            <View style={styles.fieldRow}>
                              <View style={styles.fieldHalf}>
                                <TextField
                                  label="Séries"
                                  value={ex.setsCount ? String(ex.setsCount) : ''}
                                  onChangeText={(t) =>
                                    setPlan((p) =>
                                      updateExercise(p, bi, si, ei, {
                                        setsCount: parseInt(t, 10) || 0,
                                      }),
                                    )
                                  }
                                  keyboardType="number-pad"
                                  placeholder="4"
                                />
                              </View>
                              <View style={styles.fieldHalf}>
                                <TextField
                                  label="Reps — opcional"
                                  value={ex.targetReps ?? ''}
                                  onChangeText={(t) =>
                                    setPlan((p) =>
                                      updateExercise(p, bi, si, ei, { targetReps: t }),
                                    )
                                  }
                                  placeholder="8-12"
                                />
                              </View>
                            </View>
                            <ThemedText type="smallBold" themeColor="textSecondary">
                              Modalidade
                            </ThemedText>
                            <ModalityPicker
                              value={ex.modality}
                              onChange={(modality) =>
                                setPlan((p) => updateExercise(p, bi, si, ei, { modality }))
                              }
                            />
                            <View style={styles.fieldRow}>
                              <View style={styles.fieldHalf}>
                                <TextField
                                  label="Carga (kg) — opcional"
                                  value={ex.targetLoad != null ? String(ex.targetLoad) : ''}
                                  onChangeText={(t) =>
                                    setPlan((p) =>
                                      updateExercise(p, bi, si, ei, {
                                        targetLoad: parseDecimal(t) ?? undefined,
                                      }),
                                    )
                                  }
                                  keyboardType="decimal-pad"
                                  placeholder="40"
                                />
                              </View>
                              <Pressable
                                onPress={() => setPlan((p) => removeExercise(p, bi, si, ei))}
                                style={styles.removeExercise}
                                hitSlop={8}>
                                <Ionicons name="trash-outline" size={18} color={Danger} />
                                <ThemedText type="small" style={{ color: Danger }}>
                                  Remover
                                </ThemedText>
                              </Pressable>
                            </View>
                          </ThemedView>
                        ))}

                        <AddRow
                          label="Adicionar exercício"
                          onPress={() => setPlan((p) => addExercise(p, bi, si))}
                        />
                      </CollapsibleCard>
                    );
                  })}

                  <AddRow
                    label="Adicionar grupo muscular"
                    onPress={() => setPlan((p) => addSection(p, bi))}
                  />
                </CollapsibleCard>
              ))
            )}

            <AddRow label="Adicionar bloco" onPress={handleAddBlock} />

            {error ? (
              <ThemedText type="small" style={{ color: Danger }}>
                {error}
              </ThemedText>
            ) : null}
          </ScrollView>

          <ThemedView style={styles.footer}>
            <PrimaryButton title="Salvar ficha" onPress={handleSave} loading={saving} />
          </ThemedView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

/** Linha "＋ Adicionar …" reutilizada nos três níveis. */
function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.addRow} hitSlop={6}>
      <Ionicons name="add-circle-outline" size={20} color={Accent} />
      <ThemedText type="smallBold" style={{ color: Accent }}>
        {label}
      </ThemedText>
    </Pressable>
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
  sectionLabel: { marginTop: Spacing.two },
  exercise: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  fieldRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-end' },
  fieldHalf: { flex: 1 },
  removeExercise: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  footer: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
