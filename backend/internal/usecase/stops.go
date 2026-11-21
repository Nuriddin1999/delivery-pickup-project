package usecase

import "delivery/internal/domain"

// MarkStopDone is the courier marking the stop of one of their orders done.
// The rules are in domain.CanMarkDone; the check and the change happen under
// one lock, so two taps cannot both pass.
func (d *Dispatcher) MarkStopDone(courierID, orderID string) (domain.Order, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	c, ok := d.repo.Courier(courierID)
	if !ok {
		return domain.Order{}, domain.NotFound("courier", courierID)
	}
	o, ok := d.repo.Order(orderID)
	if !ok {
		return domain.Order{}, domain.NotFound("order", orderID)
	}
	orders := d.repo.Orders()
	route := domain.PlanRoute(c, d.city.Hub.Point, orders)
	if r := domain.CanMarkDone(c, o, route, orders); r != nil {
		return domain.Order{}, r
	}

	o.DoneAt = d.now()
	d.repo.SaveOrder(o)
	return o, nil
}
