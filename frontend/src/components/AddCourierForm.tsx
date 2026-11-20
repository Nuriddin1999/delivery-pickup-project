import { useState } from 'react'
import { api, ApiError } from '../api'
import { checkCourierForm, emptyForm, LIMITS, type CourierForm } from '../logic'
import type { Courier } from '../types'

interface Props {
  takenNames: string[]
  /** lat/lng live in the parent so a map click can fill them */
  start: { lat: string; lng: string }
  onStartChange: (s: { lat: string; lng: string }) => void
  onCreated: (c: Courier) => void
}

export function AddCourierForm({ takenNames, start, onStartChange, onCreated }: Props) {
  const [form, setForm] = useState<Omit<CourierForm, 'lat' | 'lng'>>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  const full: CourierForm = { ...form, ...start }
  const set = (patch: Partial<CourierForm>) => {
    const { lat, lng, ...rest } = patch
    if (lat !== undefined || lng !== undefined) onStartChange({ lat: lat ?? start.lat, lng: lng ?? start.lng })
    const next = { ...form, ...rest }
    setForm(next)
    if (touched) setErrors(checkCourierForm({ ...next, lat: lat ?? start.lat, lng: lng ?? start.lng }, takenNames).errors)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    setServerError(null)
    const { errors, input } = checkCourierForm(full, takenNames)
    setErrors(errors)
    if (!input) return
    setBusy(true)
    try {
      const c = await api.addCourier(input)
      setForm(emptyForm)
      onStartChange({ lat: '', lng: '' })
      setTouched(false)
      onCreated(c)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields)
        setServerError(err.message)
      } else setServerError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h3>Add a courier</h3>
      <Field label="Name" error={errors.name}>
        <input value={form.name} maxLength={LIMITS.nameLen + 10} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Nodira" />
      </Field>

      <Field label="Kinds of work" error={errors.kinds}>
        <div className="row">
          <label className="check">
            <input type="checkbox" checked={form.pickup} onChange={(e) => set({ pickup: e.target.checked })} /> Pickups
          </label>
          <label className="check">
            <input type="checkbox" checked={form.delivery} onChange={(e) => set({ delivery: e.target.checked })} /> Deliveries
          </label>
          <label className="check">
            <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active today
          </label>
        </div>
      </Field>

      <div className="row">
        <Field label="Max parcels a day" error={errors.max_parcels}>
          <input inputMode="numeric" value={form.maxParcels} onChange={(e) => set({ maxParcels: e.target.value })} placeholder={`1 – ${LIMITS.maxParcels}`} />
        </Field>
        <Field label="Max kg a day" error={errors.max_kg}>
          <input inputMode="decimal" value={form.maxKg} onChange={(e) => set({ maxKg: e.target.value })} placeholder={`up to ${LIMITS.maxKg}`} />
        </Field>
      </div>

      <Field label="Start point: click the map or type it" error={errors.start}>
        <div className="row">
          <input inputMode="decimal" value={start.lat} onChange={(e) => set({ lat: e.target.value })} placeholder="lat, e.g. 41.30" />
          <input inputMode="decimal" value={start.lng} onChange={(e) => set({ lng: e.target.value })} placeholder="lng, e.g. 69.25" />
        </div>
      </Field>

      <p className="hint">Regions are chosen after saving, on the map with “Regions of”.</p>
      {serverError && <p className="error-box">{serverError}</p>}
      <button className="primary" type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Add courier'}
      </button>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="error-text">{error}</span>}
    </div>
  )
}
