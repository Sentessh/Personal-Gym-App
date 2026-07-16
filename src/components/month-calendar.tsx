import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/date';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type Props = {
  year: number;
  month: number; // 0-11
  /** data (YYYY-MM-DD) → cores dos marcadores do dia (0, 1 ou mais quadradinhos). */
  marks: Map<string, string[]>;
  onSelectDay: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
};

/** Grade mensal customizada (sem dependências). Colore dias por atividade. */
export function MonthCalendar({ year, month, marks, onSelectDay, onPrev, onNext }: Props) {
  const theme = useTheme();
  const today = todayISO();

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Células: espaços iniciais + dias; agrupadas em semanas de 7.
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={onPrev} hitSlop={8} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <ThemedText type="smallBold">
          {MONTHS[month]} {year}
        </ThemedText>
        <Pressable onPress={onNext} hitSlop={8} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary">
              {w}
            </ThemedText>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day == null) return <View key={di} style={styles.cell} />;
            const date = todayISO(new Date(year, month, day));
            const dots = marks.get(date) ?? [];
            const isToday = date === today;
            return (
              <Pressable
                key={di}
                onPress={() => onSelectDay(date)}
                style={styles.cell}
                hitSlop={2}>
                <View style={[styles.dayInner, isToday && { borderColor: Accent }]}>
                  <ThemedText type="small">{day}</ThemedText>
                  <View style={styles.dots}>
                    {dots.map((color, ci) => (
                      <View key={ci} style={[styles.dot, { backgroundColor: color }]} />
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  navBtn: { padding: Spacing.one },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.one },
  dayInner: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 3,
  },
  dots: { flexDirection: 'row', gap: 2, height: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 2 },
});
