import { useEffect, useMemo, useRef, useState } from "react";
import type { DispatchState } from "@/api/types";
import { courierColors } from "@/domain/couriers";
import { emptyStart, readStart, startFromPoint, type StartFields } from "@/domain/courierForm";
import { AutoAssignDialog } from "@/features/auto-assign/AutoAssignDialog";
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
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/shared/ui/Toast";
import { cn } from "@/shared/ui/styles";
import { Header } from "./Header";
import { SidePanelRoutes } from "./SidePanelRoutes";
import { SideTabs } from "./SideTabs";
import { useAppRoute } from "./useAppRoute";
import { useMapSplit } from "./useMapSplit";

interface Props {
  state: DispatchState;
  shapes: GeoJSON.FeatureCollection | null;
  loadError: string | null;
}

const panel = "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm";

/** Below this width the columns stack and the page scrolls as a whole (same as the max-[1000px] classes). */
const NARROW = "(max-width: 1000px)";

/**
 * The page: a dark header; on the left the map (region bar and legend on
 * top of it) with the order table under it; on the right the open order or
 * the couriers.
 */
export function Dashboard({ state, shapes, loadError }: Props) {
  const route = useAppRoute();
  const { toast, showToast, undo } = useToast();
  const regions = useRegionEditor(state.couriers);
  const autoAssign = useAutoAssign((message) => showToast(message));
  const orderList = useOrderList(state);
  const pointHighlight = usePointHighlight();
  const split = useMapSplit();
  const asideRef = useRef<HTMLElement>(null);
  // On a phone the order panel sits under the table: bring it into view when an order is picked.
  useEffect(() => {
    if (route.selectedOrderId && window.matchMedia(NARROW).matches) asideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [route.selectedOrderId]);
  // Height changes slide, except while the bar is dragged: then the map follows the pointer.
  const slide = !split.dragging && "duration-300 ease-out motion-reduce:transition-none";
  const [showShorter, setShowShorter] = useState(false);
  const [newStart, setNewStart] = useState<StartFields>(emptyStart);
  const colors = useMemo(() => courierColors(state.couriers), [state.couriers]);

  const isAdding = route.tab === "add";
  const mapMode: MapMode = isAdding ? "pickStart" : regions.courier ? "regions" : "none";
  const focused = state.couriers.find((c) => c.id === route.focusedCourierId);
  // Same query as the order panel, so this costs no extra request.
  const candidates = useCandidates(route.selectedOrderId).data;
  const allowedCourierIds = route.selectedOrderId && candidates?.order_id === route.selectedOrderId ? new Set(candidates.candidates.filter((c) => c.allowed).map((c) => c.courier_id)) : null;

  // An order picked in the table pulses on the map, the same way a courier's start does,
  // in its courier's colour (teal while free). No dot and no label: the pin and its id are already there.
  const selectFromTable = (id: string) => {
    route.selectOrder(id);
    const o = state.orders.find((x) => x.id === id);
    if (o?.location) pointHighlight.show(o.location, o.courier_id ? colors[o.courier_id] : "#2f7d71", "", false);
  };

  const pickRegionCourier = (id: string): boolean => {
    if (!regions.pick(id)) return false;
    // On the couriers tab, also show that courier's route.
    if (id && route.tab === "couriers") route.focusCourier(id);
    return true;
  };

  return (
    <div className="flex h-screen flex-col max-[1000px]:h-auto max-[1000px]:min-h-screen">
      <Header autoAssignBusy={autoAssign.dialogOpen} onAutoAssign={autoAssign.open} search={route.search} />

      <main className="flex min-h-0 flex-1 gap-3 p-3 max-[1000px]:flex-col max-sm:p-2">
        <section ref={split.columnRef} className="flex min-h-0 min-w-0 flex-1 flex-col max-[1000px]:flex-none max-[1000px]:gap-3">
          {/* The map's share of the column; 0 when the table is expanded. The bar below takes 12px. */}
          <div
            ref={split.mapBoxRef}
            // On a narrow screen the map has a fixed height (the bar is hidden); "!" wins over the inline height.
            className={cn("flex-none overflow-hidden transition-[height,opacity]", slide, split.tableExpanded ? "opacity-0" : "max-[1000px]:h-[55svh]!")}
            style={{ height: split.tableExpanded ? 0 : `calc(${split.mapShare * 100}% - 6px)` }}
            aria-hidden={split.tableExpanded}
            inert={split.tableExpanded}
          >
          <div className={`${panel} relative h-full`}>
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
          </div>

          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize the map and the order table"
            aria-valuemin={20}
            aria-valuemax={85}
            aria-valuenow={Math.round(split.share * 100)}
            tabIndex={split.tableExpanded ? -1 : 0}
            title="Drag to resize · double-click to reset"
            onPointerDown={split.onPointerDown}
            onKeyDown={split.onKeyDown}
            onDoubleClick={split.reset}
            className={cn(
              "group flex flex-none cursor-row-resize touch-none items-center justify-center overflow-hidden outline-none transition-[height,opacity] max-[1000px]:hidden",
              slide,
              split.tableExpanded ? "pointer-events-none h-0 opacity-0" : "h-3",
            )}
          >
            <span className={cn("h-1.5 w-14 rounded-full transition-colors group-hover:bg-brand-500 group-focus-visible:bg-brand-500", split.dragging ? "bg-brand-600" : "bg-slate-300")} />
          </div>

          <div className={`${panel} flex min-h-0 flex-1 flex-col max-[1000px]:flex-none`}>
            <OrdersTable
              state={state}
              colors={colors}
              list={orderList}
              selectedId={route.selectedOrderId}
              onSelect={selectFromTable}
              expanded={split.tableExpanded}
              onExpand={split.expandTable}
              onShowMap={split.showMap}
            />
          </div>
        </section>

        <aside ref={asideRef} className={`${panel} flex w-110 flex-none scroll-mt-2 flex-col max-[1000px]:w-full`}>
          {!isAdding && <SideTabs active={route.tab} search={route.search} />}
          <div className="no-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto p-4 max-[1000px]:overflow-visible max-sm:p-3">
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

      {autoAssign.dialogOpen && (
        <AutoAssignDialog
          plan={autoAssign.plan}
          couriers={state.couriers}
          orders={state.orders}
          colors={colors}
          checking={autoAssign.checking}
          confirming={autoAssign.confirming}
          error={autoAssign.error}
          onConfirm={autoAssign.confirm}
          onCancel={autoAssign.cancel}
          onCheckAgain={autoAssign.open}
        />
      )}
      {toast && <Toast key={toast.id} message={toast.text} tone={toast.tone} onUndo={undo} />}
      {loadError && <Toast message={loadError} tone="error" />}
    </div>
  );
}
