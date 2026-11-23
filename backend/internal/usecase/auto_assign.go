package usecase

import (
	"sort"
	"strings"

	"delivery/internal/domain"
)

// Placement is an order auto-assign gave to a courier.
type Placement struct {
	OrderID   string
	CourierID string
	AddedKm   float64
}

// Unplaced is an order auto-assign could not give to anyone, and why.
type Unplaced struct {
	OrderID string
	Reason  string
}

type AutoAssignResult struct {
	Assigned []Placement
	Unplaced []Unplaced
}

// AutoAssign gives the free, valid orders to couriers allowed to take them,
// planning all of them together (see domain.PlanAssignments): as many orders
// placed as possible, then as few km as possible. Orders that already have a
// courier are left alone. Orders it cannot place are listed, oldest first,
// with the reason.
func (d *Dispatcher) AutoAssign() AutoAssignResult {
	d.mu.Lock()
	defer d.mu.Unlock()

	couriers := d.repo.Couriers()
	orders := d.repo.Orders()
	res := AutoAssignResult{Assigned: []Placement{}, Unplaced: []Unplaced{}}

	index := make(map[string]int, len(orders))
	for i, o := range orders {
		index[o.ID] = i
	}
	for _, a := range domain.PlanAssignments(couriers, orders, d.city.Hub.Point) {
		i := index[a.OrderID]
		o := orders[i]
		o.AssignTo(a.CourierID, d.repo.NextAssignSeq())
		orders[i] = o
		d.repo.SaveOrder(o)
		res.Assigned = append(res.Assigned, Placement{o.ID, a.CourierID, a.AddedKm})
	}

	// Explained against the loads after the plan, so "full" names the
	// couriers who could have taken it had they had room.
	for _, i := range freeOrdersOldestFirst(orders) {
		o := orders[i]
		_, _, full := domain.ChooseNearest(o, couriers, orders, d.city.Hub.Point)
		res.Unplaced = append(res.Unplaced, Unplaced{o.ID, whyNotPlaced(couriers, o, full)})
	}
	return res
}

// freeOrdersOldestFirst returns the indexes of orders without a courier.
func freeOrdersOldestFirst(orders []domain.Order) []int {
	var idx []int
	for i, o := range orders {
		if !o.Assigned() {
			idx = append(idx, i)
		}
	}
	sort.SliceStable(idx, func(a, b int) bool { return orders[idx[a]].CreatedAt.Before(orders[idx[b]].CreatedAt) })
	return idx
}

func whyNotPlaced(couriers []domain.Courier, o domain.Order, full []string) string {
	if reason := domain.WhyNobodyCanTake(couriers, o); reason != "" {
		return reason
	}
	return "Every courier allowed to take it is full: " + strings.Join(full, "; ")
}
