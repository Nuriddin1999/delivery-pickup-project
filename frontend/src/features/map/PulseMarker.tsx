import { useEffect } from "react";
import { Marker, Tooltip, useMap } from "react-leaflet";
import { pulseIcon } from "./mapStyles";
import type { PointHighlight } from "./usePointHighlight";

const MIN_ZOOM = 14;

/** Flies the map to the highlighted point and pulses rings around it. */
export function PulseMarker({ highlight }: { highlight: PointHighlight }) {
  const map = useMap();
  const { lat, lng } = highlight.point;

  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), MIN_ZOOM), { duration: 0.8 });
  }, [map, lat, lng, highlight.id]);

  return (
    <Marker position={[lat, lng]} icon={pulseIcon(highlight.color)} interactive={false} zIndexOffset={2000}>
      <Tooltip permanent direction="top" offset={[0, -26]}>
        {highlight.label}
      </Tooltip>
    </Marker>
  );
}
