import { cn, inputClass } from "@/shared/ui/styles";
import { orderFilterLabels, type OrderFilter, type OrderQuery } from "./orderFilter";

export const SEARCH_ID = "order-search";

interface Props {
  query: OrderQuery;
  counts: Record<OrderFilter, number>;
  regions: string[];
  onChange: (patch: Partial<OrderQuery>) => void;
}

/** "Free (12)  Assigned (28)  Problems (2)  All" pills, then id search and region. */
export function OrderFilters({ query, counts, regions, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1.5" role="tablist">
        {(Object.keys(orderFilterLabels) as OrderFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={query.show === f}
            className={cn(
              "cursor-pointer rounded-lg px-3.5 py-1.5 text-[14px] tabular-nums",
              query.show === f ? "bg-brand-600 font-semibold text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
            onClick={() => onChange({ show: f })}
          >
            {orderFilterLabels[f]} ({counts[f]})
          </button>
        ))}
      </div>
      <div className="ml-auto flex gap-2">
        <input
          id={SEARCH_ID}
          type="search"
          className={cn(inputClass, "w-44")}
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
