package store

import (
	"errors"
	"path/filepath"
	"testing"

	"delivery/internal/domain"
)

func seeded(t *testing.T) *Store {
	t.Helper()
	s, err := LoadFiles(filepath.Join("..", "..", "..", "data", "data.json"),
		filepath.Join("..", "..", "..", "data", "regions.geojson"))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func refusalCode(err error) string {
	var r *domain.Refusal
	if errors.As(err, &r) {
		return r.Code
	}
	return ""
}

func TestSeedBrokenOrdersAreFound(t *testing.T) {
	s := seeded(t)
	st := s.State()
	broken := map[string]bool{}
	for _, u := range st.Unassignable {
		if u.Broken {
			broken[u.OrderID] = true
		}
	}
	for _, id := range []string{"o08", "o15", "o16", "o20", "o03-2"} {
		if !broken[id] {
			t.Errorf("%s should be marked broken", id)
		}
	}
	// o06 had a messy region name; it is fixed up, not broken.
	if broken["o06"] {
		t.Error("o06 should be read as Chilonzor, not broken")
	}
	for _, id := range []string{"o08", "o15", "o16", "o20", "o03-2"} {
		for _, c := range st.Couriers {
			if _, err := s.Assign(id, c.ID); err == nil {
				t.Errorf("broken order %s was assigned to %s", id, c.Name)
			}
		}
	}
}

func TestSeedNeverAssignableHaveReasons(t *testing.T) {
	st := seeded(t).State()
	want := map[string]string{
		"o07": "No courier in Yashnobod does pickups",
		"o12": "No courier works in Bektemir",
	}
	got := map[string]string{}
	for _, u := range st.Unassignable {
		got[u.OrderID] = u.Reason
	}
	for id, reason := range want {
		if got[id] != reason {
			t.Errorf("%s: reason %q, want %q", id, got[id], reason)
		}
	}
	if got["o10"] == "" {
		t.Error("o10 (45 kg) should be listed as never assignable")
	}
}

func TestAssignRefusalsThroughStore(t *testing.T) {
	s := seeded(t)
	cases := []struct {
		order, courier, code string
	}{
		{"nope", "c1", domain.CodeNotFound},
		{"o01", "nope", domain.CodeNotFound},
		{"o04", "c4", domain.CodeInactive},    // Sardor is inactive
		{"o02", "c2", domain.CodeWrongKind},   // Dilnoza does pickups only
		{"o12", "c5", domain.CodeWrongRegion}, // Kamola not in Bektemir
		{"o10", "c1", domain.CodeWeightLimit}, // 45 kg > 40 kg
		{"o15", "c1", domain.CodeOrderBroken}, // type "return"
	}
	for _, c := range cases {
		_, err := s.Assign(c.order, c.courier)
		if got := refusalCode(err); got != c.code {
			t.Errorf("assign %s to %s: code %q, want %q (err %v)", c.order, c.courier, got, c.code, err)
		}
	}
}

func TestParcelLimitCountsPickupsAndDeliveriesTogether(t *testing.T) {
	s := seeded(t)
	// Kamola (c5) takes 3 parcels at most: one pickup and two deliveries.
	for _, id := range []string{"o18", "o04", "o14"} {
		if _, err := s.Assign(id, "c5"); err != nil {
			t.Fatalf("assign %s: %v", id, err)
		}
	}
	_, err := s.Assign("o09", "c5")
	if refusalCode(err) != domain.CodeParcelLimit {
		t.Fatalf("4th parcel: got %v, want parcel limit", err)
	}
}

func TestAssignTwiceAndUnassign(t *testing.T) {
	s := seeded(t)
	if _, err := s.Assign("o01", "c1"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Assign("o01", "c1"); refusalCode(err) != domain.CodeAlreadyAssigned {
		t.Errorf("second assign: %v", err)
	}
	if _, err := s.Unassign("o01"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Unassign("o01"); refusalCode(err) != domain.CodeNotAssigned {
		t.Errorf("second unassign: %v", err)
	}
}

func TestReassignMovesOrStays(t *testing.T) {
	s := seeded(t)
	if _, err := s.Assign("o01", "c1"); err != nil { // Aziz, Chilonzor pickup
		t.Fatal(err)
	}
	// Dilnoza does not work in Chilonzor: the order must stay with Aziz.
	if _, err := s.Assign("o01", "c2"); refusalCode(err) != domain.CodeWrongRegion {
		t.Fatalf("move to Dilnoza: %v", err)
	}
	if got := findOrder(s.State(), "o01").CourierID; got != "c1" {
		t.Fatalf("refused move changed the courier to %q", got)
	}
	// Kamola works in Chilonzor and does pickups: the move goes through.
	if _, err := s.Assign("o01", "c5"); err != nil {
		t.Fatal(err)
	}
	st := s.State()
	if findOrder(st, "o01").CourierID != "c5" || findCourier(st, "c1").Load.Parcels != 0 {
		t.Fatal("order was not moved cleanly")
	}
}

func TestRegionChangeKeepsOrdersAndMarksThem(t *testing.T) {
	s := seeded(t)
	if _, err := s.Assign("o01", "c1"); err != nil { // Chilonzor
		t.Fatal(err)
	}
	if _, err := s.Assign("o05", "c1"); err != nil { // Uchtepa
		t.Fatal(err)
	}
	c, err := s.SetRegions("c1", []string{" uchtepa", "Uchtepa", "Yakkasaroy"})
	if err != nil {
		t.Fatal(err)
	}
	if len(c.Regions) != 2 || c.Regions[0] != "Uchtepa" {
		t.Errorf("regions not normalized: %v", c.Regions)
	}
	st := s.State()
	if findOrder(st, "o01").CourierID != "c1" {
		t.Error("region change took the order away")
	}
	if !findOrder(st, "o01").OutsideRegions || findOrder(st, "o05").OutsideRegions {
		t.Error("only o01 should be marked outside the regions")
	}
	if got := findCourier(st, "c1").OutsideRegions; len(got) != 1 || got[0] != "o01" {
		t.Errorf("courier outside list = %v", got)
	}
	// But new Chilonzor orders are refused now.
	if _, err := s.Assign("o06", "c1"); refusalCode(err) != domain.CodeWrongRegion {
		t.Errorf("new order outside regions: %v", err)
	}
}

func TestRegionChangeRefusesUnknownRegion(t *testing.T) {
	s := seeded(t)
	_, err := s.SetRegions("c1", []string{"Chilonzor", "Olmazor"})
	var ve *domain.ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("expected validation error, got %v", err)
	}
	if got := findCourier(s.State(), "c1").Regions; len(got) != 2 || got[0] != "Chilonzor" {
		t.Errorf("refused change still changed regions: %v", got)
	}
	if _, err := s.SetRegions("nope", nil); refusalCode(err) != domain.CodeNotFound {
		t.Errorf("unknown courier: %v", err)
	}
}

func TestAddCourierRefusedAndAccepted(t *testing.T) {
	s := seeded(t)
	before := len(s.State().Couriers)
	if _, err := s.AddCourier(domain.NewCourierInput{Name: "Kamola"}); err == nil {
		t.Fatal("expected refusal")
	}
	if len(s.State().Couriers) != before {
		t.Fatal("refused courier was stored")
	}
	n, kg, lat, lng := 4, 20.0, 41.21, 69.33
	in := domain.NewCourierInput{Name: "Nodira", Kinds: []string{"delivery"}, Regions: []string{"Bektemir"}, MaxParcels: &n, MaxKg: &kg}
	in.Start = &struct {
		Lat *float64 `json:"lat"`
		Lng *float64 `json:"lng"`
	}{&lat, &lng}
	c, err := s.AddCourier(in)
	if err != nil {
		t.Fatal(err)
	}
	if c.ID != "c7" {
		t.Errorf("id = %s, want c7", c.ID)
	}
	if _, err := s.Assign("o12", c.ID); err != nil {
		t.Errorf("new Bektemir courier should take o12: %v", err)
	}
}

func TestAutoAssign(t *testing.T) {
	s := seeded(t)
	if _, err := s.Assign("o01", "c5"); err != nil { // a hand assignment to keep
		t.Fatal(err)
	}
	res := s.AutoAssign()
	st := s.State()
	if findOrder(st, "o01").CourierID != "c5" {
		t.Error("auto-assign changed a hand assignment")
	}
	for _, p := range res.Assigned {
		o, c := findOrder(st, p.OrderID), findCourier(st, p.CourierID)
		if c.Load.Parcels > c.MaxParcels || c.Load.Kg > c.MaxKg+1e-9 {
			t.Errorf("%s is over the limit", c.Name)
		}
		if !c.WorksIn(o.Region) || !c.Does(o.Type) || !c.Active {
			t.Errorf("%s given to %s who may not take it", o.ID, c.Name)
		}
	}
	unplaced := map[string]string{}
	for _, u := range res.Unplaced {
		unplaced[u.OrderID] = u.Reason
	}
	for _, id := range []string{"o07", "o08", "o10", "o12", "o15", "o16", "o20", "o03-2"} {
		if unplaced[id] == "" {
			t.Errorf("%s should be unplaced with a reason", id)
		}
	}
	for _, o := range st.Orders {
		if o.CourierID == "" && unplaced[o.ID] == "" {
			t.Errorf("%s is free but not listed as unplaced", o.ID)
		}
	}
	// Running again changes nothing.
	if again := s.AutoAssign(); len(again.Assigned) != 0 {
		t.Errorf("second run assigned %d more", len(again.Assigned))
	}
}

func findOrder(st State, id string) OrderView {
	for _, o := range st.Orders {
		if o.ID == id {
			return o
		}
	}
	return OrderView{}
}

func findCourier(st State, id string) CourierView {
	for _, c := range st.Couriers {
		if c.ID == id {
			return c
		}
	}
	return CourierView{}
}
