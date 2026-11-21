import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import { useStateMutation } from "@/hooks/useStateMutation";

/**
 * Assign, move or take off one order. A refusal from the server is kept in
 * `error` as the server wrote it, e.g. "Kamola does not work in Bektemir".
 */
export function useOrderActions(orderId: string) {
  // courierId null means "take off"
  const mutation = useStateMutation((courierId: string | null) => (courierId ? dispatchApi.assign(orderId, courierId) : dispatchApi.unassign(orderId)));

  return {
    busy: mutation.isPending,
    error: mutation.error ? errorMessage(mutation.error) : null,
    assign: (courierId: string, onDone: () => void) => mutation.mutate(courierId, { onSuccess: onDone }),
    unassign: (onDone: () => void) => mutation.mutate(null, { onSuccess: onDone }),
  };
}
