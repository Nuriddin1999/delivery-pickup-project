package usecase_test

import (
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"delivery/internal/domain"
	"delivery/internal/repository/memory"
	"delivery/internal/seed"
	"delivery/internal/usecase"
)

// newDispatcher runs the use cases on the real seed data.
func newDispatcher(t *testing.T) *usecase.Dispatcher {
	t.Helper()
	data, err := seed.Load(filepath.Join("..", "..", "..", "data", "data.json"))
	if err != nil {
		t.Fatal(err)
	}
	return usecase.NewDispatcher(data.City, memory.New(data.Couriers, data.Orders))
}

func refusalCode(err error) string {
	var r *domain.Refusal
	if errors.As(err, &r) {
		return r.Code
	}
	return ""
}

func TestBrokenOrdersAreListedAndNeverAssigned(t *testing.T) {
	d := newDispatcher(t)
	ov := d.Overview()
	broken := map[string]bool{}
	for _, u := range ov.Unassignable {
		if u.Broken {
			broken[u.OrderID] = true
		}
	}
	for _, id := range []string{"o08", "o15", "o16", "o20", "o03-2"} {
		if !broken[id] {
			t.Errorf("%s should be listed as broken", id)
		}
		for _, c := range ov.Couriers {
			if _, err := d.AssignOrder(id, c.Courier.ID); err == nil {
				t.Errorf("broken order %s was assigned to %s", id, c.Courier.Name)
			}
		}
	}
	if broken["o06"] {
		t.Error("o06 should be read as Chilonzor, not broken")
	}
}

