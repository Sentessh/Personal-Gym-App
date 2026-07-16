import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from './text-field';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { searchExercises } from '@/repositories/workout-repo';
import type { ExerciseCatalogItem } from '@/types/domain';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  /** Chamado ao escolher uma sugestão com grupo muscular padrão (pré-preenche). */
  onPickMuscleGroup?: (muscleGroup: string) => void;
};

/**
 * Campo de nome do exercício com autocomplete do catálogo `exercises`.
 * A lista é pequena (uso pessoal) — busca com debounce e mostra até 8 sugestões.
 */
export function ExerciseNameInput({ value, onChangeText, onPickMuscleGroup }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ExerciseCatalogItem[]>([]);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const t = setTimeout(async () => {
      try {
        const r = await searchExercises(value);
        if (active) setResults(r);
      } catch {
        if (active) setResults([]);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [value, open]);

  function pick(item: ExerciseCatalogItem) {
    onChangeText(item.name);
    if (item.defaultMuscleGroup) onPickMuscleGroup?.(item.defaultMuscleGroup);
    setOpen(false);
  }

  const show = open && results.length > 0;

  return (
    <View style={styles.wrap}>
      <TextField
        label="Exercício"
        value={value}
        onChangeText={(t) => {
          onChangeText(t);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Atrasa para permitir o toque numa sugestão antes de fechar.
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Ex.: Supino inclinado"
        autoCapitalize="sentences"
      />
      {show ? (
        <ThemedView type="backgroundSelected" style={styles.dropdown}>
          {results.map((item, i) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current);
                pick(item);
              }}
              style={[styles.option, i < results.length - 1 && styles.divider]}>
              <ThemedText type="small">{item.name}</ThemedText>
              {item.defaultMuscleGroup ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.defaultMuscleGroup}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 10 },
  dropdown: {
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
});
