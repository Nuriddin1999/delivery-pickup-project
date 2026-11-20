import type { AutoAssignResult, CourierView } from "@/api/types";
import { Card } from "@/shared/ui/Card";
import { CardHeader } from "@/shared/ui/CardHeader";
import { listItem, mutedText } from "@/shared/ui/styles";

interface Props {
  result: AutoAssignResult;
  couriers: CourierView[];
  onClose: () => void;
  onSelectOrder: (id: string) => void;
}

/** What the last auto-assign did, and why some orders were not placed. */
export function AutoAssignReport({ result, couriers, onClose, onSelectOrder }: Props) {
  const names = Object.fromEntries(couriers.map((c) => [c.id, c.name]));
  const { assigned, unplaced } = result;

  return (
    <Card>
      <CardHeader title={`Auto-assign: ${assigned.length} placed, ${unplaced.length} not placed`} onClose={onClose} />
      {assigned.length === 0 && unplaced.length > 0 && <p className={mutedText}>Nothing new to place: every order a courier can take already has one.</p>}
      {assigned.length > 0 && <p className={mutedText}>{assigned.map((a) => `${a.order_id} → ${names[a.courier_id]} (+${a.added_km.toFixed(2)} km)`).join(", ")}</p>}
      <ul className="m-0 list-none p-0">
        {unplaced.map((u) => (
          <li key={u.order_id} className={listItem} onClick={() => onSelectOrder(u.order_id)}>
            <b>{u.order_id}</b>: {u.reason}
          </li>
        ))}
      </ul>
    </Card>
  );
}
