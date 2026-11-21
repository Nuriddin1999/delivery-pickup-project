import type { CourierView, DispatchState, Order } from "@/api/types";
import { dispatchApi } from "@/api/dispatchApi";
import { kindLabel } from "@/domain/format";
import { isBroken } from "@/domain/orders";
import { useHotkeys, type Hotkeys } from "@/hooks/useHotkeys";
import type { Undo } from "@/hooks/useToast";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { CardHeader } from "@/shared/ui/CardHeader";
import { CandidateList } from "./CandidateList";
import { OrderDetails } from "./OrderDetails";
import { useCandidates } from "./useCandidates";
import { useOrderActions } from "./useOrderActions";

/** What happened to the order, for the toast and the queue. */
export interface OrderChange {
  message: string;
  undo: Undo;
  /** a free order got its first courier (the queue then moves on) */
  newlyAssigned: boolean;
}

interface Props {
  order: Order;
  state: DispatchState;
  couriersById: Record<string, CourierView>;
  colors: Record<string, string>;
  onClose: () => void;
  onChanged: (change: OrderChange) => void;
}

/** The selected order: its details, the couriers to give it to, and take off. */
export function AssignBox({ order, state, couriersById, colors, onClose, onChanged }: Props) {
  const current = order.courier_id ? couriersById[order.courier_id] : undefined;
  const reason = state.unassignable.find((u) => u.order_id === order.id)?.reason;
  const candidates = useCandidates(order.id).data?.candidates;
  const actions = useOrderActions(order.id);

  const giveTo = (courierId: string) => {
    const target = couriersById[courierId];
    if (!target || actions.busy) return;
    actions.assign(courierId, () =>
      onChanged(
        current
          ? { message: `${order.id} moved from ${current.name} to ${target.name}`, undo: () => dispatchApi.assign(order.id, current.id), newlyAssigned: false }
          : { message: `${order.id} given to ${target.name}`, undo: () => dispatchApi.unassign(order.id), newlyAssigned: true },
      ),
    );
  };

  const takeOff = () => {
    if (!current || actions.busy) return;
    actions.unassign(() => onChanged({ message: `${order.id} taken off ${current.name}`, undo: () => dispatchApi.assign(order.id, current.id), newlyAssigned: false }));
  };

  // Keys 1–9 give the order to the allowed courier with that number.
  const keys: Hotkeys = { Escape: onClose };
  candidates
    ?.filter((c) => c.allowed)
    .slice(0, 9)
    .forEach((c, i) => (keys[String(i + 1)] = () => giveTo(c.courier_id)));
  useHotkeys(keys);

  return (
    <Card className="border-blue-200 shadow-sm">
      <CardHeader title={`Order ${order.id} · ${kindLabel(order.type)}`} onClose={onClose} />
      <OrderDetails order={order} holder={current} />
      {!isBroken(order) && reason && !current && <Alert tone="warn">No courier can take it now: {reason}</Alert>}

      {!isBroken(order) && (
        <>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-700">{current ? "Move to" : "Give to"}</span>
            {current && (
              <Button disabled={actions.busy} onClick={takeOff}>
                Take off {current.name}
              </Button>
            )}
          </div>
          <CandidateList order={order} candidates={candidates} couriersById={couriersById} colors={colors} busy={actions.busy} onPick={giveTo} />
        </>
      )}
      {actions.error && <Alert tone="error">{actions.error}</Alert>}
    </Card>
  );
}
