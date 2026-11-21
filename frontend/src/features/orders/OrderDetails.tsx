import type { Courier, Order } from "@/api/types";
import { formatKg, formatTime, kindLabel } from "@/domain/format";
import { isBroken } from "@/domain/orders";
import { Alert } from "@/shared/ui/Alert";
import { BoxIcon, KindIcon } from "@/shared/ui/icons";
import { Tag } from "@/shared/ui/Tag";

interface Props {
  order: Order;
  /** the courier holding the order, if any */
  holder?: Courier;
  holderColor?: string;
}

/** Kind and region, parcel and weight, then notes, problems and the current courier. */
export function OrderDetails({ order, holder, holderColor }: Props) {
  const place = order.location ? `${order.location.lat.toFixed(4)}, ${order.location.lng.toFixed(4)}` : "no location";
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2.5 text-[16px]">
        <KindIcon type={order.type} color={holderColor ?? null} className="size-6" />
        {kindLabel(order.type)} <span className="text-slate-400">·</span> {order.region || "no region"}
      </p>
      <p className="flex items-center gap-2.5 text-[16px]">
        <BoxIcon className="size-6 text-slate-500" />1 parcel <span className="text-slate-400">·</span> {formatKg(order.weight_kg)}
      </p>
      <p className="text-[13px] text-slate-500 tabular-nums">
        Created {formatTime(order.created_at)} · {place}
      </p>

      {order.notes?.map((n) => (
        <Alert key={n} tone="note">
          {n}
        </Alert>
      ))}

      {isBroken(order) && (
        <Alert tone="error">
          This order is broken and can never be assigned:
          <ul className="mt-1 list-disc pl-5">
            {order.problems!.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Alert>
      )}

      {holder && (
        <p className="text-[15px]">
          With <b>{holder.name}</b>
          {order.outside_regions && <Tag tone="warn">outside {holder.name}'s regions</Tag>}
        </p>
      )}
    </div>
  );
}
