package usecase

import "delivery/internal/domain"

// OrderCandidates lists every courier the order could go to, allowed ones
// first with the km they would add, refused ones with the reason. It only
// reads; AssignOrder checks the rules again when the dispatcher picks one.
func (d *Dispatcher) OrderCandidates(orderID string) ([]domain.Candidate, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	o, ok := d.repo.Order(orderID)
	if !ok {
		return nil, domain.NotFound("order", orderID)
	}
	return domain.Candidates(o, d.repo.Couriers(), d.repo.Orders(), d.city.Hub.Point), nil
}
