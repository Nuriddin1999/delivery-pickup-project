import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import { useStateMutation } from "@/hooks/useStateMutation";

/**
 * Assign, move or take off one order. A refusal from the server is kept in
 * `error` as the server wrote it, e.g. "Kamola does not work in Bektemir".
 */
export function useOrderActions(orderId: string, onDone: (message: string) => void) {
  // courierId null means "take off"
  const mutation = useStateMutation((courierId: string | null) => (courierId ? dispatchApi.assign(orderId, courierId) : dispatchApi.unassign(orderId)));

  const run = (courierId: string | null, message: string) => mutation.mutate(courierId, { onSuccess: () => onDone(message) });

  return {
    busy: mutation.isPending,
    error: mutation.error ? errorMessage(mutation.error) : null,
    clearError: () => mutation.reset(),
    assign: (courierId: string, message: string) => run(courierId, message),
    unassign: (message: string) => run(null, message),
  };
}
