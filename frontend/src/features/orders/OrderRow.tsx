import { useEffect, useRef } from "react";
import type { Courier, Order } from "@/api/types";
import { formatKg, formatTime, kindLabel } from "@/domain/format";
import { KindIcon } from "@/shared/ui/icons";
import { cn } from "@/shared/ui/styles";
import { OrderStatus } from "./OrderStatus";

interface Props {
  order: Order;
  courier?: Courier;
  color: string | null;
  unassignable: boolean;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Scrolls the table's own box so the row sits in the middle of the visible
 * rows (below the sticky header). Only the table moves, never the page: when
 * the table does not scroll (everything fits, or on a phone where the page
 * scrolls as a whole) nothing happens.
 */
function centerInTable(row: HTMLTableRowElement) {
  const box = row.closest<HTMLElement>("[data-order-scroll]");
  if (!box || box.scrollHeight <= box.clientHeight) return;
  const head = row.closest("table")?.tHead?.offsetHeight ?? 0;
  const r = row.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const visible = b.height - head;
  const top = box.scrollTop + (r.top - b.top - head) - (visible - r.height) / 2;
  box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

const cell ="border-b border-slate-100 px-3 py-2 max-sm:px-2";

/** One row of the order table. The icon matches the pin on the map. */
export function OrderRow({ order: o, courier, color, unassignable, selected, onSelect }: Props) {
  const ref = useRef<HTMLTableRowElement>(null);
  // When the table scrolls, bring the selected row to the middle of what is visible.
  useEffect(() => {
    if (selected && ref.current) centerInTable(ref.current);
  }, [selected]);

  return (
    <tr ref={ref} aria-selected={selected} className={cn("cursor-pointer tabular-nums", selected ? "bg-brand-100/70" : "hover:bg-slate-50")} onClick={onSelect}>
      <td className={cn(cell, "w-0 pr-0")}>
        <KindIcon type={o.type} color={color} />
      </td>
      <td className={cn(cell, "text-[15px] font-bold")}>{o.id}</td>
      <td className={cn(cell, "max-sm:hidden")}>{kindLabel(o.type)}</td>
      <td className={cell}>{o.region || "—"}</td>
      <td className={cn(cell, "text-right")}>{formatKg(o.weight_kg)}</td>
      <td className={cn(cell, "text-slate-600 max-sm:hidden")}>{formatTime(o.created_at)}</td>
      <td className={cell}>
        <span className="flex items-center gap-1">
          <OrderStatus order={o} courier={courier} unassignable={unassignable} />
        </span>
      </td>
      <td className={cn(cell, "w-0 text-lg text-slate-400 max-sm:hidden")} aria-hidden>
        ›
      </td>
    </tr>
  );
}
