package domain

// Load is how much a courier already carries today. Pickups and deliveries
// count towards the same limits.
type Load struct {
	Parcels int
	Kg      float64
}

// With returns the load after adding order o.
func (l Load) With(o Order) Load {
	return Load{Parcels: l.Parcels + 1, Kg: l.Kg + o.WeightKg}
}

// LoadOf adds up the orders held by a courier.
func LoadOf(courierID string, orders []Order) Load {
	var l Load
	for _, o := range orders {
		if o.CourierID == courierID {
			l = l.With(o)
		}
	}
	return l
}
