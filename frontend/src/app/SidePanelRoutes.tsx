import { Navigate, Route, Routes } from "react-router-dom";
import type { Courier, DispatchState } from "@/api/types";
import type { StartFields } from "@/domain/courierForm";
import type { Undo } from "@/hooks/useToast";
import { AddCourierForm } from "@/features/add-courier/AddCourierForm";
import { CourierPanel } from "@/features/couriers/CourierPanel";
import type { ShowPoint } from "@/features/map/usePointHighlight";
import { OrderPanel } from "@/features/orders/OrderPanel";
import type { OrderList } from "@/features/orders/useOrderList";
import { paths, patterns } from "./routes";
import type { useAppRoute } from "./useAppRoute";

interface Props {
  state: DispatchState;
  colors: Record<string, string>;
  route: ReturnType<typeof useAppRoute>;
  orderList: OrderList;
  showShorter: boolean;
  onShowShorter: (v: boolean) => void;
  newStart: StartFields;
  onNewStartChange: (s: StartFields) => void;
  onOrderChanged: (message: string, undo?: Undo) => void;
  onCourierCreated: (c: Courier) => void;
  onShowPoint: ShowPoint;
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
      onShowPoint={p.onShowPoint}
    />
  );
  const order = <OrderPanel state={p.state} colors={p.colors} list={p.orderList} selectedId={p.route.selectedOrderId} onSelect={p.route.selectOrder} onChanged={p.onOrderChanged} />;
  const addCourier = (
    <AddCourierForm
      takenNames={p.state.couriers.map((c) => c.name)}
      start={p.newStart}
      onStartChange={p.onNewStartChange}
      onCreated={p.onCourierCreated}
      onClose={() => p.route.focusCourier(null)}
    />
  );

  return (
    <Routes>
      <Route path="/" element={<Navigate to={paths.orders} replace />} />
      <Route path={patterns.couriers} element={couriers} />
      <Route path={patterns.newCourier} element={addCourier} />
      <Route path={patterns.courier} element={couriers} />
      <Route path={patterns.orders} element={order} />
      <Route path={patterns.order} element={order} />
      <Route path="*" element={<Navigate to={paths.orders} replace />} />
    </Routes>
  );
}
