import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import type { Point, Route, State } from "../types";
import { isBroken, kg, kindLabel } from "../logic";
import { hubIcon, mapModeClass, newStartIcon, orderIcon, regionStyle, startIcon, type MapMode } from "../mapStyles";
import { cn } from "../ui";
import { MapClickCatcher } from "./MapClickCatcher";
import { RegionsLayer } from "./RegionsLayer";

interface Props {
  shapes: GeoJSON.FeatureCollection | null;
  state: State;
  colors: Record<string, string>;
  mode: MapMode;
  /** regions shown as chosen while editing a courier's regions */
  draftRegions: string[] | null;
  draftColor: string;
  onToggleRegion: (name: string) => void;
  onPickPoint: (p: Point) => void;
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
  route: { route: Route; color: string } | null;
  startPreview: Point | null;
}

export function MapView(props: Props) {
  const { state, colors, mode } = props;
  const couriersById = Object.fromEntries(state.couriers.map((c) => [c.id, c]));

  return (
    <MapContainer center={[state.hub.lat, state.hub.lng]} zoom={12} className={cn("min-h-0 flex-1", mapModeClass[mode])} doubleClickZoom={mode === "none"}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapClickCatcher enabled={mode === "pickStart"} onPick={props.onPickPoint} />

      {props.shapes && (
        <RegionsLayer
          shapes={props.shapes}
          style={(name) => regionStyle(name, mode, props.draftRegions, props.draftColor)}
          onClick={(name, p) => {
            if (mode === "regions") props.onToggleRegion(name);
            else if (mode === "pickStart") props.onPickPoint(p);
          }}
        />
      )}

      {props.route && props.route.route.stops.length > 1 && (
        <Polyline
          positions={props.route.route.stops.map((s) => [s.point.lat, s.point.lng] as [number, number])}
          pathOptions={{ color: props.route.color, weight: 4, opacity: 0.8, dashArray: "8 6" }}
        />
      )}

      <Marker position={[state.hub.lat, state.hub.lng]} icon={hubIcon} zIndexOffset={1000}>
        <Tooltip direction="top" offset={[0, -14]}>
          {state.hub.name}: every parcel passes here
        </Tooltip>
      </Marker>

      {state.couriers.map((c) => (
        <Marker key={c.id} position={[c.start.lat, c.start.lng]} icon={startIcon(colors[c.id], c.name)}>
          <Tooltip direction="top" offset={[0, -10]}>
            {c.name} starts here
          </Tooltip>
        </Marker>
      ))}

      {state.orders.map((o) => {
        if (!o.location) return null;
        const courier = o.courier_id ? couriersById[o.courier_id] : undefined;
        const selected = o.id === props.selectedOrderId;
        return (
          <Marker
            key={o.id}
            position={[o.location.lat, o.location.lng]}
            icon={orderIcon({ type: o.type, color: courier ? colors[courier.id] : null, broken: isBroken(o), outside: o.outside_regions, selected })}
            zIndexOffset={selected ? 900 : 0}
            eventHandlers={{ click: () => props.onSelectOrder(o.id) }}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              <b>{o.id}</b> · {kindLabel(o.type)} · {o.region} · {kg(o.weight_kg)}
              <br />
              {isBroken(o) ? `Broken: ${o.problems!.join("; ")}` : courier ? `Courier: ${courier.name}` : "No courier yet"}
              {o.outside_regions && (
                <>
                  <br />
                  Outside {courier?.name}'s regions
                </>
              )}
            </Tooltip>
          </Marker>
        );
      })}

      {props.startPreview && (
        <Marker position={[props.startPreview.lat, props.startPreview.lng]} icon={newStartIcon}>
          <Tooltip permanent direction="top" offset={[0, -12]}>
            New courier start
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}
