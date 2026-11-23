package domain

import (
	"fmt"
	"math/rand"
	"testing"
	"time"
)

var planHub = Point{41.30, 69.28}

// applyPlan gives the planned orders out in plan order, checking every rule
// against the load at that moment, as the use case does.
func applyPlan(t *testing.T, couriers []Courier, orders []Order, plan []Assignment) []Order {
	t.Helper()
	out := append([]Order(nil), orders...)
	byID := map[string]Courier{}
	for _, c := range couriers {
		byID[c.ID] = c
	}
	seq := 1000
	for _, a := range plan {
		for i := range out {
			if out[i].ID != a.OrderID {
				continue
			}
			if out[i].Assigned() {
				t.Fatalf("%s already had a courier, the plan must leave it alone", a.OrderID)
			}
			if r := CanTake(byID[a.CourierID], out[i], LoadOf(a.CourierID, out)); r != nil {
				t.Fatalf("plan breaks a rule giving %s to %s: %s", a.OrderID, a.CourierID, r.Message)
			}
			seq++
			out[i].AssignTo(a.CourierID, seq)
		}
	}
	return out
}

// greedy is the old auto-assign: oldest first, each to its nearest courier.
func greedy(couriers []Courier, orders []Order) []Order {
	out := append([]Order(nil), orders...)
	seq := 1000
	for _, o := range freeValidOldestFirst(out) {
		if choice, ok, _ := ChooseNearest(o, couriers, out, planHub); ok {
			seq++
			for i := range out {
				if out[i].ID == o.ID {
					out[i].AssignTo(choice.Courier.ID, seq)
				}
			}
		}
	}
	return out
}

func placed(orders []Order) int {
	n := 0
	for _, o := range orders {
		if o.Assigned() {
			n++
		}
	}
	return n
}

func totalKm(couriers []Courier, orders []Order) float64 {
	sum := 0.0
	for _, c := range couriers {
		sum += PlanRoute(c, planHub, orders).TotalKm
	}
	return sum
}

func TestPlanPlacesWhatGreedyLeavesOut(t *testing.T) {
	// Near has room for one order and works in both regions; Far only in
	// Sergeli. The older order is nearest to Near, so greedy gives it to
	// Near and the Chilonzor order, which only Near can take, is left out.
	near := kamola()
	near.ID, near.Name, near.Start, near.MaxParcels = "near", "Near", Point{41.26, 69.22}, 1
	far := kamola()
	far.ID, far.Name, far.Start, far.Regions = "far", "Far", Point{41.32, 69.30}, []string{"Sergeli"}
	couriers := []Courier{near, far}

	t0 := time.Date(2026, 1, 1, 8, 0, 0, 0, time.UTC)
	older := Order{ID: "older", Type: Pickup, Region: "Sergeli", WeightKg: 1, Location: &Point{41.25, 69.21}, CreatedAt: t0}
	onlyNear := Order{ID: "only-near", Type: Pickup, Region: "Chilonzor", WeightKg: 1, Location: &Point{41.27, 69.20}, CreatedAt: t0.Add(time.Hour)}
	orders := []Order{older, onlyNear}

	if got := placed(greedy(couriers, orders)); got != 1 {
		t.Fatalf("setup: greedy placed %d, want 1", got)
	}

	plan := PlanAssignments(couriers, orders, planHub)
	after := applyPlan(t, couriers, orders, plan)
	who := map[string]string{}
	for _, o := range after {
		who[o.ID] = o.CourierID
	}
	if who["older"] != "far" || who["only-near"] != "near" {
		t.Errorf("plan = %v, want older→far and only-near→near", who)
	}
}

