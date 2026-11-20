import { cn } from "@/shared/ui/styles";

interface Props {
  name: string;
  on: boolean;
  color: string;
  onToggle: () => void;
}

/** A region button in the toolbar; filled with the courier's colour when chosen. */
export function RegionChip({ name, on, color, onToggle }: Props) {
  return (
    <button
      type="button"
      title="Or click the region on the map"
      className={cn("cursor-pointer rounded-full border px-2 py-0.5 text-xs", on ? "border-transparent text-white" : "border-slate-300 bg-white hover:bg-slate-50")}
      style={on ? { background: color } : undefined}
      onClick={onToggle}
    >
      {name}
    </button>
  );
}
