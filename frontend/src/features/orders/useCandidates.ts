import { useQuery } from "@tanstack/react-query";
import { dispatchApi } from "@/api/dispatchApi";
import { POLL_MS, stateKey } from "@/hooks/useDispatchState";

/**
 * The couriers an order could go to, checked by the server. The key starts
 * with the state key, so every change (which reloads the state) reloads
 * this list too.
 */
export function useCandidates(orderId: string | null) {
  return useQuery({
    queryKey: [...stateKey, "candidates", orderId],
    queryFn: () => dispatchApi.candidates(orderId!),
    enabled: !!orderId,
    refetchInterval: POLL_MS,
  });
}
