package httpapi

import "delivery/internal/domain"

// newCourierRequest is the body of POST /api/couriers. Pointers tell a
// missing field apart from a zero value.
type newCourierRequest struct {
	Name       string   `json:"name"`
	Active     *bool    `json:"active"`
	Kinds      []string `json:"kinds"`
	Regions    []string `json:"regions"`
	MaxParcels *int     `json:"max_parcels"`
	MaxKg      *float64 `json:"max_kg"`
	Start      *struct {
		Lat *float64 `json:"lat"`
		Lng *float64 `json:"lng"`
	} `json:"start"`
}

func (r newCourierRequest) toDraft() domain.CourierDraft {
	d := domain.CourierDraft{
		Name: r.Name, Active: r.Active, Kinds: r.Kinds, Regions: r.Regions,
		MaxParcels: r.MaxParcels, MaxKg: r.MaxKg,
	}
	if r.Start != nil {
		d.Lat, d.Lng = r.Start.Lat, r.Start.Lng
	}
	return d
}

// setRegionsRequest is the body of PUT /api/couriers/{id}/regions.
type setRegionsRequest struct {
	Regions *[]string `json:"regions"`
}

// setKindsRequest is the body of PUT /api/couriers/{id}/kinds.
type setKindsRequest struct {
	Kinds *[]string `json:"kinds"`
}

// applyPlanRequest is the body of POST /api/auto-assign that gives out a
// plan the dispatcher confirmed.
type applyPlanRequest struct {
	Assignments *[]struct {
		OrderID   string `json:"order_id"`
		CourierID string `json:"courier_id"`
	} `json:"assignments"`
}

// assignRequest is the body of PUT /api/orders/{id}/courier.
type assignRequest struct {
	CourierID string `json:"courier_id"`
}
