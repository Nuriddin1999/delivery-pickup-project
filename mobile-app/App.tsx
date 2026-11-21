import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { API_URL, ordersOf } from './src/api';
import { OrderRow } from './src/OrderRow';
import { Select } from './src/Select';
import { useDispatchState } from './src/useDispatchState';

export default function App() {
  const { load, refreshing, offline, retry, refresh } = useDispatchState();
  const [courierId, setCourierId] = useState('');
  const [listOpen, setListOpen] = useState(false);

  const data = load.status === 'ready' ? load.data : null;
  const me = data?.couriers.find((c) => c.id === courierId);
  const names = useMemo(() => new Map(data?.couriers.map((c) => [c.id, c.name])), [data]);
  const orders = data ? (me ? ordersOf(me, data.orders) : data.orders) : [];

  return (
    <View style={styles.container}>
      {/* A tap anywhere outside the open list closes it. */}
      {listOpen && <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={() => setListOpen(false)} />}

      {load.status === 'loading' && <Text style={styles.text}>Loading...</Text>}

      {load.status === 'error' && (
        <View style={styles.block}>
          <Text style={styles.text}>Could not load data from {API_URL}</Text>
          <Text style={styles.muted}>{load.message}</Text>
          <Pressable style={styles.button} onPress={retry}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {data && (
        <>
          <View style={[styles.block, styles.head]}>
            <Text style={styles.text}>Please select yourself:</Text>
            <Select
              placeholder="Couriers"
              options={data.couriers.map((c) => ({ value: c.id, label: c.name }))}
              value={courierId}
              onChange={setCourierId}
              open={listOpen}
              onOpenChange={setListOpen}
            />
            {me && (
              <View style={styles.youRow}>
                <Text style={styles.you}>You are {me.name}</Text>
                <Pressable onPress={() => setCourierId('')} hitSlop={8}>
                  <Text style={styles.link}>Show all orders</Text>
                </Pressable>
              </View>
            )}
          </View>

          {offline && <Text style={styles.offline}>No connection to the server. Showing the last list.</Text>}
          <Text style={styles.section}>
            {me ? `Your orders, in route order (${orders.length})` : `All orders (${orders.length})`}
          </Text>
          <FlatList
            style={styles.list}
            data={orders}
            keyExtractor={(o) => o.id}
            renderItem={({ item, index }) =>
              me ? (
                <OrderRow order={item} side={`Stop ${index + 1}`} />
              ) : (
                <OrderRow
                  order={item}
                  side={item.courier_id ? (names.get(item.courier_id) ?? item.courier_id) : 'Free'}
                  sideMuted={!item.courier_id}
                />
              )
            }
            ListEmptyComponent={<Text style={styles.empty}>{me ? 'You have no orders yet.' : 'No orders.'}</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          />
        </>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  // Content starts at the top, below the status bar plus some air.
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingBottom: 0, paddingTop: Constants.statusBarHeight + 48 },
  // The backdrop sits over the order list but under the select, so the select stays tappable.
  backdrop: { zIndex: 1 },
  head: { zIndex: 2 },
  block: { gap: 12 },
  text: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  youRow: { marginTop: 4, alignItems: 'center', gap: 4 },
  you: { fontSize: 18, textAlign: 'center', color: '#0f172a' },
  link: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  section: { marginTop: 24, marginBottom: 4, fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  list: { flex: 1 },
  offline: { marginTop: 16, padding: 8, borderRadius: 8, backgroundColor: '#fef3c7', color: '#92400e', fontSize: 13, textAlign: 'center' },
  empty: { paddingVertical: 24, textAlign: 'center', color: '#64748b', fontSize: 15 },
  muted: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  button: { alignSelf: 'center', backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
