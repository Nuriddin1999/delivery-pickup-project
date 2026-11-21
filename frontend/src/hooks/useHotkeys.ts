import { useEffect, useRef } from "react";

/** Keys mapped to what they do: KeyboardEvent.key values, letters in lower case ("ArrowDown", "u", "1"). */
export type Hotkeys = Record<string, (() => void) | undefined>;

/** True while the user is typing, so single-letter keys must not fire. A radio or checkbox is not typing. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el instanceof HTMLInputElement) return !["radio", "checkbox"].includes(el.type);
  return el.isContentEditable || ["TEXTAREA", "SELECT"].includes(el.tagName);
}

/** Enter on a focused button or link already clicks it; handling it again would act twice. */
function clicksItself(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return e.key === "Enter" && !!el && ["BUTTON", "A", "SUMMARY"].includes(el.tagName);
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
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || clicksItself(e)) return;
      const run = ref.current[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!run) return;
      e.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
