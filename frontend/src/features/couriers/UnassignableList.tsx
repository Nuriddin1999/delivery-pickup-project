import type { Unassignable } from "@/api/types";
import { Tag } from "@/shared/ui/Tag";
import { listItem, mutedText } from "@/shared/ui/styles";

interface Props {
  items: Unassignable[];
  onSelectOrder: (id: string) => void;
}

/** Orders that no courier can take as things stand, with the reason. */
export function UnassignableList({ items, onSelectOrder }: Props) {
  return (
    <section>
      <h3 className="mt-2.5 mb-1 text-[15px] font-semibold">Orders that cannot be assigned</h3>
      {items.length === 0 && <p className={mutedText}>None.</p>}
      <ul className="m-0 list-none p-0">
        {items.map((u) => (
          <li key={u.order_id} className={listItem} onClick={() => onSelectOrder(u.order_id)}>
            <b>{u.order_id}</b> <Tag tone={u.broken ? "bad" : "warn"}>{u.broken ? "broken data" : "no courier fits"}</Tag>
            <div>{u.reason}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
