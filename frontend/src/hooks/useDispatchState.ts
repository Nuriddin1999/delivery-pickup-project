import { useQuery } from "@tanstack/react-query";
import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";

/** Query key of the dispatch state; every change invalidates it. */
export const stateKey = ["state"] as const;

/**
 * How often the state is reloaded without any action, so changes made by
 * another dispatcher, or a stop a courier marks done in the app, show up
 * within seconds. The state is small, so 5 s costs little.
 */
export const POLL_MS = 5_000;

/** The dispatch state and the region shapes (loaded once). */
export function useDispatchState() {
  const state = useQuery({ queryKey: stateKey, queryFn: dispatchApi.state, refetchInterval: POLL_MS });
  const shapes = useQuery({ queryKey: ["regionShapes"], queryFn: dispatchApi.regionShapes, staleTime: Infinity });
  const error = state.error ?? shapes.error;

  return {
    state: state.data ?? null,
    shapes: shapes.data ?? null,
    loadError: error ? errorMessage(error) : null,
    refresh: () => void state.refetch(),
  };
}
