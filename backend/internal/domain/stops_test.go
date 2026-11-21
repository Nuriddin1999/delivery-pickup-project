package domain

import (
	"testing"
	"time"
)

// Kamola holds pickup p1, pickup p2 and delivery d1; the route visits
// start → p1 → p2 → hub → d1.
func kamolaDay() (Courier, []Order) {
	at := func(lat float64) *Point { return &Point{lat, 69.2} }
	orders := []Order{
		{ID: "p1", Type: Pickup, Region: "Sergeli", Location: at(41.30), CourierID: "c5", AssignSeq: 1},
		{ID: "d1", Type: Delivery, Region: "Sergeli", Location: at(41.31), CourierID: "c5", AssignSeq: 2},
		{ID: "p2", Type: Pickup, Region: "Sergeli", Location: at(41.32), CourierID: "c5", AssignSeq: 3},
		{ID: "x1", Type: Pickup, Region: "Sergeli", Location: at(41.33), CourierID: "c1", AssignSeq: 4},
	}
	return kamola(), orders
}

func markDone(orders []Order, ids ...string) {
	for i := range orders {
		for _, id := range ids {
			if orders[i].ID == id {
				orders[i].DoneAt = time.Date(2026, 11, 21, 10, 0, 0, 0, time.UTC)
			}
		}
	}
}

func TestCanMarkDone(t *testing.T) {
	tests := []struct {
		name     string
		done     []string // already done before the check
		order    string
		wantCode string // "" means allowed
		wantMsg  string
	}{
		{"first stop", nil, "p1", "", ""},
		{"next stop after the first", []string{"p1"}, "p2", "", ""},
		{"delivery once every pickup is done", []string{"p1", "p2"}, "d1", "", ""},
		{"skipping a stop", nil, "p2", CodeOutOfOrder, "Do stop 1 (order p1) first: stops go in route order"},
		{"delivery before the pickups", []string{"p1"}, "d1", CodeOutOfOrder, "Do stop 2 (order p2) first: stops go in route order"},
		{"twice", []string{"p1"}, "p1", CodeAlreadyDone, "Order p1 is already done"},
		{"another courier's order", nil, "x1", CodeNotYourOrder, "Order x1 is not on Kamola's route"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, orders := kamolaDay()
			markDone(orders, tt.done...)
			route := PlanRoute(c, Point{41.31, 69.28}, orders)
			var o Order
			for _, x := range orders {
				if x.ID == tt.order {
					o = x
				}
			}

			r := CanMarkDone(c, o, route, orders)
			if tt.wantCode == "" {
				if r != nil {
					t.Fatalf("expected allowed, got %q", r.Message)
				}
				return
			}
			if r == nil {
				t.Fatalf("expected refusal %s, got allowed", tt.wantCode)
			}
			if r.Code != tt.wantCode || r.Message != tt.wantMsg {
				t.Errorf("got %s %q, want %s %q", r.Code, r.Message, tt.wantCode, tt.wantMsg)
			}
		})
	}
}

func TestDoneOrderCannotLeaveAndMarksPastHub(t *testing.T) {
	_, orders := kamolaDay()
	if r := CanRelease(orders[0]); r != nil {
		t.Fatalf("a stop not done yet may move, got %q", r.Message)
	}
	markDone(orders, "p1")
	if r := CanRelease(orders[0]); r == nil || r.Code != CodeOrderDone {
		t.Fatalf("a done stop must stay with its courier, got %v", r)
	}

	if LoadOf("c5", orders).PastHub {
		t.Error("a done pickup does not mean the courier left the hub")
	}
	markDone(orders, "p2", "d1")
	if !LoadOf("c5", orders).PastHub {
		t.Error("a done delivery means the courier has left the hub")
	}
}
