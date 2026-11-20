import { useMemo, useState } from "react";
import type { DispatchState } from "@/api/types";
import { courierColors } from "@/domain/couriers";
import { emptyStart, readStart, startFromPoint, type StartFields } from "@/domain/courierForm";
import { AutoAssignReport } from "@/features/auto-assign/AutoAssignReport";
import { MapView } from "@/features/map/MapView";
import type { MapMode } from "@/features/map/mapStyles";
import { RegionEditor } from "@/features/regions/RegionEditor";
import { useAutoAssign } from "@/hooks/useAutoAssign";
import { useRegionEditor } from "@/hooks/useRegionEditor";
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
  refresh: () => Promise<void>;
}

/** The page layout: header, map with its region toolbar, and the side panel. */
export function Dashboard({ state, shapes, loadError, refresh }: Props) {
  const route = useAppRoute();
  const { toast, showToast } = useToast();
  const regions = useRegionEditor(state.couriers, refresh);
  const autoAssign = useAutoAssign(refresh, showToast);
  const [showShorter, setShowShorter] = useState(false);
  const [newStart, setNewStart] = useState<StartFields>(emptyStart);
  const colors = useMemo(() => courierColors(state.couriers), [state.couriers]);

  const isAdding = route.tab === "add";
  const mapMode: MapMode = isAdding ? "pickStart" : regions.courier ? "regions" : "none";
  const focused = state.couriers.find((c) => c.id === route.focusedCourierId);

  const pickRegionCourier = (id: string) => {
    // On the couriers tab, also show that courier's route.
    if (regions.pick(id) && id && route.tab === "couriers") route.focusCourier(id);
  };

  return (
    <div className="flex h-screen flex-col">
      <Header state={state} autoAssignBusy={autoAssign.busy} onAutoAssign={autoAssign.run} />

      <main className="flex min-h-0 flex-1 max-[900px]:flex-col">
        <section className="flex min-w-0 flex-1 flex-col max-[900px]:min-h-[55vh]">
          <RegionEditor editor={regions} couriers={state.couriers} allRegions={state.regions} colors={colors} disabled={isAdding} onPick={pickRegionCourier} />
          <MapView
            state={state}
            shapes={shapes}
            colors={colors}
            mode={mapMode}
            draftRegions={regions.draft}
            draftColor={regions.courier ? colors[regions.courier.id] : "#2563eb"}
            onToggleRegion={regions.toggle}
            onPickPoint={(p) => setNewStart(startFromPoint(p))}
            selectedOrderId={route.selectedOrderId}
            onSelectOrder={route.selectOrder}
            route={focused ? { route: showShorter ? focused.better_route : focused.route, color: colors[focused.id] } : null}
            startPreview={isAdding ? readStart(newStart) : null}
          />
        </section>

        <aside className="flex w-110 flex-col border-l border-slate-200 bg-white max-[900px]:w-full max-[900px]:border-l-0">
          <SideTabs active={route.tab} />
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
            {autoAssign.result && <AutoAssignReport result={autoAssign.result} couriers={state.couriers} onClose={autoAssign.close} onSelectOrder={route.selectOrder} />}
            <SidePanelRoutes
              state={state}
              colors={colors}
              route={route}
              showShorter={showShorter}
              onShowShorter={setShowShorter}
              newStart={newStart}
              onNewStartChange={setNewStart}
              onOrderChanged={async (message) => {
                showToast(message);
                await refresh();
              }}
              onCourierCreated={async (c) => {
                showToast(`${c.name} added. Now choose their regions on the map.`);
                await refresh();
                regions.edit(c.id, c.regions);
                route.focusCourier(c.id);
              }}
            />
          </div>
        </aside>
      </main>

      {toast && <Toast message={toast} />}
      {loadError && <Toast message={loadError} tone="error" />}
    </div>
  );
}
