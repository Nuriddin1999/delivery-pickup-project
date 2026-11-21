import { StyleSheet, Text, View } from 'react-native';
import type { Order } from './api';

interface Props {
  order: Order;
  /** Right side: the courier's name (all orders) or the stop number (my orders). */
  side?: string;
  sideMuted?: boolean;
  /** No divider line: the row sits inside a stop that draws its own frame. */
  plain?: boolean;
}

const KIND = {
  pickup: { label: 'Pickup', color: '#15803d', bg: '#dcfce7' },
  delivery: { label: 'Delivery', color: '#1d4ed8', bg: '#dbeafe' },
} as const;

const weight = (kg: number) => `${Number(kg.toFixed(2))} kg`;

/** One order: id, kind, region and weight. */
export function OrderRow({ order: o, side, sideMuted, plain }: Props) {
  const kind = KIND[o.type as keyof typeof KIND] ?? { label: 'Unknown', color: '#b91c1c', bg: '#fee2e2' };
  return (
    <View style={[styles.row, plain && styles.plain]}>
      <View style={styles.main}>
        <View style={styles.top}>
          <Text style={styles.id}>{o.id}</Text>
          <Text style={[styles.kind, { color: kind.color, backgroundColor: kind.bg }]}>{kind.label}</Text>
          {o.done_at && !plain && <Text style={[styles.kind, styles.done]}>Done</Text>}
        </View>
        <Text style={styles.meta}>
          {o.region || '—'} · {weight(o.weight_kg)}
        </Text>
      </View>
      {!!side && (
        <Text style={[styles.side, sideMuted && styles.sideMuted]} numberOfLines={1}>
          {side}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  plain: { borderBottomWidth: 0 },
  done: { color: '#fff', backgroundColor: '#16a34a' },
  main: { flex: 1, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  id: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  kind: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  meta: { fontSize: 14, color: '#64748b' },
  side: { fontSize: 14, fontWeight: '600', color: '#0f172a', maxWidth: 120 },
  sideMuted: { color: '#94a3b8', fontWeight: '400' },
});
