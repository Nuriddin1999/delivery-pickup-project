import { useMemo, useState } from "react";
import type { DispatchState } from "@/api/types";
import { courierColors } from "@/domain/couriers";
import { emptyStart, readStart, startFromPoint, type StartFields } from "@/domain/courierForm";
import { AutoAssignReport } from "@/features/auto-assign/AutoAssignReport";
import { useAutoAssign } from "@/features/auto-assign/useAutoAssign";
import { Legend } from "@/features/map/Legend";
import { MapView } from "@/features/map/MapView";
import type { MapMode } from "@/features/map/mapStyles";
import { usePointHighlight } from "@/features/map/usePointHighlight";
import { OrdersTable } from "@/features/orders/OrdersTable";
import { useCandidates } from "@/features/orders/useCandidates";
import { useOrderList } from "@/features/orders/useOrderList";
import { RegionEditor } from "@/features/regions/RegionEditor";
import { useRegionEditor } from "@/features/regions/useRegionEditor";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/shared/ui/Toast";
import { Header } from "./Header";
import { SidePanelRoutes } from "./SidePanelRoutes";
import { SideTabs } from "./SideTabs";
import { useAppRoute } from "./useAppRoute";

interface Props {
  state: DispatchState;
  shapes: GeoJSON.FeatureCollection | null;
  loadError: string | null;
  updatedAt: number;
}

const panel = "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm";

/**
 * The page: a dark header; on the left the map (region bar and legend on
 * top of it) with the order table under it; on the right the open order or
 * the couriers.
 */
export function Dashboard({ state, shapes, loadError, updatedAt }: Props) {
  const route = useAppRoute();
  const { toast, showToast, undo } = useToast();
  const regions = useRegionEditor(state.couriers);
  const autoAssign = useAutoAssign((message) => showToast(message, undefined, "error"));
  const orderList = useOrderList(state, route.selectedOrderId, route.selectOrder);
  useHotkeys({ u: undo ?? undefined });
  const pointHighlight = usePointHighlight();
  const [showShorter, setShowShorter] = useState(false);
  const [newStart, setNewStart] = useState<StartFields>(emptyStart);
  const colors = useMemo(() => courierColors(state.couriers), [state.couriers]);

  const isAdding = route.tab === "add";
  const mapMode: MapMode = isAdding ? "pickStart" : regions.courier ? "regions" : "none";
  const focused = state.couriers.find((c) => c.id === route.focusedCourierId);
  // Same query as the order panel, so this costs no extra request.
  const candidates = useCandidates(route.selectedOrderId).data;
  const allowedCourierIds = route.selectedOrderId && candidates?.order_id === route.selectedOrderId ? new Set(candidates.candidates.filter((c) => c.allowed).map((c) => c.courier_id)) : null;

  const pickRegionCourier = (id: string) => {
    // On the couriers tab, also show that courier's route.
    if (regions.pick(id) && id && route.tab === "couriers") route.focusCourier(id);
  };

  return (
    <div className="flex h-screen flex-col">
      <Header updatedAt={updatedAt} autoAssignBusy={autoAssign.busy} onAutoAssign={autoAssign.run} search={route.search} />

      <main className="flex min-h-0 flex-1 gap-3 p-3 max-[1000px]:flex-col max-[1000px]:overflow-y-auto">
        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <div className={`${panel} relative min-h-80 flex-3`}>
            <MapView
              state={state}
              shapes={shapes}
              colors={colors}
              mode={mapMode}
              draftRegions={regions.draft}
              draftColor={regions.courier ? colors[regions.courier.id] : "#2f7d71"}
              onToggleRegion={regions.toggle}
              onPickPoint={(p) => setNewStart(startFromPoint(p))}
              selectedOrderId={route.selectedOrderId}
              onSelectOrder={route.selectOrder}
              route={focused ? { route: showShorter ? focused.better_route : focused.route, color: colors[focused.id] } : null}
              startPreview={isAdding ? readStart(newStart) : null}
              highlight={pointHighlight.highlight}
              allowedCourierIds={allowedCourierIds}
            />
            {/* Leaflet's own controls sit at z-index 1000; these float just above the tiles too. */}
            <div className="pointer-events-none absolute top-3 right-3 left-14 z-1000 flex justify-end">
              <RegionEditor editor={regions} couriers={state.couriers} allRegions={state.regions} colors={colors} disabled={isAdding} onPick={pickRegionCourier} />
            </div>
            <div className="absolute bottom-6 left-3 z-1000 max-[700px]:hidden">
              <Legend />
            </div>
          </div>

          <div className={`${panel} flex min-h-65 flex-2 flex-col`}>
            <OrdersTable state={state} colors={colors} list={orderList} selectedId={route.selectedOrderId} onSelect={route.selectOrder} />
          </div>
        </section>

        <aside className={`${panel} flex w-110 flex-none flex-col max-[1000px]:w-full`}>
          {!isAdding && <SideTabs active={route.tab} search={route.search} />}
          <div className="no-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {autoAssign.result && <AutoAssignReport result={autoAssign.result} couriers={state.couriers} onClose={autoAssign.close} onSelectOrder={route.selectOrder} />}
            <SidePanelRoutes
              state={state}
              colors={colors}
              route={route}
              orderList={orderList}
              showShorter={showShorter}
              onShowShorter={setShowShorter}
              newStart={newStart}
              onNewStartChange={setNewStart}
              onShowPoint={pointHighlight.show}
              onOrderChanged={showToast}
              onCourierCreated={(c) => {
                showToast(`${c.name} added. Now choose their regions on the map.`);
                regions.edit(c.id, c.regions);
                route.focusCourier(c.id);
              }}
            />
          </div>
        </aside>
      </main>

      {toast && <Toast key={toast.id} message={toast.text} tone={toast.tone} onUndo={undo} />}
      {loadError && <Toast message={loadError} tone="error" />}
    </div>
  );
}
