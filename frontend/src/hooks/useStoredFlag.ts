import { useState } from "react";

function read(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback; // storage can be blocked; the page still works
  }
}

/** A yes/no preference remembered in this browser, e.g. "open the next order". */
export function useStoredFlag(key: string, fallback: boolean) {
  const [value, setValue] = useState(() => read(key, fallback));
  const set = (v: boolean) => {
    setValue(v);
    try {
      localStorage.setItem(key, v ? "1" : "0");
    } catch {
      // not remembered, but still works for this visit
    }
  };
  return [value, set] as const;
}
