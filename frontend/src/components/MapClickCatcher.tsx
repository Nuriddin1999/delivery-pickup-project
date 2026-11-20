import { useMapEvents } from "react-leaflet";
import type { Point } from "../types";

/** Reports clicks on the map (outside any region shape) while enabled. */
export function MapClickCatcher({ enabled, onPick }: { enabled: boolean; onPick: (p: Point) => void }) {
  useMapEvents({
    click: (e) => {
      if (enabled) onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}