func TestNeverAssignableOrdersHaveReasons(t *testing.T) {
	ov := newDispatcher(t).Overview()
	got := map[string]string{}
	for _, u := range ov.Unassignable {
		got[u.OrderID] = u.Reason
	}
	want := map[string]string{
		"o07": "No courier in Yashnobod does pickups",
		"o12": "No courier works in Bektemir",
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

func TestAssignRefusals(t *testing.T) {
	d := newDispatcher(t)
	cases := []struct{ order, courier, code string }{
		{"nope", "c1", domain.CodeNotFound},
		{"o01", "nope", domain.CodeNotFound},
		{"o04", "c4", domain.CodeInactive},    // Sardor is inactive
		{"o02", "c2", domain.CodeWrongKind},   // Dilnoza does pickups only
		{"o12", "c5", domain.CodeWrongRegion}, // Kamola is not in Bektemir
		{"o10", "c1", domain.CodeWeightLimit}, // 45 kg > 40 kg
		{"o15", "c1", domain.CodeOrderBroken}, // type "return"
	}
	for _, c := range cases {
		_, err := d.AssignOrder(c.order, c.courier)
		if got := refusalCode(err); got != c.code {
			t.Errorf("assign %s to %s: code %q, want %q (err %v)", c.order, c.courier, got, c.code, err)
		}
	}
}

func TestParcelLimitCountsPickupsAndDeliveriesTogether(t *testing.T) {
	d := newDispatcher(t)
	// Kamola (c5) takes 3 parcels at most: one pickup and two deliveries.
	for _, id := range []string{"o18", "o04", "o14"} {
		if _, err := d.AssignOrder(id, "c5"); err != nil {
			t.Fatalf("assign %s: %v", id, err)
		}
	}
	if _, err := d.AssignOrder("o09", "c5"); refusalCode(err) != domain.CodeParcelLimit {
		t.Fatalf("4th parcel: got %v, want parcel limit", err)
	}
}

func TestAssignTwiceAndUnassign(t *testing.T) {
	d := newDispatcher(t)
	if _, err := d.AssignOrder("o01", "c1"); err != nil {
		t.Fatal(err)
	}
	if _, err := d.AssignOrder("o01", "c1"); refusalCode(err) != domain.CodeAlreadyAssigned {
		t.Errorf("second assign: %v", err)
	}
	if _, err := d.UnassignOrder("o01"); err != nil {
		t.Fatal(err)
	}
	if _, err := d.UnassignOrder("o01"); refusalCode(err) != domain.CodeNotAssigned {
		t.Errorf("second unassign: %v", err)
	}
}

func TestReassignMovesOrStays(t *testing.T) {
	d := newDispatcher(t)
	if _, err := d.AssignOrder("o01", "c1"); err != nil { // Aziz, Chilonzor pickup
		t.Fatal(err)
	}
	// Dilnoza does not work in Chilonzor: the order must stay with Aziz.
	if _, err := d.AssignOrder("o01", "c2"); refusalCode(err) != domain.CodeWrongRegion {
		t.Fatalf("move to Dilnoza: %v", err)
	}
	if got := findOrder(d.Overview(), "o01").Order.CourierID; got != "c1" {
		t.Fatalf("refused move changed the courier to %q", got)
	}
	// Kamola works in Chilonzor and does pickups: the move goes through.
	if _, err := d.AssignOrder("o01", "c5"); err != nil {
		t.Fatal(err)
	}
	ov := d.Overview()
	if findOrder(ov, "o01").Order.CourierID != "c5" || findCourier(ov, "c1").Load.Parcels != 0 {
		t.Fatal("order was not moved cleanly")
	}
}

func TestRegionChangeKeepsOrdersAndMarksThem(t *testing.T) {
	d := newDispatcher(t)
	for _, id := range []string{"o01", "o05"} { // Chilonzor, Uchtepa
		if _, err := d.AssignOrder(id, "c1"); err != nil {
			t.Fatal(err)
		}
	}
	c, err := d.SetCourierRegions("c1", []string{" uchtepa", "Uchtepa", "Yakkasaroy"})
	if err != nil {
		t.Fatal(err)
	}
	if len(c.Regions) != 2 || c.Regions[0] != "Uchtepa" {
		t.Errorf("regions not normalized: %v", c.Regions)
	}

	ov := d.Overview()
	if findOrder(ov, "o01").Order.CourierID != "c1" {
		t.Error("region change took the order away")
	}
	if !findOrder(ov, "o01").OutsideRegions || findOrder(ov, "o05").OutsideRegions {
		t.Error("only o01 should be marked outside the regions")
	}
	if got := findCourier(ov, "c1").OutsideRegions; len(got) != 1 || got[0] != "o01" {
		t.Errorf("courier outside list = %v", got)
	}
	// New Chilonzor orders are refused now.
	if _, err := d.AssignOrder("o06", "c1"); refusalCode(err) != domain.CodeWrongRegion {
		t.Errorf("new order outside regions: %v", err)
	}
}

func TestRegionChangeRefusesUnknownRegion(t *testing.T) {
	d := newDispatcher(t)
	_, err := d.SetCourierRegions("c1", []string{"Chilonzor", "Olmazor"})
	var ve *domain.ValidationError
	if !errors.As(err, &ve) {
		t.Fatalf("expected validation error, got %v", err)
	}
	if got := findCourier(d.Overview(), "c1").Courier.Regions; len(got) != 2 || got[0] != "Chilonzor" {
		t.Errorf("refused change still changed regions: %v", got)
	}
	if _, err := d.SetCourierRegions("nope", nil); refusalCode(err) != domain.CodeNotFound {
		t.Errorf("unknown courier: %v", err)
	}
}

func TestAddCourierRefusedAndAccepted(t *testing.T) {
	d := newDispatcher(t)
	before := len(d.Overview().Couriers)
	if _, err := d.AddCourier(domain.CourierDraft{Name: "Kamola"}); err == nil {
		t.Fatal("expected refusal")
	}
	if len(d.Overview().Couriers) != before {
		t.Fatal("refused courier was stored")
	}

	n, kg, lat, lng := 4, 20.0, 41.21, 69.33
	c, err := d.AddCourier(domain.CourierDraft{Name: "Nodira", Kinds: []string{"delivery"}, Regions: []string{"Bektemir"},
		MaxParcels: &n, MaxKg: &kg, Lat: &lat, Lng: &lng})
	if err != nil {
		t.Fatal(err)
	}
	if c.ID != "c7" {
		t.Errorf("id = %s, want c7", c.ID)
	}
	if _, err := d.AssignOrder("o12", c.ID); err != nil {
		t.Errorf("new Bektemir courier should take o12: %v", err)
	}
}

func TestAutoAssign(t *testing.T) {
	d := newDispatcher(t)
	if _, err := d.AssignOrder("o01", "c5"); err != nil { // a hand assignment to keep
		t.Fatal(err)
	}
	res := d.AutoAssign()
	ov := d.Overview()
	if findOrder(ov, "o01").Order.CourierID != "c5" {
		t.Error("auto-assign changed a hand assignment")
	}
	for _, p := range res.Assigned {
		o, c := findOrder(ov, p.OrderID).Order, findCourier(ov, p.CourierID)
		if c.Load.Parcels > c.Courier.MaxParcels || c.Load.Kg > c.Courier.MaxKg+1e-9 {
			t.Errorf("%s is over the limit", c.Courier.Name)
		}
		if !c.Courier.WorksIn(o.Region) || !c.Courier.Does(o.Type) || !c.Courier.Active {
			t.Errorf("%s given to %s who may not take it", o.ID, c.Courier.Name)
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
	for _, o := range ov.Orders {
		if !o.Order.Assigned() && unplaced[o.Order.ID] == "" {
			t.Errorf("%s is free but not listed as unplaced", o.Order.ID)
		}
	}
	if again := d.AutoAssign(); len(again.Assigned) != 0 {
		t.Errorf("second run assigned %d more", len(again.Assigned))
	}
}

func findOrder(ov usecase.Overview, id string) usecase.OrderOverview {
	for _, o := range ov.Orders {
		if o.Order.ID == id {
			return o
		}
	}
	return usecase.OrderOverview{}
}

func findCourier(ov usecase.Overview, id string) usecase.CourierOverview {
	for _, c := range ov.Couriers {
		if c.Courier.ID == id {
			return c
		}
	}
	return usecase.CourierOverview{}
}

// kindsOf finds a courier's kinds in the overview.
func kindsOf(d *usecase.Dispatcher, courierID string) []domain.Kind {
	for _, c := range d.Overview().Couriers {
		if c.Courier.ID == courierID {
			return c.Courier.Kinds
		}
	}
	return nil
}

func TestKindsChange(t *testing.T) {
	d := newDispatcher(t)

	// Dilnoza (c2) does pickups only, so a delivery in her region is refused.
	if _, err := d.AssignOrder("o02", "c2"); refusalCode(err) != domain.CodeWrongKind {
		t.Fatalf("before: want wrong_kind, got %v", err)
	}

	// Adding deliveries is allowed, and then she can take one.
	if c, err := d.SetCourierKinds("c2", []string{"pickup", "delivery"}); err != nil || len(c.Kinds) != 2 {
		t.Fatalf("add delivery: %v %v", c.Kinds, err)
	}
	if _, err := d.AssignOrder("o02", "c2"); err != nil {
		t.Fatalf("assign after adding delivery: %v", err)
	}

	// Taking deliveries away while she holds o02 is refused and changes nothing.
	_, err := d.SetCourierKinds("c2", []string{"pickup"})
	if refusalCode(err) != domain.CodeKindInUse || !strings.Contains(err.Error(), "o02") {
		t.Fatalf("remove while held: want kind_in_use naming o02, got %v", err)
	}
	if got := kindsOf(d, "c2"); len(got) != 2 {
		t.Errorf("a refused change must not be stored, kinds = %v", got)
	}

	// Once o02 is taken off, deliveries can go.
	if _, err := d.UnassignOrder("o02"); err != nil {
		t.Fatal(err)
	}
	if c, err := d.SetCourierKinds("c2", []string{"pickup"}); err != nil || len(c.Kinds) != 1 || c.Kinds[0] != domain.Pickup {
		t.Fatalf("remove after taking off: %v %v", c.Kinds, err)
	}

	// A courier needs at least one kind, known kinds only, and must exist.
	var invalid *domain.ValidationError
	for _, raw := range [][]string{{}, {"fly"}} {
		if _, err := d.SetCourierKinds("c2", raw); !errors.As(err, &invalid) {
			t.Errorf("%v: want a validation error, got %v", raw, err)
		}
	}
	if _, err := d.SetCourierKinds("c99", []string{"pickup"}); refusalCode(err) != domain.CodeNotFound {
		t.Errorf("unknown courier: got %v", err)
	}
}
