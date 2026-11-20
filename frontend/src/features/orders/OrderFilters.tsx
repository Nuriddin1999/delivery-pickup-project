import { cn } from "@/shared/ui/styles";
import { orderFilterLabels, type OrderFilter } from "./orderFilter";

interface Props {
  value: OrderFilter;
  onChange: (f: OrderFilter) => void;
}

/** All / Free / Assigned / Problems switch above the order list. */
export function OrderFilters({ value, onChange }: Props) {
  return (
    <div className="flex gap-1" role="tablist">
      {(Object.keys(orderFilterLabels) as OrderFilter[]).map((f) => (
        <button
          key={f}
          type="button"
          role="tab"
          aria-selected={value === f}
          className={cn("cursor-pointer rounded-md border px-2.5 py-0.5 text-[13px]", value === f ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-50")}
          onClick={() => onChange(f)}
        >
          {orderFilterLabels[f]}
        </button>
      ))}
    </div>
  );
}
