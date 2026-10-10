import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, font, radius, spacing } from '@/theme';

/** Barre de consommation du budget. Le repère noir marque l'avancement des travaux. */
export function BudgetBar({ spent, budget, progress }: { spent: number; budget: number; progress: number }) {
  const ratio = budget > 0 ? (spent / budget) * 100 : 0;
  const fill = ratio > 100 ? colors.danger : ratio > progress + 15 ? colors.gold : colors.success;
  return (
    <View style={{ height: 14, justifyContent: 'center' }}>
      <View style={styles.track}>
        <View style={{ height: 10, width: `${Math.min(100, ratio)}%`, backgroundColor: fill, borderRadius: radius.pill }} />
      </View>
      {budget > 0 ? <View style={[styles.marker, { left: `${Math.max(0, Math.min(100, progress))}%` }]} /> : null}
    </View>
  );
}

export interface Slice { key: string; value: number; color: string }

export function Donut({ slices, size = 140, thickness = 22, selected, centerTop, centerBottom }: {
  slices: Slice[]; size?: number; thickness?: number; selected?: string | null; centerTop?: string; centerBottom?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.neutralSoft} strokeWidth={thickness} fill="none" />
          {total > 0 ? slices.map((s) => {
            const len = (s.value / total) * c;
            const node = (
              <Circle
                key={s.key} cx={size / 2} cy={size / 2} r={r} stroke={s.color} strokeWidth={thickness} fill="none"
                strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} opacity={selected && selected !== s.key ? 0.25 : 1}
              />
            );
            offset += len;
            return node;
          }) : null}
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          {centerTop ? <Text style={styles.centerTop}>{centerTop}</Text> : null}
          {centerBottom ? <Text style={styles.centerBottom}>{centerBottom}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export interface MonthDatum { key: string; label: string; expenses: number; income: number }

/** Dépenses (bleu) et entrées (vert) par mois ; toucher un mois filtre la liste. */
export function MonthBars({ data, selected, onSelect }: { data: MonthDatum[]; selected: string | null; onSelect: (key: string | null) => void }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.expenses, d.income]));
  const H = 96;
  return (
    <View>
      <View style={styles.bars}>
        {data.map((d) => {
          const active = selected === d.key;
          return (
            <Pressable key={d.key} onPress={() => onSelect(active ? null : d.key)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.barCol, active && { backgroundColor: colors.brandSoft }]}>
              <View style={{ height: H, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                <View style={{ width: 14, height: Math.max(2, (d.expenses / max) * H), backgroundColor: colors.brand, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                <View style={{ width: 14, height: Math.max(2, (d.income / max) * H), backgroundColor: colors.success, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
              </View>
              <Text style={styles.barLabel}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.brand }]} /><Text style={styles.legendText}>Dépenses</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>Entrées</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: radius.pill, backgroundColor: colors.neutralSoft, overflow: 'hidden' },
  marker: { position: 'absolute', width: 3, height: 14, marginLeft: -1, backgroundColor: colors.text, borderRadius: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerTop: { ...font.small, color: colors.muted },
  centerBottom: { fontSize: 16, fontWeight: '800', color: colors.text },
  bars: { flexDirection: 'row', justifyContent: 'space-around' },
  barCol: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6, borderRadius: radius.input },
  barLabel: { ...font.small, color: colors.muted, marginTop: 4 },
  legend: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center', marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { ...font.small, color: colors.muted },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