func TestPlanCutsKmAndGivesStopsInShortOrder(t *testing.T) {
	// Three pickups on a line, created far-to-near. Given in creation order
	// the route zigzags; the plan gives them in the order of the short route.
	c := kamola()
	c.Start = Point{41.20, 69.28}
	t0 := time.Date(2026, 1, 1, 8, 0, 0, 0, time.UTC)
	var orders []Order
	for i, lat := range []float64{41.28, 41.22, 41.25} {
		orders = append(orders, Order{ID: fmt.Sprintf("p%d", i), Type: Pickup, Region: "Sergeli", WeightKg: 1,
			Location: &Point{lat, 69.28}, CreatedAt: t0.Add(time.Duration(i) * time.Minute)})
	}

	after := applyPlan(t, []Courier{c}, orders, PlanAssignments([]Courier{c}, orders, planHub))
	given := PlanRoute(c, planHub, after).TotalKm
	shortest := PlanShorterRoute(c, planHub, after).TotalKm
	if given != shortest {
		t.Errorf("route in the order given = %.2f km, shortest = %.2f km; the plan should give them in the short order", given, shortest)
	}
	if old := totalKm([]Courier{c}, greedy([]Courier{c}, orders)); given >= old {
		t.Errorf("plan %.2f km is not shorter than greedy %.2f km", given, old)
	}
}

func TestPlanKeepsHeldOrdersAndSkipsBrokenOnes(t *testing.T) {
	c, orders := kamolaDay() // Kamola holds p1, d1, p2 (3 of 3 parcels)
	c.MaxParcels = 5
	markDone(orders, "p1", "d1") // she has left the hub: no new pickups
	orders = append(orders,
		Order{ID: "new-pickup", Type: Pickup, Region: "Sergeli", WeightKg: 1, Location: &Point{41.3, 69.2}},
		Order{ID: "new-delivery", Type: Delivery, Region: "Sergeli", WeightKg: 1, Location: &Point{41.3, 69.2}},
		Order{ID: "broken", Type: Delivery, Region: "Sergeli", WeightKg: 1, Problems: []string{"Missing coordinates"}},
	)

	plan := PlanAssignments([]Courier{c}, orders, planHub)
	applyPlan(t, []Courier{c}, orders, plan) // fails on a held order or a broken rule
	if len(plan) != 1 || plan[0].OrderID != "new-delivery" {
		t.Errorf("plan = %+v, want only new-delivery (no pickup past the hub, nothing broken)", plan)
	}
}

// TestPlanNeverBreaksARule runs the plan on random days: it must keep every
// rule and the hand assignment, and never place fewer orders than greedy.
func TestPlanNeverBreaksARule(t *testing.T) {
	regions := []string{"Sergeli", "Chilonzor", "Yunusobod"}
	for seed := int64(1); seed <= 30; seed++ {
		rng := rand.New(rand.NewSource(seed))
		pt := func() Point { return Point{41.20 + rng.Float64()*0.2, 69.15 + rng.Float64()*0.25} }

		var couriers []Courier
		for i := 0; i < 4; i++ {
			kinds := [][]Kind{{Pickup}, {Delivery}, {Pickup, Delivery}}[rng.Intn(3)]
			couriers = append(couriers, Courier{ID: fmt.Sprintf("c%d", i), Name: fmt.Sprintf("C%d", i),
				Active: rng.Intn(5) > 0, Kinds: kinds, Regions: regions[:1+rng.Intn(3)],
				MaxParcels: 1 + rng.Intn(5), MaxKg: float64(5 + rng.Intn(20)), Start: pt()})
		}
		var orders []Order
		t0 := time.Date(2026, 1, 1, 8, 0, 0, 0, time.UTC)
		for i := 0; i < 20; i++ {
			p := pt()
			orders = append(orders, Order{ID: fmt.Sprintf("o%d", i), Type: []Kind{Pickup, Delivery}[rng.Intn(2)],
				Region: regions[rng.Intn(3)], WeightKg: float64(1 + rng.Intn(8)), Location: &p,
				CreatedAt: t0.Add(time.Duration(rng.Intn(600)) * time.Minute)})
		}
		// One order already held by hand, if its courier may take it.
		if CanTake(couriers[0], orders[0], Load{}) == nil {
			orders[0].AssignTo(couriers[0].ID, 1)
		}

		t.Run(fmt.Sprint("seed ", seed), func(t *testing.T) {
			after := applyPlan(t, couriers, orders, PlanAssignments(couriers, orders, planHub))
			if got, old := placed(after), placed(greedy(couriers, orders)); got < old {
				t.Errorf("plan placed %d, the one-by-one choice %d", got, old)
			}
		})
	}
}
