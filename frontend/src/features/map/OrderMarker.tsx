import { Marker, Tooltip } from "react-leaflet";
import type { Courier, Order } from "@/api/types";
import { formatKg, kindLabel } from "@/domain/format";
import { isBroken } from "@/domain/orders";
import { orderIcon } from "./mapStyles";

interface Props {
  order: Order;
  courier?: Courier;
  color: string | null;
  selected: boolean;
  onSelect: () => void;
}

/** One order on the map. Orders without coordinates are not drawn. */
export function OrderMarker({ order: o, courier, color, selected, onSelect }: Props) {
  if (!o.location) return null;
  const broken = isBroken(o);

  return (
    <Marker
      position={[o.location.lat, o.location.lng]}
      icon={orderIcon({ type: o.type, color, broken, outside: o.outside_regions, selected })}
      zIndexOffset={selected ? 900 : 0}
      eventHandlers={{ click: onSelect }}
    >
      {selected && (
        <Tooltip permanent direction="top" offset={[0, -22]} className="rounded-md! border-slate-300! px-2! py-0.5! text-[13px]! font-bold! text-slate-900!">
          {o.id}
        </Tooltip>
      )}
      {!selected && (
      <Tooltip direction="top" offset={[0, -12]}>
        <b>{o.id}</b> · {kindLabel(o.type)} · {o.region} · {formatKg(o.weight_kg)}
        <br />
        {broken ? `Broken: ${o.problems!.join("; ")}` : courier ? `Courier: ${courier.name}` : "No courier yet"}
        {o.outside_regions && (
          <>
            <br />
            Outside {courier?.name}'s regions
          </>
        )}
      </Tooltip>
      )}
    </Marker>
  );
}
