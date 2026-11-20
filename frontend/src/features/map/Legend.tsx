import { orderPin, type PinLook } from "./mapStyles";

const items: { label: string; look: PinLook }[] = [
  { label: "pickup", look: { type: "pickup", color: null, broken: false, outside: false } },
  { label: "delivery", look: { type: "delivery", color: null, broken: false, outside: false } },
  { label: "broken", look: { type: "delivery", color: null, broken: true, outside: false } },
  { label: "outside regions", look: { type: "delivery", color: "#64748b", broken: false, outside: true } },
];

/** Explains the order pins, using the same classes as the map. */
export function Legend() {
  return (
    <div className="flex items-center gap-3.5 text-xs text-slate-500">
      {items.map(({ label, look }) => {
        const pin = orderPin({ ...look, small: true });
        return (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className={pin.outer} style={{ ["--c" as string]: look.color ?? "#fff" }}>
              <span className={pin.inner}>{pin.letter}</span>
            </span>
            {label}
          </span>
        );
      })}
    </div>
  );
}
