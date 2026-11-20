package memory

import (
	"testing"

	"delivery/internal/domain"
)

func TestReturnsCopies(t *testing.T) {
	r := New([]domain.Courier{{ID: "c1", Regions: []string{"Sergeli"}}}, []domain.Order{{ID: "o1"}})

	c, _ := r.Courier("c1")
	c.Regions[0] = "changed"
	if got, _ := r.Courier("c1"); got.Regions[0] != "Sergeli" {
		t.Error("changing a returned courier changed the stored one")
	}

	o, _ := r.Order("o1")
	o.CourierID = "c1"
	if got, _ := r.Order("o1"); got.CourierID != "" {
		t.Error("changing a returned order changed the stored one")
	}
}

func TestSaveAndIDs(t *testing.T) {
	r := New([]domain.Courier{{ID: "c1"}, {ID: "c3"}}, []domain.Order{{ID: "o1", AssignSeq: 4}})

	if id := r.NextCourierID(); id != "c4" {
		t.Errorf("next courier id = %s, want c4 (c3 is taken)", id)
	}
	r.SaveCourier(domain.Courier{ID: "c4", Name: "New"})
	if len(r.Couriers()) != 3 {
		t.Error("SaveCourier should add a new courier")
	}
	r.SaveCourier(domain.Courier{ID: "c4", Name: "Renamed"})
	if c, _ := r.Courier("c4"); c.Name != "Renamed" || len(r.Couriers()) != 3 {
		t.Error("SaveCourier should replace an existing courier")
	}
	if seq := r.NextAssignSeq(); seq != 5 {
		t.Errorf("seq = %d, want 5 (continues after the seed)", seq)
	}
}
