import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from './api'
import { courierColors, formPoint, sameSet } from './logic'
import type { AutoResult, Point, State } from './types'
import { MapView, type MapMode } from './components/MapView'
import { RegionEditor } from './components/RegionEditor'
import { AddCourierForm } from './components/AddCourierForm'
import { OrdersPanel } from './components/OrdersPanel'
import { CourierPanel } from './components/CourierPanel'

type Tab = 'couriers' | 'orders' | 'add'

export default function App() {
  const [state, setState] = useState<State | null>(null)
  const [shapes, setShapes] = useState<GeoJSON.FeatureCollection | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('couriers')
  const [toast, setToast] = useState<string | null>(null)

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [focusCourierId, setFocusCourierId] = useState<string | null>(null)
  const [showBetter, setShowBetter] = useState(false)

  // region editing
  const [regionCourierId, setRegionCourierId] = useState('')
  const [draftRegions, setDraftRegions] = useState<string[] | null>(null)
  const [savingRegions, setSavingRegions] = useState(false)
  const [regionMsg, setRegionMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // add courier: the start point is shared with the map
  const [newStart, setNewStart] = useState({ lat: '', lng: '' })
  const [autoResult, setAutoResult] = useState<AutoResult | null>(null)
  const [autoBusy, setAutoBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setState(await api.state())
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    refresh()
    api.regionShapes().then(setShapes).catch(() => setLoadError('Could not load region shapes'))
  }, [refresh])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const colors = useMemo(() => courierColors(state?.couriers ?? []), [state])

  if (!state) {
    return <div className="loading">{loadError ?? 'Loading…'} {loadError && <button onClick={refresh}>Retry</button>}</div>
  }

  const regionCourier = state.couriers.find((c) => c.id === regionCourierId)
  const regionsDirty = !!regionCourier && !!draftRegions && !sameSet(regionCourier.regions, draftRegions)
  const mode: MapMode = tab === 'add' ? 'pickStart' : regionCourier ? 'regions' : 'none'

  const pickRegionCourier = (id: string) => {
    if (regionsDirty && !confirm(`Drop the unsaved region changes for ${regionCourier!.name}?`)) return
    setRegionCourierId(id)
    setRegionMsg(null)
    const c = state.couriers.find((x) => x.id === id)
    setDraftRegions(c ? [...c.regions] : null)
    if (c) setFocusCourierId(c.id)
  }

  const toggleRegion = (name: string) => {
    if (!draftRegions) return
    setRegionMsg(null)
    setDraftRegions(draftRegions.includes(name) ? draftRegions.filter((r) => r !== name) : [...draftRegions, name])
  }

  const saveRegions = async () => {
    if (!regionCourier || !draftRegions) return
    setSavingRegions(true)
    try {
      const saved = await api.setRegions(regionCourier.id, draftRegions)
      setDraftRegions(saved.regions)
      setRegionMsg({ ok: true, text: `Saved: ${saved.name} works in ${saved.regions.join(', ') || 'no regions'}` })
      await refresh()
    } catch (err) {
      setRegionMsg({ ok: false, text: err instanceof ApiError ? err.message : String(err) })
    } finally {
      setSavingRegions(false)
    }
  }

  const selectOrder = (id: string | null) => {
    setSelectedOrderId(id)
    if (id) setTab('orders')
  }

  const runAutoAssign = async () => {
    setAutoBusy(true)
    try {
      const res = await api.autoAssign()
      setAutoResult(res)
      await refresh()
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : String(err))
    } finally {
      setAutoBusy(false)
    }
  }

  const focused = state.couriers.find((c) => c.id === focusCourierId)
  const route = focused ? { route: showBetter ? focused.better_route : focused.route, color: colors[focused.id] } : null
  const free = state.orders.filter((o) => !o.courier_id).length

  return (
    <div className="app">
      <header>
        <h1>Courier dispatch</h1>
        <span className="muted">
          {state.couriers.length} couriers · {state.orders.length} orders · {free} without a courier
        </span>
        <Legend />
        <button className="primary" onClick={runAutoAssign} disabled={autoBusy}>
          {autoBusy ? 'Assigning…' : 'Auto-assign free orders'}
        </button>
      </header>

      <main>
        <section className="map-col">
          <RegionEditor
            couriers={state.couriers}
            colors={colors}
            courierId={regionCourierId}
            draft={draftRegions}
            disabled={tab === 'add'}
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
            draftColor={regionCourier ? colors[regionCourier.id] : '#2563eb'}
            onToggleRegion={toggleRegion}
            onPickPoint={(p: Point) => setNewStart({ lat: p.lat.toFixed(5), lng: p.lng.toFixed(5) })}
            selectedOrderId={selectedOrderId}
            onSelectOrder={selectOrder}
            route={route}
            startPreview={tab === 'add' ? formPoint(newStart) : null}
          />
        </section>

        <aside>
          <nav className="tabs">
            <button className={tab === 'couriers' ? 'on' : ''} onClick={() => setTab('couriers')}>Couriers</button>
            <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>Orders</button>
            <button className={tab === 'add' ? 'on' : ''} onClick={() => setTab('add')}>Add courier</button>
          </nav>

          <div className="tab-body">
            {autoResult && (
              <AutoAssignReport result={autoResult} state={state} onClose={() => setAutoResult(null)} onSelectOrder={selectOrder} />
            )}
            {tab === 'couriers' && (
              <CourierPanel
                state={state}
                colors={colors}
                focusId={focusCourierId}
                showBetter={showBetter}
                onFocus={setFocusCourierId}
                onShowBetter={setShowBetter}
                onSelectOrder={selectOrder}
              />
            )}
            {tab === 'orders' && (
              <OrdersPanel
                state={state}
                colors={colors}
                selectedId={selectedOrderId}
                onSelect={selectOrder}
                onChanged={async (msg) => {
                  setToast(msg)
                  await refresh()
                }}
              />
            )}
            {tab === 'add' && (
              <AddCourierForm
                takenNames={state.couriers.map((c) => c.name)}
                start={newStart}
                onStartChange={setNewStart}
                onCreated={async (c) => {
                  setToast(`${c.name} added. Now choose their regions on the map.`)
                  await refresh()
                  setTab('couriers')
                  setRegionCourierId(c.id)
                  setDraftRegions([...c.regions])
                  setFocusCourierId(c.id)
                  setRegionMsg(null)
                }}
              />
            )}
          </div>
        </aside>
      </main>
      {toast && <div className="toast">{toast}</div>}
      {loadError && <div className="toast error">{loadError}</div>}
    </div>
  )
}

