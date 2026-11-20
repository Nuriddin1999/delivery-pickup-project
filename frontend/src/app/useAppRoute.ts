import { useLocation, useMatch, useNavigate } from "react-router-dom";
import { paths, patterns, type Tab } from "./routes";

/**
 * What the address says is open: the tab, the selected order and the
 * courier whose route is shown. Selecting something changes the address.
 */
export function useAppRoute() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdd = useMatch(patterns.newCourier) !== null;
  const orderMatch = useMatch(patterns.order);
  const courierMatch = useMatch(patterns.courier);

  const tab: Tab = isAdd ? "add" : pathname.startsWith(paths.orders) ? "orders" : "couriers";

  return {
    tab,
    selectedOrderId: orderMatch?.params.orderId ?? null,
    focusedCourierId: isAdd ? null : (courierMatch?.params.courierId ?? null),
    selectOrder: (id: string | null) => navigate(id ? paths.order(id) : paths.orders),
    focusCourier: (id: string | null) => navigate(id ? paths.courier(id) : paths.couriers),
  };
}
