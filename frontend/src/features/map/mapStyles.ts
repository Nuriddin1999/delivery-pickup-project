// Looks of things drawn on the map: region styles, pins and labels.
// Leaflet takes HTML strings for custom pins, so their Tailwind classes live here.
import L from "leaflet";
import { cn } from "@/shared/ui/styles";

export type MapMode = "none" | "regions" | "pickStart";

/** Cursor per map mode. Leaflet sets its own cursors, so these need "!". */
export const mapModeClass: Record<MapMode, string> = {
  none: "",
  regions: "[&_.leaflet-interactive]:cursor-pointer!",
  pickStart: "cursor-crosshair! [&_.leaflet-interactive]:cursor-crosshair!",
};

/** Region name tooltips, overriding Leaflet's tooltip box and arrow. */
export const regionLabelClass = "rounded-[10px]! border! border-slate-300! bg-white/90! px-1.75! py-px! text-xs! font-bold! text-slate-800! shadow-none! before:hidden!";

export function regionStyle(name: string, mode: MapMode, draft: string[] | null, color: string): L.PathOptions {
  if (mode === "regions" && draft) {
    const on = draft.includes(name);
    return {
      color: on ? color : "#64748b",
      weight: on ? 3 : 1,
      fillColor: on ? color : "#94a3b8",
      fillOpacity: on ? 0.35 : 0.06,
    };
  }
  return { color: "#334155", weight: 2, fillColor: "#94a3b8", fillOpacity: 0.12 };
}

export interface PinLook {
  type: string;
  /** courier colour, or null for a free order */
  color: string | null;
  broken: boolean;
  outside: boolean;
  selected?: boolean;
  small?: boolean;
}

/** Classes for an order pin: pickups are diamonds, deliveries are circles. */
export function orderPin(p: PinLook) {
  const isPickup = p.type === "pickup";
  const letter = p.broken ? "!" : isPickup ? "P" : p.type === "delivery" ? "D" : "?";
  const outer = cn(
    "flex items-center justify-center border-2 font-bold shadow-[0_1px_3px_rgba(0,0,0,0.4)]",
    p.small ? "size-4 text-[8px]" : "size-5.5 text-[11px]",
    isPickup ? "rotate-45 rounded-[3px]" : "rounded-full",
    p.broken ? "border-dashed border-red-600 bg-red-100 text-red-600" : p.color ? "border-white bg-(--c) text-white" : "border-slate-800 bg-white text-slate-800",
    p.outside && "outline-3 outline-offset-1 outline-amber-600",
    p.selected && "scale-125 ring-4 ring-blue-600/60",
  );
  return { outer, inner: isPickup ? "-rotate-45" : "", letter };
}

const iconBase = { className: "border-0 bg-transparent" };

export function orderIcon(p: PinLook) {
  const { outer, inner, letter } = orderPin(p);
  return L.divIcon({
    ...iconBase,
    html: `<div class="${outer}" style="--c:${p.color ?? "#fff"}"><span class="${inner}">${letter}</span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export const hubIcon = L.divIcon({
  ...iconBase,
  html: '<div class="flex h-5.5 w-10 items-center justify-center rounded border-2 border-white bg-slate-900 text-[11px] font-extrabold text-white shadow-[0_1px_4px_rgba(0,0,0,0.5)]">HUB</div>',
  iconSize: [40, 22],
  iconAnchor: [20, 11],
});

export const newStartIcon = L.divIcon({
  ...iconBase,
  html: '<div class="flex size-5.5 items-center justify-center rounded-full border-2 border-white bg-slate-900 font-extrabold text-white">+</div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** How a courier start pin looks while an order is picked: "allowed" couriers stand out, the others fade. */
export type StartEmphasis = "normal" | "allowed" | "faded";

export function startIcon(color: string, name: string, emphasis: StartEmphasis = "normal") {
  const look = cn(
    "flex size-4.5 items-center justify-center rounded-[50%_50%_50%_0] border-3 border-(--c) bg-white text-[9px] font-extrabold text-(--c)",
    emphasis === "allowed" && "scale-150 shadow-[0_0_0_3px_white,0_0_0_5px_var(--c)]",
    emphasis === "faded" && "opacity-30",
  );
  return L.divIcon({
    ...iconBase,
    html: `<div class="${look}" style="--c:${color}">${escapeHtml(name.charAt(0))}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Rings that grow and fade around a point, in the given colour. */
export function pulseIcon(color: string) {
  return L.divIcon({
    ...iconBase,
    html: `<div class="relative size-14" style="--c:${color}">
      <span class="absolute inset-0 animate-ping rounded-full bg-(--c) opacity-50"></span>
      <span class="absolute inset-0 animate-ping rounded-full border-4 border-(--c) [animation-delay:500ms]"></span>
      <span class="absolute inset-4.5 rounded-full border-3 border-white bg-(--c) shadow-[0_0_0_3px_rgba(0,0,0,0.25)]"></span>
    </div>`,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
