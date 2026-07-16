import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  active: boolean;
  onToggle: () => void;
  /** Rótulo quando ativo (permite gênero: "Ativo" / "Ativa"). */
  activeLabel?: string;
  inactiveLabel?: string;
};

/** Botão-pílula que alterna o estado "ativo" (seleção vigente, §3.5). */
export function ActiveToggle({
  active,
  onToggle,
  activeLabel = 'Ativo',
  inactiveLabel = 'Ativar',
}: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={6}
      style={[
        styles.pill,
        active
          ? { backgroundColor: Accent, borderColor: Accent }
          : { borderColor: theme.textSecondary },
      ]}>
      <View style={styles.inner}>
        {active ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
        <ThemedText type="smallBold" style={{ color: active ? '#ffffff' : theme.text }}>
          {active ? activeLabel : inactiveLabel}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
