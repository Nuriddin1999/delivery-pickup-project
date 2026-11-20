import type { FormEvent } from "react";
import type { Courier } from "@/api/types";
import { COURIER_LIMITS, type StartFields } from "@/domain/courierForm";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { CardHeader } from "@/shared/ui/CardHeader";
import { Checkbox } from "@/shared/ui/Checkbox";
import { FormField } from "@/shared/ui/FormField";
import { cn, hintText, inputClass } from "@/shared/ui/styles";
import { useCourierForm } from "./useCourierForm";

interface Props {
  takenNames: string[];
  /** lat/lng live in the parent so a map click can fill them */
  start: StartFields;
  onStartChange: (s: StartFields) => void;
  onCreated: (c: Courier) => void;
}

export function AddCourierForm({ takenNames, start, onStartChange, onCreated }: Props) {
  const form = useCourierForm(start, onStartChange, takenNames, onCreated);
  const { fields, errors } = form;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    form.submit();
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="gap-2.5">
        <CardHeader title="Add a courier" />

        <FormField label="Name" error={errors.name}>
          <input className={inputClass} value={fields.name} maxLength={COURIER_LIMITS.nameLen + 10} onChange={(e) => form.setField("name", e.target.value)} placeholder="e.g. Nodira" />
        </FormField>

        <FormField label="Kinds of work" error={errors.kinds}>
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox checked={fields.pickup} onChange={(v) => form.setField("pickup", v)}>
              Pickups
            </Checkbox>
            <Checkbox checked={fields.delivery} onChange={(v) => form.setField("delivery", v)}>
              Deliveries
            </Checkbox>
            <Checkbox checked={fields.active} onChange={(v) => form.setField("active", v)}>
              Active today
            </Checkbox>
          </div>
        </FormField>

        <div className="flex flex-wrap gap-2">
          <FormField label="Max parcels a day" error={errors.max_parcels}>
            <input className={inputClass} inputMode="numeric" value={fields.maxParcels} onChange={(e) => form.setField("maxParcels", e.target.value)} placeholder={`1 – ${COURIER_LIMITS.maxParcels}`} />
          </FormField>
          <FormField label="Max kg a day" error={errors.max_kg}>
            <input className={inputClass} inputMode="decimal" value={fields.maxKg} onChange={(e) => form.setField("maxKg", e.target.value)} placeholder={`up to ${COURIER_LIMITS.maxKg}`} />
          </FormField>
        </div>

        <FormField label="Start point: click the map or type it" error={errors.start}>
          <div className="flex gap-2">
            <input className={cn(inputClass, "flex-1")} inputMode="decimal" value={start.lat} onChange={(e) => form.setStart({ lat: e.target.value })} placeholder="lat, e.g. 41.30" />
            <input className={cn(inputClass, "flex-1")} inputMode="decimal" value={start.lng} onChange={(e) => form.setStart({ lng: e.target.value })} placeholder="lng, e.g. 69.25" />
          </div>
        </FormField>

        <p className={hintText}>Regions are chosen after saving, on the map with “Regions of”.</p>
        {form.serverError && <Alert tone="error">{form.serverError}</Alert>}
        <Button variant="primary" type="submit" disabled={form.busy}>
          {form.busy ? "Saving…" : "Add courier"}
        </Button>
      </Card>
    </form>
  );
}
