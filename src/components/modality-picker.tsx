import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Modality } from '@/types/domain';

const OPTIONS: { value: Modality; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'MUSCLE_ROUND', label: 'Muscle R.' },
  { value: 'LOW_VOLUME', label: 'Low Vol.' },
];

/** Seletor segmentado da modalidade do exercício (§3.3). */
export function ModalityPicker({
  value,
  onChange,
}: {
  value: Modality;
  onChange: (m: Modality) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundSelected }]}>
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.seg, active && { backgroundColor: Accent }]}>
            <ThemedText
              type="small"
              style={{ color: active ? '#ffffff' : theme.textSecondary }}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: 2,
  },
  seg: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.one + 2,
  },
});
