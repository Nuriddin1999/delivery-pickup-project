import { useStoredFlag } from "@/hooks/useStoredFlag";
import { orderPin, type PinLook } from "./mapStyles";

const items: { label: string; look: PinLook }[] = [
  { label: "Pickup (free)", look: { type: "pickup", color: null, broken: false, outside: false } },
  { label: "Delivery (free)", look: { type: "delivery", color: null, broken: false, outside: false } },
  { label: "Pickup (assigned, courier's colour)", look: { type: "pickup", color: "#2563eb", broken: false, outside: false } },
  { label: "Delivery (assigned)", look: { type: "delivery", color: "#2563eb", broken: false, outside: false } },
  { label: "Broken order", look: { type: "delivery", color: null, broken: true, outside: false } },
  { label: "Outside the courier's regions", look: { type: "delivery", color: "#2563eb", broken: false, outside: true } },
];

/** Explains the pins, using the same classes as the map. Sits on the map's bottom-left corner and folds away. */
export function Legend() {
  const [open, setOpen] = useStoredFlag("dispatch.legendOpen", true);
  if (!open)
    return (
      <button type="button" className="cursor-pointer rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-md hover:bg-white" onClick={() => setOpen(true)}>
        Legend
      </button>
    );
  return (
    <div className="relative flex flex-col gap-1 rounded-lg border border-slate-200 bg-white/95 py-2 pr-7 pl-2.5 text-xs text-slate-700 shadow-md">
      <button type="button" className="absolute top-1 right-1.5 cursor-pointer px-1 text-base leading-none text-slate-400 hover:text-slate-700" onClick={() => setOpen(false)} title="Hide the legend">
        ×
      </button>
      {items.map(({ label, look }) => {
        const pin = orderPin({ ...look, small: true });
        return (
          <span key={label} className="flex items-center gap-2">
            <span className={pin.outer} style={{ ["--c" as string]: pin.color }} dangerouslySetInnerHTML={{ __html: pin.content }} />
            {label}
          </span>
        );
      })}
      <span className="flex items-center gap-2">
        <span className="size-4 rounded-full bg-slate-200 shadow-[0_0_0_2px_white,0_0_0_3px_rgba(15,23,42,0.3)]" />
        Selected order
      </span>
    </div>
  );
}
