const PALETTE = ["#2563eb", "#db2777", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04", "#be123c", "#4d7c0f", "#9333ea"];

/** A stable colour per courier, by their position in the list. */
export function courierColors(couriers: { id: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  couriers.forEach((c, i) => (out[c.id] = PALETTE[i % PALETTE.length]));
  return out;
}
