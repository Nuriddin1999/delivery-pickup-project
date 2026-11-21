import { useLocation, useMatch, useNavigate } from "react-router-dom";
import { paths, patterns, type Tab } from "./routes";

/**
 * What the address says is open: the tab, the selected order and the
 * courier whose route is shown. Selecting something changes the address.
 */
export function useAppRoute() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const isAdd = useMatch(patterns.newCourier) !== null;
  const orderMatch = useMatch(patterns.order);
  const courierMatch = useMatch(patterns.courier);

  const tab: Tab = isAdd ? "add" : pathname.startsWith(paths.orders) ? "order" : "couriers";

  return {
    tab,
    selectedOrderId: orderMatch?.params.orderId ?? null,
    focusedCourierId: isAdd ? null : (courierMatch?.params.courierId ?? null),
    // The order list is always on screen; its filter lives in the query string, so every move keeps it.
    selectOrder: (id: string | null) => navigate((id ? paths.order(id) : paths.orders) + search),
    focusCourier: (id: string | null) => navigate((id ? paths.courier(id) : paths.couriers) + search),
    /** opens an order with another list filter, e.g. Assigned right after it was given out */
    openOrderWith: (id: string, nextSearch: string) => navigate(paths.order(id) + nextSearch),
    /** keeps the order list's filter on links */
    search,
  };
}
