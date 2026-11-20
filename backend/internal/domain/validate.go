package domain

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

// Limits for a new courier. The page uses the same numbers.
const (
	MaxNameLen      = 50
	MaxParcelsLimit = 100
	MaxKgLimit      = 500.0
	ServiceMinLat   = 41.0
	ServiceMaxLat   = 41.6
	ServiceMinLng   = 69.0
	ServiceMaxLng   = 69.6
)

// ValidationError lists problems per field, e.g. {"name": "Name is required"}.
type ValidationError struct {
	Fields map[string]string `json:"fields"`
}

func (e *ValidationError) Error() string {
	keys := make([]string, 0, len(e.Fields))
	for k := range e.Fields {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	msgs := make([]string, len(keys))
	for i, k := range keys {
		msgs[i] = e.Fields[k]
	}
	return strings.Join(msgs, "; ")
}

// NewCourierInput is what a client sends to add a courier. Pointers tell a
// missing field apart from a zero value.
type NewCourierInput struct {
	Name       string   `json:"name"`
	Active     *bool    `json:"active"`
	Kinds      []string `json:"kinds"`
	Regions    []string `json:"regions"`
	MaxParcels *int     `json:"max_parcels"`
	MaxKg      *float64 `json:"max_kg"`
	Start      *struct {
		Lat *float64 `json:"lat"`
		Lng *float64 `json:"lng"`
	} `json:"start"`
}

// ValidateNewCourier checks the input and returns a courier without an ID.
// existing is used to refuse a name that is already taken.
func ValidateNewCourier(in NewCourierInput, regions []string, existing []*Courier) (*Courier, error) {
	errs := map[string]string{}
	c := &Courier{Active: true, Kinds: []Kind{}, Regions: []string{}}

	c.Name = strings.Join(strings.Fields(in.Name), " ")
	switch {
	case c.Name == "":
		errs["name"] = "Name is required"
	case len([]rune(c.Name)) > MaxNameLen:
		errs["name"] = fmt.Sprintf("Name must be at most %d characters", MaxNameLen)
	default:
		for _, e := range existing {
			if strings.EqualFold(e.Name, c.Name) {
				errs["name"] = fmt.Sprintf("There is already a courier called %s", e.Name)
				break
			}
		}
	}

	if in.Active != nil {
		c.Active = *in.Active
	}

	seen := map[Kind]bool{}
	for _, s := range in.Kinds {
		k := Kind(strings.ToLower(strings.TrimSpace(s)))
		if !k.Valid() {
			errs["kinds"] = fmt.Sprintf("Unknown kind of work %q: use pickup or delivery", s)
			break
		}
		if !seen[k] {
			seen[k] = true
			c.Kinds = append(c.Kinds, k)
		}
	}
	if _, bad := errs["kinds"]; !bad && len(c.Kinds) == 0 {
		errs["kinds"] = "Choose at least one kind of work: pickup or delivery"
	}

	switch {
	case in.MaxParcels == nil:
		errs["max_parcels"] = "Max parcels is required"
	case *in.MaxParcels < 1 || *in.MaxParcels > MaxParcelsLimit:
		errs["max_parcels"] = fmt.Sprintf("Max parcels must be a whole number from 1 to %d", MaxParcelsLimit)
	default:
		c.MaxParcels = *in.MaxParcels
	}

	switch {
	case in.MaxKg == nil:
		errs["max_kg"] = "Max kg is required"
	case math.IsNaN(*in.MaxKg) || *in.MaxKg <= 0 || *in.MaxKg > MaxKgLimit:
		errs["max_kg"] = fmt.Sprintf("Max kg must be more than 0 and at most %s", FormatKg(MaxKgLimit))
	default:
		c.MaxKg = *in.MaxKg
	}

	switch {
	case in.Start == nil || in.Start.Lat == nil || in.Start.Lng == nil:
		errs["start"] = "Start point is required: click the map or type lat and lng"
	case *in.Start.Lat < ServiceMinLat || *in.Start.Lat > ServiceMaxLat ||
		*in.Start.Lng < ServiceMinLng || *in.Start.Lng > ServiceMaxLng:
		errs["start"] = fmt.Sprintf("Start point must be in the Tashkent area (lat %g to %g, lng %g to %g)",
			ServiceMinLat, ServiceMaxLat, ServiceMinLng, ServiceMaxLng)
	default:
		c.Start = Point{Lat: *in.Start.Lat, Lng: *in.Start.Lng}
	}

	if rs, err := NormalizeRegions(regions, in.Regions); err != nil {
		errs["regions"] = err.Error()
	} else {
		c.Regions = rs
	}

	if len(errs) > 0 {
		return nil, &ValidationError{Fields: errs}
	}
	return c, nil
}

// NormalizeRegions maps each name to its canonical spelling and drops
// repeats. An unknown name is an error.
func NormalizeRegions(known, in []string) ([]string, error) {
	out := []string{}
	seen := map[string]bool{}
	for _, s := range in {
		name, ok := CanonicalRegion(known, s)
		if !ok {
			return nil, fmt.Errorf("Unknown region %q", s)
		}
		if !seen[name] {
			seen[name] = true
			out = append(out, name)
		}
	}
	return out, nil
}
