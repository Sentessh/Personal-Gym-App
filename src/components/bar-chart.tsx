import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Accent, Spacing } from '@/constants/theme';
import type { ChartPoint } from '@/lib/stats';

type Props = {
  data: ChartPoint[];
  /** Base da escala (default 0). Barras crescem a partir daqui. */
  baseline?: number;
  color?: string;
  /** Cor por valor (ex.: verde se adesão ≥ 100%). Tem prioridade sobre `color`. */
  colorForValue?: (value: number) => string;
  formatValue?: (value: number) => string;
  /** Linha de referência (ex.: meta de 100%). */
  target?: number;
  /** Força o topo da escala (ex.: 0→max arredondado). Senão usa o maior valor. */
  maxValue?: number;
  plotHeight?: number;
};

/** Gráfico de barras feito só com Views (sem dependência nativa). Rolável na horizontal. */
export function BarChart({
  data,
  baseline = 0,
  color = Accent,
  colorForValue,
  formatValue = (v) => String(Math.round(v)),
  target,
  maxValue,
  plotHeight = 140,
}: Props) {
  if (data.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Sem dados no período.
      </ThemedText>
    );
  }

  const values = data.map((d) => d.value);
  const base = Math.min(baseline, ...values);
  const max = maxValue ?? Math.max(...values, target ?? Number.NEGATIVE_INFINITY);
  const range = max - base || 1;
  // Reserva espaço no topo para o número não ser cortado na barra mais alta.
  const barMax = Math.max(10, plotHeight - LABEL_SPACE);
  const px = (value: number) => Math.max(2, ((value - base) / range) * barMax);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={[styles.plot, { height: plotHeight }]}>
          {target != null ? (
            <View style={[styles.target, { bottom: ((target - base) / range) * barMax }]} />
          ) : null}
          {data.map((p, i) => (
            <View key={i} style={styles.col}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.value}>
                {formatValue(p.value)}
              </ThemedText>
              <View
                style={[
                  styles.bar,
                  { height: px(p.value), backgroundColor: colorForValue?.(p.value) ?? color },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.labels}>
          {data.map((p, i) => (
            <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.label}>
              {p.label}
            </ThemedText>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const COL_WIDTH = 40;
const LABEL_SPACE = 18;

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { width: COL_WIDTH, alignItems: 'center', justifyContent: 'flex-end' },
  value: { fontSize: 10, marginBottom: 2 },
  bar: { width: 18, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  target: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.6)',
  },
  labels: { flexDirection: 'row', marginTop: Spacing.one },
  label: { width: COL_WIDTH, textAlign: 'center', fontSize: 10 },
});
