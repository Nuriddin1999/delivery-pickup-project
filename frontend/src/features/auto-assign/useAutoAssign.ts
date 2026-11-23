import { useMutation } from "@tanstack/react-query";
import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import { useStateMutation } from "@/hooks/useStateMutation";

/**
 * Auto-assign in two steps: open() asks the server for a plan and shows it,
 * changing nothing; confirm() gives out exactly that plan and closes the
 * dialog with a short message. No report follows: the dialog already
 * showed who gets what and what is left out.
 */
export function useAutoAssign(onDone: (message: string) => void) {
  const plan = useMutation({ mutationFn: dispatchApi.planAutoAssign });
  const apply = useStateMutation(dispatchApi.applyAutoAssign);

  const open = () => {
    apply.reset();
    plan.mutate();
  };
  const cancel = () => {
    plan.reset();
    apply.reset();
  };
  const confirm = () => {
    if (!plan.data) return;
    const items = plan.data.assigned.map(({ order_id, courier_id }) => ({ order_id, courier_id }));
    apply.mutate(items, {
      onSuccess: (res) => {
        plan.reset();
        onDone(`${res.assigned.length} ${res.assigned.length === 1 ? "order" : "orders"} given out`);
      },
    });
  };

  return {
    /** the dialog is open while a plan is loading, shown, or failed */
    dialogOpen: plan.isPending || plan.isSuccess || plan.isError,
    plan: plan.data ?? null,
    checking: plan.isPending,
    error: plan.error ? errorMessage(plan.error) : apply.error ? errorMessage(apply.error) : null,
    confirming: apply.isPending,
    open,
    cancel,
    confirm,
  };
}
