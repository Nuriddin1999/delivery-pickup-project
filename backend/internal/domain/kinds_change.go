package domain

import (
	"sort"
	"strings"
)

// allKinds is the order kinds are stored and shown in.
var allKinds = []Kind{Pickup, Delivery}

// ParseKinds checks the kinds of work the dispatcher chose for a courier:
// known kinds only, at least one. Repeats are dropped and the result is in
// a fixed order (pickup, then delivery).
func ParseKinds(raw []string) ([]Kind, error) {
	kinds, msg := checkKinds(raw)
	if msg != "" {
		return nil, FieldError("kinds", msg)
	}
	out := make([]Kind, 0, len(kinds))
	for _, k := range allKinds {
		for _, chosen := range kinds {
			if chosen == k {
				out = append(out, k)
			}
		}
	}
	return out, nil
}

// CheckKindsChange refuses to take a kind of work away from a courier who
// still holds orders of that kind: they could not do them any more. The
// dispatcher takes those orders off or moves them first. Adding a kind is
// always allowed.
func CheckKindsChange(c Courier, kinds []Kind, orders []Order) *Refusal {
	for _, k := range c.Kinds {
		if containsKind(kinds, k) {
			continue
		}
		var held []Order
		for _, o := range orders {
			if o.CourierID == c.ID && o.Type == k {
				held = append(held, o)
			}
		}
		if len(held) == 0 {
			continue
		}
		sort.SliceStable(held, func(i, j int) bool { return held[i].AssignSeq < held[j].AssignSeq })
		ids := make([]string, len(held))
		for i, o := range held {
			ids[i] = o.ID
		}
		what := string(k)
		if len(held) > 1 {
			what = k.Plural()
		}
		return Refuse(CodeKindInUse, "%s still has %d %s: %s. Take them off or move them first",
			c.Name, len(held), what, strings.Join(ids, ", "))
	}
	return nil
}

func containsKind(kinds []Kind, k Kind) bool {
	for _, x := range kinds {
		if x == k {
			return true
		}
	}
	return false
}
