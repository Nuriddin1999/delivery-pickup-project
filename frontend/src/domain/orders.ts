import type { CourierView, Kind, Order } from "@/api/types";
import { kindPlural } from "./format";

export function isBroken(o: Order): boolean {
  return (o.problems?.length ?? 0) > 0;
}

/**
 * Why courier c may not take order o, or null if they may. Mirrors the
 * server rules so the courier list can show hints before asking. Only for
 * comfort: the server checks everything again.
 */
export function quickCheck(c: CourierView, o: Order): string | null {
  if (isBroken(o)) return "order is broken";
  if (!c.active) return "not active today";
  if (!c.kinds.includes(o.type as Kind)) return `does not do ${kindPlural(o.type as Kind)}`;
  if (!c.regions.includes(o.region)) return `does not work in ${o.region}`;
  if (c.load.parcels + 1 > c.max_parcels) return "no parcel room left";
  if (c.load.kg + o.weight_kg > c.max_kg + 1e-9) return "too heavy for what is left";
  return null;
}
