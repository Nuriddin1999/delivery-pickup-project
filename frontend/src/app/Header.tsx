import { Link } from "react-router-dom";
import { cn } from "@/shared/ui/styles";
import { KeysHelp } from "./KeysHelp";
import { paths } from "./routes";
import { UpdatedAgo } from "./UpdatedAgo";

interface Props {
  updatedAt: number;
  autoAssignBusy: boolean;
  onAutoAssign: () => void;
  /** the order list's filter, kept on the add-courier link */
  search: string;
}

// The hub is in Tashkent, so "today" is Tashkent's day whatever the browser's zone.
const todayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tashkent" });

const onDark = "rounded-lg border border-white/30 px-3 py-1.5 text-[13px] text-white hover:bg-white/10";

/** Dark bar: the page name, today's date, data age, keys, auto-assign and add courier. */
export function Header({ updatedAt, autoAssignBusy, onAutoAssign, search }: Props) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-navy-900 px-5 py-2.5 text-white max-[900px]:grid-cols-1">
      <h1 className="m-0 text-xl font-bold tracking-tight">Courier dispatch</h1>
      <span className="text-[15px] font-medium text-white/90">Today · {todayFormat.format(Date.now())}</span>
      <span className="flex items-center justify-end gap-2.5">
        <UpdatedAgo at={updatedAt} />
        <KeysHelp />
        <button
          type="button"
          className={cn(onDark, "cursor-pointer disabled:opacity-60")}
          onClick={onAutoAssign}
          disabled={autoAssignBusy}
          title="Give every free order to the nearest courier who is allowed to take it"
        >
          {autoAssignBusy ? "Assigning…" : "Auto-assign free orders"}
        </button>
        <Link to={{ pathname: paths.newCourier, search }} className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-600">
          + Add courier
        </Link>
      </span>
    </header>
  );
}
