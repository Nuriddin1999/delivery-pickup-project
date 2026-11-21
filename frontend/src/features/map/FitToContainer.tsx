import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Leaflet measures its box only once. When the dispatcher resizes the map
 * (dragging the bar, or showing it again after the table was expanded),
 * this tells Leaflet the new size, once per frame, so tiles fill the box.
 */
export function FitToContainer() {
  const map = useMap();

  useEffect(() => {
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    observer.observe(map.getContainer());
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  return null;
}
