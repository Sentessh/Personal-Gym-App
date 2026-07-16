import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveToggle } from '@/components/active-toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing } from '@/constants/theme';
import { useActiveSelection } from '@/hooks/use-active-selection';
import { useTheme } from '@/hooks/use-theme';
import { setActiveSelection } from '@/repositories/active-selection-repo';
import { deleteDietPlan, listDietPlans } from '@/repositories/diet-repo';
import type { DietPlan } from '@/types/domain';

/**
 * Aba Dieta (Fase 3) — lista os planos alimentares e permite criar, abrir
 * (modo leitura/edição) e excluir. Edição na tela `dieta/[id]`.
 */
export default function DietaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeDietPlanId } = useActiveSelection();
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setPlans(await listDietPlans());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggleActive(plan: DietPlan) {
    try {
      // Estrela alterna: se já é a ativa, desmarca (null); senão, ativa esta.
      await setActiveSelection({
        activeDietPlanId: activeDietPlanId === plan.id ? null : plan.id,
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar a dieta ativa.');
    }
  }

  function confirmDelete(plan: DietPlan) {
    Alert.alert('Excluir dieta', `Excluir "${plan.name}"? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteDietPlan(plan.id);
          load();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Dieta</ThemedText>
          <Pressable
            onPress={() => router.push('/dieta/new')}
            style={[styles.addBtn, { backgroundColor: Accent }]}
            hitSlop={8}>
            <Ionicons name="add" size={24} color="#ffffff" />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.spacer} color={theme.text} />
        ) : plans.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color={theme.textSecondary} />
            <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
              Nenhuma dieta ainda. Toque em ＋ para montar a primeira.
            </ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {plans.map((plan) => (
              <Pressable key={plan.id} onPress={() => router.push(`/dieta/${plan.id}`)}>
                <ThemedView type="backgroundElement" style={styles.card}>
                  <View style={styles.cardInfo}>
                    <ThemedText type="default">{plan.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {plan.meals.length} refeição(ões) · {formatUpdated(plan.updatedAt)}
                    </ThemedText>
                  </View>
                  <ActiveToggle
                    active={activeDietPlanId === plan.id}
                    onToggle={() => toggleActive(plan)}
                    activeLabel="Ativa"
                  />
                  <Pressable onPress={() => confirmDelete(plan)} hitSlop={8} style={styles.cardAction}>
                    <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
                  </Pressable>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </ThemedView>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function formatUpdated(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('pt-BR');
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  spacer: { marginTop: Spacing.five },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  emptyText: { textAlign: 'center' },
  list: {
    padding: Spacing.four,
    paddingTop: 0,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardAction: { padding: Spacing.one },
});
