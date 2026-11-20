import type { ReactNode } from "react";
import { cn, errorText } from "./styles";

interface Props {
  label: string;
  error?: string;
  children: ReactNode;
}

/** A labelled form field with its error under it. */
export function FormField({ label, error, children }: Props) {
  return (
    <div className={cn("flex flex-1 flex-col gap-1", error && "[&_input]:border-red-600")}>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {children}
      {error && <span className={errorText}>{error}</span>}
    </div>
  );
}
