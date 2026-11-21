package domain

import "sort"

// Choice is the courier picked for an order and how many km it adds.
type Choice struct {
	Courier Courier
	AddedKm float64
}

// Candidate is one courier the dispatcher could give an order to: whether
// the rules allow it, and if so how many km it adds to their route.
type Candidate struct {
	Courier Courier
	Load    Load     // what the courier already carries
	Refusal *Refusal // nil when the courier may take the order
	AddedKm float64  // only set when allowed
	Nearest bool     // the allowed courier whose route grows the least
}

// Allowed reports whether the rules let this courier take the order.
func (c Candidate) Allowed() bool { return c.Refusal == nil }

// Candidates checks every courier except the one holding o. Allowed
// couriers come first, the nearest (least added km, ties to the courier
// listed first) at the top; refused couriers follow in list order with
// the reason. Auto-assign and the dispatcher's courier list both use this,
// so they always agree on who is nearest.
func Candidates(o Order, couriers []Courier, orders []Order, hub Point) []Candidate {
	out := make([]Candidate, 0, len(couriers))
	nearest := -1
	for _, c := range couriers {
		if c.ID == o.CourierID {
			continue
		}
		cand := Candidate{Courier: c, Load: LoadOf(c.ID, orders)}
		cand.Refusal = CanTake(c, o, cand.Load)
		if cand.Allowed() {
			cand.AddedKm = AddedKm(c, o, orders, hub)
			if nearest < 0 || cand.AddedKm < out[nearest].AddedKm-1e-9 {
				nearest = len(out)
			}
		}
		out = append(out, cand)
	}
	if nearest >= 0 {
		out[nearest].Nearest = true
	}
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.Allowed() != b.Allowed() {
			return a.Allowed()
		}
		if a.Nearest != b.Nearest {
			return a.Nearest
		}
		return a.Allowed() && a.AddedKm < b.AddedKm-1e-9
	})
	return out
}

// ChooseNearest picks, among the couriers allowed to take o, the one whose
// route grows the least when o is added ("nearest"). Ties go to the courier
// listed first. When nobody is allowed, ok is false and full holds the
// refusals of couriers who would fit except that they have no room left.
func ChooseNearest(o Order, couriers []Courier, orders []Order, hub Point) (choice Choice, ok bool, full []string) {
	for _, cand := range Candidates(o, couriers, orders, hub) {
		switch {
		case cand.Nearest:
			choice, ok = Choice{Courier: cand.Courier, AddedKm: cand.AddedKm}, true
		case !cand.Allowed() && cand.Refusal.IsCapacity():
			full = append(full, cand.Refusal.Message)
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
