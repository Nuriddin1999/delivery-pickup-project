package domain

import (
	"fmt"
	"sort"
	"strings"
)

// tiny tolerance so 12.1 + 2.9 <= 15 is not refused by float rounding
const kgEpsilon = 1e-9

// CanTake checks every rule for giving order o to courier c, who already
// carries load. It returns nil when the courier may take the order. The
// rules are checked in a fixed order and the first broken one is reported.
func CanTake(c Courier, o Order, load Load) *Refusal {
	switch {
	case o.Broken():
		return Refuse(CodeOrderBroken, "Order %s cannot be assigned: %s", o.ID, strings.Join(o.Problems, "; "))
	case !c.Active:
		return Refuse(CodeInactive, "%s is not active today", c.Name)
	case !c.Does(o.Type):
		return Refuse(CodeWrongKind, "%s does not do %s", c.Name, o.Type.Plural())
	case !c.WorksIn(o.Region):
		return Refuse(CodeWrongRegion, "%s does not work in %s", c.Name, o.Region)
	case o.Type == Pickup && load.PastHub:
		return Refuse(CodePastHub, "%s has already left the hub with deliveries, so a new pickup does not fit today's route", c.Name)
	case load.Parcels+1 > c.MaxParcels:
		return Refuse(CodeParcelLimit, "%s has no room: already %d of %d parcels today",
			c.Name, load.Parcels, c.MaxParcels)
	case load.Kg+o.WeightKg > c.MaxKg+kgEpsilon:
		return Refuse(CodeWeightLimit, "%s cannot carry %s kg more: already %s of %s kg today",
			c.Name, FormatKg(o.WeightKg), FormatKg(load.Kg), FormatKg(c.MaxKg))
	}
	return nil
}

// WhyNobodyCanTake explains why no courier could take o even with an empty
// day. It returns "" when at least one courier could. Broken orders return
// their problems.
func WhyNobodyCanTake(couriers []Courier, o Order) string {
	if o.Broken() {
		return strings.Join(o.Problems, "; ")
	}

	inRegion := filter(couriers, func(c Courier) bool { return c.WorksIn(o.Region) })
	if len(inRegion) == 0 {
		return fmt.Sprintf("No courier works in %s", o.Region)
	}
	withKind := filter(inRegion, func(c Courier) bool { return c.Does(o.Type) })
	if len(withKind) == 0 {
		return fmt.Sprintf("No courier in %s does %s", o.Region, o.Type.Plural())
	}
	active := filter(withKind, func(c Courier) bool { return c.Active })
	if len(active) == 0 {
		return fmt.Sprintf("Every courier who could take it is inactive: %s", names(withKind))
	}

	maxKg := 0.0
	for _, c := range active {
		if c.MaxParcels >= 1 && o.WeightKg <= c.MaxKg+kgEpsilon {
			return ""
		}
		maxKg = max(maxKg, c.MaxKg)
	}
	return fmt.Sprintf("Weighs %s kg, more than any suitable courier can carry in a day (at most %s kg)",
		FormatKg(o.WeightKg), FormatKg(maxKg))
}

func filter(cs []Courier, keep func(Courier) bool) []Courier {
	var out []Courier
	for _, c := range cs {
		if keep(c) {
			out = append(out, c)
		}
	}
	return out
}

func names(cs []Courier) string {
	out := make([]string, len(cs))
	for i, c := range cs {
		out[i] = c.Name
	}
	sort.Strings(out)
	return strings.Join(out, ", ")
}
