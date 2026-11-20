package domain

import "slices"

// Courier works only in their regions, only on their kinds of work, and
// carries at most MaxParcels parcels and MaxKg kilograms a day.
type Courier struct {
	ID         string
	Name       string
	Active     bool
	Kinds      []Kind
	Regions    []string
	MaxParcels int
	MaxKg      float64
	Start      Point
}

// Does reports whether the courier does this kind of work.
func (c Courier) Does(k Kind) bool { return slices.Contains(c.Kinds, k) }

// WorksIn reports whether the region is one of the courier's regions.
func (c Courier) WorksIn(region string) bool { return slices.Contains(c.Regions, region) }

// Clone returns a copy that shares no slices with c.
func (c Courier) Clone() Courier {
	c.Kinds = slices.Clone(c.Kinds)
	c.Regions = slices.Clone(c.Regions)
	return c
}
