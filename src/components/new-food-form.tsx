import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from './primary-button';
import { TextField } from './text-field';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { parseDecimal } from '@/lib/number';
import type { NewFoodData } from '@/repositories/diet-repo';

type Props = {
  /** Cria o alimento (persiste). Deve lançar em caso de falha. */
  onCreate: (data: NewFoodData) => Promise<void>;
};

/** Formulário inline para cadastrar um alimento personalizado (valores por 100 g). */
export function NewFoodForm({ onCreate }: Props) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const nameTrim = name.trim();
    const k = parseDecimal(kcal);
    const c = parseDecimal(carbs);
    const p = parseDecimal(protein);
    const f = parseDecimal(fat);
    if (!nameTrim) return setError('Informe o nome do alimento.');
    if ([k, c, p, f].some((v) => v == null || v < 0)) {
      return setError('Preencha kcal e macros (por 100 g) com números válidos.');
    }
    setError(null);
    setSaving(true);
    try {
      await onCreate({
        name: nameTrim,
        kcalPer100g: k as number,
        carbsPer100g: c as number,
        proteinPer100g: p as number,
        fatPer100g: f as number,
      });
      setName('');
      setKcal('');
      setCarbs('');
      setProtein('');
      setFat('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o alimento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView type="backgroundSelected" style={styles.card}>
      <ThemedText type="smallBold">Novo alimento personalizado (por 100 g)</ThemedText>
      <TextField label="Nome" value={name} onChangeText={setName} autoCapitalize="sentences" />
      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Kcal" value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" placeholder="0" />
        </View>
        <View style={styles.half}>
          <TextField label="Carbo (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" placeholder="0" />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Proteína (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" placeholder="0" />
        </View>
        <View style={styles.half}>
          <TextField label="Gordura (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" placeholder="0" />
        </View>
      </View>
      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
      <PrimaryButton title="Salvar alimento" onPress={handleSave} loading={saving} variant="secondary" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.three },
  half: { flex: 1 },
  error: { color: '#E5484D' },
});
