import type { CourierView } from '../types'
import { sameSet } from '../logic'

interface Props {
  couriers: CourierView[]
  colors: Record<string, string>
  courierId: string
  draft: string[] | null
  disabled: boolean
  saving: boolean
  message: { ok: boolean; text: string } | null
  onPick: (id: string) => void
  onToggle: (region: string) => void
  onSave: () => void
  onReset: () => void
  allRegions: string[]
}

/** Toolbar above the map: pick a courier, click regions, save. */
export function RegionEditor(p: Props) {
  const courier = p.couriers.find((c) => c.id === p.courierId)
  const dirty = !!courier && !!p.draft && !sameSet(courier.regions, p.draft)

  return (
    <div className="region-editor">
      <label>
        Regions of{' '}
        <select value={p.courierId} disabled={p.disabled} onChange={(e) => p.onPick(e.target.value)}>
          <option value="">— choose a courier —</option>
          {p.couriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.active ? '' : ' (inactive)'}
            </option>
          ))}
        </select>
      </label>

      {p.disabled && <span className="hint">Close the “Add courier” form to edit regions.</span>}

      {courier && p.draft && !p.disabled && (
        <>
          <span className="swatch" style={{ background: p.colors[courier.id] }} />
          <div className="chips">
            {p.allRegions.map((r) => (
              <button
                key={r}
                type="button"
                className={`chip ${p.draft!.includes(r) ? 'on' : ''}`}
                style={p.draft!.includes(r) ? { background: p.colors[courier.id] } : undefined}
                onClick={() => p.onToggle(r)}
                title="Or click the region on the map"
              >
                {r}
              </button>
            ))}
          </div>
          <button type="button" className="primary" disabled={!dirty || p.saving} onClick={p.onSave}>
            {p.saving ? 'Saving…' : 'Save regions'}
          </button>
          <button type="button" disabled={!dirty || p.saving} onClick={p.onReset}>
            Undo changes
          </button>
          {dirty && <span className="hint">Unsaved: click regions on the map to add or remove them.</span>}
          {!dirty && !p.message && <span className="hint">Click a region on the map to add or remove it.</span>}
        </>
      )}
      {p.message && <span className={p.message.ok ? 'ok-text' : 'error-text'}>{p.message.text}</span>}
    </div>
  )
}

