import { cn } from "./styles";

interface Props {
  message: string;
  tone?: "info" | "error";
}

/** A short message floating at the bottom of the screen. */
export function Toast({ message, tone = "info" }: Props) {
  return (
    <div
      role="status"
      className={cn(
        "fixed left-1/2 z-2000 -translate-x-1/2 rounded-lg px-4.5 py-2.5 text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
        tone === "error" ? "bottom-17.5 bg-red-600" : "bottom-5 bg-slate-900",
      )}
    >
      {message}
    </div>
  );
}
