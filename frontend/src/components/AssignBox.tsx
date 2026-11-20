import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { isBroken, kg, kindLabel, quickCheck } from "../logic";
import type { CourierView, Order, State } from "../types";
import { btn, btnLink, btnPrimary, card, cardTitle, cn, errorBox, input, muted, noteBox, tagWarn, warnBox } from "../ui";

interface Props {
  order: Order;
  state: State;
  byId: Record<string, CourierView>;
  onClose: () => void;
  onChanged: (message: string) => void;
}

/** The selected order: its details and the assign / move / take off buttons. */
export function AssignBox({ order, state, byId, onClose, onChanged }: Props) {
  const current = order.courier_id ? byId[order.courier_id] : undefined;
  const [courierId, setCourierId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reason = state.unassignable.find((u) => u.order_id === order.id)?.reason;

  useEffect(() => setError(null), [courierId]);

  const options = state.couriers
    .filter((c) => c.id !== order.courier_id)
    .map((c) => ({ c, why: quickCheck(c, order) }))
    .sort((a, b) => Number(!!a.why) - Number(!!b.why));

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setCourierId("");
      onChanged(message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const target = courierId ? byId[courierId] : undefined;
  return (
    <div className={cn(card, "flex flex-col gap-1.5")}>
      <div className="flex items-center justify-between">
        <h3 className={cardTitle}>
          Order {order.id} · {kindLabel(order.type)}
        </h3>
        <button type="button" className={btnLink} onClick={onClose}>
          close
        </button>
      </div>
      <p className={muted}>
        {order.region || "no region"} · {kg(order.weight_kg)}
        {order.location ? ` · ${order.location.lat.toFixed(4)}, ${order.location.lng.toFixed(4)}` : " · no location"}
      </p>
      {order.notes?.map((n) => (
        <p key={n} className={noteBox}>
          {n}
        </p>
      ))}
      {isBroken(order) && (
        <div className={errorBox}>
          This order is broken and can never be assigned:
          <ul className="mt-1 list-disc pl-5">
            {order.problems!.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {!isBroken(order) && reason && !current && <p className={warnBox}>No courier can take it now: {reason}</p>}
      {current && (
        <p>
          With <b>{current.name}</b>
          {order.outside_regions && <span className={tagWarn}>outside {current.name}'s regions</span>}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select className={cn(input, "flex-1")} value={courierId} onChange={(e) => setCourierId(e.target.value)}>
          <option value="">{current ? "Move to…" : "Give to…"}</option>
          {options.map(({ c, why }) => (
            <option key={c.id} value={c.id}>
              {c.name} {why ? `— ${why}` : "✓"}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btnPrimary}
          disabled={!courierId || busy}
          onClick={() => run(() => api.assign(order.id, courierId), current ? `${order.id} moved from ${current.name} to ${target?.name}` : `${order.id} given to ${target?.name}`)}
        >
          {current ? "Move" : "Assign"}
        </button>
        {current && (
          <button type="button" className={btn} disabled={busy} onClick={() => run(() => api.unassign(order.id), `${order.id} taken off ${current.name}`)}>
            Take off
          </button>
        )}
      </div>
      {error && <p className={errorBox}>{error}</p>}
    </div>
  );
}
