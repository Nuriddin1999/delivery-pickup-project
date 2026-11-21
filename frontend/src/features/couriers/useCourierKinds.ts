import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import type { CourierView, Kind } from "@/api/types";
import { useStateMutation } from "@/hooks/useStateMutation";

const ORDER: Kind[] = ["pickup", "delivery"];

/**
 * Turning a courier's kinds of work on and off, saved on every click. The
 * server refuses to take a kind away while the courier still holds orders
 * of that kind; its message is kept in `error`.
 */
export function useCourierKinds(courier: CourierView) {
  const mutation = useStateMutation((kinds: Kind[]) => dispatchApi.setKinds(courier.id, kinds));

  const toggle = (kind: Kind) => {
    const has = courier.kinds.includes(kind);
    const next = ORDER.filter((k) => (k === kind ? !has : courier.kinds.includes(k)));
    if (next.length === 0 || mutation.isPending) return; // a courier needs at least one kind
    mutation.mutate(next);
  };

  return {
    busy: mutation.isPending,
    error: mutation.error ? errorMessage(mutation.error) : null,
    toggle,
  };
}
