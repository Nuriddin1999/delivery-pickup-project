import type { Candidate, CourierView, Order } from "@/api/types";
import { formatKg } from "@/domain/format";
import { BoxIcon, WeightIcon } from "@/shared/ui/icons";
import { Swatch } from "@/shared/ui/Swatch";
import { Tag } from "@/shared/ui/Tag";
import { cn, hintText } from "@/shared/ui/styles";

interface Props {
  order: Order;
  candidates: Candidate[];
  couriersById: Record<string, CourierView>;
  colors: Record<string, string>;
  chosenId: string | null;
  onChoose: (courierId: string) => void;
  /** shown when no courier is allowed */
  emptyText: string;
}

/**
 * "Who gets it": one card per courier, as the server checked them. Allowed
 * couriers show their load after the order and the km it adds; the nearest
 * is marked and chosen at first. Couriers who cannot take the order are
 * disabled: greyed, not selectable, with the server's reason on the card.
 */
export function CandidatePicker({ order, candidates, couriersById, colors, chosenId, onChoose, emptyText }: Props) {
  const allowed = candidates.filter((c) => c.allowed);

  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={`Courier for ${order.id}`}>
      {allowed.length === 0 && <p className={hintText}>{emptyText}</p>}
      {candidates.map((cand) => {
        const c = couriersById[cand.courier_id];
        if (!c) return null;
        const chosen = chosenId === c.id;
        return (
          <label
            key={c.id}
            aria-disabled={!cand.allowed}
            title={cand.allowed ? undefined : cand.reason}
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border-2 px-3 py-2.5 transition-colors",
              cand.allowed
                ? chosen
                  ? "cursor-pointer border-brand-500 bg-brand-50"
                  : "cursor-pointer border-slate-200 bg-white hover:border-brand-300"
                : "cursor-not-allowed border-transparent bg-slate-100/80",
            )}
          >
            <input
              type="radio"
              name="courier"
              className="size-4 accent-brand-600 disabled:cursor-not-allowed"
              checked={chosen}
              disabled={!cand.allowed}
              onChange={() => onChoose(c.id)}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn("flex items-center gap-1.5 text-[16px] font-bold", !cand.allowed && "text-slate-400")}>
                <Swatch color={colors[c.id]} />
                {c.name}
                {cand.nearest && <Tag tone="info">nearest</Tag>}
              </span>
              {cand.allowed && <span className="text-xs text-slate-500 tabular-nums">+{cand.added_km.toFixed(2)} km to the route</span>}
            </span>
            {cand.allowed ? (
              <span className="flex flex-col border-l border-slate-200 pl-3 text-[13px] tabular-nums max-sm:w-full max-sm:flex-row max-sm:flex-wrap max-sm:gap-x-3 max-sm:border-l-0 max-sm:pl-7">
                <span className="text-xs text-slate-500">After giving:</span>
                <span className="flex items-center gap-1.5">
                  <BoxIcon className="size-4 text-slate-500" /> {cand.load.parcels + 1} / {c.max_parcels} parcels
                </span>
                <span className="flex items-center gap-1.5">
                  <WeightIcon className="size-4 text-slate-500" /> {formatKg(cand.load.kg + order.weight_kg)} / {formatKg(c.max_kg)}
                </span>
              </span>
            ) : (
              <span className="max-w-[55%] border-l border-slate-200 pl-3 text-[13px] text-slate-500 max-sm:max-w-none max-sm:basis-full max-sm:border-l-0 max-sm:pl-7">{cand.reason}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
