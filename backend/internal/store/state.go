package store

import (
	"delivery/internal/domain"
)

// State is everything the page needs in one response.
type State struct {
	Hub          HubView        `json:"hub"`
	Regions      []string       `json:"regions"`
	Couriers     []CourierView  `json:"couriers"`
	Orders       []OrderView    `json:"orders"`
	Unassignable []Unassignable `json:"unassignable"`
}

type HubView struct {
	Name string `json:"name"`
	domain.Point
}

type CourierView struct {
	domain.Courier
	Load domain.Load `json:"load"`
	// Route visits stops in the order they were given.
	Route domain.Route `json:"route"`
	// BetterRoute is the same stops reordered to cut km.
	BetterRoute domain.Route `json:"better_route"`
	// OutsideRegions lists held orders that are not in the courier's regions
	// any more (after a region change).
	OutsideRegions []string `json:"outside_regions"`
}

type OrderView struct {
	domain.Order
	OutsideRegions bool `json:"outside_regions"`
}

// Unassignable is an order that no courier can ever take as things stand.
type Unassignable struct {
	OrderID string `json:"order_id"`
	Broken  bool   `json:"broken"` // bad data, as opposed to "no courier fits"
	Reason  string `json:"reason"`
}

// State returns a copy of the current state with loads and routes worked out.
func (s *Store) State() State {
	s.mu.RLock()
	defer s.mu.RUnlock()

	st := State{
		Hub:          HubView{Name: s.hubName, Point: s.hub},
		Regions:      append([]string(nil), s.regions...),
		Couriers:     []CourierView{},
		Orders:       []OrderView{},
		Unassignable: []Unassignable{},
	}
	outside := map[string]bool{}

	for _, c := range s.couriers {
		p, d := s.held(c.ID)
		v := CourierView{
			Courier:        *c,
			Load:           s.loadOf(c.ID),
			Route:          domain.BuildRoute(c.Start, s.hub, p, d),
			BetterRoute:    domain.OptimizeRoute(c.Start, s.hub, p, d),
			OutsideRegions: []string{},
		}
		for _, o := range append(p, d...) {
			if !c.WorksIn(o.Region) {
				v.OutsideRegions = append(v.OutsideRegions, o.ID)
				outside[o.ID] = true
			}
		}
		st.Couriers = append(st.Couriers, v)
	}

	for _, o := range s.orders {
		st.Orders = append(st.Orders, OrderView{Order: *o, OutsideRegions: outside[o.ID]})
		if o.CourierID != "" {
			continue
		}
		if reason := domain.WhyNobodyCanTake(s.couriers, o); reason != "" {
			st.Unassignable = append(st.Unassignable, Unassignable{OrderID: o.ID, Broken: o.Broken(), Reason: reason})
		}
	}
	return st
}
