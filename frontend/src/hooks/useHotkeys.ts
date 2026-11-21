import { useEffect, useRef } from "react";

/** Keys mapped to what they do: KeyboardEvent.key values, letters in lower case ("ArrowDown", "u", "1"). */
export type Hotkeys = Record<string, (() => void) | undefined>;

/** True while the user is typing, so single-letter keys must not fire. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

/**
 * Keyboard shortcuts for the dispatcher. They do nothing while a text field
 * or select has focus, or when Ctrl, Alt or Cmd is held.
 */
export function useHotkeys(keys: Hotkeys) {
  const ref = useRef(keys);
  useEffect(() => {
    ref.current = keys;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const run = ref.current[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!run) return;
      e.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
