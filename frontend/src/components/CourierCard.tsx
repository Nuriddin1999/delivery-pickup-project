import type { CourierView } from "../types";
import { kg, km, kindLabel } from "../logic";
import { card, cardTitle, cn, muted, swatch, tagPlain, warnBox } from "../ui";
import { LoadMeter } from "./LoadMeter";
import { RouteStops } from "./RouteStops";

interface Props {
  courier: CourierView;
  color: string;
  focused: boolean;
  showBetter: boolean;
  onFocus: () => void;
  onSelectOrder: (id: string) => void;
}

/** One courier: kinds, regions, load against limits, stops and km. */
export function CourierCard({ courier: c, color, focused, showBetter, onFocus, onSelectOrder }: Props) {
  const route = showBetter ? c.better_route : c.route;
  const saved = c.route.total_km - c.better_route.total_km;

  return (
    <div className={cn(card, "flex flex-col gap-1 border-l-[5px]", focused && "ring-2 ring-blue-200", !c.active && "opacity-70")} style={{ borderLeftColor: color }}>
      <div className="flex cursor-pointer items-center justify-between" onClick={onFocus} role="button" title="Show the route on the map">
        <h3 className={cardTitle}>
          <span className={swatch} style={{ background: color }} /> {c.name}
          {!c.active && <span className={tagPlain}>inactive</span>}
        </h3>
        <span className={muted}>{focused ? "route shown ▲" : "show route ▼"}</span>
      </div>
      <p className={muted}>
        {c.kinds.map(kindLabel).join(" + ") || "no kinds"} · {c.regions.length ? c.regions.join(", ") : "no regions"}
      </p>
      <LoadMeter label="Parcels" used={c.load.parcels} max={c.max_parcels} format={String} color={color} />
      <LoadMeter label="Weight" used={c.load.kg} max={c.max_kg} format={kg} color={color} />
      {c.outside_regions.length > 0 && (
        <p className={warnBox}>
          Outside {c.name}'s regions now: {c.outside_regions.join(", ")}. They stay with {c.name}.
        </p>
      )}
      <RouteStops route={route} outside={c.outside_regions} onSelectOrder={onSelectOrder} />
      <p className="mt-1">
        Total: <b>{km(route.total_km)}</b>
        {c.route.stops.length > 0 && (
          <span className={muted}>
            {" "}
            · given order {km(c.route.total_km)}, shorter order {km(c.better_route.total_km)}
            {saved > 0.004 ? ` (saves ${km(saved)})` : " (already best)"}
          </span>
        )}
      </p>
    </div>
  );
}
