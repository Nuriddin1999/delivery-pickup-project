package domain

import (
	"math"
	"testing"
)

func at(id string, kind Kind, lat, lng float64) Order {
	return Order{ID: id, Type: kind, Location: &Point{lat, lng}}
}

func TestDistanceKm(t *testing.T) {
	// One degree of latitude is about 111.2 km.
	if d := DistanceKm(Point{41, 69}, Point{42, 69}); math.Abs(d-111.2) > 0.1 {
		t.Fatalf("1 degree of latitude = %.2f km", d)
	}
	if DistanceKm(Point{41, 69}, Point{41, 69}) != 0 {
		t.Fatal("same point should be 0 km")
	}
}

func TestBuildRouteOrder(t *testing.T) {
	start, hub := Point{41.0, 69.0}, Point{41.1, 69.0}
	p1, p2 := at("p1", Pickup, 41.02, 69), at("p2", Pickup, 41.01, 69)
	d1 := at("d1", Delivery, 41.2, 69)

	r := BuildRoute(start, hub, []Order{p1, p2}, []Order{d1})
	want := []string{"start", "pickup:p1", "pickup:p2", "hub", "delivery:d1"}
	if len(r.Stops) != len(want) {
		t.Fatalf("got %d stops, want %d", len(r.Stops), len(want))
	}
	sum := 0.0
	for i, s := range r.Stops {
		got := string(s.Kind)
		if s.OrderID != "" {
			got += ":" + s.OrderID
		}
		if got != want[i] {
			t.Errorf("stop %d = %s, want %s", i, got, want[i])
		}
		sum += s.LegKm
	}
	if r.Stops[0].LegKm != 0 {
		t.Error("first stop has no leg")
	}
	if math.Abs(sum-r.TotalKm) > 1e-9 {
		t.Errorf("legs sum to %.2f but total is %.2f", sum, r.TotalKm)
	}
	// legs of 0.02, 0.01, 0.09 and 0.1 degrees of latitude: 0.22 degrees in all
	if math.Abs(r.TotalKm-24.46) > 0.05 {
		t.Errorf("total = %.2f km, want about 24.46", r.TotalKm)
	}
}

func TestPlanRouteUsesAssignOrder(t *testing.T) {
	c := Courier{ID: "c1", Start: Point{41.0, 69.0}}
	a, b := at("a", Pickup, 41.01, 69), at("b", Pickup, 41.02, 69)
	a.AssignTo("c1", 2)
	b.AssignTo("c1", 1)
	other := at("x", Pickup, 41.05, 69)
	other.AssignTo("c2", 3)

	r := PlanRoute(c, Point{41.1, 69.0}, []Order{a, b, other})
	if len(r.Stops) != 4 || r.Stops[1].OrderID != "b" || r.Stops[2].OrderID != "a" {
		t.Errorf("stops = %+v, want start, b, a, hub", r.Stops)
	}
}

func TestBuildRouteEmptyAndDeliveriesOnly(t *testing.T) {
	if r := BuildRoute(Point{}, Point{}, nil, nil); len(r.Stops) != 0 || r.TotalKm != 0 {
		t.Errorf("empty route: %+v", r)
	}
	r := BuildRoute(Point{41, 69}, Point{41.1, 69}, nil, []Order{at("d", Delivery, 41.2, 69)})
	if len(r.Stops) != 3 || r.Stops[1].Kind != StopHub {
		t.Errorf("deliveries only should go start -> hub -> delivery, got %+v", r.Stops)
	}
}

func TestOptimizeRouteNeverWorse(t *testing.T) {
	start, hub := Point{41.0, 69.0}, Point{41.1, 69.0}
	// Given in a zig-zag order on purpose.
	p := []Order{at("a", Pickup, 41.08, 69), at("b", Pickup, 41.02, 69), at("c", Pickup, 41.05, 69)}
	d := []Order{at("x", Delivery, 41.4, 69), at("y", Delivery, 41.2, 69), at("z", Delivery, 41.3, 69)}
	given := BuildRoute(start, hub, p, d)
	better := OptimizeRoute(start, hub, p, d)
	if better.TotalKm >= given.TotalKm {
		t.Fatalf("expected a shorter route: given %.2f, better %.2f", given.TotalKm, better.TotalKm)
	}
	order := ""
	for _, s := range better.Stops {
		if s.OrderID != "" {
			order += s.OrderID
		} else if s.Kind == StopHub {
			order += "|"
		}
	}
	if order != "bca|yzx" {
		t.Errorf("better order = %s, want bca|yzx", order)
	}
}
