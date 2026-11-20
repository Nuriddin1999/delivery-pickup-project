package domain

import (
	"fmt"
	"sort"
	"strings"
)

// Refusal codes. The page shows Message; Code is for tests and clients.
const (
	CodeNotFound        = "not_found"
	CodeOrderBroken     = "order_broken"
	CodeAlreadyAssigned = "already_assigned"
	CodeNotAssigned     = "not_assigned"
	CodeInactive        = "courier_inactive"
	CodeWrongKind       = "wrong_kind"
	CodeWrongRegion     = "wrong_region"
	CodeParcelLimit     = "parcel_limit"
	CodeWeightLimit     = "weight_limit"
)

// Refusal is a rule the request broke, with a sentence for the dispatcher.
type Refusal struct {
	Code    string `json:"code"`
	Message string `json:"error"`
}

func (r *Refusal) Error() string { return r.Message }

func refuse(code, format string, args ...any) *Refusal {
	return &Refusal{Code: code, Message: fmt.Sprintf(format, args...)}
}

// tiny tolerance so 12.1 + 2.9 <= 15 is not refused by float rounding
const kgEpsilon = 1e-9

// CanTake checks every rule for giving order o to courier c, who already
// carries load. It returns nil when the courier may take the order.
func CanTake(c *Courier, o *Order, load Load) *Refusal {
	if o.Broken() {
		return refuse(CodeOrderBroken, "Order %s cannot be assigned: %s", o.ID, strings.Join(o.Problems, "; "))
	}
	if !c.Active {
		return refuse(CodeInactive, "%s is not active today", c.Name)
	}
	if !c.Does(o.Type) {
		return refuse(CodeWrongKind, "%s does not do %s", c.Name, o.Type.Plural())
	}
	if !c.WorksIn(o.Region) {
		return refuse(CodeWrongRegion, "%s does not work in %s", c.Name, o.Region)
	}
	if load.Parcels+1 > c.MaxParcels {
		return refuse(CodeParcelLimit, "%s has no room: already %d of %d parcels today",
			c.Name, load.Parcels, c.MaxParcels)
	}
	if load.Kg+o.WeightKg > c.MaxKg+kgEpsilon {
		return refuse(CodeWeightLimit, "%s cannot carry %s kg more: already %s of %s kg today",
			c.Name, FormatKg(o.WeightKg), FormatKg(load.Kg), FormatKg(c.MaxKg))
	}
	return nil
}

// WhyNobodyCanTake explains why no courier could take o even with an empty
// day. It returns "" when at least one courier could. Broken orders return
// their problems.
func WhyNobodyCanTake(couriers []*Courier, o *Order) string {
	if o.Broken() {
		return strings.Join(o.Problems, "; ")
	}
	var inRegion, withKind, active []*Courier
	for _, c := range couriers {
		if c.WorksIn(o.Region) {
			inRegion = append(inRegion, c)
		}
	}
	if len(inRegion) == 0 {
		return fmt.Sprintf("No courier works in %s", o.Region)
	}
	for _, c := range inRegion {
		if c.Does(o.Type) {
			withKind = append(withKind, c)
		}
	}
	if len(withKind) == 0 {
		return fmt.Sprintf("No courier in %s does %s", o.Region, o.Type.Plural())
	}
	for _, c := range withKind {
		if c.Active {
			active = append(active, c)
		}
	}
	if len(active) == 0 {
		return fmt.Sprintf("Every courier who could take it is inactive: %s", names(withKind))
	}
	maxKg := 0.0
	for _, c := range active {
		if c.MaxParcels >= 1 && o.WeightKg <= c.MaxKg+kgEpsilon {
			return ""
		}
		if c.MaxKg > maxKg {
			maxKg = c.MaxKg
		}
	}
	return fmt.Sprintf("Weighs %s kg, more than any suitable courier can carry in a day (at most %s kg)",
		FormatKg(o.WeightKg), FormatKg(maxKg))
}

func names(cs []*Courier) string {
	out := make([]string, len(cs))
	for i, c := range cs {
		out[i] = c.Name
	}
	sort.Strings(out)
	return strings.Join(out, ", ")
}
