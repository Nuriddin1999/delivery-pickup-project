package usecase

import "delivery/internal/domain"

// AssignOrder gives an order to a courier. If another courier holds the
// order it is moved in one step; when the new courier is not allowed, the
// order stays where it was.
func (d *Dispatcher) AssignOrder(orderID, courierID string) (domain.Order, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	o, ok := d.repo.Order(orderID)
	if !ok {
		return domain.Order{}, domain.NotFound("order", orderID)
	}
	c, ok := d.repo.Courier(courierID)
	if !ok {
		return domain.Order{}, domain.NotFound("courier", courierID)
	}
	if o.Assigned() {
		if r := domain.CanRelease(o); r != nil {
			return domain.Order{}, r
		}
	}
	if o.CourierID == c.ID {
		return domain.Order{}, domain.Refuse(domain.CodeAlreadyAssigned, "Order %s is already with %s", o.ID, c.Name)
	}
	if r := domain.CanTake(c, o, domain.LoadOf(c.ID, d.repo.Orders())); r != nil {
		return domain.Order{}, r
	}

	o.AssignTo(c.ID, d.repo.NextAssignSeq())
	d.repo.SaveOrder(o)
	return o, nil
}

// UnassignOrder takes an order off its courier.
func (d *Dispatcher) UnassignOrder(orderID string) (domain.Order, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	o, ok := d.repo.Order(orderID)
	if !ok {
		return domain.Order{}, domain.NotFound("order", orderID)
	}
	if !o.Assigned() {
		return domain.Order{}, domain.Refuse(domain.CodeNotAssigned, "Order %s has no courier", o.ID)
	}
	if r := domain.CanRelease(o); r != nil {
		return domain.Order{}, r
	}

	o.Unassign()
	d.repo.SaveOrder(o)
	return o, nil
}
