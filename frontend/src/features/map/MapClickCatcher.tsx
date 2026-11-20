import { useMapEvents } from "react-leaflet";
import type { Point } from "@/api/types";

interface Props {
  enabled: boolean;
  onPick: (p: Point) => void;
}

/** Reports clicks on the map (outside any region shape) while enabled. */
export function MapClickCatcher({ enabled, onPick }: Props) {
  useMapEvents({
    click: (e) => {
      if (enabled) onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}
