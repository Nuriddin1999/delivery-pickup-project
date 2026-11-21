import { MapContainer, Marker, Polyline, ScaleControl, TileLayer, Tooltip } from "react-leaflet";
import type { DispatchState, Point, Route } from "@/api/types";
import { env } from "@/config/env";
import { cn } from "@/shared/ui/styles";
import { KeepInView } from "./KeepInView";
import { hubIcon, mapModeClass, newStartIcon, regionStyle, startIcon, type MapMode } from "./mapStyles";
import { MapClickCatcher } from "./MapClickCatcher";
import { OrderMarker } from "./OrderMarker";
import { PulseMarker } from "./PulseMarker";
import type { PointHighlight } from "./usePointHighlight";
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
  /** a point to pulse and fly to, e.g. a courier's start */
  highlight?: PointHighlight | null;
  /** couriers allowed to take the selected order; their start pins stand out, the rest fade */
  allowedCourierIds?: Set<string> | null;
}

export function MapView(props: Props) {
  const { state, colors, mode } = props;
  const couriersById = Object.fromEntries(state.couriers.map((c) => [c.id, c]));
  const selected = state.orders.find((o) => o.id === props.selectedOrderId);
  const allowed = props.allowedCourierIds;

  const onRegionClick = (name: string, p: Point) => {
    if (mode === "regions") props.onToggleRegion(name);
    else if (mode === "pickStart") props.onPickPoint(p);
  };

  return (
    <MapContainer center={[state.hub.lat, state.hub.lng]} zoom={env.mapZoom} className={cn("h-full w-full", mapModeClass[mode])} doubleClickZoom={mode === "none"}>
      <TileLayer attribution={env.tileAttribution} url={env.tileUrl} />
      <ScaleControl position="bottomright" imperial={false} />
      <MapClickCatcher enabled={mode === "pickStart"} onPick={props.onPickPoint} />
      <KeepInView point={selected?.location ?? null} />

      {props.shapes && <RegionsLayer shapes={props.shapes} style={(name) => regionStyle(state.regions.indexOf(name), name, mode, props.draftRegions, props.draftColor)} onClick={onRegionClick} />}

      {props.route && props.route.route.stops.length > 1 && (
        <Polyline positions={props.route.route.stops.map((s) => [s.point.lat, s.point.lng] as [number, number])} pathOptions={{ color: props.route.color, weight: 4, opacity: 0.8, dashArray: "8 6" }} />
      )}

      <Marker position={[state.hub.lat, state.hub.lng]} icon={hubIcon} zIndexOffset={1000}>
        <Tooltip direction="top" offset={[0, -20]}>
          {state.hub.name}: every parcel passes here
        </Tooltip>
      </Marker>

      {state.couriers.map((c) => (
        <Marker key={c.id} position={[c.start.lat, c.start.lng]} icon={startIcon(colors[c.id], c.name, !allowed ? "normal" : allowed.has(c.id) ? "allowed" : "faded")} zIndexOffset={allowed?.has(c.id) ? 800 : 0}>
          <Tooltip direction="top" offset={[0, -10]}>
            {c.name} starts here
            {allowed?.has(c.id) && ` · can take ${props.selectedOrderId}`}
          </Tooltip>
        </Marker>
      ))}

      {state.orders.map((o) => {
        const courier = o.courier_id ? couriersById[o.courier_id] : undefined;
        return <OrderMarker key={o.id} order={o} courier={courier} color={courier ? colors[courier.id] : null} selected={o.id === props.selectedOrderId} onSelect={() => props.onSelectOrder(o.id)} />;
      })}

      {props.startPreview && (
        <Marker position={[props.startPreview.lat, props.startPreview.lng]} icon={newStartIcon}>
          <Tooltip permanent direction="top" offset={[0, -12]}>
            New courier start
          </Tooltip>
        </Marker>
      )}

      {props.highlight && <PulseMarker key={props.highlight.id} highlight={props.highlight} />}
    </MapContainer>
  );
}
