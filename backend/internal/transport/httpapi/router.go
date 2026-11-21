// Package httpapi is the HTTP adapter: it decodes requests into use case
// calls and encodes the results as JSON. Every error answer carries a
// plain-language "error" message that the page shows as it is.
package httpapi

import (
	"net/http"

	"delivery/internal/domain"
	"delivery/internal/usecase"
)

// Dispatcher is what the HTTP layer needs from the use cases.
type Dispatcher interface {
	Overview() usecase.Overview
	AddCourier(draft domain.CourierDraft) (domain.Courier, error)
	SetCourierRegions(courierID string, regions []string) (domain.Courier, error)
	AssignOrder(orderID, courierID string) (domain.Order, error)
	UnassignOrder(orderID string) (domain.Order, error)
	AutoAssign() usecase.AutoAssignResult
	OrderCandidates(orderID string) ([]domain.Candidate, error)
}

type handlers struct {
	dispatcher Dispatcher
	shapes     []byte // regions.geojson, served as it is
}

// NewRouter returns all routes. If staticDir is set, the built page is
// served from it too, so one process runs everything.
func NewRouter(d Dispatcher, shapes []byte, staticDir string) http.Handler {
	h := &handlers{dispatcher: d, shapes: shapes}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/state", h.getState)
	mux.HandleFunc("GET /api/regions.geojson", h.getShapes)
	mux.HandleFunc("POST /api/couriers", h.addCourier)
	mux.HandleFunc("PUT /api/couriers/{id}/regions", h.setRegions)
	mux.HandleFunc("GET /api/orders/{id}/candidates", h.getCandidates)
	mux.HandleFunc("PUT /api/orders/{id}/courier", h.assignOrder)
	mux.HandleFunc("DELETE /api/orders/{id}/courier", h.unassignOrder)
	mux.HandleFunc("POST /api/auto-assign", h.autoAssign)
	mux.HandleFunc("/api/", notFound)

	if staticDir != "" {
		mux.Handle("/", singlePageApp(staticDir))
	}
	return logRequests(mux)
}
