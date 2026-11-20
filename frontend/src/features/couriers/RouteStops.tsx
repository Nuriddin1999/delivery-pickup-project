import type { Route } from "@/api/types";
import { formatKm } from "@/domain/format";
import { cn, mutedText } from "@/shared/ui/styles";
import { StartPointLink } from "./StartPointLink";
import { StopLabel } from "./StopLabel";

interface Props {
  route: Route;
  /** orders now outside the courier's regions */
  outside: string[];
  onSelectOrder: (id: string) => void;
  /** when set, the start row links to the start point on the map */
  onShowStart?: () => void;
}

const cell = "border-b border-slate-200 px-1 py-0.75 text-left";
const num = "text-right tabular-nums";

/** The stops of a route in order, with km for each leg. */
export function RouteStops({ route, outside, onSelectOrder, onShowStart }: Props) {
  if (route.stops.length === 0) return <p className={mutedText}>No stops yet.</p>;
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
              <StopLabel stop={s} outside={!!s.order_id && outside.includes(s.order_id)} />
            </td>
            <td className={cn(cell, num)}>{i > 0 ? formatKm(s.leg_km) : onShowStart ? <StartPointLink point={s.point} onShow={onShowStart} /> : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
