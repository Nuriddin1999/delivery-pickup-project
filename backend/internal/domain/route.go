package domain

import "sort"

type StopKind string

const (
	StopStart    StopKind = "start"
	StopPickup   StopKind = "pickup"
	StopHub      StopKind = "hub"
	StopDelivery StopKind = "delivery"
)

// Stop is one point on a route. LegKm is the distance from the previous stop.
type Stop struct {
	Kind    StopKind
	OrderID string
	Point   Point
	LegKm   float64
}

// Route is start → pickups → hub → deliveries. Legs are rounded to 0.01 km
// and TotalKm is the sum of the rounded legs, so the numbers on screen add up.
type Route struct {
	Stops   []Stop
	TotalKm float64
}

// HeldBy returns a courier's pickups and deliveries in the order given.
func HeldBy(courierID string, orders []Order) (pickups, deliveries []Order) {
	var mine []Order
	for _, o := range orders {
		if o.CourierID == courierID {
			mine = append(mine, o)
		}
	}
	sort.SliceStable(mine, func(i, j int) bool { return mine[i].AssignSeq < mine[j].AssignSeq })
	for _, o := range mine {
		if o.Type == Pickup {
			pickups = append(pickups, o)
		} else {
			deliveries = append(deliveries, o)
		}
	}
	return pickups, deliveries
}

// PlanRoute is the courier's route with stops in the order they were given.
func PlanRoute(c Courier, hub Point, orders []Order) Route {
	p, d := HeldBy(c.ID, orders)
	return BuildRoute(c.Start, hub, p, d)
}

// PlanShorterRoute is the same stops reordered to cut the total km.
func PlanShorterRoute(c Courier, hub Point, orders []Order) Route {
	p, d := HeldBy(c.ID, orders)
	return OptimizeRoute(c.Start, hub, p, d)
}

// BuildRoute lays out the stops in the given order. A courier with no orders
// has an empty route. Orders without a location are skipped (they can never
// be assigned anyway).
func BuildRoute(start, hub Point, pickups, deliveries []Order) Route {
	if len(pickups) == 0 && len(deliveries) == 0 {
		return Route{Stops: []Stop{}}
	}
	stops := []Stop{{Kind: StopStart, Point: start}}
	stops = appendOrderStops(stops, StopPickup, pickups)
	stops = append(stops, Stop{Kind: StopHub, Point: hub})
	stops = appendOrderStops(stops, StopDelivery, deliveries)

	total := 0.0
	for i := 1; i < len(stops); i++ {
		stops[i].LegKm = RoundKm(DistanceKm(stops[i-1].Point, stops[i].Point))
		total += stops[i].LegKm
	}
	return Route{Stops: stops, TotalKm: RoundKm(total)}
}

func appendOrderStops(stops []Stop, kind StopKind, orders []Order) []Stop {
	for _, o := range orders {
		if o.Location != nil {
			stops = append(stops, Stop{Kind: kind, OrderID: o.ID, Point: *o.Location})
		}
	}
	return stops
}
