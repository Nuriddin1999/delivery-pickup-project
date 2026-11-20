import type { CourierView, Order } from "@/api/types";
import { quickCheck } from "@/domain/orders";
import { cn, inputClass } from "@/shared/ui/styles";

interface Props {
  order: Order;
  couriers: CourierView[];
  value: string;
  placeholder: string;
  onChange: (courierId: string) => void;
}

/**
 * Couriers to give the order to: allowed ones first with ✓, the rest with a
 * hint why not. Everyone stays selectable so the server can explain a refusal.
 */
export function CourierPicker({ order, couriers, value, placeholder, onChange }: Props) {
  const options = couriers
    .filter((c) => c.id !== order.courier_id)
    .map((c) => ({ courier: c, why: quickCheck(c, order) }))
    .sort((a, b) => Number(!!a.why) - Number(!!b.why));

  return (
    <select className={cn(inputClass, "flex-1")} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(({ courier, why }) => (
        <option key={courier.id} value={courier.id}>
          {courier.name} {why ? `— ${why}` : "✓"}
        </option>
      ))}
    </select>
  );
}
