package seed

import (
	"path/filepath"
	"strings"
	"testing"
)

var dataDir = filepath.Join("..", "..", "..", "data")

func TestLoadFindsBrokenOrders(t *testing.T) {
	data, err := Load(filepath.Join(dataDir, "data.json"))
	if err != nil {
		t.Fatal(err)
	}
	if len(data.Couriers) != 6 || len(data.Orders) != 25 || data.City.Hub.Name != "Hub" {
		t.Fatalf("loaded %d couriers, %d orders, hub %q", len(data.Couriers), len(data.Orders), data.City.Hub.Name)
	}

	problems := map[string]string{}
	notes := map[string]string{}
	for _, o := range data.Orders {
		problems[o.ID] = strings.Join(o.Problems, "; ")
		notes[o.ID] = strings.Join(o.Notes, "; ")
	}
	want := map[string]string{
		"o08":   "Weight must be more than 0 kg",
		"o15":   `Order type "return" is not supported`,
		"o16":   `Unknown region "Olmazor"`,
		"o20":   "Missing coordinates",
		"o03-2": "Duplicate id: o03",
	}
	for id, prefix := range want {
		if !strings.HasPrefix(problems[id], prefix) {
			t.Errorf("%s problems = %q, want prefix %q", id, problems[id], prefix)
		}
	}
	if problems["o06"] != "" || !strings.Contains(notes["o06"], "read as Chilonzor") {
		t.Errorf("o06 should be fixed up with a note: problems %q, notes %q", problems["o06"], notes["o06"])
	}
	if problems["o03"] != "" {
		t.Error("the first o03 is the valid one")
	}
}

func TestLoadShapes(t *testing.T) {
	raw, err := LoadShapes(filepath.Join(dataDir, "regions.geojson"))
	if err != nil || !strings.Contains(string(raw), "FeatureCollection") {
		t.Fatalf("shapes: %v", err)
	}
}
