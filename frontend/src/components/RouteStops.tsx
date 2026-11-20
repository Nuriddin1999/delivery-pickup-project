import type { Route } from "../types";
import { km, kindLabel } from "../logic";
import { cn, muted, tagWarn } from "../ui";

interface Props {
  route: Route;
  /** orders now outside the courier's regions */
  outside: string[];
  onSelectOrder: (id: string) => void;
}

const cell = "border-b border-slate-200 px-1 py-0.75 text-left";
const num = "text-right tabular-nums";

/** The stops of a route in order, with km for each leg. */
export function RouteStops({ route, outside, onSelectOrder }: Props) {
  if (route.stops.length === 0) return <p className={muted}>No stops yet.</p>;
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          <th className={cell}>#</th>
          <th className={cell}>Stop</th>
          <th className={cn(cell, num)}>Leg</th>
        </tr>
      </thead>
      <tbody>
        {route.stops.map((s, i) => (
          <tr key={i} className={cn(s.order_id && "cursor-pointer hover:bg-slate-50")} onClick={() => s.order_id && onSelectOrder(s.order_id)}>
            <td className={cell}>{i}</td>
            <td className={cell}>
              {s.kind === "start" && "Start point"}
              {s.kind === "hub" && "Hub"}
              {s.order_id && (
                <>
                  {kindLabel(s.kind)} {s.order_id}
                  {outside.includes(s.order_id) && <span className={tagWarn}>outside</span>}
                </>
              )}
            </td>
            <td className={cn(cell, num)}>{i === 0 ? "—" : km(s.leg_km)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
