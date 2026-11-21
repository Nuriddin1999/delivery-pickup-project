import type { CourierView, Kind } from "@/api/types";
import { cn, errorText } from "@/shared/ui/styles";
import { useCourierKinds } from "./useCourierKinds";

const KINDS: { kind: Kind; label: string }[] = [
  { kind: "pickup", label: "Pickups" },
  { kind: "delivery", label: "Deliveries" },
];

/**
 * "Works on: [Pickups] [Deliveries]" in the open courier card. A click adds
 * or takes away that kind of work and saves it at once. The last kind left
 * cannot be taken away; the server refuses to take one away while the
 * courier still holds orders of that kind, and its reason is shown here.
 */
export function KindToggles({ courier }: { courier: CourierView }) {
  const { busy, error, toggle } = useCourierKinds(courier);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`${courier.name}'s kinds of work`}>
        <span className="mr-1 text-[13px] text-slate-600">Works on:</span>
        {KINDS.map(({ kind, label }) => {
          const on = courier.kinds.includes(kind);
          const last = on && courier.kinds.length === 1;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={on}
              disabled={busy || last}
              onClick={() => toggle(kind)}
              title={last ? "A courier needs at least one kind of work" : on ? `Stop giving ${courier.name} ${label.toLowerCase()}` : `Let ${courier.name} do ${label.toLowerCase()} too`}
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-[13px] transition-colors disabled:cursor-not-allowed",
                on ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700" : "border-slate-300 bg-white text-slate-700 hover:border-brand-500 hover:text-brand-700",
                last && "hover:bg-brand-600",
                busy && "opacity-60",
              )}
            >
              <span aria-hidden>{on ? "✓" : "+"}</span>
              {label}
            </button>
          );
        })}
      </div>
      {error && <span className={errorText}>{error}</span>}
    </div>
  );
}
