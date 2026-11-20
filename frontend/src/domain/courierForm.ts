// The add-courier form: its fields and the same checks the server makes,
// as a zod schema that turns the typed text into the request body.
import { z } from "zod";
import type { Kind, NewCourierInput, Point } from "@/api/types";

export const COURIER_LIMITS = {
  nameLen: 50,
  maxParcels: 100,
  maxKg: 500,
  lat: [41.0, 41.6] as const,
  lng: [69.0, 69.6] as const,
};

/** What the dispatcher types; numbers stay text until the schema reads them. */
export interface CourierFormValues {
  name: string;
  active: boolean;
  pickup: boolean;
  delivery: boolean;
  maxParcels: string;
  maxKg: string;
  lat: string;
  lng: string;
}

export const emptyCourierForm: CourierFormValues = { name: "", active: true, pickup: true, delivery: true, maxParcels: "", maxKg: "", lat: "", lng: "" };

/** Server field names → form fields that show their errors. */
export const serverFieldToFormField: Record<string, keyof CourierFormValues> = {
  name: "name",
  kinds: "pickup",
  max_parcels: "maxParcels",
  max_kg: "maxKg",
  start: "lat",
};

/** null for an empty field, NaN for text that is not a number. */
function parseNumber(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s.trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const cleanName = (s: string) => s.trim().replace(/\s+/g, " ");

/** The form schema; takenNames are refused so refusal messages stay unambiguous. */
export function courierFormSchema(takenNames: string[]) {
  const L = COURIER_LIMITS;
  return z
    .object({
      name: z.string(),
      active: z.boolean(),
      pickup: z.boolean(),
      delivery: z.boolean(),
      maxParcels: z.string(),
      maxKg: z.string(),
      lat: z.string(),
      lng: z.string(),
    })
    .superRefine((v, ctx) => {
      const issue = (path: keyof CourierFormValues, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

      const name = cleanName(v.name);
      const taken = takenNames.find((n) => n.toLowerCase() === name.toLowerCase());
      if (!name) issue("name", "Name is required");
      else if ([...name].length > L.nameLen) issue("name", `Name must be at most ${L.nameLen} characters`);
      else if (taken) issue("name", `There is already a courier called ${taken}`);

      if (!v.pickup && !v.delivery) issue("pickup", "Choose at least one kind of work: pickup or delivery");

      const parcels = parseNumber(v.maxParcels);
      if (parcels === null) issue("maxParcels", "Max parcels is required");
      else if (!Number.isInteger(parcels) || parcels < 1 || parcels > L.maxParcels) issue("maxParcels", `Max parcels must be a whole number from 1 to ${L.maxParcels}`);

      const kg = parseNumber(v.maxKg);
      if (kg === null) issue("maxKg", "Max kg is required");
      else if (Number.isNaN(kg) || kg <= 0 || kg > L.maxKg) issue("maxKg", `Max kg must be more than 0 and at most ${L.maxKg}`);

      const lat = parseNumber(v.lat);
      const lng = parseNumber(v.lng);
      if (lat === null || lng === null) issue("lat", "Start point is required: click the map or type lat and lng");
      else if (Number.isNaN(lat) || Number.isNaN(lng) || lat < L.lat[0] || lat > L.lat[1] || lng < L.lng[0] || lng > L.lng[1])
        issue("lat", `Start point must be in the Tashkent area (lat ${L.lat[0]} to ${L.lat[1]}, lng ${L.lng[0]} to ${L.lng[1]})`);
    })
    .transform((v): NewCourierInput => {
      const kinds: Kind[] = [];
      if (v.pickup) kinds.push("pickup");
      if (v.delivery) kinds.push("delivery");
      return {
        name: cleanName(v.name),
        active: v.active,
        kinds,
        regions: [],
        max_parcels: parseNumber(v.maxParcels)!,
        max_kg: parseNumber(v.maxKg)!,
        start: { lat: parseNumber(v.lat)!, lng: parseNumber(v.lng)! },
      };
    });
}

// ---- start point, shared with the map ----

export interface StartFields {
  lat: string;
  lng: string;
}

export const emptyStart: StartFields = { lat: "", lng: "" };

/** The typed start point, if it can be read, for a preview on the map. */
export function readStart(s: StartFields): Point | null {
  const lat = parseNumber(s.lat);
  const lng = parseNumber(s.lng);
  if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** A map click as form fields. */
export function startFromPoint(p: Point): StartFields {
  return { lat: p.lat.toFixed(5), lng: p.lng.toFixed(5) };
}
