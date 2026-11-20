import type { Courier, Order } from "@/api/types";
import { formatKg, kindLabel } from "@/domain/format";
import { cn, mutedText } from "@/shared/ui/styles";
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
  return (
    <li className={cn("flex cursor-pointer items-center gap-2 border-b border-slate-200 px-2 py-1.5 hover:bg-slate-50", selected && "bg-blue-50")} onClick={onSelect}>
      <span
        className={cn("size-3 flex-none border-2 border-slate-700 bg-white", o.type === "pickup" ? "rounded-[2px]" : "rounded-full")}
        style={color ? { background: color, borderColor: color } : undefined}
      />
      <b>{o.id}</b>
      <span>{kindLabel(o.type)}</span>
      <span className={mutedText}>{o.region || "—"}</span>
      <span className={mutedText}>{formatKg(o.weight_kg)}</span>
      <span className="ml-auto flex items-center gap-1">
        <OrderStatus order={o} courier={courier} unassignable={unassignable} />
      </span>
    </li>
  );
}
