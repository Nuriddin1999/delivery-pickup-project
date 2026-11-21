// Small line icons drawn inline, so they follow the text colour and need no icon font.
import { arrowPath } from "./arrowPath";

interface IconProps {
  className?: string;
}

const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A parcel box. */
export function BoxIcon({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </svg>
  );
}

/** A weight, for kilograms. */
export function WeightIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
      <circle cx="12" cy="6" r="2.5" />
      <path d="M6.5 9h11l2.5 11H4L6.5 9Z" />
    </svg>
  );
}

/** A warehouse: the hub. */
export function WarehouseIcon({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
      <path d="M3 21V9l9-5 9 5v12" />
      <path d="M7 21v-8h10v8M7 17h10" />
    </svg>
  );
}


interface KindProps {
  type: string;
  /** fill colour; grey when the order has no courier */
  color?: string | null;
  className?: string;
}

/**
 * The order kind as on the map: a square with an up arrow for a pickup, a
 * circle with a down arrow for a delivery.
 */
export function KindIcon({ type, color, className = "size-5" }: KindProps) {
  const isPickup = type === "pickup";
  const fill = color ?? "#64748b";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {isPickup ? <rect x="2" y="2" width="20" height="20" rx="5" fill={fill} /> : <circle cx="12" cy="12" r="10.5" fill={fill} />}
      {type === "pickup" || type === "delivery" ? (
        <path d={isPickup ? arrowPath.up : arrowPath.down} fill="none" stroke="white" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="white">
          ?
        </text>
      )}
    </svg>
  );
}
