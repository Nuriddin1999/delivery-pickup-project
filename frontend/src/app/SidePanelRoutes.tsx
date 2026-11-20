import { Navigate, Route, Routes } from "react-router-dom";
import type { Courier, DispatchState } from "@/api/types";
import type { StartFields } from "@/domain/courierForm";
import { AddCourierForm } from "@/features/add-courier/AddCourierForm";
import { CourierPanel } from "@/features/couriers/CourierPanel";
import { OrdersPanel } from "@/features/orders/OrdersPanel";
import { paths, patterns } from "./routes";
import type { useAppRoute } from "./useAppRoute";

interface Props {
  state: DispatchState;
  colors: Record<string, string>;
  route: ReturnType<typeof useAppRoute>;
  showShorter: boolean;
  onShowShorter: (v: boolean) => void;
  newStart: StartFields;
  onNewStartChange: (s: StartFields) => void;
  onOrderChanged: (message: string) => void;
  onCourierCreated: (c: Courier) => void;
}

/** Which panel the side bar shows for each page address. */
export function SidePanelRoutes(p: Props) {
  const couriers = (
    <CourierPanel
      state={p.state}
      colors={p.colors}
      focusedId={p.route.focusedCourierId}
      showShorter={p.showShorter}
      onFocus={p.route.focusCourier}
      onShowShorter={p.onShowShorter}
      onSelectOrder={p.route.selectOrder}
    />
  );
  const orders = <OrdersPanel state={p.state} colors={p.colors} selectedId={p.route.selectedOrderId} onSelect={p.route.selectOrder} onChanged={p.onOrderChanged} />;
  const addCourier = <AddCourierForm takenNames={p.state.couriers.map((c) => c.name)} start={p.newStart} onStartChange={p.onNewStartChange} onCreated={p.onCourierCreated} />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={paths.couriers} replace />} />
      <Route path={patterns.couriers} element={couriers} />
      <Route path={patterns.newCourier} element={addCourier} />
      <Route path={patterns.courier} element={couriers} />
      <Route path={patterns.orders} element={orders} />
      <Route path={patterns.order} element={orders} />
      <Route path="*" element={<Navigate to={paths.couriers} replace />} />
    </Routes>
  );
}
