package httpapi

import (
	"time"

	"delivery/internal/domain"
	"delivery/internal/usecase"
)

// JSON shapes sent to the page. Keep in sync with frontend/src/api/types.ts.

type pointJSON struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type stateResponse struct {
	Hub          hubJSON            `json:"hub"`
	Regions      []string           `json:"regions"`
	Couriers     []courierView      `json:"couriers"`
	Orders       []orderResponse    `json:"orders"`
	Unassignable []unassignableJSON `json:"unassignable"`
}

type hubJSON struct {
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}

type courierResponse struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Active     bool      `json:"active"`
	Kinds      []string  `json:"kinds"`
	Regions    []string  `json:"regions"`
	MaxParcels int       `json:"max_parcels"`
	MaxKg      float64   `json:"max_kg"`
	Start      pointJSON `json:"start"`
}

type courierView struct {
	courierResponse
	Load           loadJSON  `json:"load"`
	Route          routeJSON `json:"route"`
	BetterRoute    routeJSON `json:"better_route"`
	OutsideRegions []string  `json:"outside_regions"`
}

type loadJSON struct {
	Parcels int     `json:"parcels"`
	Kg      float64 `json:"kg"`
}

type routeJSON struct {
	Stops   []stopJSON `json:"stops"`
	TotalKm float64    `json:"total_km"`
}

type stopJSON struct {
	Kind    string    `json:"kind"`
	OrderID string    `json:"order_id,omitempty"`
	Point   pointJSON `json:"point"`
	LegKm   float64   `json:"leg_km"`
}

type orderResponse struct {
	ID             string     `json:"id"`
	SeedID         string     `json:"seed_id"`
	Type           string     `json:"type"`
	Region         string     `json:"region"`
	Location       *pointJSON `json:"location"`
	WeightKg       float64    `json:"weight_kg"`
	CreatedAt      time.Time  `json:"created_at"`
	CourierID      string     `json:"courier_id,omitempty"`
	Problems       []string   `json:"problems,omitempty"`
	Notes          []string   `json:"notes,omitempty"`
	OutsideRegions bool       `json:"outside_regions"`
}

type unassignableJSON struct {
	OrderID string `json:"order_id"`
	Broken  bool   `json:"broken"`
	Reason  string `json:"reason"`
}

type autoAssignResponse struct {
	Assigned []placementJSON `json:"assigned"`
	Unplaced []unplacedJSON  `json:"unplaced"`
}

type placementJSON struct {
	OrderID   string  `json:"order_id"`
	CourierID string  `json:"courier_id"`
	AddedKm   float64 `json:"added_km"`
}

type unplacedJSON struct {
	OrderID string `json:"order_id"`
	Reason  string `json:"reason"`
}

type candidatesResponse struct {
	OrderID    string          `json:"order_id"`
	Candidates []candidateJSON `json:"candidates"`
}

// candidateJSON is one courier in the order's "give to" list. Code and
// Reason are set when the rules refuse; AddedKm and Nearest when they allow.
type candidateJSON struct {
	CourierID string   `json:"courier_id"`
	Allowed   bool     `json:"allowed"`
	Code      string   `json:"code,omitempty"`
	Reason    string   `json:"reason,omitempty"`
	AddedKm   float64  `json:"added_km"`
	Nearest   bool     `json:"nearest"`
	Load      loadJSON `json:"load"`
}

type errorResponse struct {
	Code   string            `json:"code"`
	Error  string            `json:"error"`
	Fields map[string]string `json:"fields,omitempty"`
}

// ---- mapping from use case results ----

