import { useEffect, useState } from "react";

/** "updated 10 s ago": how fresh the data on screen is. The state reloads every 15 s. */
export function UpdatedAgo({ at }: { at: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  if (!at) return null;
  const s = Math.max(0, Math.round((now - at) / 1000));
  const text = s < 5 ? "just now" : s < 60 ? `${s} s ago` : `${Math.floor(s / 60)} min ago`;
  return (
    <span className={s > 60 ? "text-xs text-amber-700" : "text-xs text-slate-500"} title="The page reloads the data every 15 seconds">
      updated {text}
    </span>
  );
}
