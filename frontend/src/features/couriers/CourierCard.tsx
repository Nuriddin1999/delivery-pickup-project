import type { CourierView } from "@/api/types";
import type { ShowPoint } from "@/features/map/usePointHighlight";
import { formatKg, formatKm, kindLabel } from "@/domain/format";
import { Alert } from "@/shared/ui/Alert";
import { Card } from "@/shared/ui/Card";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Swatch } from "@/shared/ui/Swatch";
import { Tag } from "@/shared/ui/Tag";
import { cn, mutedText } from "@/shared/ui/styles";
import { LoadMeter } from "./LoadMeter";
import { MiniMeter } from "./MiniMeter";
import { RouteStops } from "./RouteStops";
import { RouteTotal } from "./RouteTotal";

interface Props {
  courier: CourierView;
  color: string;
  /** open: details shown here and the route drawn on the map */
  open: boolean;
  showShorter: boolean;
  onToggle: () => void;
  onShowShorter: (v: boolean) => void;
  onSelectOrder: (id: string) => void;
  onShowPoint?: ShowPoint;
}

const kindShort = (k: string) => (k === "pickup" ? "P" : "D");

/**
 * One courier. Closed, it is a single line (load bars and km) so the whole
 * team fits on one screen; open, it shows regions, load, stops and km.
 */
export function CourierCard({
  courier: c,
  color,
  open,
  showShorter,
  onToggle,
  onShowShorter,
  onSelectOrder,
  onShowPoint,
}: Props) {
  const route = showShorter ? c.better_route : c.route;
  const showStart =
    onShowPoint && (() => onShowPoint(c.start, color, `${c.name} starts here`));
  const outside = c.outside_regions.length;

  return (
    <Card
      className={cn(
        "border-l-[5px] py-2 transition-shadow duration-300",
        open && "ring-2 ring-blue-200",
        !c.active && "opacity-60",
      )}
      style={{ borderLeftColor: color }}
    >
      <div>
        <button
          type="button"
          className="grid w-full cursor-pointer grid-cols-[1fr_60px_88px_64px] items-center gap-2.5 text-left"
          onClick={onToggle}
          aria-expanded={open}
          title={open ? "Close" : "Show stops here and the route on the map"}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "inline-block w-2 text-slate-500 transition-transform duration-300",
                open && "rotate-90",
              )}
              aria-hidden
            >
              ›
            </span>
            <Swatch color={color} />
            <b className="shrink-0 text-[15px]">{c.name}</b>
            {c.active ? (
              <span
                className="truncate text-xs text-slate-500"
                title={c.kinds.map(kindLabel).join(" + ")}
              >
                {c.kinds.map(kindShort).join("+")}
              </span>
            ) : (
              <Tag>inactive</Tag>
            )}
            {outside > 0 && (
              <Tag
                tone="warn"
                title={`Outside ${c.name}'s regions: ${c.outside_regions.join(", ")}`}
              >
                {outside} outside
              </Tag>
            )}
          </span>
          <MiniMeter
            used={c.load.parcels}
            max={c.max_parcels}
            text={`${c.load.parcels} / ${c.max_parcels}`}
            color={color}
            title="Parcels today"
          />
          <MiniMeter
            used={c.load.kg}
            max={c.max_kg}
            text={`${formatKg(c.load.kg)} / ${c.max_kg}`}
            color={color}
            title="Weight today"
          />
          <span className="text-right text-[13px] tabular-nums">
            {c.route.stops.length ? (
              formatKm(c.route.total_km)
            ) : (
              <span className={mutedText}>no stops</span>
            )}
          </span>
        </button>

        {/* Always rendered so it can slide: rows go from 0fr to 1fr, and the content is clipped meanwhile. */}
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
          inert={!open}
          aria-hidden={!open}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mt-2 flex flex-col gap-1.5 border-t border-slate-100 pt-2">
              <p className={mutedText}>
                {c.kinds.map(kindLabel).join(" + ") || "no kinds"} ·{" "}
                {c.regions.length ? c.regions.join(", ") : "no regions"}
              </p>

              <LoadMeter
                label="Parcels"
                used={c.load.parcels}
                max={c.max_parcels}
                format={String}
                color={color}
              />
              <LoadMeter
                label="Weight"
                used={c.load.kg}
                max={c.max_kg}
                format={formatKg}
                color={color}
              />

              {outside > 0 && (
                <Alert tone="warn">
                  Outside {c.name}'s regions now: {c.outside_regions.join(", ")}
                  . They stay with {c.name}.
                </Alert>
              )}

              {c.route.stops.length > 0 && (
                <Checkbox checked={showShorter} onChange={onShowShorter}>
                  <span className="text-[13px]">
                    Show the stops in the shorter order
                  </span>
                </Checkbox>
              )}
              <RouteStops
                route={route}
                outside={c.outside_regions}
                onSelectOrder={onSelectOrder}
                onShowStart={showStart}
              />
              <RouteTotal
                shown={route}
                given={c.route}
                shorter={c.better_route}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
