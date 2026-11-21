import { useState } from "react";
import type { CourierView, DispatchState, Order } from "@/api/types";
import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import { isBroken } from "@/domain/orders";
import type { Undo } from "@/hooks/useToast";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { cn, hintText } from "@/shared/ui/styles";
import { CandidatePicker } from "./CandidatePicker";
import { OrderDetails } from "./OrderDetails";
import { useCandidates } from "./useCandidates";
import { useOrderActions } from "./useOrderActions";

/** What happened to the order, for the toast and the order list. */
export interface OrderChange {
  message: string;
  undo: Undo;
  /**
   * given: a free order got its first courier (the table then shows Assigned);
   * takenOff: it lost its courier (the table then shows Free); moved: another courier.
   */
  kind: "given" | "moved" | "takenOff";
}

interface Props {
  order: Order;
  state: DispatchState;
  couriersById: Record<string, CourierView>;
  colors: Record<string, string>;
  onClose: () => void;
  onChanged: (change: OrderChange) => void;
}

/**
 * The open order: what it is, who could get it, and one big button. The
 * nearest allowed courier is chosen at first, so giving out an order is a
 * single click on the button.
 */
export function AssignBox({ order, state, couriersById, colors, onClose, onChanged }: Props) {
  const current = order.courier_id ? couriersById[order.courier_id] : undefined;
  const reason = state.unassignable.find((u) => u.order_id === order.id)?.reason;
  const candidatesQuery = useCandidates(order.id);
  const candidates = candidatesQuery.data?.candidates;
  const actions = useOrderActions(order.id);
  const [picked, setPicked] = useState<string | null>(null);

  const nearestId = candidates?.find((c) => c.nearest)?.courier_id ?? null;
  // A pick only counts while that courier is still allowed. After the order went to them they
  // hold it and are no longer a candidate, so "Move to <the holder>" must never be offered.
  const pickedStillAllowed = !!picked && !!candidates?.some((c) => c.courier_id === picked && c.allowed);
  const chosenId = pickedStillAllowed ? picked : nearestId;
  const chosen = chosenId ? couriersById[chosenId] : undefined;

  const giveTo = (courierId: string) => {
    const target = couriersById[courierId];
    if (!target || actions.busy) return;
    actions.assign(courierId, () => {
      setPicked(null);
      onChanged(
        current
          ? { message: `${order.id} moved from ${current.name} to ${target.name}`, undo: () => dispatchApi.assign(order.id, current.id), kind: "moved" }
          : { message: `${order.id} given to ${target.name}`, undo: () => dispatchApi.unassign(order.id), kind: "given" },
      );
    });
  };

  const takeOff = () => {
    if (!current || actions.busy) return;
    actions.unassign(() => onChanged({ message: `${order.id} taken off ${current.name}`, undo: () => dispatchApi.assign(order.id, current.id), kind: "takenOff" }));
  };

  const verb = current ? "Move" : "Give";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="m-0 text-[28px] leading-tight font-bold">Order {order.id}</h2>
        <button type="button" className="cursor-pointer rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose} title="Close">
          ×
        </button>
      </div>

      <OrderDetails order={order} holder={current} holderColor={current ? colors[current.id] : undefined} />
      {!isBroken(order) && reason && !current && <Alert tone="warn">No courier can take it now: {reason}</Alert>}

      {!isBroken(order) && (
        <>
          <div className="border-t border-slate-200" />
          <h3 className="m-0 text-[18px] font-semibold">{current ? "Move to" : "Who gets it"}</h3>

          {candidatesQuery.isError && !candidates ? (
            <Alert tone="error">
              Could not load the couriers for this order: {errorMessage(candidatesQuery.error)}{" "}
              <Button variant="link" onClick={() => void candidatesQuery.refetch()}>
                Try again
              </Button>
            </Alert>
          ) : !candidates ? (
            <p className={hintText}>Checking couriers…</p>
          ) : (
            <CandidatePicker
              order={order}
              candidates={candidates}
              couriersById={couriersById}
              colors={colors}
              chosenId={chosenId}
              onChoose={(id) => {
                setPicked(id);
              }}
              emptyText={current ? `No other courier can take it. It stays with ${current.name}.` : "Nobody can take this order right now."}
            />
          )}

          {/* An assigned order nobody else can take needs no button: it simply stays where it is. */}
          {(chosen || !current) && (
            <button
              type="button"
              disabled={!chosen || actions.busy}
              onClick={() => chosenId && giveTo(chosenId)}
              className={cn(
                "h-13 w-full cursor-pointer rounded-xl text-[18px] font-semibold shadow-sm transition-colors disabled:cursor-default disabled:opacity-50",
                "bg-brand-600 text-white hover:bg-brand-700 disabled:hover:bg-brand-600",
              )}
            >
              {actions.busy ? "Saving…" : chosen ? `${verb} to ${chosen.name}` : candidates ? "Nobody can take it" : "Choose a courier"}
            </button>
          )}

          {current && (
            <Button disabled={actions.busy} onClick={takeOff}>
              Take off from {current.name}
            </Button>
          )}
        </>
      )}
      {actions.error && <Alert tone="error">{actions.error}</Alert>}
    </div>
  );
}
