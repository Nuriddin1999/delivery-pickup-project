// Looks of things drawn on the map: region styles, pins and labels.
// Leaflet takes HTML strings for custom pins, so their Tailwind classes live here.
import L from "leaflet";
import { arrowPath } from "@/shared/ui/arrowPath";
import { cn } from "@/shared/ui/styles";

export type MapMode = "none" | "regions" | "pickStart";

/** Cursor per map mode. Leaflet sets its own cursors, so these need "!". */
export const mapModeClass: Record<MapMode, string> = {
  none: "",
  regions: "[&_.leaflet-interactive]:cursor-pointer!",
  pickStart: "cursor-crosshair! [&_.leaflet-interactive]:cursor-crosshair!",
};

/** Region name labels: bold dark text on a soft white plate, without Leaflet's tooltip box and arrow. */
export const regionLabelClass =
  "rounded-md! border-0! bg-white/75! px-1.5! py-0! text-[13px]! font-extrabold! text-slate-800! shadow-none! before:hidden!";

/** One soft colour per region, so neighbouring districts are easy to tell apart. */
const REGION_FILLS = ["#22c55e", "#a855f7", "#3b82f6", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444", "#6366f1", "#84cc16", "#0ea5e9"];

export function regionColor(index: number): string {
  return REGION_FILLS[(index < 0 ? 0 : index) % REGION_FILLS.length];
}

/**
 * How a region is drawn. Normally each region has its own soft colour.
 * While a courier's regions are being edited, only that courier's chosen
 * regions are coloured (in the courier's colour) and the rest are grey.
 */
export function regionStyle(regionIndex: number, name: string, mode: MapMode, draft: string[] | null, color: string): L.PathOptions {
  if (mode === "regions" && draft) {
    const on = draft.includes(name);
    return {
      color: on ? color : "#64748b",
      weight: on ? 3 : 1,
      fillColor: on ? color : "#94a3b8",
      fillOpacity: on ? 0.35 : 0.06,
    };
  }
  const fill = regionColor(regionIndex);
  return { color: fill, weight: 1.5, opacity: 0.85, fillColor: fill, fillOpacity: 0.11 };
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

const FREE_GREY = "#64748b";

/**
 * An order pin: pickups are rounded squares with an up arrow (towards the
 * hub), deliveries are circles with a down arrow. Grey when free, the
 * courier's colour when assigned, red and dashed when broken.
 */
export function orderPin(p: PinLook) {
  const isPickup = p.type === "pickup";
  const known = isPickup || p.type === "delivery";
  const outer = cn(
    "flex items-center justify-center border-2 font-bold shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
    p.small ? "size-4 text-[9px]" : "size-6 text-[12px]",
    isPickup ? "rounded-[6px]" : "rounded-full",
    p.broken ? "border-dashed border-red-600 bg-red-50 text-red-600" : "border-white bg-(--c) text-white",
    p.outside && "outline-3 outline-offset-1 outline-amber-500",
    p.selected && "scale-150 shadow-[0_0_0_4px_white,0_0_0_7px_rgba(15,23,42,0.35)]",
  );
  const content =
    p.broken || !known
      ? p.broken
        ? "!"
        : "?"
      : `<svg viewBox="0 0 24 24" class="${p.small ? "size-3" : "size-4"}"><path d="${isPickup ? arrowPath.up : arrowPath.down}" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return { outer, content, color: p.color ?? FREE_GREY };
}

const iconBase = { className: "border-0 bg-transparent" };

export function orderIcon(p: PinLook) {
  const { outer, content, color } = orderPin(p);
  return L.divIcon({
    ...iconBase,
    html: `<div class="${outer}" style="--c:${color}">${content}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/** The hub: a dark warehouse badge labelled "Hub". */
export const hubIcon = L.divIcon({
  ...iconBase,
  html: `<div class="flex flex-col items-center">
    <div class="flex size-9 items-center justify-center rounded-lg border-2 border-white bg-navy-900 text-white shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/></svg>
    </div>
    <span class="mt-0.5 rounded bg-navy-900 px-1.5 text-[11px] font-bold text-white">Hub</span>
  </div>`,
  iconSize: [44, 56],
  iconAnchor: [22, 18],
});

export const newStartIcon = L.divIcon({
  ...iconBase,
  html: '<div class="flex size-6 items-center justify-center rounded-full border-2 border-white bg-brand-600 font-extrabold text-white shadow">+</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
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

/** Rings that grow and fade around a point, in the given colour, with or without a dot in the middle. */
export function pulseIcon(color: string, dot = true) {
  return L.divIcon({
    ...iconBase,
    html: `<div class="relative size-14" style="--c:${color}">
      <span class="absolute inset-0 animate-ping rounded-full bg-(--c) opacity-50"></span>
      <span class="absolute inset-0 animate-ping rounded-full border-4 border-(--c) [animation-delay:500ms]"></span>
      ${dot ? '<span class="absolute inset-4.5 rounded-full border-3 border-white bg-(--c) shadow-[0_0_0_3px_rgba(0,0,0,0.25)]"></span>' : ""}
    </div>`,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
