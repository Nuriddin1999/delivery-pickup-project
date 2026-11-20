import type { CSSProperties, ReactNode } from "react";
import { cn } from "./styles";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A white box with a border; children are stacked with a small gap. */
export function Card({ children, className, style }: Props) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5", className)} style={style}>
      {children}
    </div>
  );
}
