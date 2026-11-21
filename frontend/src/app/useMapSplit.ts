import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useStoredFlag } from "@/hooks/useStoredFlag";
import { useStoredNumber } from "@/hooks/useStoredNumber";

export const DEFAULT_MAP_SHARE = 0.6;
const MIN_SHARE = 0.2;
const MAX_SHARE = 0.85;
const KEY_STEP = 0.05;

const clamp = (v: number) => Math.min(MAX_SHARE, Math.max(MIN_SHARE, v));

/**
 * How the left column is split between the map (top) and the order table
 * (bottom). The dispatcher drags the bar between them, or expands the table
 * to the full height (the map hides) and brings the map back. Both are
 * remembered in the browser.
 */
export function useMapSplit() {
  const [share, setShare] = useStoredNumber("dispatch.mapShare", DEFAULT_MAP_SHARE);
  const [tableExpanded, setTableExpanded] = useStoredFlag("dispatch.tableExpanded", false);
  const [dragging, setDragging] = useState(false);
  const columnRef = useRef<HTMLElement>(null);
  /** the box whose height is the map's share */
  const mapBoxRef = useRef<HTMLDivElement>(null);

  /**
   * Dragging the bar. The map's height follows the pointer by writing it
   * straight to the element, at most once per frame, and with no
   * transition. React (and storage) only hear about it when the pointer is
   * released: re-rendering the whole page on every mouse move made the bar
   * lag behind the pointer.
   */
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const column = columnRef.current;
    const box = mapBoxRef.current;
    if (!column || !box || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    box.style.transition = "none";
    const rect = column.getBoundingClientRect();
    let next = share;
    let frame = 0;

    const move = (ev: globalThis.PointerEvent) => {
      next = clamp((ev.clientY - rect.top) / rect.height);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        box.style.height = `calc(${next * 100}% - 6px)`;
      });
    };
    const up = () => {
      cancelAnimationFrame(frame);
      box.style.height = `calc(${next * 100}% - 6px)`;
      box.style.transition = "";
      setDragging(false);
      setShare(next);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  /** Arrow keys move the bar too, for keyboard users. */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    e.stopPropagation(); // the order list uses the arrows too
    setShare(clamp(share + (e.key === "ArrowUp" ? -KEY_STEP : KEY_STEP)));
  };

  return {
    columnRef,
    mapBoxRef,
    /** the map's part of the column height, 0 when the table is expanded */
    mapShare: tableExpanded ? 0 : share,
    share,
    dragging,
    tableExpanded,
    expandTable: () => setTableExpanded(true),
    showMap: () => setTableExpanded(false),
    reset: () => setShare(DEFAULT_MAP_SHARE),
    onPointerDown,
    onKeyDown,
  };
}
