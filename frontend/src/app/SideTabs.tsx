import { Link } from "react-router-dom";
import { cn } from "@/shared/ui/styles";
import { tabs, type Tab } from "./routes";

/** Couriers / Orders / Add courier. Each tab is a link, so the address changes. */
export function SideTabs({ active }: { active: Tab }) {
  return (
    <nav className="flex border-b border-slate-200">
      {tabs.map((t) => (
        <Link
          key={t.id}
          to={t.to}
          aria-current={active === t.id ? "page" : undefined}
          className={cn("flex-1 border-b-3 p-2.5 text-center", active === t.id ? "border-blue-600 font-semibold" : "border-transparent hover:bg-slate-50")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
