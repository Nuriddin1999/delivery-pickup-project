package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"delivery/internal/repository/memory"
	"delivery/internal/seed"
	"delivery/internal/usecase"
)

// These tests send requests "by hand", the way curl would, to show the
// server refuses them without help from the page.

func newServer(t *testing.T) *httptest.Server {
	t.Helper()
	dir := filepath.Join("..", "..", "..", "..", "data")
	data, err := seed.Load(filepath.Join(dir, "data.json"))
	if err != nil {
		t.Fatal(err)
	}
	shapes, err := seed.LoadShapes(filepath.Join(dir, "regions.geojson"))
	if err != nil {
		t.Fatal(err)
	}
	d := usecase.NewDispatcher(data.City, memory.New(data.Couriers, data.Orders))
	srv := httptest.NewServer(NewRouter(d, shapes, ""))
	t.Cleanup(srv.Close)
	return srv
}

func call(t *testing.T, srv *httptest.Server, method, path, body string) (int, map[string]any) {
	t.Helper()
	req, _ := http.NewRequest(method, srv.URL+path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]any
	json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

func TestAssignRefusedWithPlainMessage(t *testing.T) {
	srv := newServer(t)
	cases := []struct {
		name, path, body string
		status           int
		msg              string
	}{
		{"wrong region", "/api/orders/o12/courier", `{"courier_id":"c5"}`, 409, "Kamola does not work in Bektemir"},
		{"wrong kind", "/api/orders/o02/courier", `{"courier_id":"c2"}`, 409, "Dilnoza does not do deliveries"},
		{"inactive", "/api/orders/o04/courier", `{"courier_id":"c4"}`, 409, "Sardor is not active today"},
		{"too heavy", "/api/orders/o10/courier", `{"courier_id":"c1"}`, 409, "Aziz cannot carry 45 kg more"},
		{"broken order", "/api/orders/o20/courier", `{"courier_id":"c1"}`, 409, "Missing coordinates"},
		{"unknown order", "/api/orders/o99/courier", `{"courier_id":"c1"}`, 404, `There is no order "o99"`},
		{"unknown courier", "/api/orders/o01/courier", `{"courier_id":"c99"}`, 404, `There is no courier "c99"`},
		{"no courier id", "/api/orders/o01/courier", `{}`, 400, "Choose a courier"},
		{"not JSON", "/api/orders/o01/courier", `courier=c1`, 400, "not valid JSON"},
		{"empty body", "/api/orders/o01/courier", ``, 400, "empty"},
		{"wrong type", "/api/orders/o01/courier", `{"courier_id":1}`, 400, "Courier must be text"},
		{"unknown field", "/api/orders/o01/courier", `{"courier":"c1"}`, 400, "Unknown field"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			status, body := call(t, srv, "PUT", c.path, c.body)
			if status != c.status {
				t.Errorf("status %d, want %d (%v)", status, c.status, body)
			}
			if msg, _ := body["error"].(string); !strings.Contains(msg, c.msg) {
				t.Errorf("error %q, want it to contain %q", msg, c.msg)
			}
		})
	}
}

func TestAssignThenParcelLimitOverHTTP(t *testing.T) {
	srv := newServer(t)
	for _, id := range []string{"o18", "o04", "o14"} {
		if status, body := call(t, srv, "PUT", "/api/orders/"+id+"/courier", `{"courier_id":"c5"}`); status != 200 {
			t.Fatalf("assign %s: %d %v", id, status, body)
		}
	}
	status, body := call(t, srv, "PUT", "/api/orders/o09/courier", `{"courier_id":"c5"}`)
	if status != 409 || body["code"] != "parcel_limit" {
		t.Fatalf("got %d %v", status, body)
	}
}

func TestAddCourierRefusedOverHTTP(t *testing.T) {
	srv := newServer(t)
	cases := []struct{ name, body, field string }{
		{"missing everything", `{}`, "name"},
		{"fractional parcels", `{"name":"X","kinds":["pickup"],"max_parcels":2.5,"max_kg":10,"start":{"lat":41.3,"lng":69.2}}`, "max_parcels"},
		{"string kg", `{"name":"X","kinds":["pickup"],"max_parcels":2,"max_kg":"10","start":{"lat":41.3,"lng":69.2}}`, "max_kg"},
		{"bad kind", `{"name":"X","kinds":["fly"],"max_parcels":2,"max_kg":10,"start":{"lat":41.3,"lng":69.2}}`, "kinds"},
		{"start far away", `{"name":"X","kinds":["pickup"],"max_parcels":2,"max_kg":10,"start":{"lat":0,"lng":0}}`, "start"},
		{"duplicate name", `{"name":"aziz","kinds":["pickup"],"max_parcels":2,"max_kg":10,"start":{"lat":41.3,"lng":69.2}}`, "name"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			status, body := call(t, srv, "POST", "/api/couriers", c.body)
			if status != 400 {
				t.Fatalf("status %d, want 400 (%v)", status, body)
			}
			fields, _ := body["fields"].(map[string]any)
			if fields[c.field] == nil {
				t.Errorf("expected an error on %s, got %v", c.field, body)
			}
		})
	}
	_, state := call(t, srv, "GET", "/api/state", "")
	if n := len(state["couriers"].([]any)); n != 6 {
		t.Errorf("refused couriers were stored: %d couriers", n)
	}
}

