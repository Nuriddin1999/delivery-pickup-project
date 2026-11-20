// Package store keeps couriers and orders in memory and is the only place
// that changes them. Every change goes through the domain rules.
package store

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"sync"

	"delivery/internal/domain"
)

type Store struct {
	mu       sync.RWMutex
	hubName  string
	hub      domain.Point
	regions  []string
	geojson  []byte
	couriers []*domain.Courier
	orders   []*domain.Order
	seq      int // last AssignSeq handed out
}

// New builds a store from seed data. Broken orders are kept and marked.
func New(seed Seed, geojson []byte) *Store {
	s := &Store{
		hubName: seed.Hub.Name,
		hub:     domain.Point{Lat: seed.Hub.Lat, Lng: seed.Hub.Lng},
		regions: seed.Regions,
		geojson: geojson,
	}
	for _, c := range seed.Couriers {
		cp := *c
		if rs, err := domain.NormalizeRegions(s.regions, c.Regions); err == nil {
			cp.Regions = rs
		}
		if cp.Kinds == nil {
			cp.Kinds = []domain.Kind{}
		}
		s.couriers = append(s.couriers, &cp)
	}
	used := map[string]int{}
	for _, in := range seed.Orders {
		s.orders = append(s.orders, checkOrder(in, s.regions, used))
	}
	return s
}

func (s *Store) GeoJSON() []byte { return s.geojson }

// ---- lookups (caller holds the lock) ----

func (s *Store) courier(id string) *domain.Courier {
	for _, c := range s.couriers {
		if c.ID == id {
			return c
		}
	}
	return nil
}

func (s *Store) order(id string) *domain.Order {
	for _, o := range s.orders {
		if o.ID == id {
			return o
		}
	}
	return nil
}

func (s *Store) loadOf(courierID string) domain.Load {
	var l domain.Load
	for _, o := range s.orders {
		if o.CourierID == courierID {
			l = l.Add(o)
		}
	}
	return l
}

// held returns a courier's pickups and deliveries in the order given.
func (s *Store) held(courierID string) (pickups, deliveries []*domain.Order) {
	var mine []*domain.Order
	for _, o := range s.orders {
		if o.CourierID == courierID {
			mine = append(mine, o)
		}
	}
	sort.SliceStable(mine, func(i, j int) bool { return mine[i].AssignSeq < mine[j].AssignSeq })
	for _, o := range mine {
		if o.Type == domain.Pickup {
			pickups = append(pickups, o)
		} else {
			deliveries = append(deliveries, o)
		}
	}
	return
}

func (s *Store) route(c *domain.Courier) domain.Route {
	p, d := s.held(c.ID)
	return domain.BuildRoute(c.Start, s.hub, p, d)
}

func notFound(what, id string) *domain.Refusal {
	return &domain.Refusal{Code: domain.CodeNotFound, Message: fmt.Sprintf("There is no %s %q", what, id)}
}

func (s *Store) give(o *domain.Order, c *domain.Courier) {
	s.seq++
	o.CourierID = c.ID
	o.AssignSeq = s.seq
}

// ---- changes ----

// Assign gives an order to a courier. If the order is already with another
// courier it is moved in one step; when the new courier is not allowed the
// order stays where it was.
func (s *Store) Assign(orderID, courierID string) (*domain.Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	o := s.order(orderID)
	if o == nil {
		return nil, notFound("order", orderID)
	}
	c := s.courier(courierID)
	if c == nil {
		return nil, notFound("courier", courierID)
	}
	if o.CourierID == c.ID {
		return nil, &domain.Refusal{Code: domain.CodeAlreadyAssigned,
			Message: fmt.Sprintf("Order %s is already with %s", o.ID, c.Name)}
	}
	if r := domain.CanTake(c, o, s.loadOf(c.ID)); r != nil {
		return nil, r
	}
	s.give(o, c)
	cp := *o
	return &cp, nil
}

// Unassign takes an order off its courier.
func (s *Store) Unassign(orderID string) (*domain.Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	o := s.order(orderID)
	if o == nil {
		return nil, notFound("order", orderID)
	}
	if o.CourierID == "" {
		return nil, &domain.Refusal{Code: domain.CodeNotAssigned,
			Message: fmt.Sprintf("Order %s has no courier", o.ID)}
	}
	o.CourierID, o.AssignSeq = "", 0
	cp := *o
	return &cp, nil
}

