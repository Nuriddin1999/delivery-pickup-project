import { useEffect, useRef } from "react";
import type { Courier, Order } from "@/api/types";
import { formatKg, formatTime, kindLabel } from "@/domain/format";
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

/** One line of the order list. The marker matches the pin on the map. */
export function OrderRow({ order: o, courier, color, unassignable, selected, onSelect }: Props) {
  const ref = useRef<HTMLLIElement>(null);
  // Keep the selected row visible when it is picked on the map or with the arrow keys.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <li
      ref={ref}
      aria-selected={selected}
      className={cn(
        "grid cursor-pointer grid-cols-[14px_44px_62px_1fr_52px_40px_auto] items-center gap-2 border-b border-slate-200 px-2 py-1.5 tabular-nums hover:bg-slate-50",
        selected && "bg-blue-50 shadow-[inset_3px_0_0_var(--color-blue-600)] hover:bg-blue-50",
      )}
      onClick={onSelect}
    >
      <span
        className={cn("size-3 border-2 border-slate-700 bg-white", o.type === "pickup" ? "rotate-45 rounded-[2px]" : "rounded-full")}
        style={color ? { background: color, borderColor: color } : undefined}
      />
      <b>{o.id}</b>
      <span>{kindLabel(o.type)}</span>
      <span className="truncate text-slate-600">{o.region || "—"}</span>
      <span className="text-right text-slate-600">{formatKg(o.weight_kg)}</span>
      <span className="text-slate-600" title="Created">
        {formatTime(o.created_at)}
      </span>
      <span className="flex items-center justify-end gap-1 text-right">
        <OrderStatus order={o} courier={courier} unassignable={unassignable} />
      </span>
    </li>
  );
}
