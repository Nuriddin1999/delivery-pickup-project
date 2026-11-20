// Package usecase holds what the dispatcher can do: assign and move orders,
// change regions, add couriers, auto-assign, and see the overview. It uses
// the domain rules and talks to storage only through Repository, so the
// storage can change without touching this package.
package usecase

import "delivery/internal/domain"

// Repository is the storage the use cases need. Implementations return
// copies, so callers can change what they get without side effects.
type Repository interface {
	Couriers() []domain.Courier
	Courier(id string) (domain.Courier, bool)
	// SaveCourier adds the courier or replaces the one with the same ID.
	SaveCourier(c domain.Courier)
	NextCourierID() string

	Orders() []domain.Order
	Order(id string) (domain.Order, bool)
	// SaveOrder replaces the order with the same ID.
	SaveOrder(o domain.Order)
	// NextAssignSeq returns a number larger than any handed out before; it
	// orders a courier's stops by when they were given.
	NextAssignSeq() int
}