func TestAddCourierAndRegionsOverHTTP(t *testing.T) {
	srv := newServer(t)
	status, body := call(t, srv, "POST", "/api/couriers",
		`{"name":"Nodira","kinds":["delivery"],"max_parcels":3,"max_kg":12.5,"start":{"lat":41.22,"lng":69.31}}`)
	if status != 201 || body["id"] != "c7" {
		t.Fatalf("create: %d %v", status, body)
	}
	if status, body = call(t, srv, "PUT", "/api/couriers/c7/regions", `{"regions":["Bektemir"]}`); status != 200 {
		t.Fatalf("regions: %d %v", status, body)
	}
	if status, body = call(t, srv, "PUT", "/api/orders/o12/courier", `{"courier_id":"c7"}`); status != 200 {
		t.Fatalf("assign after region change: %d %v", status, body)
	}
	if status, _ = call(t, srv, "PUT", "/api/couriers/c7/regions", `{"regions":["Atlantis"]}`); status != 400 {
		t.Errorf("unknown region: status %d", status)
	}
	if status, _ = call(t, srv, "PUT", "/api/couriers/c7/regions", `{}`); status != 400 {
		t.Errorf("missing regions: status %d", status)
	}
}

func TestStateShape(t *testing.T) {
	srv := newServer(t)
	status, state := call(t, srv, "GET", "/api/state", "")
	if status != 200 {
		t.Fatalf("status %d", status)
	}
	for _, key := range []string{"hub", "regions", "couriers", "orders", "unassignable"} {
		if state[key] == nil {
			t.Errorf("state has no %q", key)
		}
	}
	c := state["couriers"].([]any)[0].(map[string]any)
	for _, key := range []string{"id", "max_parcels", "start", "load", "route", "better_route", "outside_regions"} {
		if _, ok := c[key]; !ok {
			t.Errorf("courier has no %q", key)
		}
	}
}

func TestUnassignAutoAssignAndUnknownEndpoint(t *testing.T) {
	srv := newServer(t)
	if status, body := call(t, srv, "DELETE", "/api/orders/o01/courier", ""); status != 409 {
		t.Errorf("unassign free order: %d %v", status, body)
	}
	status, body := call(t, srv, "POST", "/api/auto-assign", "")
	if status != 200 || len(body["assigned"].([]any)) == 0 || len(body["unplaced"].([]any)) == 0 {
		t.Fatalf("auto-assign: %d %v", status, body)
	}
	if status, _ := call(t, srv, "GET", "/api/nothing", ""); status != 404 {
		t.Errorf("unknown endpoint: %d", status)
	}
}

func TestCandidatesOverHTTP(t *testing.T) {
	srv := newServer(t)
	// o13: pickup in Mirzo Ulug'bek. Only Dilnoza does pickups there.
	status, body := call(t, srv, "GET", "/api/orders/o13/candidates", "")
	if status != 200 {
		t.Fatalf("status %d %v", status, body)
	}
	cands := body["candidates"].([]any)
	if len(cands) != 6 {
		t.Fatalf("want all 6 couriers, got %d", len(cands))
	}
	first := cands[0].(map[string]any)
	if first["courier_id"] != "c2" || first["allowed"] != true || first["nearest"] != true {
		t.Errorf("first candidate = %v, want Dilnoza allowed and nearest", first)
	}
	for _, c := range cands[1:] {
		c := c.(map[string]any)
		if c["allowed"] == true || c["reason"] == "" {
			t.Errorf("only Dilnoza may take o13, got %v", c)
		}
	}

	// The holder is left out once the order is assigned.
	call(t, srv, "PUT", "/api/orders/o13/courier", `{"courier_id":"c2"}`)
	_, body = call(t, srv, "GET", "/api/orders/o13/candidates", "")
	if n := len(body["candidates"].([]any)); n != 5 {
		t.Errorf("holder should be left out: %d candidates", n)
	}

	if status, _ := call(t, srv, "GET", "/api/orders/o99/candidates", ""); status != 404 {
		t.Errorf("unknown order: %d", status)
	}
}

