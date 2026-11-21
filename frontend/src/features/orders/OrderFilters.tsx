import { cn, inputClass } from "@/shared/ui/styles";
import { orderFilterLabels, type OrderFilter, type OrderQuery } from "./orderFilter";

export const SEARCH_ID = "order-search";

interface Props {
  query: OrderQuery;
  counts: Record<OrderFilter, number>;
  regions: string[];
  onChange: (patch: Partial<OrderQuery>) => void;
}

/** Free / Assigned / Problems / All with counts, then region and id search. */
export function OrderFilters({ query, counts, regions, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1" role="tablist">
        {(Object.keys(orderFilterLabels) as OrderFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={query.show === f}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-[13px]",
              query.show === f ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-50",
            )}
            onClick={() => onChange({ show: f })}
          >
            {orderFilterLabels[f]}
            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", query.show === f ? "bg-white/20" : "bg-slate-100 text-slate-600")}>{counts[f]}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          id={SEARCH_ID}
          type="search"
          className={cn(inputClass, "flex-1")}
          placeholder="Find order id…  ( / )"
          value={query.q}
          onChange={(e) => onChange({ q: e.target.value })}
          onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
        />
        <select className={inputClass} value={query.region} onChange={(e) => onChange({ region: e.target.value })} aria-label="Region">
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
