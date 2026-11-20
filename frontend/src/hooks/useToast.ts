import { useEffect, useState } from "react";

const SHOW_MS = 4000;

/** A message that hides itself after a few seconds. */
export function useToast() {
  const [toast, showToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => showToast(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [toast]);

  return { toast, showToast };
}
