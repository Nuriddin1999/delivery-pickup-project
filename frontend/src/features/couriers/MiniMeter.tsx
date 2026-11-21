import { cn } from "@/shared/ui/styles";

interface Props {
  used: number;
  max: number;
  text: string;
  color: string;
  title: string;
}

/** A thin load bar with "used / max" under it, for the one-line courier row. */
export function MiniMeter({ used, max, text, color, title }: Props) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  return (
    <span className="flex flex-col gap-0.5" title={title}>
      <span className="h-1.5 overflow-hidden rounded bg-slate-200">
        <span className="block h-full" style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className={cn("text-xs tabular-nums", pct >= 100 ? "font-semibold text-slate-900" : "text-slate-600")}>{text}</span>
    </span>
  );
}
