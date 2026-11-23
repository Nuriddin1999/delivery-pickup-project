package usecase

import (
	"fmt"
	"sort"
	"strings"

	"delivery/internal/domain"
)

// Placement is an order auto-assign gave (or would give) to a courier.
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

// PlanItem is one order a dispatcher confirmed for a courier.
type PlanItem struct {
	OrderID   string
	CourierID string
}

// PlanAutoAssign works out what auto-assign would do and changes nothing:
// the plan (see domain.PlanAssignments) and the orders it would leave out,
// with the reason. The dispatcher checks it, then confirms it with
// ApplyAutoAssign.
func (d *Dispatcher) PlanAutoAssign() AutoAssignResult {
	d.mu.Lock()
	defer d.mu.Unlock()

	couriers, orders := d.repo.Couriers(), d.repo.Orders()
	res := AutoAssignResult{Assigned: []Placement{}}
	for _, a := range domain.PlanAssignments(couriers, orders, d.city.Hub.Point) {
		res.Assigned = append(res.Assigned, Placement{a.OrderID, a.CourierID, a.AddedKm})
		for i := range orders {
			if orders[i].ID == a.OrderID {
				orders[i].AssignTo(a.CourierID, 0) // on this copy only, for the reasons below
			}
		}
	}
	res.Unplaced = d.unplaced(couriers, orders)
	return res
}

// ApplyAutoAssign gives out exactly the plan the dispatcher confirmed, in
// its order (the order a courier's stops are given in). It is all or
// nothing: when the data changed since the plan was made, so that one item
// no longer fits (the order got a courier, the courier filled up, a rule
// changed), nothing is assigned and the refusal says which item and why.
func (d *Dispatcher) ApplyAutoAssign(plan []PlanItem) (AutoAssignResult, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	couriers, orders := d.repo.Couriers(), d.repo.Orders()
	if err := checkPlan(plan, couriers, orders); err != nil {
		return AutoAssignResult{}, err
	}
	return d.apply(plan, couriers, orders), nil
}

// AutoAssign plans and gives out in one step, without a confirmation.
func (d *Dispatcher) AutoAssign() AutoAssignResult {
	d.mu.Lock()
	defer d.mu.Unlock()

	couriers, orders := d.repo.Couriers(), d.repo.Orders()
	var plan []PlanItem
	for _, a := range domain.PlanAssignments(couriers, orders, d.city.Hub.Point) {
		plan = append(plan, PlanItem{a.OrderID, a.CourierID})
	}
	return d.apply(plan, couriers, orders)
}

// checkPlan checks every item against the current data, with the load of
// the items before it, without changing anything.
func checkPlan(plan []PlanItem, couriers []domain.Courier, orders []domain.Order) error {
	byID := make(map[string]domain.Courier, len(couriers))
	for _, c := range couriers {
		byID[c.ID] = c
	}
	at := orderIndex(orders)

	// First the request itself: known ids, each order once.
	seen := map[string]bool{}
	for _, it := range plan {
		if _, ok := at[it.OrderID]; !ok {
			return domain.NotFound("order", it.OrderID)
		}
		if _, ok := byID[it.CourierID]; !ok {
			return domain.NotFound("courier", it.CourierID)
		}
		if seen[it.OrderID] {
			return domain.FieldError("assignments", fmt.Sprintf("Order %s is in the plan twice", it.OrderID))
		}
		seen[it.OrderID] = true
	}

	// Then the rules, each item with the load of the items before it.
	work := append([]domain.Order(nil), orders...)
	for _, it := range plan {
		i, c := at[it.OrderID], byID[it.CourierID]
		o := work[i]
		if o.Assigned() {
			holder := byID[o.CourierID].Name
			return outdated(fmt.Sprintf("%s already has a courier (%s)", o.ID, holder))
		}
		if r := domain.CanTake(c, o, domain.LoadOf(c.ID, work)); r != nil {
			return outdated(fmt.Sprintf("%s cannot go to %s any more: %s", o.ID, c.Name, r.Message))
		}
		work[i].AssignTo(c.ID, 0)
	}
	return nil
}

func outdated(why string) *domain.Refusal {
	return domain.Refuse(domain.CodePlanOutdated, "The plan is out of date: %s. Nothing was assigned; check the plan again", why)
}

// apply gives out a plan that has been checked, and lists what is left.
// AddedKm is what each order adds to its courier's route after the ones
// given before it.
func (d *Dispatcher) apply(plan []PlanItem, couriers []domain.Courier, orders []domain.Order) AutoAssignResult {
	byID := make(map[string]domain.Courier, len(couriers))
	for _, c := range couriers {
		byID[c.ID] = c
	}
	at := orderIndex(orders)
	hub := d.city.Hub.Point
	res := AutoAssignResult{Assigned: []Placement{}}

	for _, it := range plan {
		c, i := byID[it.CourierID], at[it.OrderID]
		before := domain.PlanRoute(c, hub, orders).TotalKm
		orders[i].AssignTo(c.ID, d.repo.NextAssignSeq())
		d.repo.SaveOrder(orders[i])
		after := domain.PlanRoute(c, hub, orders).TotalKm
		res.Assigned = append(res.Assigned, Placement{it.OrderID, c.ID, domain.RoundKm(after - before)})
	}
	res.Unplaced = d.unplaced(couriers, orders)
	return res
}

// unplaced lists the free orders, oldest first, with why nobody takes them,
// judged against the loads in orders. "Full" names the couriers who could
// have taken one had they had room.
func (d *Dispatcher) unplaced(couriers []domain.Courier, orders []domain.Order) []Unplaced {
	out := []Unplaced{}
	for _, i := range freeOrdersOldestFirst(orders) {
		o := orders[i]
		_, _, full := domain.ChooseNearest(o, couriers, orders, d.city.Hub.Point)
		out = append(out, Unplaced{o.ID, whyNotPlaced(couriers, o, full)})
	}
	return out
}

func orderIndex(orders []domain.Order) map[string]int {
	at := make(map[string]int, len(orders))
	for i, o := range orders {
		at[o.ID] = i
	}
	return at
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
