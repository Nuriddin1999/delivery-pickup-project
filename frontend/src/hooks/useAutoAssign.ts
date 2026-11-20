import { useState } from "react";
import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import type { AutoAssignResult } from "@/api/types";

/** Runs auto-assign and keeps its report until it is closed. */
export function useAutoAssign(refresh: () => Promise<void>, onError: (message: string) => void) {
  const [result, setResult] = useState<AutoAssignResult | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      setResult(await dispatchApi.autoAssign());
      await refresh();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return { result, busy, run, close: () => setResult(null) };
}
