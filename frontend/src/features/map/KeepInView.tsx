import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Point } from "@/api/types";

// What covers the map: the region bar along the top, the legend in the bottom-left corner.
const EDGE = 40;
const TOP_BAR = 70;
const LEGEND = { width: 260, height: 200 };

/**
 * Centres the map on a point that is off screen or hidden under the legend
 * or the region bar, e.g. an order picked in the table. The zoom stays.
 */
export function KeepInView({ point }: { point: Point | null }) {
  const map = useMap();
  const lat = point?.lat;
  const lng = point?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const p = map.latLngToContainerPoint([lat, lng]);
    const size = map.getSize();
    const hidden = p.x < EDGE || p.y < TOP_BAR || p.x > size.x - EDGE || p.y > size.y - EDGE || (p.x < LEGEND.width && p.y > size.y - LEGEND.height);
    if (hidden) map.panTo([lat, lng], { duration: 0.5 });
  }, [map, lat, lng]);

  return null;
}
