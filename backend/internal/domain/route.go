package domain

import (
	"math"
)

const earthRadiusKm = 6371.0088

// DistanceKm is the straight-line (great-circle) distance between two points.
func DistanceKm(a, b Point) float64 {
	rad := math.Pi / 180
	dLat := (b.Lat - a.Lat) * rad
	dLng := (b.Lng - a.Lng) * rad
	h := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(a.Lat*rad)*math.Cos(b.Lat*rad)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthRadiusKm * math.Asin(math.Min(1, math.Sqrt(h)))
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }

type StopKind string

const (
	StopStart    StopKind = "start"
	StopPickup   StopKind = "pickup"
	StopHub      StopKind = "hub"
	StopDelivery StopKind = "delivery"
)

// Stop is one point on a route. LegKm is the distance from the previous stop.
type Stop struct {
	Kind    StopKind `json:"kind"`
	OrderID string   `json:"order_id,omitempty"`
	Point   Point    `json:"point"`
	LegKm   float64  `json:"leg_km"`
}

// Route is start -> pickups -> hub -> deliveries. Legs are rounded to 0.01 km
// and TotalKm is the sum of the rounded legs, so the numbers on screen add up.
type Route struct {
	Stops   []Stop  `json:"stops"`
	TotalKm float64 `json:"total_km"`
}

// BuildRoute lays out the stops in the given order. A courier with no orders
// has an empty route. Orders without a location are skipped (they can never
// be assigned anyway).
func BuildRoute(start, hub Point, pickups, deliveries []*Order) Route {
	if len(pickups) == 0 && len(deliveries) == 0 {
		return Route{Stops: []Stop{}}
	}
	stops := []Stop{{Kind: StopStart, Point: start}}
	for _, o := range pickups {
		if o.Location != nil {
			stops = append(stops, Stop{Kind: StopPickup, OrderID: o.ID, Point: *o.Location})
		}
	}
	stops = append(stops, Stop{Kind: StopHub, Point: hub})
	for _, o := range deliveries {
		if o.Location != nil {
			stops = append(stops, Stop{Kind: StopDelivery, OrderID: o.ID, Point: *o.Location})
		}
	}
	total := 0.0
	for i := 1; i < len(stops); i++ {
		stops[i].LegKm = round2(DistanceKm(stops[i-1].Point, stops[i].Point))
		total += stops[i].LegKm
	}
	return Route{Stops: stops, TotalKm: round2(total)}
}

// OptimizeRoute reorders pickups (between start and hub) and deliveries
// (after the hub) to cut the total km. The pickups-hub-deliveries shape is
// kept: a parcel must reach the hub before it can go out again.
func OptimizeRoute(start, hub Point, pickups, deliveries []*Order) Route {
	p := bestPath(start, &hub, pickups)
	d := bestPath(hub, nil, deliveries)
	better := BuildRoute(start, hub, p, d)
	given := BuildRoute(start, hub, pickups, deliveries)
	if better.TotalKm > given.TotalKm {
		return given
	}
	return better
}

// bestPath orders the stops of a path that starts at from and, if end is set,
// finishes at end. Small paths are solved exactly; longer ones use nearest
// neighbour followed by 2-opt.
func bestPath(from Point, end *Point, orders []*Order) []*Order {
	pts := make([]*Order, 0, len(orders))
	for _, o := range orders {
		if o.Location != nil {
			pts = append(pts, o)
		}
	}
	cost := func(seq []*Order) float64 {
		cur, sum := from, 0.0
		for _, o := range seq {
			sum += DistanceKm(cur, *o.Location)
			cur = *o.Location
		}
		if end != nil {
			sum += DistanceKm(cur, *end)
		}
		return sum
	}
	if len(pts) <= 7 {
		return exactPath(pts, cost)
	}
	seq := nearestNeighbour(from, pts)
	twoOpt(seq, cost)
	return seq
}

func exactPath(pts []*Order, cost func([]*Order) float64) []*Order {
	best := append([]*Order(nil), pts...)
	bestCost := cost(best)
	cur := append([]*Order(nil), pts...)
	var permute func(k int)
	permute = func(k int) {
		if k == len(cur) {
			if c := cost(cur); c < bestCost-1e-12 {
				bestCost = c
				copy(best, cur)
			}
			return
		}
		for i := k; i < len(cur); i++ {
			cur[k], cur[i] = cur[i], cur[k]
			permute(k + 1)
			cur[k], cur[i] = cur[i], cur[k]
		}
	}
	permute(0)
	return best
}

func nearestNeighbour(from Point, pts []*Order) []*Order {
	left := append([]*Order(nil), pts...)
	out := make([]*Order, 0, len(pts))
	cur := from
	for len(left) > 0 {
		bi := 0
		for i := range left {
			if DistanceKm(cur, *left[i].Location) < DistanceKm(cur, *left[bi].Location) {
				bi = i
			}
		}
		out = append(out, left[bi])
		cur = *left[bi].Location
		left = append(left[:bi], left[bi+1:]...)
	}
	return out
}

func twoOpt(seq []*Order, cost func([]*Order) float64) {
	reverse := func(i, j int) {
		for ; i < j; i, j = i+1, j-1 {
			seq[i], seq[j] = seq[j], seq[i]
		}
	}
	for improved := true; improved; {
		improved = false
		for i := 0; i < len(seq)-1; i++ {
			for j := i + 1; j < len(seq); j++ {
				before := cost(seq)
				reverse(i, j)
				if cost(seq) < before-1e-12 {
					improved = true
				} else {
					reverse(i, j)
				}
			}
		}
	}
}
