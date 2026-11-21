import { Link } from "react-router-dom";
import type { DispatchState } from "@/api/types";
import { Legend } from "@/features/map/Legend";
import { countByFilter } from "@/features/orders/orderFilter";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/ui/styles";
import { KeysHelp } from "./KeysHelp";
import { paths } from "./routes";
import { UpdatedAgo } from "./UpdatedAgo";

interface Props {
  state: DispatchState;
  updatedAt: number;
  autoAssignBusy: boolean;
  onAutoAssign: () => void;
}

const countLink = "rounded-md px-2 py-0.5 tabular-nums hover:bg-slate-100";

/** Title, counts that open the matching list, pin legend, keys and auto-assign. */
export function Header({ state, updatedAt, autoAssignBusy, onAutoAssign }: Props) {
  const counts = countByFilter(state, { show: "all", region: "", q: "" });
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-white px-4 py-2">
      <h1 className="m-0 text-lg font-bold">Courier dispatch</h1>
      <nav className="flex items-center gap-1 text-[13px]" aria-label="Order counts">
        <Link to={paths.orders} className={cn(countLink, counts.free > 0 ? "font-semibold text-blue-700" : "text-slate-600")} title="Orders a courier can take, still without one">
          {counts.free} free
        </Link>
        <Link to={`${paths.orders}?show=taken`} className={cn(countLink, "text-slate-600")}>
          {counts.taken} assigned
        </Link>
        <Link to={`${paths.orders}?show=problem`} className={cn(countLink, counts.problem > 0 ? "text-amber-700" : "text-slate-600")} title="Broken, nobody can take them, or outside the courier's regions">
          {counts.problem} problems
        </Link>
      </nav>
      <Legend />
      <span className="ml-auto flex items-center gap-3">
        <UpdatedAgo at={updatedAt} />
        <KeysHelp />
        <Button variant="primary" onClick={onAutoAssign} disabled={autoAssignBusy} title="Give every free order to the nearest courier who is allowed to take it">
          {autoAssignBusy ? "Assigning…" : "Auto-assign free orders"}
        </Button>
      </span>
    </header>
  );
}
