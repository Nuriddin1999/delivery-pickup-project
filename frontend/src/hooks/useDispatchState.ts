import { useQuery } from "@tanstack/react-query";
import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";

/** Query key of the dispatch state; every change invalidates it. */
export const stateKey = ["state"] as const;

/** The dispatch state and the region shapes (loaded once). */
export function useDispatchState() {
  const state = useQuery({ queryKey: stateKey, queryFn: dispatchApi.state });
  const shapes = useQuery({ queryKey: ["regionShapes"], queryFn: dispatchApi.regionShapes, staleTime: Infinity });
  const error = state.error ?? shapes.error;

  return {
    state: state.data ?? null,
    shapes: shapes.data ?? null,
    loadError: error ? errorMessage(error) : null,
    refresh: () => void state.refetch(),
  };
}
