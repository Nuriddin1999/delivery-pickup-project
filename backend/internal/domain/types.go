// Package domain holds the business types and rules. It has no I/O and no
// locking, so every rule can be tested with plain values.
package domain

import (
	"strconv"
	"strings"
	"time"
)

// Kind is the kind of work: a pickup (seller -> hub) or a delivery (hub -> buyer).
type Kind string

const (
	Pickup   Kind = "pickup"
	Delivery Kind = "delivery"
)

func (k Kind) Valid() bool { return k == Pickup || k == Delivery }

// Plural is used in messages: "Dilnoza does not do deliveries".
func (k Kind) Plural() string {
	if k == Delivery {
		return "deliveries"
	}
	return string(k) + "s"
}

type Point struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type Courier struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Active     bool     `json:"active"`
	Kinds      []Kind   `json:"kinds"`
	Regions    []string `json:"regions"`
	MaxParcels int      `json:"max_parcels"`
	MaxKg      float64  `json:"max_kg"`
	Start      Point    `json:"start"`
}

func (c *Courier) Does(k Kind) bool {
	for _, x := range c.Kinds {
		if x == k {
			return true
		}
	}
	return false
}

func (c *Courier) WorksIn(region string) bool {
	for _, r := range c.Regions {
		if r == region {
			return true
		}
	}
	return false
}

// Order is one parcel to move. Orders that came in broken keep their
// Problems; an order with any problem can never be assigned.
type Order struct {
	ID        string    `json:"id"`
	SeedID    string    `json:"seed_id"` // id as written in the seed (may repeat)
	Type      Kind      `json:"type"`
	Region    string    `json:"region"`
	Location  *Point    `json:"location"` // nil when coordinates are missing
	WeightKg  float64   `json:"weight_kg"`
	CreatedAt time.Time `json:"created_at"`
	CourierID string    `json:"courier_id,omitempty"`
	Problems  []string  `json:"problems,omitempty"` // why the order is broken
	Notes     []string  `json:"notes,omitempty"`    // fixed-up input, for information

	// AssignSeq records when the order was given to its courier; the route
	// visits stops in this order.
	AssignSeq int `json:"-"`
}

func (o *Order) Broken() bool { return len(o.Problems) > 0 }

// Load is how much a courier already carries today.
type Load struct {
	Parcels int     `json:"parcels"`
	Kg      float64 `json:"kg"`
}

func (l Load) Add(o *Order) Load {
	return Load{Parcels: l.Parcels + 1, Kg: l.Kg + o.WeightKg}
}

// FormatKg prints 2.5 as "2.5" and 15 as "15".
func FormatKg(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

// CanonicalRegion finds the region whose name matches s ignoring case and
// extra spaces. ok is false when there is no such region.
func CanonicalRegion(regions []string, s string) (name string, ok bool) {
	want := strings.Join(strings.Fields(strings.ToLower(s)), " ")
	for _, r := range regions {
		if strings.ToLower(r) == want {
			return r, true
		}
	}
	return "", false
}
