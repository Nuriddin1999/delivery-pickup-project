// Package memory is an in-memory implementation of usecase.Repository.
// Data is lost on restart, which the task allows.
package memory

import (
	"fmt"
	"sync"

	"delivery/internal/domain"
)

type Repository struct {
	mu       sync.RWMutex
	couriers []domain.Courier
	orders   []domain.Order
	seq      int
}

// New starts the repository with the given data, keeping its order.
func New(couriers []domain.Courier, orders []domain.Order) *Repository {
	r := &Repository{}
	for _, c := range couriers {
		r.couriers = append(r.couriers, c.Clone())
	}
	for _, o := range orders {
		r.orders = append(r.orders, o.Clone())
		r.seq = max(r.seq, o.AssignSeq)
	}
	return r
}

func (r *Repository) Couriers() []domain.Courier {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]domain.Courier, len(r.couriers))
	for i, c := range r.couriers {
		out[i] = c.Clone()
	}
	return out
}

func (r *Repository) Courier(id string) (domain.Courier, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if i := r.courierIndex(id); i >= 0 {
		return r.couriers[i].Clone(), true
	}
	return domain.Courier{}, false
}

func (r *Repository) SaveCourier(c domain.Courier) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if i := r.courierIndex(c.ID); i >= 0 {
		r.couriers[i] = c.Clone()
		return
	}
	r.couriers = append(r.couriers, c.Clone())
}

// NextCourierID returns the first free id of the form c1, c2, ...
func (r *Repository) NextCourierID() string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for n := len(r.couriers) + 1; ; n++ {
		if id := fmt.Sprintf("c%d", n); r.courierIndex(id) < 0 {
			return id
		}
	}
}

func (r *Repository) Orders() []domain.Order {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]domain.Order, len(r.orders))
	for i, o := range r.orders {
		out[i] = o.Clone()
	}
	return out
}

func (r *Repository) Order(id string) (domain.Order, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if i := r.orderIndex(id); i >= 0 {
		return r.orders[i].Clone(), true
	}
	return domain.Order{}, false
}

func (r *Repository) SaveOrder(o domain.Order) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if i := r.orderIndex(o.ID); i >= 0 {
		r.orders[i] = o.Clone()
	}
}

func (r *Repository) NextAssignSeq() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.seq++
	return r.seq
}

func (r *Repository) courierIndex(id string) int {
	for i, c := range r.couriers {
		if c.ID == id {
			return i
		}
	}
	return -1
}

func (r *Repository) orderIndex(id string) int {
	for i, o := range r.orders {
		if o.ID == id {
			return i
		}
	}
	return -1
}