func TestSetKindsOverHTTP(t *testing.T) {
	srv := newServer(t)
	cases := []struct {
		name, body string
		status     int
		msg        string
	}{
		{"missing kinds", `{}`, 400, "kinds is required"},
		{"none", `{"kinds":[]}`, 400, "at least one kind"},
		{"unknown kind", `{"kinds":["fly"]}`, 400, "Unknown kind"},
		{"wrong type", `{"kinds":"pickup"}`, 400, ""},
		{"unknown field", `{"kind":["pickup"]}`, 400, "Unknown field"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			status, body := call(t, srv, "PUT", "/api/couriers/c2/kinds", c.body)
			if status != c.status {
				t.Errorf("status %d, want %d (%v)", status, c.status, body)
			}
			if msg, _ := body["error"].(string); !strings.Contains(msg, c.msg) {
				t.Errorf("error %q, want it to contain %q", msg, c.msg)
			}
		})
	}

	if status, _ := call(t, srv, "PUT", "/api/couriers/c99/kinds", `{"kinds":["pickup"]}`); status != 404 {
		t.Errorf("unknown courier: %d", status)
	}

	// Aziz (c1) does both. Give him a delivery, then try to drop deliveries by hand.
	if status, body := call(t, srv, "PUT", "/api/orders/o06/courier", `{"courier_id":"c1"}`); status != 200 {
		t.Fatalf("assign o06: %d %v", status, body)
	}
	status, body := call(t, srv, "PUT", "/api/couriers/c1/kinds", `{"kinds":["pickup"]}`)
	if status != 409 || body["code"] != "kind_in_use" || !strings.Contains(body["error"].(string), "Aziz still has 1 delivery: o06") {
		t.Fatalf("drop deliveries while holding o06: %d %v", status, body)
	}
	// Dropping pickups is fine: he holds no pickup.
	status, body = call(t, srv, "PUT", "/api/couriers/c1/kinds", `{"kinds":["delivery"]}`)
	if status != 200 || len(body["kinds"].([]any)) != 1 {
		t.Fatalf("drop pickups: %d %v", status, body)
	}
}

// routeOf returns the order ids on a courier's route, in route order.
func routeOf(t *testing.T, srv *httptest.Server, courierID string) []string {
	t.Helper()
	_, state := call(t, srv, "GET", "/api/state", "")
	for _, c := range state["couriers"].([]any) {
		cm := c.(map[string]any)
		if cm["id"] != courierID {
			continue
		}
		var ids []string
		for _, s := range cm["route"].(map[string]any)["stops"].([]any) {
			if id, _ := s.(map[string]any)["order_id"].(string); id != "" {
				ids = append(ids, id)
			}
		}
		return ids
	}
	t.Fatalf("no courier %s", courierID)
	return nil
}

func TestMarkStopDoneOverHTTP(t *testing.T) {
	srv := newServer(t)
	call(t, srv, "POST", "/api/auto-assign", "")
	stops := routeOf(t, srv, "c1")
	if len(stops) < 2 {
		t.Fatalf("Aziz needs at least 2 stops for this test, has %v", stops)
	}
	first, second := stops[0], stops[1]
	done := func(courier, order string) string { return "/api/couriers/" + courier + "/stops/" + order + "/done" }

	refused := []struct {
		name, method, path, body string
		status                   int
		code                     string
	}{
		{"skipping the first stop", "POST", done("c1", second), "", 409, "out_of_order"},
		{"another courier's stop", "POST", done("c2", first), "", 409, "not_your_order"},
		{"unknown courier", "POST", done("c99", first), "", 404, "not_found"},
		{"unknown order", "POST", done("c1", "o99"), "", 404, "not_found"},
	}
	for _, c := range refused {
		t.Run(c.name, func(t *testing.T) {
			status, body := call(t, srv, c.method, c.path, c.body)
			if status != c.status || body["code"] != c.code {
				t.Errorf("got %d %v, want %d %s", status, body, c.status, c.code)
			}
		})
	}

	status, body := call(t, srv, "POST", done("c1", first), "")
	if status != 200 || body["done_at"] == nil {
		t.Fatalf("marking the first stop: %d %v", status, body)
	}

	after := []struct {
		name, method, path, body string
		code                     string
	}{
		{"the same stop twice", "POST", done("c1", first), "", "already_done"},
		{"taking a done order off", "DELETE", "/api/orders/" + first + "/courier", "", "order_done"},
		{"moving a done order", "PUT", "/api/orders/" + first + "/courier", `{"courier_id":"c5"}`, "order_done"},
	}
	for _, c := range after {
		t.Run(c.name, func(t *testing.T) {
			status, body := call(t, srv, c.method, c.path, c.body)
			if status != 409 || body["code"] != c.code {
				t.Errorf("got %d %v, want 409 %s", status, body, c.code)
			}
		})
	}

	if status, body := call(t, srv, "POST", done("c1", second), ""); status != 200 {
		t.Errorf("the second stop after the first: %d %v", status, body)
	}
}
