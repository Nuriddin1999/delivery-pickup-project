import { useEffect, useRef } from "react";
import L from "leaflet";
import { GeoJSON } from "react-leaflet";
import type { Point } from "@/api/types";
import { regionLabelClass } from "./mapStyles";

interface Props {
  shapes: GeoJSON.FeatureCollection;
  style: (name: string) => L.PathOptions;
  onClick: (name: string, p: Point) => void;
}

const regionName = (f?: GeoJSON.Feature) => (f?.properties?.name as string) ?? "";

/**
 * Region shapes with name labels. Leaflet keeps its own layers, so the
 * latest style and click handler are passed through a ref.
 */
export function RegionsLayer(props: Props) {
  const layer = useRef<L.GeoJSON | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    layer.current?.setStyle((f) => latest.current.style(regionName(f)));
  });

  return (
    <GeoJSON
      ref={layer}
      data={props.shapes}
      style={(f) => props.style(regionName(f))}
      onEachFeature={(f, l) => {
        const name = regionName(f);
        l.bindTooltip(name, { permanent: true, direction: "center", className: regionLabelClass });
        l.on("click", (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          latest.current.onClick(name, { lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }}
    />
  );
}
