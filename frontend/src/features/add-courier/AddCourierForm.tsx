import type { Courier } from "@/api/types";
import { COURIER_LIMITS, type StartFields } from "@/domain/courierForm";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { CardHeader } from "@/shared/ui/CardHeader";
import { FormField } from "@/shared/ui/FormField";
import { cn, hintText, inputClass } from "@/shared/ui/styles";
import { useCourierForm } from "./useCourierForm";

interface Props {
  takenNames: string[];
  /** lat/lng live in the parent so a map click can fill them */
  start: StartFields;
  onStartChange: (s: StartFields) => void;
  onCreated: (c: Courier) => void;
  onClose?: () => void;
}

const check = "inline-flex cursor-pointer items-center gap-1.5";

export function AddCourierForm({ takenNames, start, onStartChange, onCreated, onClose }: Props) {
  const { register, errors, serverError, busy, canSubmit, submit } = useCourierForm(start, onStartChange, takenNames, onCreated);

  return (
    <form onSubmit={submit} noValidate>
      <Card className="gap-2.5">
        <CardHeader title="Add a courier" onClose={onClose} />

        <FormField label="Name" error={errors.name?.message}>
          <input className={inputClass} maxLength={COURIER_LIMITS.nameLen + 10} placeholder="e.g. Nodira" {...register("name")} />
        </FormField>

        <FormField label="Kinds of work" error={errors.pickup?.message}>
          <div className="flex flex-wrap items-center gap-3">
            <label className={check}>
              <input type="checkbox" {...register("pickup")} /> Pickups
            </label>
            <label className={check}>
              <input type="checkbox" {...register("delivery")} /> Deliveries
            </label>
            <label className={check}>
              <input type="checkbox" {...register("active")} /> Active today
            </label>
          </div>
        </FormField>

        <div className="flex flex-wrap gap-2">
          <FormField label="Max parcels a day" error={errors.maxParcels?.message}>
            <input className={inputClass} inputMode="numeric" placeholder={`1 – ${COURIER_LIMITS.maxParcels}`} {...register("maxParcels")} />
          </FormField>
          <FormField label="Max kg a day" error={errors.maxKg?.message}>
            <input className={inputClass} inputMode="decimal" placeholder={`up to ${COURIER_LIMITS.maxKg}`} {...register("maxKg")} />
          </FormField>
        </div>

        <FormField label="Start point: click the map or type it" error={errors.lat?.message}>
          <div className="flex gap-2">
            <input className={cn(inputClass, "flex-1")} inputMode="decimal" placeholder="lat, e.g. 41.30" {...register("lat")} />
            <input className={cn(inputClass, "flex-1")} inputMode="decimal" placeholder="lng, e.g. 69.25" {...register("lng")} />
          </div>
        </FormField>

        <p className={hintText}>Regions are chosen after saving, on the map with “Regions of”.</p>
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <Button variant="primary" type="submit" disabled={!canSubmit} title={canSubmit ? undefined : "Fill in the name, kinds of work, both limits and the start point"}>
          {busy ? "Saving…" : "Add courier"}
        </Button>
      </Card>
    </form>
  );
}
