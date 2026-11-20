import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError, errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import type { Courier, NewCourierInput } from "@/api/types";
import { courierFormSchema, emptyCourierForm, emptyStart, serverFieldToFormField, type CourierFormValues, type StartFields } from "@/domain/courierForm";
import { useStateMutation } from "@/hooks/useStateMutation";

/**
 * The add-courier form on React Hook Form + zod. Errors appear after the
 * first submit and then update while typing. The start point is shared with
 * the map: a map click fills lat/lng, typing moves the preview pin. The
 * server checks everything again; its field errors land on the same fields.
 */
export function useCourierForm(start: StartFields, onStartChange: (s: StartFields) => void, takenNames: string[], onCreated: (c: Courier) => void) {
  const schema = useMemo(() => courierFormSchema(takenNames), [takenNames]);
  const form = useForm<CourierFormValues, unknown, NewCourierInput>({
    resolver: zodResolver(schema),
    defaultValues: { ...emptyCourierForm, ...start },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const mutation = useStateMutation(dispatchApi.addCourier);
  const { setValue, getValues, watch, formState } = form;

  // Map click → form fields.
  useEffect(() => {
    if (getValues("lat") !== start.lat) setValue("lat", start.lat, { shouldValidate: formState.isSubmitted });
    if (getValues("lng") !== start.lng) setValue("lng", start.lng, { shouldValidate: formState.isSubmitted });
  }, [start.lat, start.lng, getValues, setValue, formState.isSubmitted]);

  // Typed lat/lng → preview pin on the map.
  const [lat, lng, name, maxParcels, maxKg, pickup, delivery] = watch(["lat", "lng", "name", "maxParcels", "maxKg", "pickup", "delivery"]);
  // Submit stays off until every required field has something in it.
  const requiredFilled = [name, maxParcels, maxKg, lat, lng].every((v) => v.trim() !== "") && (pickup || delivery);
  useEffect(() => {
    if (lat !== start.lat || lng !== start.lng) onStartChange({ lat, lng });
  }, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps -- only react to typing

  const submit = form.handleSubmit((input) =>
    mutation.mutate(input, {
      onSuccess: (courier) => {
        form.reset(emptyCourierForm);
        onStartChange(emptyStart);
        onCreated(courier);
      },
      onError: (err) => {
        if (!(err instanceof ApiError)) return;
        for (const [field, message] of Object.entries(err.fields)) {
          const target = serverFieldToFormField[field];
          if (target) form.setError(target, { message });
        }
      },
    }),
  );

  return {
    register: form.register,
    errors: formState.errors,
    serverError: mutation.error ? errorMessage(mutation.error) : null,
    busy: mutation.isPending,
    canSubmit: requiredFilled && !mutation.isPending,
    submit,
  };
}
