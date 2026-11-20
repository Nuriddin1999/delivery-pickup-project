import { useState } from "react";
import { ApiError, errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import type { Courier } from "@/api/types";
import { checkCourierForm, emptyCourierForm, emptyStart, type CourierFormFields, type FormErrors, type StartFields } from "@/domain/courierForm";

/**
 * State of the add-courier form. Errors appear after the first submit and
 * then update as the dispatcher types. The server checks everything again;
 * its field errors are shown the same way.
 */
export function useCourierForm(start: StartFields, onStartChange: (s: StartFields) => void, takenNames: string[], onCreated: (c: Courier) => void) {
  const [fields, setFields] = useState<CourierFormFields>(emptyCourierForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const recheck = (f: CourierFormFields, s: StartFields) => {
    if (submitted) setErrors(checkCourierForm(f, s, takenNames).errors);
  };

  const setField = <K extends keyof CourierFormFields>(key: K, value: CourierFormFields[K]) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    recheck(next, start);
  };

  const setStart = (patch: Partial<StartFields>) => {
    const next = { ...start, ...patch };
    onStartChange(next);
    recheck(fields, next);
  };

  const submit = async () => {
    setSubmitted(true);
    setServerError(null);
    const { errors, input } = checkCourierForm(fields, start, takenNames);
    setErrors(errors);
    if (!input) return;

    setBusy(true);
    try {
      const courier = await dispatchApi.addCourier(input);
      setFields(emptyCourierForm);
      onStartChange(emptyStart);
      setSubmitted(false);
      onCreated(courier);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return { fields, errors, serverError, busy, setField, setStart, submit };
}
