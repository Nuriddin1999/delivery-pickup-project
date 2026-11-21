import { Link } from "react-router-dom";
import { cn } from "@/shared/ui/styles";
import { tabs, type Tab } from "./routes";

interface Props {
  active: Tab;
  /** the order list's filter, kept when switching tabs */
  search: string;
}

/** Order / Couriers. Each tab is a link, so the address changes. */
export function SideTabs({ active, search }: Props) {
  return (
    <nav className="m-3 mb-0 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {tabs.map((t) => (
        <Link
          key={t.id}
          to={{ pathname: t.to, search }}
          aria-current={active === t.id ? "page" : undefined}
          className={cn(
            "rounded-lg border-b-2 py-2 text-center text-[15px]",
            active === t.id ? "border-brand-600 bg-white font-semibold text-brand-700 shadow-sm" : "border-transparent text-slate-600 hover:bg-white/60",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
