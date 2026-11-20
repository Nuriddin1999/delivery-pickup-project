import { useState } from "react";
import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";

/**
 * Assign, move or take off one order. A refusal from the server is kept in
 * `error` as the server wrote it, e.g. "Kamola does not work in Bektemir".
 */
export function useOrderActions(orderId: string, onDone: (message: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (call: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await call();
      onDone(message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    error,
    clearError: () => setError(null),
    assign: (courierId: string, message: string) => run(() => dispatchApi.assign(orderId, courierId), message),
    unassign: (message: string) => run(() => dispatchApi.unassign(orderId), message),
  };
}
