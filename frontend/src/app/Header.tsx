import type { DispatchState } from "@/api/types";
import { Legend } from "@/features/map/Legend";
import { Button } from "@/shared/ui/Button";
import { mutedText } from "@/shared/ui/styles";

interface Props {
  state: DispatchState;
  autoAssignBusy: boolean;
  onAutoAssign: () => void;
}

/** Title, counts, pin legend and the auto-assign button. */
export function Header({ state, autoAssignBusy, onAutoAssign }: Props) {
  const free = state.orders.filter((o) => !o.courier_id).length;
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-2.5">
      <h1 className="m-0 text-lg font-bold">Courier dispatch</h1>
      <span className={mutedText}>
        {state.couriers.length} couriers · {state.orders.length} orders · {free} without a courier
      </span>
      <Legend />
      <Button
        variant="primary"
        className="ml-auto"
        onClick={onAutoAssign}
        disabled={autoAssignBusy}
        title="Give every free order to the nearest courier who is allowed to take it"
      >
        {autoAssignBusy ? "Assigning…" : "Auto-assign free orders"}
      </Button>
    </header>
  );
}
