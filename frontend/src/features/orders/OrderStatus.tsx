import type { Courier, Order } from "@/api/types";
import { isBroken } from "@/domain/orders";
import { Tag } from "@/shared/ui/Tag";
import { mutedText } from "@/shared/ui/styles";

interface Props {
  order: Order;
  courier?: Courier;
  unassignable: boolean;
}

/** Who holds the order, or why nobody can. */
export function OrderStatus({ order, courier, unassignable }: Props) {
  if (isBroken(order)) return <Tag tone="bad">broken</Tag>;
  if (courier)
    return (
      <>
        {courier.name}
        {order.done_at && <Tag tone="ok">done</Tag>}
        {order.outside_regions && (
          <Tag tone="warn" title="Outside the courier's regions">
            outside
          </Tag>
        )}
      </>
    );
  if (unassignable) return <Tag tone="warn">no courier fits</Tag>;
  return <span className={mutedText}>free</span>;
}
