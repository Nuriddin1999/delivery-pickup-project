import { useState } from "react";
import { api, ApiError } from "../api";
import { checkCourierForm, emptyForm, LIMITS, type CourierForm } from "../logic";
import type { Courier } from "../types";
import { btnPrimary, card, cardTitle, checkLabel, cn, errorBox, hint, input } from "../ui";
import { FormField } from "./FormField";

interface Props {
  takenNames: string[];
  /** lat/lng live in the parent so a map click can fill them */
  start: { lat: string; lng: string };
  onStartChange: (s: { lat: string; lng: string }) => void;
  onCreated: (c: Courier) => void;
}

export function AddCourierForm({ takenNames, start, onStartChange, onCreated }: Props) {
  const [form, setForm] = useState<Omit<CourierForm, "lat" | "lng">>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const full: CourierForm = { ...form, ...start };
  const set = (patch: Partial<CourierForm>) => {
    const { lat, lng, ...rest } = patch;
    if (lat !== undefined || lng !== undefined) onStartChange({ lat: lat ?? start.lat, lng: lng ?? start.lng });
    const next = { ...form, ...rest };
    setForm(next);
    if (touched) setErrors(checkCourierForm({ ...next, lat: lat ?? start.lat, lng: lng ?? start.lng }, takenNames).errors);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    const { errors, input } = checkCourierForm(full, takenNames);
    setErrors(errors);
    if (!input) return;
    setBusy(true);
    try {
      const c = await api.addCourier(input);
      setForm(emptyForm);
      onStartChange({ lat: "", lng: "" });
      setTouched(false);
      onCreated(c);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setServerError(err.message);
      } else setServerError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={cn(card, "flex flex-col gap-2.5")} onSubmit={submit} noValidate>
      <h3 className={cardTitle}>Add a courier</h3>
      <FormField label="Name" error={errors.name}>
        <input className={input} value={form.name} maxLength={LIMITS.nameLen + 10} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Nodira" />
      </FormField>

      <FormField label="Kinds of work" error={errors.kinds}>
        <div className="flex flex-wrap items-center gap-3">
          <label className={checkLabel}>
            <input type="checkbox" checked={form.pickup} onChange={(e) => set({ pickup: e.target.checked })} /> Pickups
          </label>
          <label className={checkLabel}>
            <input type="checkbox" checked={form.delivery} onChange={(e) => set({ delivery: e.target.checked })} /> Deliveries
          </label>
          <label className={checkLabel}>
            <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active today
          </label>
        </div>
      </FormField>

      <div className="flex flex-wrap gap-2">
        <FormField label="Max parcels a day" error={errors.max_parcels}>
          <input className={input} inputMode="numeric" value={form.maxParcels} onChange={(e) => set({ maxParcels: e.target.value })} placeholder={`1 – ${LIMITS.maxParcels}`} />
        </FormField>
        <FormField label="Max kg a day" error={errors.max_kg}>
          <input className={input} inputMode="decimal" value={form.maxKg} onChange={(e) => set({ maxKg: e.target.value })} placeholder={`up to ${LIMITS.maxKg}`} />
        </FormField>
      </div>

      <FormField label="Start point: click the map or type it" error={errors.start}>
        <div className="flex gap-2">
          <input className={cn(input, "flex-1")} inputMode="decimal" value={start.lat} onChange={(e) => set({ lat: e.target.value })} placeholder="lat, e.g. 41.30" />
          <input className={cn(input, "flex-1")} inputMode="decimal" value={start.lng} onChange={(e) => set({ lng: e.target.value })} placeholder="lng, e.g. 69.25" />
        </div>
      </FormField>

      <p className={hint}>Regions are chosen after saving, on the map with “Regions of”.</p>
      {serverError && <p className={errorBox}>{serverError}</p>}
      <button className={btnPrimary} type="submit" disabled={busy}>
        {busy ? "Saving…" : "Add courier"}
      </button>
    </form>
  );
}
