import { useState } from "react";

function read(key: string, fallback: number): number {
  try {
    const v = Number(localStorage.getItem(key));
    return localStorage.getItem(key) !== null && Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback; // storage can be blocked; the page still works
  }
}

/** A number remembered in this browser, e.g. how much of the height the map takes. */
export function useStoredNumber(key: string, fallback: number) {
  const [value, setValue] = useState(() => read(key, fallback));
  const set = (v: number) => {
    setValue(v);
    try {
      localStorage.setItem(key, String(v));
    } catch {
      // not remembered, but still works for this visit
    }
  };
  return [value, set] as const;
}
