import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from './text-field';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { searchFoods } from '@/repositories/diet-repo';
import type { Food } from '@/types/domain';

type Props = {
  /** Chamado ao escolher um alimento; o campo se limpa em seguida. */
  onPick: (food: Food) => void;
  /** Foca o campo ao montar (abre o teclado) — usado quando revelado por botão. */
  autoFocus?: boolean;
};

/** Busca de alimentos (TACO + custom) com autocomplete; adiciona ao tocar. */
export function FoodSearch({ onPick, autoFocus }: Props) {
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const t = setTimeout(async () => {
      try {
        const r = await searchFoods(queryText);
        if (active) setResults(r);
      } catch {
        if (active) setResults([]);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [queryText, open]);

  function pick(food: Food) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onPick(food);
    setQueryText('');
    setResults([]);
    setOpen(false);
  }

  return (
    <View style={styles.wrap}>
      <TextField
        label="Adicionar alimento"
        value={queryText}
        onChangeText={(t) => {
          setQueryText(t);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Buscar (ex.: arroz, frango…)"
        autoCapitalize="sentences"
        autoFocus={autoFocus}
      />
      {open && results.length > 0 ? (
        <ThemedView type="backgroundSelected" style={styles.dropdown}>
          {results.map((food, i) => (
            <Pressable
              key={food.id}
              onPress={() => pick(food)}
              style={[styles.option, i < results.length - 1 && styles.divider]}>
              <View style={styles.optionText}>
                <ThemedText type="small">{food.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {Math.round(food.kcalPer100g)} kcal/100g
                  {food.source === 'custom' ? ' · seu' : ''}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 10 },
  dropdown: { borderRadius: Spacing.two, marginTop: Spacing.one, overflow: 'hidden' },
  option: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  optionText: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
});
