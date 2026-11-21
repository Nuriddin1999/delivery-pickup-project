import type { Candidate, CourierView, Order } from "@/api/types";
import { formatKg } from "@/domain/format";
import { Swatch } from "@/shared/ui/Swatch";
import { Tag } from "@/shared/ui/Tag";
import { cn, hintText } from "@/shared/ui/styles";

interface Props {
  order: Order;
  candidates: Candidate[] | undefined;
  couriersById: Record<string, CourierView>;
  colors: Record<string, string>;
  busy: boolean;
  onPick: (courierId: string) => void;
}

/**
 * The couriers to give the order to, as the server checked them. One click
 * on an allowed courier assigns; the number on the left is its key (1–9).
 * Refused couriers are folded away with the reason, and can still be tried,
 * so the server explains the refusal in its own words.
 */
export function CandidateList({ order, candidates, couriersById, colors, busy, onPick }: Props) {
  if (!candidates) return <p className={hintText}>Checking couriers…</p>;
  const allowed = candidates.filter((c) => c.allowed);
  const refused = candidates.filter((c) => !c.allowed);

  return (
    <div className="flex flex-col gap-1">
      {allowed.length === 0 && <p className={hintText}>Nobody can take this order right now.</p>}
      {allowed.map((cand, i) => {
        const c = couriersById[cand.courier_id];
        if (!c) return null;
        return (
          <button
            key={c.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(c.id)}
            title={`Give ${order.id} to ${c.name}${i < 9 ? ` (key ${i + 1})` : ""}`}
            className={cn(
              "grid cursor-pointer grid-cols-[22px_1fr_auto] items-center gap-x-2 rounded-md border px-2 py-1.5 text-left hover:border-blue-500 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60",
              cand.nearest ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white",
            )}
          >
            <kbd className="rounded border border-slate-300 bg-white text-center text-xs text-slate-600">{i < 9 ? i + 1 : ""}</kbd>
            <span className="flex min-w-0 items-center gap-1.5 font-semibold">
              <Swatch color={colors[c.id]} /> {c.name}
              {cand.nearest && <Tag tone="info">nearest</Tag>}
            </span>
            <span className="text-right font-semibold tabular-nums">+{cand.added_km.toFixed(2)} km</span>
            <span />
            <span className="col-span-2 text-xs text-slate-600 tabular-nums">
              after: {cand.load.parcels + 1} / {c.max_parcels} parcels · {formatKg(cand.load.kg + order.weight_kg)} / {formatKg(c.max_kg)}
            </span>
          </button>
        );
      })}

      {refused.length > 0 && (
        <details className="mt-1 text-[13px]" open={allowed.length === 0}>
          <summary className="cursor-pointer text-slate-600 select-none">
            {refused.length} {refused.length === 1 ? "courier cannot" : "couriers cannot"} take it
          </summary>
          <ul className="m-0 mt-1 list-none p-0">
            {refused.map((cand) => {
              const c = couriersById[cand.courier_id];
              if (!c) return null;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPick(c.id)}
                    title="Try anyway: the server will refuse and say why"
                    className="flex w-full cursor-pointer items-baseline gap-1.5 rounded px-1 py-0.5 text-left text-slate-600 hover:bg-slate-50"
                  >
                    <Swatch color={colors[c.id]} />
                    <b className="font-medium text-slate-800">{c.name}</b>
                    <span>— {cand.reason}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
