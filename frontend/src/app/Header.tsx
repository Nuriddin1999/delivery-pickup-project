import { Link } from "react-router-dom";
import { cn } from "@/shared/ui/styles";
import { KeysHelp } from "./KeysHelp";
import { paths } from "./routes";

interface Props {
  autoAssignBusy: boolean;
  onAutoAssign: () => void;
  /** the order list's filter, kept on the add-courier link */
  search: string;
}

// The hub is in Tashkent, so "today" is Tashkent's day whatever the browser's zone.
const todayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tashkent" });

const onDark = "rounded-lg border border-white/30 px-3 py-1.5 text-[13px] whitespace-nowrap text-white hover:bg-white/10 max-sm:px-2.5";

/** Dark bar: the page name, today's date, keys, auto-assign and add courier. */
export function Header({ autoAssignBusy, onAutoAssign, search }: Props) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-navy-900 px-5 py-2.5 text-white max-[1000px]:flex max-[1000px]:flex-wrap max-[1000px]:gap-x-3 max-[1000px]:gap-y-1 max-sm:px-3">
      <h1 className="m-0 text-xl font-bold tracking-tight whitespace-nowrap max-[1000px]:flex-1 max-sm:text-lg">Courier dispatch</h1>
      <span className="text-[15px] font-medium text-white/90 max-[1000px]:order-last max-[1000px]:w-full max-[1000px]:text-xs max-[1000px]:text-white/70">Today · {todayFormat.format(Date.now())}</span>
      <span className="flex items-center justify-end gap-2.5">
        {/* No keyboard on a phone, so the keys help hides there. */}
        <span className="max-sm:hidden">
          <KeysHelp />
        </span>
        <button
          type="button"
          className={cn(onDark, "cursor-pointer disabled:opacity-60")}
          onClick={onAutoAssign}
          disabled={autoAssignBusy}
          title="Give every free order to the nearest courier who is allowed to take it"
        >
          {autoAssignBusy ? "Assigning…" : <>Auto-assign<span className="max-sm:hidden"> free orders</span></>}
        </button>
        <Link to={{ pathname: paths.newCourier, search }} className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-[14px] font-semibold whitespace-nowrap text-white shadow-sm hover:bg-brand-600 max-sm:px-2.5 max-sm:text-[13px]">
          + <span className="max-sm:hidden">Add </span>courier
        </Link>
      </span>
    </header>
  );
}
