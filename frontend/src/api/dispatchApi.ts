import { request } from "./client";
import type { AutoAssignResult, CandidateList, Courier, DispatchState, NewCourierInput, Order } from "./types";

const id = encodeURIComponent;

/** Every call the page makes to the Go server. */
export const dispatchApi = {
  state: () => request<DispatchState>("GET", "/api/state"),
  regionShapes: () => request<GeoJSON.FeatureCollection>("GET", "/api/regions.geojson"),

  addCourier: (input: NewCourierInput) => request<Courier>("POST", "/api/couriers", input),
  setRegions: (courierId: string, regions: string[]) => request<Courier>("PUT", `/api/couriers/${id(courierId)}/regions`, { regions }),

  /** Every courier the order could go to: allowed ones first, nearest on top. */
  candidates: (orderId: string) => request<CandidateList>("GET", `/api/orders/${id(orderId)}/candidates`),
  /** Assigns a free order, or moves an assigned one to another courier. */
  assign: (orderId: string, courierId: string) => request<Order>("PUT", `/api/orders/${id(orderId)}/courier`, { courier_id: courierId }),
  unassign: (orderId: string) => request<Order>("DELETE", `/api/orders/${id(orderId)}/courier`),
  autoAssign: () => request<AutoAssignResult>("POST", "/api/auto-assign"),
};
