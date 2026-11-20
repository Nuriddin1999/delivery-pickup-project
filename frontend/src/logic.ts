// Small helpers shared by components. Rules here are only for comfort:
// the server checks everything again.
import type { CourierView, Kind, NewCourierInput, Order } from './types'

const PALETTE = [
  '#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed',
  '#0891b2', '#ca8a04', '#be123c', '#4d7c0f', '#9333ea',
]

/** A stable colour per courier, by their position in the list. */
export function courierColors(couriers: { id: string }[]): Record<string, string> {
  const out: Record<string, string> = {}
  couriers.forEach((c, i) => (out[c.id] = PALETTE[i % PALETTE.length]))
  return out
}

export const km = (v: number) => `${v.toFixed(2)} km`
export const kg = (v: number) => `${Number(v.toFixed(2))} kg`
export const kindLabel = (k: string) => (k === 'pickup' ? 'Pickup' : k === 'delivery' ? 'Delivery' : k)
export const plural = (k: Kind) => (k === 'pickup' ? 'pickups' : 'deliveries')

export function isBroken(o: Order) {
  return (o.problems?.length ?? 0) > 0
}

/**
 * Why courier c may not take order o, or null if they may. Mirrors the
 * server rules so the courier list can show hints before the dispatcher asks.
 */
export function quickCheck(c: CourierView, o: Order): string | null {
  if (isBroken(o)) return 'order is broken'
  if (!c.active) return 'not active today'
  if (!c.kinds.includes(o.type as Kind)) return `does not do ${plural(o.type as Kind)}`
  if (!c.regions.includes(o.region)) return `does not work in ${o.region}`
  if (c.load.parcels + 1 > c.max_parcels) return 'no parcel room left'
  if (c.load.kg + o.weight_kg > c.max_kg + 1e-9) return 'too heavy for what is left'
  return null
}

// ---- add courier form ----

export const LIMITS = {
  nameLen: 50,
  maxParcels: 100,
  maxKg: 500,
  lat: [41.0, 41.6] as const,
  lng: [69.0, 69.6] as const,
}

export interface CourierForm {
  name: string
  active: boolean
  pickup: boolean
  delivery: boolean
  maxParcels: string
  maxKg: string
  lat: string
  lng: string
}

export const emptyForm: CourierForm = {
  name: '', active: true, pickup: true, delivery: true, maxParcels: '', maxKg: '', lat: '', lng: '',
}

function num(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** Checks the form the same way the server does and builds the request. */
export function checkCourierForm(
  f: CourierForm,
  takenNames: string[],
): { errors: Record<string, string>; input?: NewCourierInput } {
  const errors: Record<string, string> = {}
  const name = f.name.trim().replace(/\s+/g, ' ')
  if (!name) errors.name = 'Name is required'
  else if ([...name].length > LIMITS.nameLen) errors.name = `Name must be at most ${LIMITS.nameLen} characters`
  else if (takenNames.some((n) => n.toLowerCase() === name.toLowerCase()))
    errors.name = `There is already a courier called ${name}`

  const kinds: Kind[] = []
  if (f.pickup) kinds.push('pickup')
  if (f.delivery) kinds.push('delivery')
  if (kinds.length === 0) errors.kinds = 'Choose at least one kind of work: pickup or delivery'

  const parcels = num(f.maxParcels)
  if (parcels === null) errors.max_parcels = 'Max parcels is required'
  else if (!Number.isInteger(parcels) || parcels < 1 || parcels > LIMITS.maxParcels)
    errors.max_parcels = `Max parcels must be a whole number from 1 to ${LIMITS.maxParcels}`

  const weight = num(f.maxKg)
  if (weight === null) errors.max_kg = 'Max kg is required'
  else if (Number.isNaN(weight) || weight <= 0 || weight > LIMITS.maxKg)
    errors.max_kg = `Max kg must be more than 0 and at most ${LIMITS.maxKg}`

  const lat = num(f.lat)
  const lng = num(f.lng)
  if (lat === null || lng === null) errors.start = 'Start point is required: click the map or type lat and lng'
  else if (
    Number.isNaN(lat) || Number.isNaN(lng) ||
    lat < LIMITS.lat[0] || lat > LIMITS.lat[1] || lng < LIMITS.lng[0] || lng > LIMITS.lng[1]
  )
    errors.start = `Start point must be in the Tashkent area (lat ${LIMITS.lat[0]} to ${LIMITS.lat[1]}, lng ${LIMITS.lng[0]} to ${LIMITS.lng[1]})`

  if (Object.keys(errors).length > 0) return { errors }
  return {
    errors,
    input: {
      name, active: f.active, kinds, regions: [],
      max_parcels: parcels!, max_kg: weight!, start: { lat: lat!, lng: lng! },
    },
  }
}

/** The form's start point, if it can be read, for a preview on the map. */
export function formPoint(f: { lat: string; lng: string }) {
  const lat = num(f.lat)
  const lng = num(f.lng)
  if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

export function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x))
}