// SetRegions replaces a courier's regions. Orders they already hold stay
// with them; the state view marks the ones now outside their regions.
func (s *Store) SetRegions(courierID string, regions []string) (*domain.Courier, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.courier(courierID)
	if c == nil {
		return nil, notFound("courier", courierID)
	}
	rs, err := domain.NormalizeRegions(s.regions, regions)
	if err != nil {
		return nil, &domain.ValidationError{Fields: map[string]string{"regions": err.Error()}}
	}
	c.Regions = rs
	cp := *c
	return &cp, nil
}

// AddCourier validates the input and stores a new courier.
func (s *Store) AddCourier(in domain.NewCourierInput) (*domain.Courier, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c, err := domain.ValidateNewCourier(in, s.regions, s.couriers)
	if err != nil {
		return nil, err
	}
	c.ID = s.nextCourierID()
	s.couriers = append(s.couriers, c)
	cp := *c
	return &cp, nil
}

func (s *Store) nextCourierID() string {
	for n := len(s.couriers) + 1; ; n++ {
		id := fmt.Sprintf("c%d", n)
		if s.courier(id) == nil {
			return id
		}
	}
}

// ---- auto-assign ----

type Placed struct {
	OrderID   string  `json:"order_id"`
	CourierID string  `json:"courier_id"`
	AddedKm   float64 `json:"added_km"`
}

type Unplaced struct {
	OrderID string `json:"order_id"`
	Reason  string `json:"reason"`
}

type AutoResult struct {
	Assigned []Placed   `json:"assigned"`
	Unplaced []Unplaced `json:"unplaced"`
}

// AutoAssign gives every free, valid order to the allowed courier whose
// route grows the least by taking it ("nearest"). Orders are handled oldest
// first. Orders already assigned are left alone.
func (s *Store) AutoAssign() AutoResult {
	s.mu.Lock()
	defer s.mu.Unlock()
	res := AutoResult{Assigned: []Placed{}, Unplaced: []Unplaced{}}

	var free []*domain.Order
	for _, o := range s.orders {
		if o.CourierID == "" {
			free = append(free, o)
		}
	}
	sort.SliceStable(free, func(i, j int) bool { return free[i].CreatedAt.Before(free[j].CreatedAt) })

	for _, o := range free {
		if o.Broken() {
			res.Unplaced = append(res.Unplaced, Unplaced{o.ID, domain.WhyNobodyCanTake(s.couriers, o)})
			continue
		}
		var best *domain.Courier
		bestKm := 0.0
		var full []string
		for _, c := range s.couriers {
			r := domain.CanTake(c, o, s.loadOf(c.ID))
			if r != nil {
				if r.Code == domain.CodeParcelLimit || r.Code == domain.CodeWeightLimit {
					full = append(full, r.Message)
				}
				continue
			}
			km := s.addedKm(c, o)
			if best == nil || km < bestKm-1e-9 {
				best, bestKm = c, km
			}
		}
		if best == nil {
			reason := domain.WhyNobodyCanTake(s.couriers, o)
			if reason == "" {
				reason = "Every courier allowed to take it is full: " + strings.Join(full, "; ")
			}
			res.Unplaced = append(res.Unplaced, Unplaced{o.ID, reason})
			continue
		}
		s.give(o, best)
		res.Assigned = append(res.Assigned, Placed{o.ID, best.ID, bestKm})
	}
	return res
}

// addedKm is how much longer c's route gets if o is added at the end of
// their pickups or deliveries (where a new order goes).
func (s *Store) addedKm(c *domain.Courier, o *domain.Order) float64 {
	p, d := s.held(c.ID)
	before := domain.BuildRoute(c.Start, s.hub, p, d).TotalKm
	if o.Type == domain.Pickup {
		p = append(p, o)
	} else {
		d = append(d, o)
	}
	after := domain.BuildRoute(c.Start, s.hub, p, d).TotalKm
	return math.Round((after-before)*100) / 100
}
