package domain

// Choice is the courier picked for an order and how many km it adds.
type Choice struct {
	Courier Courier
	AddedKm float64
}

// ChooseNearest picks, among the couriers allowed to take o, the one whose
// route grows the least when o is added ("nearest"). Ties go to the courier
// listed first. When nobody is allowed, ok is false and full holds the
// refusals of couriers who would fit except that they have no room left.
func ChooseNearest(o Order, couriers []Courier, orders []Order, hub Point) (choice Choice, ok bool, full []string) {
	for _, c := range couriers {
		if r := CanTake(c, o, LoadOf(c.ID, orders)); r != nil {
			if r.IsCapacity() {
				full = append(full, r.Message)
			}
			continue
		}
		km := AddedKm(c, o, orders, hub)
		if !ok || km < choice.AddedKm-1e-9 {
			choice, ok = Choice{Courier: c, AddedKm: km}, true
		}
	}
	return choice, ok, full
}

// AddedKm is how much longer c's route gets if o is added at the end of
// their pickups or deliveries, which is where a new order goes.
func AddedKm(c Courier, o Order, orders []Order, hub Point) float64 {
	p, d := HeldBy(c.ID, orders)
	before := BuildRoute(c.Start, hub, p, d).TotalKm
	if o.Type == Pickup {
		p = append(p, o)
	} else {
		d = append(d, o)
	}
	after := BuildRoute(c.Start, hub, p, d).TotalKm
	return RoundKm(after - before)
}
