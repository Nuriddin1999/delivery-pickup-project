import type { AutoResult, Courier, NewCourierInput, Order, State } from './types'

/** An error from the server, with its plain-language message. */
export class ApiError extends Error {
  status: number
  code?: string
  fields: Record<string, string>

  constructor(message: string, status: number, fields: Record<string, string> = {}, code?: string) {
    super(message)
    this.status = status
    this.fields = fields
    this.code = code
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }
  const text = await res.text()
  let data: { error?: string; code?: string; fields?: Record<string, string> } | null = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // not JSON; handled below
  }
  if (!res.ok) {
    throw new ApiError(data?.error ?? `The server answered ${res.status}`, res.status, data?.fields ?? {}, data?.code)
  }
  return data as unknown as T
}

export const api = {
  state: () => request<State>('GET', '/api/state'),
  regionShapes: () => request<GeoJSON.FeatureCollection>('GET', '/api/regions.geojson'),
  addCourier: (input: NewCourierInput) => request<Courier>('POST', '/api/couriers', input),
  setRegions: (courierId: string, regions: string[]) =>
    request<Courier>('PUT', `/api/couriers/${encodeURIComponent(courierId)}/regions`, { regions }),
  assign: (orderId: string, courierId: string) =>
    request<Order>('PUT', `/api/orders/${encodeURIComponent(orderId)}/courier`, { courier_id: courierId }),
  unassign: (orderId: string) => request<Order>('DELETE', `/api/orders/${encodeURIComponent(orderId)}/courier`),
  autoAssign: () => request<AutoResult>('POST', '/api/auto-assign'),
}
