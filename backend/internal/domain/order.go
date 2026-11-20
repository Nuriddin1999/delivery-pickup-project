package domain

import (
	"slices"
	"time"
)

// Order is one parcel to move. An order that came in broken keeps its
// Problems and can never be assigned.
type Order struct {
	ID        string
	SeedID    string // id as written in the seed data (may repeat)
	Type      Kind
	Region    string
	Location  *Point // nil when coordinates are missing
	WeightKg  float64
	CreatedAt time.Time
	Problems  []string // why the order is broken
	Notes     []string // input that was fixed up, for information

	CourierID string // "" while the order has no courier
	// AssignSeq records when the order was given to its courier; the route
	// visits stops in this order.
	AssignSeq int
}

// Broken reports whether the order has bad data.
func (o Order) Broken() bool { return len(o.Problems) > 0 }

// Assigned reports whether the order has a courier.
func (o Order) Assigned() bool { return o.CourierID != "" }

// AssignTo gives the order to a courier; seq says when, for route order.
func (o *Order) AssignTo(courierID string, seq int) {
	o.CourierID = courierID
	o.AssignSeq = seq
}

// Unassign takes the order off its courier.
func (o *Order) Unassign() {
	o.CourierID = ""
	o.AssignSeq = 0
}

// Clone returns a copy that shares no slices or pointers with o.
func (o Order) Clone() Order {
	if o.Location != nil {
		p := *o.Location
		o.Location = &p
	}
	o.Problems = slices.Clone(o.Problems)
	o.Notes = slices.Clone(o.Notes)
	return o
}
