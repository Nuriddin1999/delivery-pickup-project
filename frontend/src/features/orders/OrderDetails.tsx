import type { Courier, Order } from "@/api/types";
import { formatKg } from "@/domain/format";
import { isBroken } from "@/domain/orders";
import { Alert } from "@/shared/ui/Alert";
import { Tag } from "@/shared/ui/Tag";
import { mutedText } from "@/shared/ui/styles";

interface Props {
  order: Order;
  /** the courier holding the order, if any */
  holder?: Courier;
}

/** Region, weight, place, notes, problems and current courier of an order. */
export function OrderDetails({ order, holder }: Props) {
  const place = order.location ? `${order.location.lat.toFixed(4)}, ${order.location.lng.toFixed(4)}` : "no location";
  return (
    <>
      <p className={mutedText}>
        {order.region || "no region"} · {formatKg(order.weight_kg)} · {place}
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
        <p>
          With <b>{holder.name}</b>
          {order.outside_regions && <Tag tone="warn">outside {holder.name}'s regions</Tag>}
        </p>
      )}
    </>
  );
}
