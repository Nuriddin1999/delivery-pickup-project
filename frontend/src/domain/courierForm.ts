// The add-courier form: its fields and the same checks the server makes.
import type { Kind, NewCourierInput, Point } from "@/api/types";

export const COURIER_LIMITS = {
  nameLen: 50,
  maxParcels: 100,
  maxKg: 500,
  lat: [41.0, 41.6] as const,
  lng: [69.0, 69.6] as const,
};

export interface StartFields {
  lat: string;
  lng: string;
}

export interface CourierFormFields {
  name: string;
  active: boolean;
  pickup: boolean;
  delivery: boolean;
  maxParcels: string;
  maxKg: string;
}

export type FormErrors = Partial<Record<"name" | "kinds" | "max_parcels" | "max_kg" | "start", string>> & Record<string, string>;

export const emptyCourierForm: CourierFormFields = {
  name: "",
  active: true,
  pickup: true,
  delivery: true,
  maxParcels: "",
  maxKg: "",
};

export const emptyStart: StartFields = { lat: "", lng: "" };

/** null for an empty field, NaN for text that is not a number. */
function parseNumber(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s.trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Checks the form and, when it is valid, builds the request body. */
export function checkCourierForm(f: CourierFormFields, start: StartFields, takenNames: string[]): { errors: FormErrors; input?: NewCourierInput } {
  const L = COURIER_LIMITS;
  const errors: FormErrors = {};

  const name = f.name.trim().replace(/\s+/g, " ");
  const taken = takenNames.find((n) => n.toLowerCase() === name.toLowerCase());
  if (!name) errors.name = "Name is required";
  else if ([...name].length > L.nameLen) errors.name = `Name must be at most ${L.nameLen} characters`;
  else if (taken) errors.name = `There is already a courier called ${taken}`;

  const kinds: Kind[] = [];
  if (f.pickup) kinds.push("pickup");
  if (f.delivery) kinds.push("delivery");
  if (kinds.length === 0) errors.kinds = "Choose at least one kind of work: pickup or delivery";

  const parcels = parseNumber(f.maxParcels);
  if (parcels === null) errors.max_parcels = "Max parcels is required";
  else if (!Number.isInteger(parcels) || parcels < 1 || parcels > L.maxParcels) errors.max_parcels = `Max parcels must be a whole number from 1 to ${L.maxParcels}`;

  const weight = parseNumber(f.maxKg);
  if (weight === null) errors.max_kg = "Max kg is required";
  else if (Number.isNaN(weight) || weight <= 0 || weight > L.maxKg) errors.max_kg = `Max kg must be more than 0 and at most ${L.maxKg}`;

  const lat = parseNumber(start.lat);
  const lng = parseNumber(start.lng);
  if (lat === null || lng === null) errors.start = "Start point is required: click the map or type lat and lng";
  else if (Number.isNaN(lat) || Number.isNaN(lng) || lat < L.lat[0] || lat > L.lat[1] || lng < L.lng[0] || lng > L.lng[1])
    errors.start = `Start point must be in the Tashkent area (lat ${L.lat[0]} to ${L.lat[1]}, lng ${L.lng[0]} to ${L.lng[1]})`;

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    input: { name, active: f.active, kinds, regions: [], max_parcels: parcels!, max_kg: weight!, start: { lat: lat!, lng: lng! } },
  };
}

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
