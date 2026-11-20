package usecase

import "delivery/internal/domain"

// AddCourier checks the draft and stores a new courier.
func (d *Dispatcher) AddCourier(draft domain.CourierDraft) (domain.Courier, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	c, err := domain.NewCourier(draft, d.city, d.repo.Couriers())
	if err != nil {
		return domain.Courier{}, err
	}
	c.ID = d.repo.NextCourierID()
	d.repo.SaveCourier(c)
	return c, nil
}

// SetCourierRegions replaces a courier's regions. Orders the courier already
// holds stay with them; the overview marks those now outside their regions.
func (d *Dispatcher) SetCourierRegions(courierID string, regions []string) (domain.Courier, error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	c, ok := d.repo.Courier(courierID)
	if !ok {
		return domain.Courier{}, domain.NotFound("courier", courierID)
	}
	normalized, err := d.city.NormalizeRegions(regions)
	if err != nil {
		return domain.Courier{}, domain.FieldError("regions", err.Error())
	}

	c.Regions = normalized
	d.repo.SaveCourier(c)
	return c, nil
}
