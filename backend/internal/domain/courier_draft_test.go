package domain

import (
	"errors"
	"strings"
	"testing"
)

var testCity = City{Regions: []string{"Chilonzor", "Sergeli", "Mirzo Ulug'bek"}}

func validDraft() CourierDraft {
	n, kg, lat, lng := 5, 20.5, 41.3, 69.25
	return CourierDraft{Name: "  Nodira  ", Kinds: []string{"pickup"}, Regions: []string{"sergeli"},
		MaxParcels: &n, MaxKg: &kg, Lat: &lat, Lng: &lng}
}

func TestNewCourierOK(t *testing.T) {
	c, err := NewCourier(validDraft(), testCity, nil)
	if err != nil {
		t.Fatal(err)
	}
	if c.Name != "Nodira" || !c.Active || c.MaxParcels != 5 || c.MaxKg != 20.5 {
		t.Errorf("unexpected courier %+v", c)
	}
	if len(c.Regions) != 1 || c.Regions[0] != "Sergeli" {
		t.Errorf("region should be canonical, got %v", c.Regions)
	}
}

func TestNewCourierRefusals(t *testing.T) {
	zero, neg, tooMany := 0, -1.0, 101
	far := 55.75
	cases := []struct {
		name  string
		edit  func(*CourierDraft)
		field string
		msg   string
	}{
		{"empty name", func(d *CourierDraft) { d.Name = "   " }, "name", "Name is required"},
		{"long name", func(d *CourierDraft) { d.Name = strings.Repeat("a", 51) }, "name", "at most 50"},
		{"taken name", func(d *CourierDraft) { d.Name = "kamola" }, "name", "already a courier called Kamola"},
		{"no kinds", func(d *CourierDraft) { d.Kinds = nil }, "kinds", "at least one"},
		{"bad kind", func(d *CourierDraft) { d.Kinds = []string{"return"} }, "kinds", "Unknown kind"},
		{"missing max_parcels", func(d *CourierDraft) { d.MaxParcels = nil }, "max_parcels", "required"},
		{"zero max_parcels", func(d *CourierDraft) { d.MaxParcels = &zero }, "max_parcels", "from 1 to 100"},
		{"too many parcels", func(d *CourierDraft) { d.MaxParcels = &tooMany }, "max_parcels", "from 1 to 100"},
		{"negative max_kg", func(d *CourierDraft) { d.MaxKg = &neg }, "max_kg", "more than 0"},
		{"missing start", func(d *CourierDraft) { d.Lat = nil }, "start", "required"},
		{"start outside Tashkent", func(d *CourierDraft) { d.Lat = &far }, "start", "Tashkent area"},
		{"unknown region", func(d *CourierDraft) { d.Regions = []string{"Olmazor"} }, "regions", `Unknown region "Olmazor"`},
	}
	existing := []Courier{{Name: "Kamola"}}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			d := validDraft()
			c.edit(&d)
			_, err := NewCourier(d, testCity, existing)
			var ve *ValidationError
			if !errors.As(err, &ve) {
				t.Fatalf("expected a validation error, got %v", err)
			}
			if !strings.Contains(ve.Fields[c.field], c.msg) {
				t.Errorf("fields[%s] = %q, want it to contain %q (all: %v)", c.field, ve.Fields[c.field], c.msg, ve.Fields)
			}
		})
	}
}

func TestCityRegions(t *testing.T) {
	if name, ok := testCity.CanonicalRegion("  mirzo   ULUG'BEK "); !ok || name != "Mirzo Ulug'bek" {
		t.Errorf("got %q %v", name, ok)
	}
	got, err := testCity.NormalizeRegions([]string{"sergeli", "Sergeli", "chilonzor"})
	if err != nil || len(got) != 2 {
		t.Errorf("got %v %v", got, err)
	}
}
