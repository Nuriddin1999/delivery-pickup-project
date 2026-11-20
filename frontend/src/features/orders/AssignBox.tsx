import { useState } from "react";
import type { CourierView, DispatchState, Order } from "@/api/types";
import { kindLabel } from "@/domain/format";
import { isBroken } from "@/domain/orders";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { CardHeader } from "@/shared/ui/CardHeader";
import { CourierPicker } from "./CourierPicker";
import { OrderDetails } from "./OrderDetails";
import { useOrderActions } from "./useOrderActions";

interface Props {
  order: Order;
  state: DispatchState;
  couriersById: Record<string, CourierView>;
  onClose: () => void;
  onChanged: (message: string) => void;
}

/** The selected order: its details and the assign / move / take off buttons. */
export function AssignBox({ order, state, couriersById, onClose, onChanged }: Props) {
  const [courierId, setCourierId] = useState("");
  const current = order.courier_id ? couriersById[order.courier_id] : undefined;
  const target = courierId ? couriersById[courierId] : undefined;
  const reason = state.unassignable.find((u) => u.order_id === order.id)?.reason;

  const actions = useOrderActions(order.id, (message) => {
    setCourierId("");
    onChanged(message);
  });

  const pick = (id: string) => {
    setCourierId(id);
    actions.clearError();
  };

  const assign = () => {
    if (!target) return;
    const message = current ? `${order.id} moved from ${current.name} to ${target.name}` : `${order.id} given to ${target.name}`;
    actions.assign(target.id, message);
  };

  return (
    <Card>
      <CardHeader title={`Order ${order.id} · ${kindLabel(order.type)}`} onClose={onClose} />
      <OrderDetails order={order} holder={current} />
      {!isBroken(order) && reason && !current && <Alert tone="warn">No courier can take it now: {reason}</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        <CourierPicker order={order} couriers={state.couriers} value={courierId} placeholder={current ? "Move to…" : "Give to…"} onChange={pick} />
        <Button variant="primary" disabled={!target || actions.busy} onClick={assign}>
          {current ? "Move" : "Assign"}
        </Button>
        {current && (
          <Button disabled={actions.busy} onClick={() => actions.unassign(`${order.id} taken off ${current.name}`)}>
            Take off
          </Button>
        )}
      </div>
      {actions.error && <Alert tone="error">{actions.error}</Alert>}
    </Card>
  );
}
