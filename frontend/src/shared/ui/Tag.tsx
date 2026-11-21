import type { ReactNode } from "react";
import { cn } from "./styles";

type Tone = "plain" | "bad" | "warn" | "info" | "ok";

const tones: Record<Tone, string> = {
  plain: "bg-slate-200 text-slate-700",
  bad: "bg-red-100 text-red-600",
  warn: "bg-amber-100 text-amber-800",
  info: "bg-brand-100 text-brand-700",
  ok: "bg-green-100 text-green-800",
};

interface Props {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}

/** A small rounded label, e.g. "broken" or "inactive". */
export function Tag({ tone = "plain", title, children }: Props) {
  return (
    <span title={title} className={cn("ml-1 rounded-full px-1.5 py-px text-[11px] font-medium whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}
