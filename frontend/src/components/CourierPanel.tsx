import type { CourierView, Route, State } from '../types'
import { kg, km, kindLabel } from '../logic'

interface Props {
  state: State
  colors: Record<string, string>
  focusId: string | null
  showBetter: boolean
  onFocus: (id: string | null) => void
  onShowBetter: (v: boolean) => void
  onSelectOrder: (id: string) => void
}

export function CourierPanel(p: Props) {
  return (
    <div className="courier-panel">
      <label className="check">
        <input type="checkbox" checked={p.showBetter} onChange={(e) => p.onShowBetter(e.target.checked)} />
        Show stops in the shorter order (bonus: better routes)
      </label>
      {p.state.couriers.map((c) => (
        <CourierCard
          key={c.id}
          c={c}
          color={p.colors[c.id]}
          focused={p.focusId === c.id}
          showBetter={p.showBetter}
          onFocus={() => p.onFocus(p.focusId === c.id ? null : c.id)}
          onSelectOrder={p.onSelectOrder}
        />
      ))}

      <h3 className="section">Orders that cannot be assigned</h3>
      {p.state.unassignable.length === 0 && <p className="muted">None.</p>}
      <ul className="unassignable">
        {p.state.unassignable.map((u) => (
          <li key={u.order_id} onClick={() => p.onSelectOrder(u.order_id)}>
            <b>{u.order_id}</b> <span className={`tag ${u.broken ? 'bad' : 'warn'}`}>{u.broken ? 'broken data' : 'no courier fits'}</span>
            <div>{u.reason}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CourierCard(props: {
  c: CourierView
  color: string
  focused: boolean
  showBetter: boolean
  onFocus: () => void
  onSelectOrder: (id: string) => void
}) {
  const { c, color } = props
  const route = props.showBetter ? c.better_route : c.route
  const saved = c.route.total_km - c.better_route.total_km

  return (
    <div className={`card courier ${props.focused ? 'focused' : ''} ${c.active ? '' : 'inactive'}`} style={{ borderLeftColor: color }}>
      <div className="row space" onClick={props.onFocus} role="button" title="Show the route on the map">
        <h3>
          <span className="swatch" style={{ background: color }} /> {c.name}
          {!c.active && <span className="tag">inactive</span>}
        </h3>
        <span className="muted">{props.focused ? 'route shown ▲' : 'show route ▼'}</span>
      </div>
      <p className="muted">
        {c.kinds.map(kindLabel).join(' + ') || 'no kinds'} · {c.regions.length ? c.regions.join(', ') : 'no regions'}
      </p>
      <Meter label="Parcels" used={c.load.parcels} max={c.max_parcels} fmt={(v) => String(v)} color={color} />
      <Meter label="Weight" used={c.load.kg} max={c.max_kg} fmt={kg} color={color} />
      {c.outside_regions.length > 0 && (
        <p className="warn-box">
          Outside {c.name}'s regions now: {c.outside_regions.join(', ')}. They stay with {c.name}.
        </p>
      )}
      <Stops route={route} onSelectOrder={props.onSelectOrder} outside={c.outside_regions} />
      <p className="total">
        Total: <b>{km(route.total_km)}</b>
        {c.route.stops.length > 0 && (
          <span className="muted">
            {' '}· given order {km(c.route.total_km)}, shorter order {km(c.better_route.total_km)}
            {saved > 0.004 ? ` (saves ${km(saved)})` : ' (already best)'}
          </span>
        )}
      </p>
    </div>
  )
}

function Meter({ label, used, max, fmt, color }: { label: string; used: number; max: number; fmt: (v: number) => string; color: string }) {
  const pct = Math.min(100, (used / max) * 100)
  return (
    <div className="meter">
      <span>{label}</span>
      <div className="bar"><div style={{ width: `${pct}%`, background: color }} /></div>
      <span className="muted">
        {fmt(used)} / {fmt(max)}
      </span>
    </div>
  )
}

function Stops({ route, onSelectOrder, outside }: { route: Route; onSelectOrder: (id: string) => void; outside: string[] }) {
  if (route.stops.length === 0) return <p className="muted">No stops yet.</p>
  return (
    <table className="stops">
      <thead>
        <tr><th>#</th><th>Stop</th><th className="num">Leg</th></tr>
      </thead>
      <tbody>
        {route.stops.map((s, i) => (
          <tr key={i} className={s.order_id ? 'clickable' : ''} onClick={() => s.order_id && onSelectOrder(s.order_id)}>
            <td>{i}</td>
            <td>
              {s.kind === 'start' && 'Start point'}
              {s.kind === 'hub' && 'Hub'}
              {s.order_id && <>{kindLabel(s.kind)} {s.order_id}{outside.includes(s.order_id) && <span className="tag warn">outside</span>}</>}
            </td>
            <td className="num">{i === 0 ? '—' : km(s.leg_km)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
