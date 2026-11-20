import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import type { DispatchState, Point, Route } from "@/api/types";
import { env } from "@/config/env";
import { cn } from "@/shared/ui/styles";
import { hubIcon, mapModeClass, newStartIcon, regionStyle, startIcon, type MapMode } from "./mapStyles";
import { MapClickCatcher } from "./MapClickCatcher";
import { OrderMarker } from "./OrderMarker";
import { RegionsLayer } from "./RegionsLayer";

interface Props {
  state: DispatchState;
  shapes: GeoJSON.FeatureCollection | null;
  colors: Record<string, string>;
  /** what a click on the map does */
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

  const onRegionClick = (name: string, p: Point) => {
    if (mode === "regions") props.onToggleRegion(name);
    else if (mode === "pickStart") props.onPickPoint(p);
  };

  return (
    <MapContainer center={[state.hub.lat, state.hub.lng]} zoom={env.mapZoom} className={cn("min-h-0 flex-1", mapModeClass[mode])} doubleClickZoom={mode === "none"}>
      <TileLayer attribution={env.tileAttribution} url={env.tileUrl} />
      <MapClickCatcher enabled={mode === "pickStart"} onPick={props.onPickPoint} />

      {props.shapes && <RegionsLayer shapes={props.shapes} style={(name) => regionStyle(name, mode, props.draftRegions, props.draftColor)} onClick={onRegionClick} />}

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
        const courier = o.courier_id ? couriersById[o.courier_id] : undefined;
        return (
          <OrderMarker
            key={o.id}
            order={o}
            courier={courier}
            color={courier ? colors[courier.id] : null}
            selected={o.id === props.selectedOrderId}
            onSelect={() => props.onSelectOrder(o.id)}
          />
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
