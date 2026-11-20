// Package api is the HTTP layer: it decodes requests, calls the store and
// turns its errors into JSON with a plain-language "error" message.
package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"delivery/internal/domain"
	"delivery/internal/store"
)

const maxBody = 64 << 10

type Server struct {
	store *store.Store
}

// Handler returns all routes. If staticDir is set, the built page is served
// from it too, so one process runs everything.
func Handler(s *store.Store, staticDir string) http.Handler {
	srv := &Server{store: s}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/state", srv.getState)
	mux.HandleFunc("GET /api/regions.geojson", srv.getGeoJSON)
	mux.HandleFunc("POST /api/couriers", srv.addCourier)
	mux.HandleFunc("PUT /api/couriers/{id}/regions", srv.setRegions)
	mux.HandleFunc("PUT /api/orders/{id}/courier", srv.assign)
	mux.HandleFunc("DELETE /api/orders/{id}/courier", srv.unassign)
	mux.HandleFunc("POST /api/auto-assign", srv.autoAssign)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "No such API endpoint: " + r.Method + " " + r.URL.Path})
	})
	if staticDir != "" {
		mux.Handle("/", spa(staticDir))
	}
	return logRequests(mux)
}

func (srv *Server) getState(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, srv.store.State())
}

func (srv *Server) getGeoJSON(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/geo+json")
	w.Write(srv.store.GeoJSON())
}

func (srv *Server) addCourier(w http.ResponseWriter, r *http.Request) {
	var in domain.NewCourierInput
	if !decode(w, r, &in) {
		return
	}
	c, err := srv.store.AddCourier(in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (srv *Server) setRegions(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Regions *[]string `json:"regions"`
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Regions == nil {
		writeError(w, &domain.ValidationError{Fields: map[string]string{"regions": "regions is required (send [] for none)"}})
		return
	}
	c, err := srv.store.SetRegions(r.PathValue("id"), *in.Regions)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (srv *Server) assign(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CourierID string `json:"courier_id"`
	}
	if !decode(w, r, &in) {
		return
	}
	if strings.TrimSpace(in.CourierID) == "" {
		writeError(w, &domain.ValidationError{Fields: map[string]string{"courier_id": "Choose a courier"}})
		return
	}
	o, err := srv.store.Assign(r.PathValue("id"), in.CourierID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (srv *Server) unassign(w http.ResponseWriter, r *http.Request) {
	o, err := srv.store.Unassign(r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (srv *Server) autoAssign(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, srv.store.AutoAssign())
}

// ---- helpers ----

// decode reads a JSON body strictly and answers 400 with a readable message
// when it is not usable.
func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBody))
	dec.DisallowUnknownFields()
	err := dec.Decode(dst)
	if err == nil && dec.More() {
		err = errors.New("body must hold a single JSON object")
	}
	if err == nil {
		return true
	}
	var typeErr *json.UnmarshalTypeError
	var syntaxErr *json.SyntaxError
	var tooBig *http.MaxBytesError
	msg := "Could not read the request: " + err.Error()
	fields := map[string]string{}
	switch {
	case errors.Is(err, io.EOF):
		msg = "The request body is empty; send a JSON object"
	case errors.As(err, &syntaxErr):
		msg = "The request body is not valid JSON"
	case errors.As(err, &tooBig):
		msg = "The request body is too large"
	case errors.As(err, &typeErr):
		field := typeErr.Field
		msg = fmt.Sprintf("%s has the wrong type: %s", field, describeType(typeErr.Type.String()))
		if field != "" {
			fields[strings.Split(field, ".")[0]] = msg
		}
	case strings.HasPrefix(err.Error(), "json: unknown field"):
		msg = "Unknown field " + strings.TrimPrefix(err.Error(), "json: unknown field ")
	}
	writeJSON(w, http.StatusBadRequest, map[string]any{"code": "bad_request", "error": msg, "fields": fields})
	return false
}

func describeType(goType string) string {
	switch strings.TrimPrefix(goType, "*") {
	case "int":
		return "expected a whole number"
	case "float64":
		return "expected a number"
	case "string":
		return "expected text"
	case "bool":
		return "expected true or false"
	case "[]string":
		return "expected a list of text"
	}
	return "expected " + goType
}

func writeError(w http.ResponseWriter, err error) {
	var refusal *domain.Refusal
	var invalid *domain.ValidationError
	switch {
	case errors.As(err, &refusal):
		status := http.StatusConflict
		if refusal.Code == domain.CodeNotFound {
			status = http.StatusNotFound
		}
		writeJSON(w, status, refusal)
	case errors.As(err, &invalid):
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"code": "invalid", "error": invalid.Error(), "fields": invalid.Fields,
		})
	default:
		log.Printf("internal error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Something went wrong on the server"})
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write response: %v", err)
	}
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			log.Printf("%s %s", r.Method, r.URL.Path)
		}
		next.ServeHTTP(w, r)
	})
}

// spa serves files from dir and falls back to index.html for page routes.
func spa(dir string) http.Handler {
	files := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(dir, filepath.FromSlash(filepath.Clean("/"+r.URL.Path)))
		if st, err := os.Stat(p); err != nil || st.IsDir() {
			http.ServeFile(w, r, filepath.Join(dir, "index.html"))
			return
		}
		files.ServeHTTP(w, r)
	})
}
