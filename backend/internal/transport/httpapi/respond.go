package httpapi

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"delivery/internal/domain"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write response: %v", err)
	}
}

// writeError maps domain errors to status codes:
// 404 unknown order or courier, 409 rule refusal, 400 invalid input.
func writeError(w http.ResponseWriter, err error) {
	var refusal *domain.Refusal
	var invalid *domain.ValidationError
	switch {
	case errors.As(err, &refusal):
		status := http.StatusConflict
		if refusal.Code == domain.CodeNotFound {
			status = http.StatusNotFound
		}
		writeJSON(w, status, errorResponse{Code: refusal.Code, Error: refusal.Message})
	case errors.As(err, &invalid):
		writeJSON(w, http.StatusBadRequest, errorResponse{Code: "invalid", Error: invalid.Error(), Fields: invalid.Fields})
	default:
		log.Printf("internal error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Code: "internal", Error: "Something went wrong on the server"})
	}
}
