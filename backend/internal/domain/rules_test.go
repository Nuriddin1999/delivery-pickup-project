package domain

import (
	"strings"
	"testing"
)

func kamola() Courier {
	return Courier{ID: "c5", Name: "Kamola", Active: true,
		Kinds: []Kind{Pickup, Delivery}, Regions: []string{"Sergeli", "Chilonzor"},
		MaxParcels: 3, MaxKg: 15}
}

func order(kind Kind, region string, kg float64) Order {
	return Order{ID: "o1", Type: kind, Region: region, WeightKg: kg, Location: &Point{41.3, 69.2}}
}

func TestCanTake(t *testing.T) {
	pickupOnly := kamola()
	pickupOnly.Kinds = []Kind{Pickup}
	inactive := kamola()
	inactive.Active = false
	broken := order(Delivery, "Sergeli", 1)
	broken.Problems = []string{"Missing coordinates"}

	tests := []struct {
		name     string
		courier  Courier
		order    Order
		load     Load
		wantCode string // "" means allowed
		wantMsg  string
	}{
		{"allowed", kamola(), order(Delivery, "Sergeli", 2), Load{}, "", ""},
		{"exactly fills both limits", kamola(), order(Pickup, "Sergeli", 5), Load{2, 10}, "", ""},
		{"float sums do not cause false refusals", kamola(), order(Pickup, "Sergeli", 2.9), Load{1, 12.1}, "", ""},
		{"broken order", kamola(), broken, Load{}, CodeOrderBroken, "Order o1 cannot be assigned: Missing coordinates"},
		{"inactive courier", inactive, order(Delivery, "Sergeli", 1), Load{}, CodeInactive, "Kamola is not active today"},
		{"wrong kind", pickupOnly, order(Delivery, "Sergeli", 1), Load{}, CodeWrongKind, "Kamola does not do deliveries"},
		{"wrong region", kamola(), order(Delivery, "Bektemir", 1), Load{}, CodeWrongRegion, "Kamola does not work in Bektemir"},
		{"parcel limit", kamola(), order(Delivery, "Sergeli", 1), Load{3, 3}, CodeParcelLimit, "Kamola has no room: already 3 of 3 parcels today"},
		{"weight limit", kamola(), order(Delivery, "Sergeli", 6), Load{1, 12}, CodeWeightLimit, "Kamola cannot carry 6 kg more: already 12 of 15 kg today"},
		{"pickups and deliveries share one limit", kamola(), order(Pickup, "Sergeli", 1), Load{3, 4}, CodeParcelLimit, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := CanTake(tt.courier, tt.order, tt.load)
			if tt.wantCode == "" {
				if r != nil {
					t.Fatalf("expected allowed, got %q", r.Message)
				}
				return
			}
			if r == nil {
				t.Fatalf("expected refusal %s, got allowed", tt.wantCode)
			}
			if r.Code != tt.wantCode {
				t.Errorf("code = %s, want %s", r.Code, tt.wantCode)
			}
			if tt.wantMsg != "" && r.Message != tt.wantMsg {
				t.Errorf("message = %q, want %q", r.Message, tt.wantMsg)
			}
		})
	}
}

func TestWhyNobodyCanTake(t *testing.T) {
	sardor := Courier{Name: "Sardor", Active: false, Kinds: []Kind{Pickup, Delivery}, Regions: []string{"Sergeli"}, MaxParcels: 8, MaxKg: 40}
	bekzod := Courier{Name: "Bekzod", Active: true, Kinds: []Kind{Delivery}, Regions: []string{"Yashnobod"}, MaxParcels: 5, MaxKg: 25}
	all := []Courier{kamola(), sardor, bekzod}

	cases := []struct {
		name  string
		order Order
		want  string
	}{
		{"someone can", order(Delivery, "Sergeli", 1), ""},
		{"no one in region", order(Delivery, "Bektemir", 1), "No courier works in Bektemir"},
		{"no one does the kind", order(Pickup, "Yashnobod", 1), "No courier in Yashnobod does pickups"},
		{"too heavy for everyone", order(Pickup, "Chilonzor", 45), "Weighs 45 kg"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := WhyNobodyCanTake(all, c.order)
			if c.want == "" && got != "" || !strings.HasPrefix(got, c.want) {
				t.Errorf("got %q, want prefix %q", got, c.want)
			}
		})
	}

	if got := WhyNobodyCanTake([]Courier{sardor}, order(Delivery, "Sergeli", 1)); !strings.Contains(got, "inactive: Sardor") {
		t.Errorf("inactive case: got %q", got)
	}
}

func TestChooseNearest(t *testing.T) {
	hub := Point{41.30, 69.28}
	near := kamola()
	near.ID, near.Name, near.Start = "near", "Near", Point{41.26, 69.22}
	far := kamola()
	far.ID, far.Name, far.Start = "far", "Far", Point{41.40, 69.40}
	full := kamola()
	full.ID, full.Name, full.MaxParcels = "full", "Full", 0

	o := order(Pickup, "Sergeli", 1)
	o.Location = &Point{41.25, 69.21}

	choice, ok, fullMsgs := ChooseNearest(o, []Courier{far, full, near}, nil, hub)
	if !ok || choice.Courier.ID != "near" {
		t.Fatalf("got %+v ok=%v, want near", choice.Courier.ID, ok)
	}
	if len(fullMsgs) != 1 || !strings.Contains(fullMsgs[0], "Full has no room") {
		t.Errorf("full = %v", fullMsgs)
	}

	if _, ok, _ := ChooseNearest(order(Pickup, "Bektemir", 1), []Courier{near}, nil, hub); ok {
		t.Error("nobody works in Bektemir, expected no choice")
	}
}
