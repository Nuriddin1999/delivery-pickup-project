package domain

import (
	"strings"
	"testing"
)

func TestParseKinds(t *testing.T) {
	got, err := ParseKinds([]string{"delivery", " Pickup ", "delivery"})
	if err != nil || len(got) != 2 || got[0] != Pickup || got[1] != Delivery {
		t.Errorf("got %v %v, want [pickup delivery] in that order without repeats", got, err)
	}
	for _, raw := range [][]string{nil, {}, {"fly"}, {"pickup", "return"}} {
		if _, err := ParseKinds(raw); err == nil {
			t.Errorf("%v: expected a field error", raw)
		}
	}
}

func TestCheckKindsChange(t *testing.T) {
	aziz := Courier{ID: "c1", Name: "Aziz", Kinds: []Kind{Pickup, Delivery}}
	orders := []Order{
		{ID: "o11", Type: Delivery, CourierID: "c1", AssignSeq: 2},
		{ID: "o02", Type: Delivery, CourierID: "c1", AssignSeq: 1},
		{ID: "o05", Type: Pickup, CourierID: "c9"}, // someone else's pickup
	}

	// Taking deliveries away while Aziz holds two is refused, oldest first in the message.
	r := CheckKindsChange(aziz, []Kind{Pickup}, orders)
	if r == nil || r.Code != CodeKindInUse || !strings.Contains(r.Message, "Aziz still has 2 deliveries: o02, o11. Take them off") {
		t.Fatalf("got %+v", r)
	}
	// One order reads in the singular.
	if r := CheckKindsChange(aziz, []Kind{Pickup}, orders[:1]); r == nil || !strings.Contains(r.Message, "1 delivery: o11. Take it off or move it first") {
		t.Errorf("singular: got %+v", r)
	}
	// Taking pickups away is fine: his orders are all deliveries.
	if r := CheckKindsChange(aziz, []Kind{Delivery}, orders); r != nil {
		t.Errorf("no pickups held, got %+v", r)
	}
	// Adding a kind is always fine.
	dilnoza := Courier{ID: "c2", Name: "Dilnoza", Kinds: []Kind{Pickup}}
	if r := CheckKindsChange(dilnoza, []Kind{Pickup, Delivery}, orders); r != nil {
		t.Errorf("adding a kind, got %+v", r)
	}
}
