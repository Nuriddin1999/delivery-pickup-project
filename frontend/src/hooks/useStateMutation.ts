import { useMutation, useQueryClient } from "@tanstack/react-query";
import { stateKey } from "./useDispatchState";

/**
 * A change on the server. On success the dispatch state is reloaded before
 * the mutation counts as done, so callers see fresh data in their onSuccess.
 */
export function useStateMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stateKey }),
  });
}
