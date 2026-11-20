import type { CourierView } from "@/api/types";
import type { ShowPoint } from "@/features/map/usePointHighlight";
import { formatKg, kindLabel } from "@/domain/format";
import { Alert } from "@/shared/ui/Alert";
import { Card } from "@/shared/ui/Card";
import { Swatch } from "@/shared/ui/Swatch";
import { Tag } from "@/shared/ui/Tag";
import { cn, mutedText } from "@/shared/ui/styles";
import { LoadMeter } from "./LoadMeter";
import { RouteStops } from "./RouteStops";
import { RouteTotal } from "./RouteTotal";

interface Props {
  courier: CourierView;
  color: string;
  focused: boolean;
  showShorter: boolean;
  onToggleFocus: () => void;
  onSelectOrder: (id: string) => void;
  onShowPoint?: ShowPoint;
}

/** One courier: kinds, regions, load against limits, stops and km. */
export function CourierCard({ courier: c, color, focused, showShorter, onToggleFocus, onSelectOrder, onShowPoint }: Props) {
  const route = showShorter ? c.better_route : c.route;
  const showStart = onShowPoint && (() => onShowPoint(c.start, color, `${c.name} starts here`));

  return (
    <Card className={cn("border-l-[5px]", focused && "ring-2 ring-blue-200", !c.active && "opacity-70")} style={{ borderLeftColor: color }}>
      <button type="button" className="flex cursor-pointer items-center justify-between text-left" onClick={onToggleFocus} title="Show the route on the map">
        <span className="flex items-center gap-1.5 text-[15px] font-semibold">
          <Swatch color={color} /> {c.name}
          {!c.active && <Tag>inactive</Tag>}
        </span>
        <span className={mutedText}>{focused ? "route shown ▲" : "show route ▼"}</span>
      </button>

      <p className={mutedText}>
        {c.kinds.map(kindLabel).join(" + ") || "no kinds"} · {c.regions.length ? c.regions.join(", ") : "no regions"}
      </p>

      <LoadMeter label="Parcels" used={c.load.parcels} max={c.max_parcels} format={String} color={color} />
      <LoadMeter label="Weight" used={c.load.kg} max={c.max_kg} format={formatKg} color={color} />

      {c.outside_regions.length > 0 && (
        <Alert tone="warn">
          Outside {c.name}'s regions now: {c.outside_regions.join(", ")}. They stay with {c.name}.
        </Alert>
      )}

      <RouteStops route={route} outside={c.outside_regions} onSelectOrder={onSelectOrder} onShowStart={showStart} />
      <RouteTotal shown={route} given={c.route} shorter={c.better_route} />
    </Card>
  );
}
