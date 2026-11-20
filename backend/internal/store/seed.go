package store

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"strings"
	"time"

	"delivery/internal/domain"
)

// Seed is data.json as written. Order fields are loose on purpose: some
// seed orders are broken and must still load.
type Seed struct {
	Hub struct {
		Name string  `json:"name"`
		Lat  float64 `json:"lat"`
		Lng  float64 `json:"lng"`
	} `json:"hub"`
	Regions  []string          `json:"regions"`
	Couriers []*domain.Courier `json:"couriers"`
	Orders   []SeedOrder       `json:"orders"`
}

type SeedOrder struct {
	ID        string   `json:"id"`
	Type      string   `json:"type"`
	Region    string   `json:"region"`
	Lat       *float64 `json:"lat"`
	Lng       *float64 `json:"lng"`
	WeightKg  *float64 `json:"weight_kg"`
	CreatedAt string   `json:"created_at"`
}

// LoadFiles reads data.json and regions.geojson and builds a store.
func LoadFiles(dataPath, geoPath string) (*Store, error) {
	raw, err := os.ReadFile(dataPath)
	if err != nil {
		return nil, err
	}
	var seed Seed
	if err := json.Unmarshal(raw, &seed); err != nil {
		return nil, fmt.Errorf("%s: %w", dataPath, err)
	}
	geo, err := os.ReadFile(geoPath)
	if err != nil {
		return nil, err
	}
	if !json.Valid(geo) {
		return nil, fmt.Errorf("%s: not valid JSON", geoPath)
	}
	return New(seed, geo), nil
}

// checkOrder turns a seed order into an order, recording every problem
// instead of failing. usedIDs makes repeated ids unique.
func checkOrder(in SeedOrder, regions []string, usedIDs map[string]int) *domain.Order {
	o := &domain.Order{SeedID: in.ID, Type: domain.Kind(in.Type), Region: in.Region}
	problem := func(f string, a ...any) { o.Problems = append(o.Problems, fmt.Sprintf(f, a...)) }

	id := strings.TrimSpace(in.ID)
	if id == "" {
		id = "order"
		problem("Order has no id")
	}
	usedIDs[id]++
	if n := usedIDs[id]; n > 1 {
		problem("Duplicate id: %s is already used by an earlier order", id)
		id = fmt.Sprintf("%s-%d", id, n)
	}
	o.ID = id

	if !o.Type.Valid() {
		problem("Unknown order type %q (expected pickup or delivery)", in.Type)
	}

	if name, ok := domain.CanonicalRegion(regions, in.Region); !ok {
		problem("Unknown region %q", in.Region)
	} else {
		if name != in.Region {
			o.Notes = append(o.Notes, fmt.Sprintf("Region was written as %q, read as %s", in.Region, name))
		}
		o.Region = name
	}

	switch {
	case in.Lat == nil || in.Lng == nil:
		problem("Missing coordinates")
	case math.Abs(*in.Lat) > 90 || math.Abs(*in.Lng) > 180:
		problem("Coordinates out of range (%g, %g)", *in.Lat, *in.Lng)
	default:
		o.Location = &domain.Point{Lat: *in.Lat, Lng: *in.Lng}
	}

	switch {
	case in.WeightKg == nil:
		problem("Missing weight")
	case *in.WeightKg <= 0:
		problem("Weight must be more than 0 kg (it is %s kg)", domain.FormatKg(*in.WeightKg))
	default:
		o.WeightKg = *in.WeightKg
	}

	if t, err := time.Parse(time.RFC3339, in.CreatedAt); err == nil {
		o.CreatedAt = t
	} else {
		o.Notes = append(o.Notes, fmt.Sprintf("Unreadable created_at %q", in.CreatedAt))
	}
	return o
}
