import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Point } from "@/api/types";

/**
 * Pans the map to a point when it is off screen, e.g. an order picked in the
 * list. The zoom stays as the dispatcher left it.
 */
export function KeepInView({ point }: { point: Point | null }) {
  const map = useMap();
  const lat = point?.lat;
  const lng = point?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    if (!map.getBounds().pad(-0.1).contains([lat, lng])) map.panTo([lat, lng], { duration: 0.5 });
  }, [map, lat, lng]);

  return null;
}
