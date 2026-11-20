import type { Stop } from "@/api/types";
import { kindLabel } from "@/domain/format";
import { Tag } from "@/shared/ui/Tag";

interface Props {
  stop: Stop;
  /** the stop's order is outside the courier's regions */
  outside: boolean;
}

/** "Start point", "Hub" or "Pickup o01" for one row of a route. */
export function StopLabel({ stop, outside }: Props) {
  if (stop.kind === "start") return <>Start point</>;
  if (stop.kind === "hub") return <>Hub</>;
  return (
    <>
      {kindLabel(stop.kind)} {stop.order_id}
      {outside && <Tag tone="warn">outside</Tag>}
    </>
  );
}
