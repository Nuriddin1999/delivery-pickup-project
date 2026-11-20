import { Button } from "@/shared/ui/Button";

interface Props {
  error: string | null;
  onRetry: () => void;
}

/** Shown until the first state arrives, or when it could not be loaded. */
export function LoadingScreen({ error, onRetry }: Props) {
  return (
    <div className="flex h-screen items-center justify-center gap-3">
      {error ? (
        <>
          <span className="text-red-600">{error}</span>
          <Button onClick={onRetry}>Retry</Button>
        </>
      ) : (
        <span className="text-slate-500">Loading…</span>
      )}
    </div>
  );
}