func toStateResponse(ov usecase.Overview) stateResponse {
	res := stateResponse{
		Hub:          hubJSON{Name: ov.City.Hub.Name, Lat: ov.City.Hub.Point.Lat, Lng: ov.City.Hub.Point.Lng},
		Regions:      ov.City.Regions,
		Couriers:     make([]courierView, 0, len(ov.Couriers)),
		Orders:       make([]orderResponse, 0, len(ov.Orders)),
		Unassignable: make([]unassignableJSON, 0, len(ov.Unassignable)),
	}
	for _, c := range ov.Couriers {
		res.Couriers = append(res.Couriers, courierView{
			courierResponse: toCourierResponse(c.Courier),
			Load:            loadJSON{Parcels: c.Load.Parcels, Kg: c.Load.Kg},
			Route:           toRouteJSON(c.Route),
			BetterRoute:     toRouteJSON(c.ShorterRoute),
			OutsideRegions:  c.OutsideRegions,
		})
	}
	for _, o := range ov.Orders {
		res.Orders = append(res.Orders, toOrderResponse(o.Order, o.OutsideRegions))
	}
	for _, u := range ov.Unassignable {
		res.Unassignable = append(res.Unassignable, unassignableJSON{OrderID: u.OrderID, Broken: u.Broken, Reason: u.Reason})
	}
	return res
}

func toCourierResponse(c domain.Courier) courierResponse {
	kinds := make([]string, len(c.Kinds))
	for i, k := range c.Kinds {
		kinds[i] = string(k)
	}
	regions := c.Regions
	if regions == nil {
		regions = []string{}
	}
	return courierResponse{
		ID: c.ID, Name: c.Name, Active: c.Active, Kinds: kinds, Regions: regions,
		MaxParcels: c.MaxParcels, MaxKg: c.MaxKg, Start: toPointJSON(c.Start),
	}
}

func toOrderResponse(o domain.Order, outside bool) orderResponse {
	res := orderResponse{
		ID: o.ID, SeedID: o.SeedID, Type: string(o.Type), Region: o.Region, WeightKg: o.WeightKg,
		CreatedAt: o.CreatedAt, CourierID: o.CourierID, Problems: o.Problems, Notes: o.Notes,
		OutsideRegions: outside,
	}
	if o.Location != nil {
		p := toPointJSON(*o.Location)
		res.Location = &p
	}
	return res
}

func toRouteJSON(r domain.Route) routeJSON {
	stops := make([]stopJSON, len(r.Stops))
	for i, s := range r.Stops {
		stops[i] = stopJSON{Kind: string(s.Kind), OrderID: s.OrderID, Point: toPointJSON(s.Point), LegKm: s.LegKm}
	}
	return routeJSON{Stops: stops, TotalKm: r.TotalKm}
}

func toAutoAssignResponse(r usecase.AutoAssignResult) autoAssignResponse {
	res := autoAssignResponse{Assigned: []placementJSON{}, Unplaced: []unplacedJSON{}}
	for _, p := range r.Assigned {
		res.Assigned = append(res.Assigned, placementJSON{OrderID: p.OrderID, CourierID: p.CourierID, AddedKm: p.AddedKm})
	}
	for _, u := range r.Unplaced {
		res.Unplaced = append(res.Unplaced, unplacedJSON{OrderID: u.OrderID, Reason: u.Reason})
	}
	return res
}

func toCandidatesResponse(orderID string, cands []domain.Candidate) candidatesResponse {
	res := candidatesResponse{OrderID: orderID, Candidates: make([]candidateJSON, 0, len(cands))}
	for _, c := range cands {
		cj := candidateJSON{
			CourierID: c.Courier.ID, Allowed: c.Allowed(), AddedKm: c.AddedKm, Nearest: c.Nearest,
			Load: loadJSON{Parcels: c.Load.Parcels, Kg: c.Load.Kg},
		}
		if c.Refusal != nil {
			cj.Code, cj.Reason = c.Refusal.Code, c.Refusal.Message
		}
		res.Candidates = append(res.Candidates, cj)
	}
	return res
}

func toPointJSON(p domain.Point) pointJSON { return pointJSON{Lat: p.Lat, Lng: p.Lng} }
