import { useState } from "react";
import { Button } from "@/shared/ui/Button";

interface Props {
  error: string | null;
}

/** Shown until the first state arrives, or when it could not be loaded. Retry reloads the whole page. */
export function LoadingScreen({ error }: Props) {
  const [reloading, setReloading] = useState(false);

  const reload = () => {
    setReloading(true);
    window.location.reload();
  };

  return (
    <div className="flex h-screen items-center justify-center gap-3">
      {error ? (
        <>
          <span className="text-red-600">{error}</span>
          <Button
            onClick={reload}
            disabled={reloading}
            className="inline-flex items-center gap-2 transition hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:scale-95"
          >
            {reloading && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
            {reloading ? "Reloading…" : "Retry"}
          </Button>
        </>
      ) : (
        <span className="text-slate-500">Loading…</span>
      )}
    </div>
  );
}
