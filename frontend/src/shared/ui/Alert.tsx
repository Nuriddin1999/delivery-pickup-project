import type { ReactNode } from "react";
import { cn } from "./styles";

type Tone = "error" | "warn" | "note";

const tones: Record<Tone, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  note: "border-blue-100 bg-blue-50 text-blue-800",
};

interface Props {
  tone: Tone;
  children: ReactNode;
}

/** A coloured box for an error, a warning or a note. */
export function Alert({ tone, children }: Props) {
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cn("rounded-md border px-2.5 py-1.5 text-[13px]", tones[tone])}>
      {children}
    </div>
  );
}
