import type { Kind } from "@/api/types";

export const formatKm = (v: number) => `${v.toFixed(2)} km`;
export const formatKg = (v: number) => `${Number(v.toFixed(2))} kg`;

// The hub is in Tashkent, so times are shown in its zone whatever the browser says.
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" });

/** "09:40" for an order's creation time, "—" when it is unknown. */
export function formatTime(iso: string): string {
  const ms = Date.parse(iso);
  return ms > 0 ? timeFormat.format(ms) : "—";
}

export const kindLabel = (k: string) => (k === "pickup" ? "Pickup" : k === "delivery" ? "Delivery" : "Unknown type");
export const kindPlural = (k: Kind) => (k === "pickup" ? "pickups" : "deliveries");
