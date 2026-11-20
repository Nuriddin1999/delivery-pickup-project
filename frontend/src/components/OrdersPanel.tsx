import { useEffect, useState } from 'react'
import { api, ApiError } from '../api'
import { isBroken, kg, kindLabel, quickCheck } from '../logic'
import type { CourierView, Order, State } from '../types'

type Filter = 'all' | 'free' | 'taken' | 'problem'

interface Props {
  state: State
  colors: Record<string, string>
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChanged: (message: string) => void
}

export function OrdersPanel({ state, colors, selectedId, onSelect, onChanged }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const byId = Object.fromEntries(state.couriers.map((c) => [c.id, c]))
  const unassignable = new Set(state.unassignable.map((u) => u.order_id))
  const selected = state.orders.find((o) => o.id === selectedId) ?? null

  const shown = state.orders.filter((o) => {
    if (filter === 'free') return !o.courier_id && !unassignable.has(o.id)
    if (filter === 'taken') return !!o.courier_id
    if (filter === 'problem') return unassignable.has(o.id) || o.outside_regions
    return true
  })

  return (
    <div className="orders-panel">
      {selected ? (
        <AssignBox key={selected.id} order={selected} state={state} byId={byId} onClose={() => onSelect(null)} onChanged={onChanged} />
      ) : (
        <p className="hint card">Pick an order on the map or in the list below to give it to a courier.</p>
      )}

      <div className="filters">
        {(['all', 'free', 'taken', 'problem'] as Filter[]).map((f) => (
          <button key={f} type="button" className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
            {{ all: 'All', free: 'Free', taken: 'Assigned', problem: 'Problems' }[f]}
          </button>
        ))}
      </div>

      <ul className="order-list">
        {shown.map((o) => {
          const c = o.courier_id ? byId[o.courier_id] : undefined
          return (
            <li key={o.id} className={o.id === selectedId ? 'selected' : ''} onClick={() => onSelect(o.id)}>
              <span className={`dot ${o.type}`} style={c ? { background: colors[c.id], borderColor: colors[c.id] } : undefined} />
              <b>{o.id}</b>
              <span>{kindLabel(o.type)}</span>
              <span className="muted">{o.region || '—'}</span>
              <span className="muted">{kg(o.weight_kg)}</span>
              <span className="right">
                {isBroken(o) ? <span className="tag bad">broken</span>
                  : c ? <>{c.name}{o.outside_regions && <span className="tag warn" title="Outside the courier's regions">outside</span>}</>
                  : unassignable.has(o.id) ? <span className="tag bad">no courier fits</span>
                  : <span className="muted">free</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AssignBox(props: {
  order: Order
  state: State
  byId: Record<string, CourierView>
  onClose: () => void
  onChanged: (message: string) => void
}) {
  const { order, state, byId } = props
  const current = order.courier_id ? byId[order.courier_id] : undefined
  const [courierId, setCourierId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const reason = state.unassignable.find((u) => u.order_id === order.id)?.reason

  useEffect(() => setError(null), [courierId])

  const others = state.couriers.filter((c) => c.id !== order.courier_id)
  const options = others
    .map((c) => ({ c, why: quickCheck(c, order) }))
    .sort((a, b) => Number(!!a.why) - Number(!!b.why))

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setCourierId('')
      props.onChanged(message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const target = courierId ? byId[courierId] : undefined
  return (
    <div className="card assign-box">
      <div className="row space">
        <h3>
          Order {order.id} · {kindLabel(order.type)}
        </h3>
        <button type="button" className="link" onClick={props.onClose}>close</button>
      </div>
      <p className="muted">
        {order.region || 'no region'} · {kg(order.weight_kg)}
        {order.location ? ` · ${order.location.lat.toFixed(4)}, ${order.location.lng.toFixed(4)}` : ' · no location'}
      </p>
      {order.notes?.map((n) => <p key={n} className="note">{n}</p>)}
      {isBroken(order) && (
        <div className="error-box">
          This order is broken and can never be assigned:
          <ul>{order.problems!.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      {!isBroken(order) && reason && !current && <p className="warn-box">No courier can take it now: {reason}</p>}
      {current && (
        <p>
          With <b>{current.name}</b>
          {order.outside_regions && <span className="tag warn">outside {current.name}'s regions</span>}
        </p>
      )}

      <div className="row">
        <select value={courierId} onChange={(e) => setCourierId(e.target.value)}>
          <option value="">{current ? 'Move to…' : 'Give to…'}</option>
          {options.map(({ c, why }) => (
            <option key={c.id} value={c.id}>
              {c.name} {why ? `— ${why}` : '✓'}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="primary"
          disabled={!courierId || busy}
          onClick={() =>
            run(() => api.assign(order.id, courierId), current
              ? `${order.id} moved from ${current.name} to ${target?.name}`
              : `${order.id} given to ${target?.name}`)
          }
        >
          {current ? 'Move' : 'Assign'}
        </button>
        {current && (
          <button type="button" disabled={busy} onClick={() => run(() => api.unassign(order.id), `${order.id} taken off ${current.name}`)}>
            Take off
          </button>
        )}
      </div>
      {error && <p className="error-box">{error}</p>}
    </div>
  )
}
