import { mutedText } from "@/shared/ui/styles";

interface Props {
  label: string;
  used: number;
  max: number;
  format: (v: number) => string;
  color: string;
}

/** A bar showing how much of a daily limit is used. */
export function LoadMeter({ label, used, max, format, color }: Props) {
  const pct = Math.min(100, (used / max) * 100);
  return (
    <div className="grid grid-cols-[56px_1fr_90px] items-center gap-2 text-[13px]">
      <span>{label}</span>
      <div className="h-2 overflow-hidden rounded bg-slate-200">
        <div className="h-full transition-[width]" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={mutedText}>
        {format(used)} / {format(max)}
      </span>
    </div>
  );
}
