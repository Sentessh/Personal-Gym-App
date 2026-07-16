import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  children: ReactNode;
  /** Fundo do card — permite distinguir níveis (bloco vs seção). */
  tone?: Extract<ThemeColor, 'backgroundElement' | 'backgroundSelected'>;
};

/** Card expansível com título, subtítulo e ação opcional de excluir. */
export function CollapsibleCard({
  title,
  subtitle,
  expanded,
  onToggle,
  onDelete,
  children,
  tone = 'backgroundElement',
}: Props) {
  const theme = useTheme();
  return (
    <ThemedView type={tone} style={styles.card}>
      <Pressable onPress={onToggle} style={styles.header}>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={18}
          color={theme.textSecondary}
        />
        <View style={styles.titleWrap}>
          <ThemedText type="smallBold">{title || '—'}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={8} style={styles.trash}>
            <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titleWrap: { flex: 1, gap: 2 },
  trash: { padding: Spacing.one },
  body: { gap: Spacing.three, marginTop: Spacing.three },
});
