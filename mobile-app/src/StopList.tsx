import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { markStopDone, type Courier, type Order } from './api';
import { OrderRow } from './OrderRow';

interface Props {
  courier: Courier;
  orders: Order[];
  refreshing: boolean;
  onRefresh: () => void;
  /** Called after a stop was saved, to load the new state. */
  onMarked: () => void;
}

type Item =
  | { kind: 'hub'; key: string; passed: boolean }
  | { kind: 'stop'; key: string; n: number; order: Order; done: boolean; next: boolean };

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Today's stops in route order: pickups, the hub, deliveries. Only the next
 * stop has a "Done" button; the server refuses any other one as well, so a
 * stale screen cannot skip a stop either.
 */
export function StopList({ courier, orders, refreshing, onRefresh, onMarked }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const byId = new Map(orders.map((o) => [o.id, o]));

  const items: Item[] = [];
  let n = 0;
  let nextFound = false;
  let allDoneSoFar = true;
  for (const s of courier.stops) {
    if (s.kind === 'hub') {
      items.push({ kind: 'hub', key: 'hub', passed: allDoneSoFar });
      continue;
    }
    const order = byId.get(s.orderId);
    if (!order) continue;
    n++;
    const done = !!order.done_at;
    const next = !done && !nextFound;
    if (next) nextFound = true;
    if (!done) allDoneSoFar = false;
    items.push({ kind: 'stop', key: order.id, n, order, done, next });
  }
  const total = n;
  const doneCount = items.filter((i) => i.kind === 'stop' && i.done).length;

  const confirmDone = (item: Extract<Item, { kind: 'stop' }>) => {
    Alert.alert(`Stop ${item.n} done?`, `Order ${item.order.id}. This cannot be undone from the app.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Done', onPress: () => save(item.order.id) },
    ]);
  };

  const save = async (orderId: string) => {
    setSaving(orderId);
    try {
      await markStopDone(courier.id, orderId);
      onMarked();
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
      onMarked(); // the screen may be out of date; load what the server has
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <Text style={styles.section}>
        {total === 0 ? "Today's stops" : doneCount === total ? `All ${total} stops done` : `Today's stops: ${doneCount} of ${total} done`}
      </Text>
      <FlatList
        style={styles.list}
        showsVerticalScrollIndicator={false}
        data={items}
        keyExtractor={(i) => i.key}
        renderItem={({ item }) =>
          item.kind === 'hub' ? (
            <View style={styles.hub}>
              <Text style={[styles.hubText, item.passed && styles.faded]}>Hub: drop off pickups, load deliveries</Text>
            </View>
          ) : (
            <View style={[styles.stop, item.next && styles.stopNext]}>
              <View style={[styles.badge, item.done ? styles.badgeDone : item.next ? styles.badgeNext : null]}>
                <Text style={[styles.badgeText, (item.done || item.next) && styles.badgeTextOn]}>{item.done ? '✓' : item.n}</Text>
              </View>
              <View style={[styles.stopBody, item.done && styles.faded]}>
                <OrderRow order={item.order} side="" plain />
              </View>
              {item.done ? (
                <Text style={styles.doneAt}>{time(item.order.done_at!)}</Text>
              ) : item.next ? (
                <Pressable
                  style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
                  onPress={() => confirmDone(item)}
                  disabled={saving !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark stop ${item.n} done`}
                >
                  {saving === item.order.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.doneBtnText}>Done</Text>}
                </Pressable>
              ) : null}
            </View>
          )
        }
        ListEmptyComponent={<Text style={styles.empty}>You have no stops today.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </>
  );
}

const BLUE = '#2563eb';
const GREEN = '#16a34a';

const styles = StyleSheet.create({
  section: { marginTop: 24, marginBottom: 4, fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  list: { flex: 1 },
  empty: { paddingVertical: 24, textAlign: 'center', color: '#64748b', fontSize: 15 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, borderRadius: 10 },
  stopNext: { backgroundColor: '#eff6ff' },
  stopBody: { flex: 1 },
  faded: { opacity: 0.5 },
  badge: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  badgeNext: { borderColor: BLUE, backgroundColor: BLUE },
  badgeDone: { borderColor: GREEN, backgroundColor: GREEN },
  badgeText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  badgeTextOn: { color: '#fff' },
  doneAt: { fontSize: 13, color: GREEN, fontWeight: '600' },
  doneBtn: { minWidth: 72, height: 40, borderRadius: 8, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  doneBtnPressed: { backgroundColor: '#1d4ed8' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hub: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  hubText: { fontSize: 14, fontWeight: '600', color: '#475569' },
});
