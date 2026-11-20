package domain

import (
	"fmt"
	"strings"
)

// Hub is the warehouse every parcel passes through.
type Hub struct {
	Name  string
	Point Point
}

// City is the fixed map the service works on: one hub and its regions.
type City struct {
	Hub     Hub
	Regions []string
}

// CanonicalRegion finds the region whose name matches s ignoring case and
// extra spaces, so " chilonzor " is read as "Chilonzor".
func (c City) CanonicalRegion(s string) (name string, ok bool) {
	want := strings.Join(strings.Fields(strings.ToLower(s)), " ")
	for _, r := range c.Regions {
		if strings.ToLower(r) == want {
			return r, true
		}
	}
	return "", false
}

// NormalizeRegions maps each name to its canonical spelling and drops
// repeats. An unknown name is an error.
func (c City) NormalizeRegions(in []string) ([]string, error) {
	out := []string{}
	seen := map[string]bool{}
	for _, s := range in {
		name, ok := c.CanonicalRegion(s)
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
