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

import { FoodSearch } from '@/components/food-search';
import { NewFoodForm } from '@/components/new-food-form';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Danger, MaxContentWidth, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { maskTime } from '@/lib/date';
import {
  addItem,
  addMeal,
  emptyPlan,
  removeItem,
  removeMeal,
  sortMealsByTime,
  updateItem,
  updateMeal,
  validatePlan,
} from '@/lib/diet-draft';
import {
  dietMacros,
  macrosForQuantity,
  mealMacros,
  proteinPerKg,
  ZERO_MACROS,
} from '@/lib/nutrition';
import { parseDecimal } from '@/lib/number';
import {
  addCustomFood,
  getAllFoods,
  getDietPlan,
  saveDietPlan,
  type NewFoodData,
} from '@/repositories/diet-repo';
import type { DietPlan, Food } from '@/types/domain';

const fmt = (n: number, d = 0) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Editor de dieta (Fase 3) — tela única com modo leitura ⇄ edição e rodapé
 * fixo com totais AO VIVO (kcal, C/P/G, g proteína/kg). Trabalha sobre uma
 * cópia local; grava tudo num único documento (refeições → itens embutidos).
 */
export default function DietaEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const router = useRouter();
  const theme = useTheme();
  const { latestWeight } = useProfile();

  const [plan, setPlan] = useState<DietPlan>(() => emptyPlan());
  const [foods, setFoods] = useState<Map<string, Food>>(new Map());
  const [mode, setMode] = useState<'read' | 'edit'>(isNew ? 'edit' : 'read');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewFood, setShowNewFood] = useState(false);
  // id da refeição cuja busca de alimento está aberta (evita teclado por engano).
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);
  // ids das refeições minimizadas (recolhidas) para encurtar a tela.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const original = useRef<DietPlan | null>(null);

  function toggleCollapsed(mealId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(mealId)) next.delete(mealId);
      else next.add(mealId);
      return next;
    });
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await getAllFoods();
        const map = new Map(all.map((f) => [f.id, f]));
        const loaded = isNew ? null : await getDietPlan(id);
        if (!active) return;
        setFoods(map);
        if (loaded) {
          setPlan(loaded);
          original.current = loaded;
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const totals = useMemo(
    () => (foods.size ? dietMacros(plan, foods) : ZERO_MACROS),
    [plan, foods],
  );
  const protPerKg = proteinPerKg(totals.protein, latestWeight?.weightKg);

  async function handleSave() {
    const msg = validatePlan(plan);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // Persiste (e passa a exibir) as refeições já ordenadas por horário.
      const ordered = sortMealsByTime(plan);
      const savedId = await saveDietPlan(ordered);
      const persisted = { ...ordered, id: savedId };
      setPlan(persisted);
      original.current = persisted;
      if (isNew) {
        router.back();
      } else {
        setMode('read');
        setShowNewFood(false);
        setAddingItemFor(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  }

  function handleCancel() {
    if (isNew) {
      router.back();
      return;
    }
    if (original.current) setPlan(original.current);
    setShowNewFood(false);
    setAddingItemFor(null);
    setError(null);
    setMode('read');
  }

  async function handleCreateFood(data: NewFoodData) {
    const food = await addCustomFood(data);
    setFoods((prev) => new Map(prev).set(food.id, food));
    setShowNewFood(false);
    Alert.alert('Alimento criado', `"${food.name}" já pode ser buscado nas refeições.`);
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  const editing = mode === 'edit';
  // Em leitura, exibe já ordenado por horário (mi só é usado para mutação no modo edição).
  const mealsToRender = editing ? plan.meals : sortMealsByTime(plan).meals;

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen
        options={{
          title: isNew ? 'Nova dieta' : editing ? 'Editar dieta' : plan.name || 'Dieta',
          headerRight: () => (
            <Pressable
              onPress={editing ? handleCancel : () => setMode('edit')}
              hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: Accent }}>
                {editing ? 'Cancelar' : 'Editar'}
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.root} edges={['bottom']}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            {editing ? (
              <TextField
                label="Nome da dieta"
                value={plan.name}
                onChangeText={(name) => setPlan((p) => ({ ...p, name }))}
                placeholder="Ex.: Cutting 2500 kcal"
                autoCapitalize="sentences"
              />
            ) : (
              <ThemedText type="subtitle">{plan.name}</ThemedText>
            )}

            {editing ? (
              <Pressable
                onPress={() => setShowNewFood((v) => !v)}
                style={styles.linkRow}
                hitSlop={6}>
                <Ionicons
                  name={showNewFood ? 'remove-circle-outline' : 'add-circle-outline'}
                  size={20}
                  color={Accent}
                />
                <ThemedText type="smallBold" style={{ color: Accent }}>
                  {showNewFood ? 'Fechar novo alimento' : 'Novo alimento personalizado'}
                </ThemedText>
              </Pressable>
            ) : null}
            {editing && showNewFood ? <NewFoodForm onCreate={handleCreateFood} /> : null}

            {plan.meals.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {editing
                  ? 'Nenhuma refeição ainda. Adicione a primeira abaixo.'
                  : 'Esta dieta não tem refeições.'}
              </ThemedText>
            ) : (
              mealsToRender.map((meal, mi) => {
                const sub = foods.size ? mealMacros(meal, foods) : ZERO_MACROS;
                return (
                  <ThemedView key={meal.id} type="backgroundElement" style={styles.mealCard}>
                    <Pressable
                      onPress={() => toggleCollapsed(meal.id)}
                      style={styles.mealToggle}
                      hitSlop={4}>
                      <Ionicons
                        name={collapsed.has(meal.id) ? 'chevron-forward' : 'chevron-down'}
                        size={18}
                        color={theme.textSecondary}
                      />
                      <View style={styles.mealSummary}>
                        <ThemedText type="smallBold">{meal.name || 'Refeição'}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {meal.time ? `${meal.time} · ` : ''}
                          {fmt(sub.kcal)} kcal · P {fmt(sub.protein, 1)} g ·{' '}
                          {meal.items.length} item(ns)
                        </ThemedText>
                      </View>
                    </Pressable>

                    {collapsed.has(meal.id) ? null : (
                      <View style={styles.mealBody}>
                    {editing ? (
                      <View style={styles.mealHeadEdit}>
                        <View style={styles.mealNameField}>
                          <TextField
                            label="Refeição"
                            value={meal.name}
                            onChangeText={(name) => setPlan((p) => updateMeal(p, mi, { name }))}
                            placeholder="Ex.: Café da manhã"
                            autoCapitalize="sentences"
                          />
                        </View>
                        <View style={styles.mealTimeField}>
                          <TextField
                            label="Hora"
                            value={meal.time ?? ''}
                            onChangeText={(t) =>
                              setPlan((p) => updateMeal(p, mi, { time: maskTime(t) }))
                            }
                            // Reordena por horário ao terminar de digitar (evita
                            // perder o foco/teclado se reordenasse a cada tecla).
                            onBlur={() => setPlan((p) => sortMealsByTime(p))}
                            keyboardType="number-pad"
                            maxLength={5}
                            placeholder="07:00"
                          />
                        </View>
                      </View>
                    ) : null}

                    {meal.items.length === 0 ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Sem alimentos.
                      </ThemedText>
                    ) : (
                      meal.items.map((item, ii) => {
                        const food = foods.get(item.foodId);
                        const kcal = food
                          ? macrosForQuantity(food, item.quantityGrams).kcal
                          : 0;
                        return (
                          <View key={`${item.foodId}:${ii}`} style={styles.itemRow}>
                            <ThemedText type="small" style={styles.itemName}>
                              {item.foodNameSnapshot}
                            </ThemedText>
                            {editing ? (
                              <View style={styles.qtyEdit}>
                                <TextField
                                  label=""
                                  value={item.quantityGrams ? String(item.quantityGrams) : ''}
                                  onChangeText={(t) =>
                                    setPlan((p) =>
                                      updateItem(p, mi, ii, {
                                        quantityGrams: parseDecimal(t) ?? 0,
                                      }),
                                    )
                                  }
                                  keyboardType="decimal-pad"
                                  placeholder="100"
                                  style={styles.qtyInput}
                                />
                                <ThemedText type="small" themeColor="textSecondary">
                                  g
                                </ThemedText>
                                <Pressable
                                  onPress={() => setPlan((p) => removeItem(p, mi, ii))}
                                  hitSlop={8}>
                                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                                </Pressable>
                              </View>
                            ) : (
                              <ThemedText type="small" themeColor="textSecondary">
                                {fmt(item.quantityGrams)} g · {fmt(kcal)} kcal
                              </ThemedText>
                            )}
                          </View>
                        );
                      })
                    )}

                    {editing ? (
                      <>
                        {addingItemFor === meal.id ? (
                          <>
                            <FoodSearch
                              autoFocus
                              onPick={(food) => setPlan((p) => addItem(p, mi, food))}
                            />
                            <Pressable
                              onPress={() => setAddingItemFor(null)}
                              style={styles.linkRow}
                              hitSlop={6}>
                              <Ionicons name="checkmark-circle-outline" size={20} color={Accent} />
                              <ThemedText type="smallBold" style={{ color: Accent }}>
                                Concluir
                              </ThemedText>
                            </Pressable>
                          </>
                        ) : (
                          <Pressable
                            onPress={() => setAddingItemFor(meal.id)}
                            style={styles.linkRow}
                            hitSlop={6}>
                            <Ionicons name="add-circle-outline" size={20} color={Accent} />
                            <ThemedText type="smallBold" style={{ color: Accent }}>
                              Adicionar alimento
                            </ThemedText>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() =>
                            Alert.alert('Excluir refeição', `Remover "${meal.name}"?`, [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Excluir',
                                style: 'destructive',
                                onPress: () => setPlan((p) => removeMeal(p, mi)),
                              },
                            ])
                          }
                          style={styles.removeMeal}
                          hitSlop={6}>
                          <Ionicons name="trash-outline" size={16} color={Danger} />
                          <ThemedText type="small" style={{ color: Danger }}>
                            Remover refeição
                          </ThemedText>
                        </Pressable>
                      </>
                    ) : null}
                      </View>
                    )}
                  </ThemedView>
                );
              })
            )}

            {editing ? (
              <Pressable onPress={() => setPlan((p) => addMeal(p))} style={styles.linkRow} hitSlop={6}>
                <Ionicons name="add-circle-outline" size={20} color={Accent} />
                <ThemedText type="smallBold" style={{ color: Accent }}>
                  Adicionar refeição
                </ThemedText>
              </Pressable>
            ) : null}

            {error ? (
              <ThemedText type="small" style={{ color: Danger }}>
                {error}
              </ThemedText>
            ) : null}
          </ScrollView>

          {/* Rodapé fixo: totais ao vivo (§4.3) */}
          <ThemedView type="backgroundElement" style={styles.footer}>
            <View style={styles.totalsRow}>
              <Stat label="Kcal" value={fmt(totals.kcal)} />
              <Stat label="Carbo" value={`${fmt(totals.carbs, 1)} g`} />
              <Stat label="Prot" value={`${fmt(totals.protein, 1)} g`} />
              <Stat label="Gord" value={`${fmt(totals.fat, 1)} g`} />
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.protKg}>
              {protPerKg != null
                ? `${fmt(protPerKg, 2)} g de proteína / kg (peso ${fmt(latestWeight?.weightKg ?? 0, 1)} kg)`
                : 'Registre seu peso no perfil para ver g de proteína/kg.'}
            </ThemedText>
            {editing ? (
              <PrimaryButton title="Salvar dieta" onPress={handleSave} loading={saving} />
            ) : null}
          </ThemedView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
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
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  mealCard: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  mealToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  mealSummary: { flex: 1, gap: 2 },
  mealBody: { gap: Spacing.two, marginTop: Spacing.two },
  mealHeadEdit: { flexDirection: 'row', gap: Spacing.three },
  mealNameField: { flex: 2 },
  mealTimeField: { flex: 1 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 32,
  },
  itemName: { flex: 1 },
  qtyEdit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  qtyInput: { width: 72, textAlign: 'right', paddingVertical: Spacing.one },
  removeMeal: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingTop: Spacing.one },
  footer: {
    padding: Spacing.three,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1, gap: 2 },
  protKg: { textAlign: 'center' },
});
