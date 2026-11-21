import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchState, type DispatchState } from './api';

/** How often the open app asks the server for changes made by the dispatcher. */
export const POLL_MS = 5000;

export type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DispatchState };

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Couriers and orders from the server, kept fresh:
 * - the first load shows "Loading..." (status 'loading');
 * - while the app is on screen it reloads every POLL_MS without showing anything,
 *   so an order the dispatcher gives out appears on the phone within seconds;
 * - coming back to the app from the background reloads at once;
 * - pull to refresh shows the spinner;
 * - after the courier marks a stop, sync() loads at once.
 * A failed background reload keeps the list and sets `offline`, so the screen
 * does not jump to an error while the courier is looking at it.
 */
export function useDispatchState() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const hasData = useRef(false);
  const inFlight = useRef<AbortController | null>(null);

  // 'sync' is a quiet load that must not be skipped: right after a change, a
  // poll already on its way may carry the data from before it.
  const run = useCallback((mode: 'first' | 'pull' | 'quiet' | 'sync') => {
    if (mode === 'quiet' && inFlight.current) return; // the previous one is still running
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;

    if (mode === 'first') setLoad({ status: 'loading' });
    if (mode === 'pull') setRefreshing(true);

    fetchState(ctrl.signal)
      .then((data) => {
        hasData.current = true;
        setOffline(false);
        setLoad({ status: 'ready', data });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        if (hasData.current) setOffline(true);
        else setLoad({ status: 'error', message: message(e) });
      })
      .finally(() => {
        if (inFlight.current === ctrl) inFlight.current = null;
        if (mode === 'pull') setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    run('first');

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!timer) timer = setInterval(() => run('quiet'), POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();

    // No polling in the background; catch up as soon as the app is back.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        run(hasData.current ? 'quiet' : 'first');
        start();
      } else {
        stop();
      }
    });

    return () => {
      stop();
      sub.remove();
      inFlight.current?.abort();
    };
  }, [run]);

  return {
    load,
    refreshing,
    offline,
    retry: () => run('first'),
    refresh: () => run('pull'),
    sync: () => run('sync'),
  };
}
