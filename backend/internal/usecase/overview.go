package usecase

import "delivery/internal/domain"

// Overview is everything the dispatcher sees at once.
type Overview struct {
	City         domain.City
	Couriers     []CourierOverview
	Orders       []OrderOverview
	Unassignable []Unassignable
}

type CourierOverview struct {
	Courier domain.Courier
	Load    domain.Load
	// Route visits stops in the order they were given.
	Route domain.Route
	// ShorterRoute is the same stops reordered to cut km (shown, not saved).
	ShorterRoute domain.Route
	// OutsideRegions lists held orders that are no longer in the courier's
	// regions, after a region change.
	OutsideRegions []string
}

type OrderOverview struct {
	Order          domain.Order
	OutsideRegions bool
}

// Unassignable is a free order no courier can take as things stand.
type Unassignable struct {
	OrderID string
	Broken  bool // bad data, as opposed to "no courier fits"
	Reason  string
}

// Overview works out loads, routes and problem orders from the current data.
func (d *Dispatcher) Overview() Overview {
	d.mu.RLock()
	defer d.mu.RUnlock()

	couriers := d.repo.Couriers()
	orders := d.repo.Orders()
	hub := d.city.Hub.Point
	ov := Overview{City: d.city, Couriers: []CourierOverview{}, Orders: []OrderOverview{}, Unassignable: []Unassignable{}}
	outside := map[string]bool{}

	for _, c := range couriers {
		co := CourierOverview{
			Courier:        c,
			Load:           domain.LoadOf(c.ID, orders),
			Route:          domain.PlanRoute(c, hub, orders),
			ShorterRoute:   domain.PlanShorterRoute(c, hub, orders),
			OutsideRegions: []string{},
		}
		for _, o := range orders {
			if o.CourierID == c.ID && !c.WorksIn(o.Region) {
				co.OutsideRegions = append(co.OutsideRegions, o.ID)
				outside[o.ID] = true
			}
		}
		ov.Couriers = append(ov.Couriers, co)
	}

	for _, o := range orders {
		ov.Orders = append(ov.Orders, OrderOverview{Order: o, OutsideRegions: outside[o.ID]})
		if o.Assigned() {
			continue
		}
		if reason := domain.WhyNobodyCanTake(couriers, o); reason != "" {
			ov.Unassignable = append(ov.Unassignable, Unassignable{OrderID: o.ID, Broken: o.Broken(), Reason: reason})
		}
	}
	return ov
}
