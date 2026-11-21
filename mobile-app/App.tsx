import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { API_URL, fetchCouriers, type Courier } from './src/api';
import { Select } from './src/Select';

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; couriers: Courier[] };

export default function App() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [courierId, setCourierId] = useState('');
  const [listOpen, setListOpen] = useState(false);

  const loadCouriers = useCallback((signal?: AbortSignal) => {
    setLoad({ status: 'loading' });
    fetchCouriers(signal)
      .then((couriers) => setLoad({ status: 'ready', couriers }))
      .catch((e: unknown) => {
        if (signal?.aborted) return;
        setLoad({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    loadCouriers(ctrl.signal);
    return () => ctrl.abort();
  }, [loadCouriers]);

  return (
    <View style={styles.container}>
      {/* A tap anywhere outside the open list closes it. */}
      {listOpen && <Pressable style={StyleSheet.absoluteFill} onPress={() => setListOpen(false)} />}

      {load.status === 'loading' && <Text style={styles.text}>Loading...</Text>}

      {load.status === 'error' && (
        <View style={styles.block}>
          <Text style={styles.text}>Could not load couriers from {API_URL}</Text>
          <Text style={styles.muted}>{load.message}</Text>
          <Pressable style={styles.button} onPress={() => loadCouriers()}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {load.status === 'ready' && (
        <View style={styles.block}>
          <Text style={styles.text}>Please select yourself:</Text>
          <Select
            placeholder="Couriers"
            options={load.couriers.map((c) => ({ value: c.id, label: c.name }))}
            value={courierId}
            onChange={setCourierId}
            open={listOpen}
            onOpenChange={setListOpen}
          />
        </View>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  // Content starts at the top, below the status bar plus some air.
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: Constants.statusBarHeight + 48 },
  block: { gap: 12 },
  text: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  muted: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  button: { alignSelf: 'center', backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
