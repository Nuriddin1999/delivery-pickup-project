import type { Kind } from "@/api/types";

export const formatKm = (v: number) => `${v.toFixed(2)} km`;
export const formatKg = (v: number) => `${Number(v.toFixed(2))} kg`;

export const kindLabel = (k: string) => (k === "pickup" ? "Pickup" : k === "delivery" ? "Delivery" : k);
export const kindPlural = (k: Kind) => (k === "pickup" ? "pickups" : "deliveries");
