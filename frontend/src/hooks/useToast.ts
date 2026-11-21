import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/api/client";
import { stateKey } from "./useDispatchState";

const SHOW_MS = 4000;
const UNDO_MS = 8000;

/** Reverses a change on the server, e.g. takes back an order just given. */
export type Undo = () => Promise<unknown>;

export interface ToastMessage {
  id: number;
  text: string;
  tone: "info" | "error";
  undo?: Undo;
}

/**
 * A message that hides itself after a few seconds. A message with an undo
 * stays longer and offers an "Undo" button.
 */
export function useToast() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? UNDO_MS : SHOW_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((text: string, undo?: Undo, tone: ToastMessage["tone"] = "info") => {
    setToast((prev) => ({ id: (prev?.id ?? 0) + 1, text, tone, undo }));
  }, []);

  const undoFn = toast?.undo;
  const undo = useCallback(async () => {
    if (!undoFn) return;
    setToast(null); // a second press must not undo twice
    try {
      await undoFn();
      showToast("Undone");
    } catch (err) {
      // The server checks the undo like any other change, e.g. the old courier is full now.
      showToast(`Could not undo: ${errorMessage(err)}`, undefined, "error");
    } finally {
      await queryClient.invalidateQueries({ queryKey: stateKey });
    }
  }, [undoFn, showToast, queryClient]);

  return { toast, showToast, undo: undoFn ? undo : null };
}