function AutoAssignReport(props: { result: AutoResult; state: State; onClose: () => void; onSelectOrder: (id: string) => void }) {
  const names = Object.fromEntries(props.state.couriers.map((c) => [c.id, c.name]))
  const { assigned, unplaced } = props.result
  return (
    <div className="card auto-report">
      <div className="row space">
        <h3>Auto-assign: {assigned.length} placed, {unplaced.length} not placed</h3>
        <button className="link" onClick={props.onClose}>close</button>
      </div>
      {assigned.length > 0 && (
        <p className="muted">
          {assigned.map((a) => `${a.order_id} → ${names[a.courier_id]} (+${a.added_km.toFixed(2)} km)`).join(', ')}
        </p>
      )}
      <ul className="unassignable">
        {unplaced.map((u) => (
          <li key={u.order_id} onClick={() => props.onSelectOrder(u.order_id)}>
            <b>{u.order_id}</b>: {u.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Legend() {
  return (
    <div className="legend">
      <span><i className="order-pin pickup free"><span>P</span></i> pickup</span>
      <span><i className="order-pin delivery free"><span>D</span></i> delivery</span>
      <span><i className="order-pin delivery free broken"><span>!</span></i> broken</span>
      <span><i className="order-pin delivery taken outside" style={{ ['--c' as string]: '#64748b' }}><span>D</span></i> outside regions</span>
    </div>
  )
}
