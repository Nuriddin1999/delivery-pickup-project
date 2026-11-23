package httpapi

import (
	"bytes"
	"io"
	"net/http"
	"strings"

	"delivery/internal/domain"
	"delivery/internal/usecase"
)

func (h *handlers) getState(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, toStateResponse(h.dispatcher.Overview()))
}

func (h *handlers) getShapes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/geo+json")
	w.Write(h.shapes)
}

func (h *handlers) addCourier(w http.ResponseWriter, r *http.Request) {
	var req newCourierRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	c, err := h.dispatcher.AddCourier(req.toDraft())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, toCourierResponse(c))
}

func (h *handlers) setRegions(w http.ResponseWriter, r *http.Request) {
	var req setRegionsRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Regions == nil {
		writeError(w, domain.FieldError("regions", "regions is required (send [] for none)"))
		return
	}
	c, err := h.dispatcher.SetCourierRegions(r.PathValue("id"), *req.Regions)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toCourierResponse(c))
}

func (h *handlers) setKinds(w http.ResponseWriter, r *http.Request) {
	var req setKindsRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Kinds == nil {
		writeError(w, domain.FieldError("kinds", "kinds is required: pickup, delivery or both"))
		return
	}
	c, err := h.dispatcher.SetCourierKinds(r.PathValue("id"), *req.Kinds)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toCourierResponse(c))
}

func (h *handlers) assignOrder(w http.ResponseWriter, r *http.Request) {
	var req assignRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.CourierID) == "" {
		writeError(w, domain.FieldError("courier_id", "Choose a courier"))
		return
	}
	o, err := h.dispatcher.AssignOrder(r.PathValue("id"), req.CourierID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toOrderResponse(o, false))
}

func (h *handlers) unassignOrder(w http.ResponseWriter, r *http.Request) {
	o, err := h.dispatcher.UnassignOrder(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toOrderResponse(o, false))
}

func (h *handlers) getCandidates(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	cands, err := h.dispatcher.OrderCandidates(id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toCandidatesResponse(id, cands))
}

// planAutoAssign shows what auto-assign would do, changing nothing.
func (h *handlers) planAutoAssign(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, toAutoAssignResponse(h.dispatcher.PlanAutoAssign()))
}

// autoAssign with {"assignments": [...]} gives out exactly that confirmed
// plan, all or nothing. With no body it plans and gives out in one step.
func (h *handlers) autoAssign(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Code: "bad_request", Error: "The request body is too large"})
		return
	}
	if len(bytes.TrimSpace(body)) == 0 {
		writeJSON(w, http.StatusOK, toAutoAssignResponse(h.dispatcher.AutoAssign()))
		return
	}

	r.Body = io.NopCloser(bytes.NewReader(body))
	var req applyPlanRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Assignments == nil {
		writeError(w, domain.FieldError("assignments", "assignments is required: the plan to give out"))
		return
	}
	plan := make([]usecase.PlanItem, len(*req.Assignments))
	for i, a := range *req.Assignments {
		plan[i] = usecase.PlanItem{OrderID: a.OrderID, CourierID: a.CourierID}
	}
	res, err := h.dispatcher.ApplyAutoAssign(plan)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toAutoAssignResponse(res))
}

// markStopDone takes no body: the path says who marks which stop.
func (h *handlers) markStopDone(w http.ResponseWriter, r *http.Request) {
	o, err := h.dispatcher.MarkStopDone(r.PathValue("id"), r.PathValue("orderId"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toOrderResponse(o, false))
}

func notFound(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotFound, errorResponse{Code: domain.CodeNotFound, Error: "No such API endpoint: " + r.Method + " " + r.URL.Path})
}
