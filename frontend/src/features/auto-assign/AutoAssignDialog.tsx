import { useEffect } from "react";
import type { AutoAssignResult, CourierView, Order } from "@/api/types";
import { formatKg, formatKm } from "@/domain/format";
import { Button } from "@/shared/ui/Button";
import { KindIcon } from "@/shared/ui/icons";
import { Swatch } from "@/shared/ui/Swatch";
import { cn } from "@/shared/ui/styles";

interface Props {
  plan: AutoAssignResult | null;
  couriers: CourierView[];
  orders: Order[];
  colors: Record<string, string>;
  checking: boolean;
  confirming: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onCheckAgain: () => void;
}

interface Group {
  courier: CourierView;
  items: { order: Order; addedKm: number }[];
  addedKm: number;
  kg: number;
}

/** The plan grouped by courier, in the order the server gives (route order within a courier). */
function groupPlan(plan: AutoAssignResult, couriers: CourierView[], orders: Order[]): Group[] {
  const groups = new Map<string, Group>();
  for (const a of plan.assigned) {
    const courier = couriers.find((c) => c.id === a.courier_id);
    const order = orders.find((o) => o.id === a.order_id);
    if (!courier || !order) continue;
    const g = groups.get(courier.id) ?? { courier, items: [], addedKm: 0, kg: 0 };
    g.items.push({ order, addedKm: a.added_km });
    g.addedKm += a.added_km;
    g.kg += order.weight_kg;
    groups.set(courier.id, g);
  }
  return [...groups.values()];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Asks the dispatcher to check the auto-assign plan before anything is
 * given out: who gets which order, the km it adds, each courier's load
 * afterwards, and the orders left out with the reason.
 */
export function AutoAssignDialog({ plan, couriers, orders, colors, checking, confirming, error, onConfirm, onCancel, onCheckAgain }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirming) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming, onCancel]);

  const groups = plan ? groupPlan(plan, couriers, orders) : [];
  const count = plan?.assigned.length ?? 0;
  const totalKm = groups.reduce((s, g) => s + g.addedKm, 0);

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center bg-slate-900/50 p-4 max-sm:p-2" onMouseDown={(e) => e.target === e.currentTarget && !confirming && onCancel()}>
      <div role="dialog" aria-modal="true" aria-labelledby="auto-assign-title" className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-5 py-4 max-sm:px-4">
          <h2 id="auto-assign-title" className="m-0 text-lg font-semibold">
            Auto-assign: check before giving out
          </h2>
          <p className="m-0 mt-1 text-[13px] text-slate-600">
            {checking ? "Working out the plan…" : plan ? (count > 0 ? `${plural(count, "order", "orders")} to ${plural(groups.length, "courier", "couriers")}, +${formatKm(totalKm)} in total. Nothing is given out until you confirm.` : "Nothing new to place: every order a courier can take already has one.") : null}
          </p>
        </div>

        <div className="no-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 max-sm:px-4">
          {error && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
              <span>{error}</span>
              <Button variant="link" onClick={onCheckAgain} className="shrink-0 font-medium">
                Check again
              </Button>
            </div>
          )}

          {groups.map((g) => {
            const parcelsAfter = g.courier.load.parcels + g.items.length;
            const kgAfter = g.courier.load.kg + g.kg;
            return (
              <section key={g.courier.id} className="rounded-lg border border-slate-200">
                <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <Swatch color={colors[g.courier.id]} />
                    {g.courier.name}
                    <span className="font-normal text-slate-600">· {plural(g.items.length, "order", "orders")}</span>
                  </span>
                  <span className="text-right text-[12px] text-slate-600 tabular-nums">
                    after: {parcelsAfter}/{g.courier.max_parcels} parcels · {formatKg(kgAfter)}/{formatKg(g.courier.max_kg)}
                    <br />
                    +{formatKm(g.addedKm)}
                  </span>
                </header>
                <ul className="m-0 list-none p-0">
                  {g.items.map(({ order, addedKm }) => (
                    <li key={order.id} className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-1.5 text-[13px] last:border-b-0">
                      <KindIcon type={order.type} color={colors[g.courier.id]} className="size-4.5 shrink-0" />
                      <b className="w-10">{order.id}</b>
                      <span className="flex-1 truncate text-slate-700">{order.region}</span>
                      <span className="w-12 text-right text-slate-600 tabular-nums">{formatKg(order.weight_kg)}</span>
                      <span className="w-20 text-right text-slate-600 tabular-nums">+{formatKm(addedKm)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {plan && plan.unplaced.length > 0 && (
            <details open={count === 0} className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[13px]">
              <summary className="cursor-pointer font-medium text-amber-900">Not placed ({plan.unplaced.length})</summary>
              <ul className="m-0 mt-1.5 list-none p-0">
                {plan.unplaced.map((u) => (
                  <li key={u.order_id} className="py-0.5 text-slate-700">
                    <b>{u.order_id}</b>: {u.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 max-sm:px-4">
          <Button onClick={onCancel} disabled={confirming}>
            {count > 0 ? "Cancel" : "Close"}
          </Button>
          {count > 0 && (
            <Button
              variant="primary"
              autoFocus
              onClick={onConfirm}
              disabled={confirming || checking || error !== null}
              className={cn("inline-flex items-center gap-2 transition active:scale-95")}
            >
              {confirming && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
              {confirming ? "Giving out…" : `Confirm: give out ${plural(count, "order", "orders")}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
