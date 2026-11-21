import { useCallback, useEffect, useState } from "react";
import type { Point } from "@/api/types";

export interface PointHighlight {
  /** changes on every show(), so clicking the same link again replays the pulse */
  id: number;
  point: Point;
  color: string;
  /** a permanent label above the point; "" for none */
  label: string;
  /** a filled dot in the middle; off when the point already has its own pin (an order) */
  dot: boolean;
}

const SHOW_MS = 6000;

/** A point to pulse on the map for a few seconds: a courier's start, or an order picked in the table. */
export function usePointHighlight() {
  const [highlight, setHighlight] = useState<PointHighlight | null>(null);

  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [highlight]);

  const show = useCallback((point: Point, color: string, label: string, dot = true) => {
    setHighlight((prev) => ({ id: (prev?.id ?? 0) + 1, point, color, label, dot }));
  }, []);

  return { highlight, show };
}

export type ShowPoint = ReturnType<typeof usePointHighlight>["show"];
