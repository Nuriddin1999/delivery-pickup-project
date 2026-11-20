package domain

import (
	"fmt"
	"math"
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

// CourierDraft is a new courier as the dispatcher typed it. Pointers tell a
// missing field apart from a zero value.
type CourierDraft struct {
	Name       string
	Active     *bool
	Kinds      []string
	Regions    []string
	MaxParcels *int
	MaxKg      *float64
	Lat, Lng   *float64
}

// NewCourier checks a draft and returns a courier without an ID. existing is
// used to refuse a name that is already taken: refusal messages use names,
// so two couriers with one name would be ambiguous.
func NewCourier(d CourierDraft, city City, existing []Courier) (Courier, error) {
	errs := map[string]string{}
	c := Courier{Active: true, Kinds: []Kind{}, Regions: []string{}}

	if name, msg := checkName(d.Name, existing); msg != "" {
		errs["name"] = msg
	} else {
		c.Name = name
	}

	if d.Active != nil {
		c.Active = *d.Active
	}

	if kinds, msg := checkKinds(d.Kinds); msg != "" {
		errs["kinds"] = msg
	} else {
		c.Kinds = kinds
	}

	switch {
	case d.MaxParcels == nil:
		errs["max_parcels"] = "Max parcels is required"
	case *d.MaxParcels < 1 || *d.MaxParcels > MaxParcelsLimit:
		errs["max_parcels"] = fmt.Sprintf("Max parcels must be a whole number from 1 to %d", MaxParcelsLimit)
	default:
		c.MaxParcels = *d.MaxParcels
	}

	switch {
	case d.MaxKg == nil:
		errs["max_kg"] = "Max kg is required"
	case math.IsNaN(*d.MaxKg) || *d.MaxKg <= 0 || *d.MaxKg > MaxKgLimit:
		errs["max_kg"] = fmt.Sprintf("Max kg must be more than 0 and at most %s", FormatKg(MaxKgLimit))
	default:
		c.MaxKg = *d.MaxKg
	}

	switch {
	case d.Lat == nil || d.Lng == nil:
		errs["start"] = "Start point is required: click the map or type lat and lng"
	case !inServiceArea(*d.Lat, *d.Lng):
		errs["start"] = fmt.Sprintf("Start point must be in the Tashkent area (lat %g to %g, lng %g to %g)",
			ServiceMinLat, ServiceMaxLat, ServiceMinLng, ServiceMaxLng)
	default:
		c.Start = Point{Lat: *d.Lat, Lng: *d.Lng}
	}

	if rs, err := city.NormalizeRegions(d.Regions); err != nil {
		errs["regions"] = err.Error()
	} else {
		c.Regions = rs
	}

	if len(errs) > 0 {
		return Courier{}, &ValidationError{Fields: errs}
	}
	return c, nil
}

func checkName(raw string, existing []Courier) (name, problem string) {
	name = strings.Join(strings.Fields(raw), " ")
	switch {
	case name == "":
		return "", "Name is required"
	case len([]rune(name)) > MaxNameLen:
		return "", fmt.Sprintf("Name must be at most %d characters", MaxNameLen)
	}
	for _, e := range existing {
		if strings.EqualFold(e.Name, name) {
			return "", fmt.Sprintf("There is already a courier called %s", e.Name)
		}
	}
	return name, ""
}

func checkKinds(raw []string) ([]Kind, string) {
	kinds := []Kind{}
	seen := map[Kind]bool{}
	for _, s := range raw {
		k := Kind(strings.ToLower(strings.TrimSpace(s)))
		if !k.Valid() {
			return nil, fmt.Sprintf("Unknown kind of work %q: use pickup or delivery", s)
		}
		if !seen[k] {
			seen[k] = true
			kinds = append(kinds, k)
		}
	}
	if len(kinds) == 0 {
		return nil, "Choose at least one kind of work: pickup or delivery"
	}
	return kinds, ""
}

func inServiceArea(lat, lng float64) bool {
	return lat >= ServiceMinLat && lat <= ServiceMaxLat && lng >= ServiceMinLng && lng <= ServiceMaxLng
}
