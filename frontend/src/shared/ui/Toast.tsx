import { cn } from "./styles";

interface Props {
  message: string;
  tone?: "info" | "error";
  /** shows an "Undo" button */
  onUndo?: (() => void) | null;
}

/** A short message floating at the bottom of the screen. */
export function Toast({ message, tone = "info", onUndo }: Props) {
  return (
    <div
      role="status"
      className={cn(
        "fixed left-1/2 z-2000 flex -translate-x-1/2 items-center gap-4 rounded-lg px-4.5 py-2.5 text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
        tone === "error" ? "bottom-17.5 bg-red-600" : "bottom-5 bg-slate-900",
      )}
    >
      {message}
      {onUndo && (
        <button type="button" className="cursor-pointer rounded border border-white/40 px-2 py-0.5 font-semibold hover:bg-white/10" onClick={onUndo}>
          Undo
        </button>
      )}
    </div>
  );
}
