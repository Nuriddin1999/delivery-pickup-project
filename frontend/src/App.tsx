import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./api";
import { courierColors, formPoint, sameSet } from "./logic";
import type { MapMode } from "./mapStyles";
import type { AutoResult, Point, State } from "./types";
import { btn, btnPrimary, cn, muted } from "./ui";
import { MapView } from "./components/MapView";
import { RegionEditor } from "./components/RegionEditor";
import { AddCourierForm } from "./components/AddCourierForm";
import { OrdersPanel } from "./components/OrdersPanel";
import { CourierPanel } from "./components/CourierPanel";
import { AutoAssignReport } from "./components/AutoAssignReport";
import { Legend } from "./components/Legend";

type Tab = "couriers" | "orders" | "add";

const tabs: { id: Tab; label: string }[] = [
  { id: "couriers", label: "Couriers" },
  { id: "orders", label: "Orders" },
  { id: "add", label: "Add courier" },
];

const toastClass = "fixed left-1/2 z-2000 -translate-x-1/2 rounded-lg px-4.5 py-2.5 text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)]";

export default function App() {
  const [state, setState] = useState<State | null>(null);
  const [shapes, setShapes] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("couriers");
  const [toast, setToast] = useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [focusCourierId, setFocusCourierId] = useState<string | null>(null);
  const [showBetter, setShowBetter] = useState(false);

  // region editing
  const [regionCourierId, setRegionCourierId] = useState("");
  const [draftRegions, setDraftRegions] = useState<string[] | null>(null);
  const [savingRegions, setSavingRegions] = useState(false);
  const [regionMsg, setRegionMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // add courier: the start point is shared with the map
  const [newStart, setNewStart] = useState({ lat: "", lng: "" });
  const [autoResult, setAutoResult] = useState<AutoResult | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await api.state());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
    api
      .regionShapes()
      .then(setShapes)
      .catch(() => setLoadError("Could not load region shapes"));
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const colors = useMemo(() => courierColors(state?.couriers ?? []), [state]);

  if (!state) {
    return (
      <div className="p-10 text-center">
        {loadError ?? "Loading…"}{" "}
        {loadError && (
          <button className={btn} onClick={refresh}>
            Retry
          </button>
        )}
      </div>
    );
  }

  const regionCourier = state.couriers.find((c) => c.id === regionCourierId);
  const regionsDirty = !!regionCourier && !!draftRegions && !sameSet(regionCourier.regions, draftRegions);
  const mode: MapMode = tab === "add" ? "pickStart" : regionCourier ? "regions" : "none";

  const pickRegionCourier = (id: string) => {
    if (regionsDirty && !confirm(`Drop the unsaved region changes for ${regionCourier!.name}?`)) return;
    setRegionCourierId(id);
    setRegionMsg(null);
    const c = state.couriers.find((x) => x.id === id);
    setDraftRegions(c ? [...c.regions] : null);
    if (c) setFocusCourierId(c.id);
  };

  const toggleRegion = (name: string) => {
    if (!draftRegions) return;
    setRegionMsg(null);
    setDraftRegions(draftRegions.includes(name) ? draftRegions.filter((r) => r !== name) : [...draftRegions, name]);
  };

  const saveRegions = async () => {
    if (!regionCourier || !draftRegions) return;
    setSavingRegions(true);
    try {
      const saved = await api.setRegions(regionCourier.id, draftRegions);
      setDraftRegions(saved.regions);
      setRegionMsg({ ok: true, text: `Saved: ${saved.name} works in ${saved.regions.join(", ") || "no regions"}` });
      await refresh();
    } catch (err) {
      setRegionMsg({ ok: false, text: err instanceof ApiError ? err.message : String(err) });
    } finally {
      setSavingRegions(false);
    }
  };

  const selectOrder = (id: string | null) => {
    setSelectedOrderId(id);
    if (id) setTab("orders");
  };

  const runAutoAssign = async () => {
    setAutoBusy(true);
    try {
      const res = await api.autoAssign();
      setAutoResult(res);
      await refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : String(err));
    } finally {
      setAutoBusy(false);
    }
  };

  const focused = state.couriers.find((c) => c.id === focusCourierId);
  const route = focused ? { route: showBetter ? focused.better_route : focused.route, color: colors[focused.id] } : null;
  const free = state.orders.filter((o) => !o.courier_id).length;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-2.5">
        <h1 className="m-0 text-lg font-bold">Courier dispatch</h1>
        <span className={muted}>
          {state.couriers.length} couriers · {state.orders.length} orders · {free} without a courier
        </span>
        <Legend />
        <button className={cn(btnPrimary, "ml-auto")} onClick={runAutoAssign} disabled={autoBusy}>
          {autoBusy ? "Assigning…" : "Auto-assign free orders"}
        </button>
      </header>

      <main className="flex min-h-0 flex-1 max-[900px]:flex-col">
        <section className="flex min-w-0 flex-1 flex-col max-[900px]:min-h-[55vh]">
          <RegionEditor
            couriers={state.couriers}
            colors={colors}
            courierId={regionCourierId}
            draft={draftRegions}
            disabled={tab === "add"}
            saving={savingRegions}
            message={regionMsg}
            onPick={pickRegionCourier}
            onToggle={toggleRegion}
            onSave={saveRegions}
            onReset={() => regionCourier && setDraftRegions([...regionCourier.regions])}
            allRegions={state.regions}
          />
          <MapView
            shapes={shapes}
            state={state}
            colors={colors}
            mode={mode}
            draftRegions={draftRegions}
            draftColor={regionCourier ? colors[regionCourier.id] : "#2563eb"}
            onToggleRegion={toggleRegion}
            onPickPoint={(p: Point) => setNewStart({ lat: p.lat.toFixed(5), lng: p.lng.toFixed(5) })}
            selectedOrderId={selectedOrderId}
            onSelectOrder={selectOrder}
            route={route}
            startPreview={tab === "add" ? formPoint(newStart) : null}
          />
        </section>

        <aside className="flex w-110 flex-col border-l border-slate-200 bg-white max-[900px]:w-full max-[900px]:border-l-0">
          <nav className="flex border-b border-slate-200">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={cn("flex-1 cursor-pointer border-b-3 p-2.5", tab === t.id ? "border-blue-600 font-semibold" : "border-transparent hover:bg-slate-50")}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
            {autoResult && <AutoAssignReport result={autoResult} state={state} onClose={() => setAutoResult(null)} onSelectOrder={selectOrder} />}
            {tab === "couriers" && (
              <CourierPanel state={state} colors={colors} focusId={focusCourierId} showBetter={showBetter} onFocus={setFocusCourierId} onShowBetter={setShowBetter} onSelectOrder={selectOrder} />
            )}
            {tab === "orders" && (
              <OrdersPanel
                state={state}
                colors={colors}
                selectedId={selectedOrderId}
                onSelect={selectOrder}
                onChanged={async (msg) => {
                  setToast(msg);
                  await refresh();
                }}
              />
            )}
            {tab === "add" && (
              <AddCourierForm
                takenNames={state.couriers.map((c) => c.name)}
                start={newStart}
                onStartChange={setNewStart}
                onCreated={async (c) => {
                  setToast(`${c.name} added. Now choose their regions on the map.`);
                  await refresh();
                  setTab("couriers");
                  setRegionCourierId(c.id);
                  setDraftRegions([...c.regions]);
                  setFocusCourierId(c.id);
                  setRegionMsg(null);
                }}
              />
            )}
          </div>
        </aside>
      </main>
      {toast && <div className={cn(toastClass, "bottom-5 bg-slate-900")}>{toast}</div>}
      {loadError && <div className={cn(toastClass, "bottom-17.5 bg-red-600")}>{loadError}</div>}
    </div>
  );
}
