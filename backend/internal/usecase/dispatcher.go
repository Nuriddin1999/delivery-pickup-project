package usecase

import (
	"sync"

	"delivery/internal/domain"
)

// Dispatcher runs every use case. One lock around each change makes a rule
// check and the change it allows happen as one step, so two requests can
// never both take the last free space of a courier.
type Dispatcher struct {
	mu   sync.RWMutex
	city domain.City
	repo Repository
}

// NewDispatcher works on the given city and storage.
func NewDispatcher(city domain.City, repo Repository) *Dispatcher {
	return &Dispatcher{city: city, repo: repo}
}
