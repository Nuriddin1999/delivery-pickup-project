package seed

import (
	"fmt"
	"math"
	"strings"
	"time"

	"delivery/internal/domain"
)

// toDomain turns a seed order into an order, recording every problem instead
// of failing. usedIDs makes repeated ids unique: the second "o03" becomes
// "o03-2" and is marked broken.
func (in orderJSON) toDomain(city domain.City, usedIDs map[string]int) domain.Order {
	o := domain.Order{SeedID: in.ID, Type: domain.Kind(in.Type), Region: in.Region}
	problem := func(format string, args ...any) { o.Problems = append(o.Problems, fmt.Sprintf(format, args...)) }

	o.ID = uniqueID(in.ID, usedIDs, problem)

	if !o.Type.Valid() {
		problem("Unknown order type %q (expected pickup or delivery)", in.Type)
	}

	if name, ok := city.CanonicalRegion(in.Region); !ok {
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

func uniqueID(raw string, used map[string]int, problem func(string, ...any)) string {
	id := strings.TrimSpace(raw)
	if id == "" {
		id = "order"
		problem("Order has no id")
	}
	used[id]++
	if n := used[id]; n > 1 {
		problem("Duplicate id: %s is already used by an earlier order", id)
		return fmt.Sprintf("%s-%d", id, n)
	}
	return id
}
