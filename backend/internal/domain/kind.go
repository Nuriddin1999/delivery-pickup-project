package domain

// Kind is the kind of work: a pickup (seller → hub) or a delivery (hub → buyer).
type Kind string

const (
	Pickup   Kind = "pickup"
	Delivery Kind = "delivery"
)

// Valid reports whether k is one of the known kinds.
func (k Kind) Valid() bool { return k == Pickup || k == Delivery }

// Plural is used in messages: "Dilnoza does not do deliveries".
func (k Kind) Plural() string {
	if k == Delivery {
		return "deliveries"
	}
	return string(k) + "s"
}
