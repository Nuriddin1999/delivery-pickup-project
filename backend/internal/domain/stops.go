package domain

// CanMarkDone checks the rules for courier c marking the stop of order o
// done. route is c's route for today and orders holds every order, so the
// earlier stops can be looked up. It returns nil when the courier may.
//
// The rules, checked in this order:
//   - the order is on this courier's route;
//   - it is not done already;
//   - every stop before it on the route is done (stops go in route order:
//     pickups, then the hub, then deliveries).
func CanMarkDone(c Courier, o Order, route Route, orders []Order) *Refusal {
	if o.CourierID != c.ID {
		return Refuse(CodeNotYourOrder, "Order %s is not on %s's route", o.ID, c.Name)
	}
	if o.Done() {
		return Refuse(CodeAlreadyDone, "Order %s is already done", o.ID)
	}

	done := map[string]bool{}
	for _, x := range orders {
		if x.Done() {
			done[x.ID] = true
		}
	}
	n := 0 // stop number as the courier sees it: order stops only, from 1
	for _, s := range route.Stops {
		if s.OrderID == "" {
			continue
		}
		n++
		if s.OrderID == o.ID {
			return nil
		}
		if !done[s.OrderID] {
			return Refuse(CodeOutOfOrder, "Do stop %d (order %s) first: stops go in route order", n, s.OrderID)
		}
	}
	// Held but not on the route: only an order without a location, and such
	// orders can never be assigned. Refuse rather than guess.
	return Refuse(CodeNotYourOrder, "Order %s is not on %s's route", o.ID, c.Name)
}

// CanRelease checks that a held order may leave its courier (be taken off or
// moved). A done order stays where it is: the parcel has already been
// picked up or delivered.
func CanRelease(o Order) *Refusal {
	if o.Done() {
		return Refuse(CodeOrderDone, "Order %s is already done, so it stays with its courier", o.ID)
	}
	return nil
}
