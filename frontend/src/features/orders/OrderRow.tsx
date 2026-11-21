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

const cell = "border-b border-slate-100 px-3 py-2 max-sm:px-2";

/** One row of the order table. The icon matches the pin on the map. */
export function OrderRow({ order: o, courier, color, unassignable, selected, onSelect }: Props) {
  const ref = useRef<HTMLTableRowElement>(null);
  // Keep the selected row visible when it is picked on the map or with the arrow keys.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
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
