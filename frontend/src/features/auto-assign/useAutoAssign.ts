import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import { useStateMutation } from "@/hooks/useStateMutation";

/** Runs auto-assign and keeps its report until it is closed. */
export function useAutoAssign(onError: (message: string) => void) {
  const mutation = useStateMutation(dispatchApi.autoAssign);

  return {
    result: mutation.data ?? null,
    busy: mutation.isPending,
    run: () => mutation.mutate(undefined, { onError: (err) => onError(errorMessage(err)) }),
    close: () => mutation.reset(),
  };
}
