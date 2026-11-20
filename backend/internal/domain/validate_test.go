package domain

import (
	"errors"
	"strings"
	"testing"
)

var testRegions = []string{"Chilonzor", "Sergeli", "Mirzo Ulug'bek"}

func validInput() NewCourierInput {
	in := NewCourierInput{Name: "  Nodira  ", Kinds: []string{"pickup"}, Regions: []string{"sergeli"}}
	n, kg, lat, lng := 5, 20.5, 41.3, 69.25
	in.MaxParcels, in.MaxKg = &n, &kg
	in.Start = &struct {
		Lat *float64 `json:"lat"`
		Lng *float64 `json:"lng"`
	}{&lat, &lng}
	return in
}

func TestValidateNewCourierOK(t *testing.T) {
	c, err := ValidateNewCourier(validInput(), testRegions, nil)
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

func TestValidateNewCourierRefusals(t *testing.T) {
	zero, neg, tooMany := 0, -1.0, 101
	far := 55.75
	cases := []struct {
		name  string
		edit  func(*NewCourierInput)
		field string
		msg   string
	}{
		{"empty name", func(in *NewCourierInput) { in.Name = "   " }, "name", "Name is required"},
		{"long name", func(in *NewCourierInput) { in.Name = strings.Repeat("a", 51) }, "name", "at most 50"},
		{"taken name", func(in *NewCourierInput) { in.Name = "kamola" }, "name", "already a courier called Kamola"},
		{"no kinds", func(in *NewCourierInput) { in.Kinds = nil }, "kinds", "at least one"},
		{"bad kind", func(in *NewCourierInput) { in.Kinds = []string{"return"} }, "kinds", "Unknown kind"},
		{"missing max_parcels", func(in *NewCourierInput) { in.MaxParcels = nil }, "max_parcels", "required"},
		{"zero max_parcels", func(in *NewCourierInput) { in.MaxParcels = &zero }, "max_parcels", "from 1 to 100"},
		{"too many parcels", func(in *NewCourierInput) { in.MaxParcels = &tooMany }, "max_parcels", "from 1 to 100"},
		{"negative max_kg", func(in *NewCourierInput) { in.MaxKg = &neg }, "max_kg", "more than 0"},
		{"missing start", func(in *NewCourierInput) { in.Start = nil }, "start", "required"},
		{"start outside Tashkent", func(in *NewCourierInput) { in.Start.Lat = &far }, "start", "Tashkent area"},
		{"unknown region", func(in *NewCourierInput) { in.Regions = []string{"Olmazor"} }, "regions", `Unknown region "Olmazor"`},
	}
	existing := []*Courier{{Name: "Kamola"}}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			in := validInput()
			c.edit(&in)
			_, err := ValidateNewCourier(in, testRegions, existing)
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
