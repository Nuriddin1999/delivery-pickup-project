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

// AutoAssign gives every free, valid order to the nearest allowed courier
// (see domain.ChooseNearest), oldest order first. Orders that already have
// a courier are left alone.
func (d *Dispatcher) AutoAssign() AutoAssignResult {
	d.mu.Lock()
	defer d.mu.Unlock()

	couriers := d.repo.Couriers()
	orders := d.repo.Orders()
	res := AutoAssignResult{Assigned: []Placement{}, Unplaced: []Unplaced{}}

	for _, i := range freeOrdersOldestFirst(orders) {
		o := orders[i]
		if o.Broken() {
			res.Unplaced = append(res.Unplaced, Unplaced{o.ID, domain.WhyNobodyCanTake(couriers, o)})
			continue
		}

		choice, ok, full := domain.ChooseNearest(o, couriers, orders, d.city.Hub.Point)
		if !ok {
			res.Unplaced = append(res.Unplaced, Unplaced{o.ID, whyNotPlaced(couriers, o, full)})
			continue
		}

		o.AssignTo(choice.Courier.ID, d.repo.NextAssignSeq())
		orders[i] = o // later choices see the new load
		d.repo.SaveOrder(o)
		res.Assigned = append(res.Assigned, Placement{o.ID, choice.Courier.ID, choice.AddedKm})
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
