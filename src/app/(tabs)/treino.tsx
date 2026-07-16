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
import { deleteWorkoutPlan, listWorkoutPlans } from '@/repositories/workout-repo';
import type { WorkoutPlan } from '@/types/domain';

/**
 * Aba Treino (Fase 2) — lista as fichas e permite criar, abrir para editar
 * e excluir. A criação/edição acontece na tela `ficha/[id]`.
 */
export default function TreinoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeWorkoutPlanId } = useActiveSelection();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setPlans(await listWorkoutPlans());
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarrega ao voltar do editor.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggleActive(plan: WorkoutPlan) {
    try {
      // Estrela alterna: se já é o ativo, desmarca (null); senão, ativa este.
      await setActiveSelection({
        activeWorkoutPlanId: activeWorkoutPlanId === plan.id ? null : plan.id,
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o treino ativo.');
    }
  }

  function confirmDelete(plan: WorkoutPlan) {
    Alert.alert('Excluir ficha', `Excluir "${plan.name}"? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkoutPlan(plan.id);
          load();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Treino</ThemedText>
          <Pressable
            onPress={() => router.push('/ficha/new')}
            style={[styles.addBtn, { backgroundColor: Accent }]}
            hitSlop={8}>
            <Ionicons name="add" size={24} color="#ffffff" />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.spacer} color={theme.text} />
        ) : plans.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={48} color={theme.textSecondary} />
            <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
              Nenhuma ficha ainda. Toque em ＋ para criar sua primeira.
            </ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {plans.map((plan) => (
              <Pressable
                key={plan.id}
                onPress={() => router.push(`/ficha/${plan.id}`)}>
                <ThemedView type="backgroundElement" style={styles.card}>
                  <View style={styles.cardInfo}>
                    <ThemedText type="default">{plan.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {plan.blocks.length} bloco(s) · {formatUpdated(plan.updatedAt)}
                    </ThemedText>
                  </View>
                  <ActiveToggle
                    active={activeWorkoutPlanId === plan.id}
                    onToggle={() => toggleActive(plan)}
                    activeLabel="Ativo"
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
