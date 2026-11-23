package domain

import (
	"math"
	"slices"
	"sort"
	"strings"
)

// Assignment is one order the plan gives to a courier. AddedKm is how much
// the courier's route grows when this order is given after the ones before
// it in the plan, so a courier's AddedKm values add up to their extra km.
type Assignment struct {
	OrderID   string
	CourierID string
	AddedKm   float64
}

// PlanAssignments decides who takes the free orders, looking at all of them
// together instead of one at a time. Orders that already have a courier stay
// where they are. The plan, in order of importance:
//
//  1. places as many orders as it can, and
//  2. keeps the total km of all routes as low as it can.
//
// It works in three steps:
//
//   - Regret insertion: the order that would lose the most by not getting
//     its best courier goes first. An order only one courier can take loses
//     everything, so it goes before orders that have a choice.
//   - Make room: an order nobody could take gets a place when one of the
//     plan's own orders can move from a courier who could take it to another.
//   - Improve: plan orders are moved or swapped between couriers while that
//     cuts the total km.
//
// Each courier's new orders come after the ones they already hold, and are
// given in the order that makes their route shortest (pickups before the
// hub, deliveries after it), so the route, which follows the order given,
// is that short route. Assignments come grouped by courier in list order,
// in the order to give them. Every step checks CanTake, so the plan never
// breaks a rule. Ties go to the older order and the courier listed first,
// so the same data always gives the same plan.
//
// Regret insertion is usually the better start, but not always, so the same
// steps also run from the old one-by-one choice (oldest first, each to its
// nearest courier, see ChooseNearest), and the better of the two plans wins.
// Make room and improve never place fewer orders, so auto-assign never
// places fewer than the one-by-one choice did.
func PlanAssignments(couriers []Courier, orders []Order, hub Point) []Assignment {
	free := freeValidOldestFirst(orders)
	memo := map[string]float64{}
	starts := []func(*planner){
		func(p *planner) { p.insertByRegret(free) },
		func(p *planner) { p.insertNearest(free, orders) },
	}
	var best *planner
	for _, start := range starts {
		p := newPlanner(couriers, orders, hub, memo)
		start(p)
		for p.makeRoom(free) {
		}
		p.improve()
		if best == nil || p.betterThan(best) {
			best = p
		}
	}
	return best.assignments()
}

// freeValidOldestFirst returns the free orders that are not broken.
func freeValidOldestFirst(orders []Order) []Order {
	var free []Order
	for _, o := range orders {
		if !o.Assigned() && !o.Broken() {
			free = append(free, o)
		}
	}
	sort.SliceStable(free, func(i, j int) bool { return free[i].CreatedAt.Before(free[j].CreatedAt) })
	return free
}

// maxImprovePasses bounds the improve step; each pass that changes
// something makes the total strictly shorter, so it stops well before.
const maxImprovePasses = 50

type planner struct {
	couriers []Courier
	hub      Point
	heldP    [][]Order // per courier: pickups they hold, in the order given
	heldD    [][]Order // per courier: deliveries they hold
	base     []Load    // per courier: load of the orders they hold
	added    [][]Order // per courier: orders the plan gives them
	memo     map[string]float64
}

// newPlanner starts an empty plan. memo caches route km by courier and set
// of plan orders; planners for the same data can share it.
func newPlanner(couriers []Courier, orders []Order, hub Point, memo map[string]float64) *planner {
	p := &planner{
		couriers: couriers,
		hub:      hub,
		heldP:    make([][]Order, len(couriers)),
		heldD:    make([][]Order, len(couriers)),
		base:     make([]Load, len(couriers)),
		added:    make([][]Order, len(couriers)),
		memo:     memo,
	}
	for i, c := range couriers {
		p.heldP[i], p.heldD[i] = HeldBy(c.ID, orders)
		p.base[i] = LoadOf(c.ID, orders)
	}
	return p
}

// canTake checks the rules for courier i taking o on top of what they hold
// and the plan orders in list.
func (p *planner) canTake(i int, o Order, list []Order) bool {
	load := p.base[i]
	for _, a := range list {
		load = load.With(a)
	}
	return CanTake(p.couriers[i], o, load) == nil
}

// sequence orders the plan's orders for courier i: new pickups between their
// last held pickup and the hub, new deliveries after their last held delivery.
func (p *planner) sequence(i int, list []Order) (pickups, deliveries []Order) {
	var newP, newD []Order
	for _, o := range list {
		if o.Type == Pickup {
			newP = append(newP, o)
		} else {
			newD = append(newD, o)
		}
	}
	fromP := p.couriers[i].Start
	if n := len(p.heldP[i]); n > 0 {
		fromP = *p.heldP[i][n-1].Location
	}
	fromD := p.hub
	if n := len(p.heldD[i]); n > 0 {
		fromD = *p.heldD[i][n-1].Location
	}
	return shortestPath(fromP, &p.hub, newP), shortestPath(fromD, nil, newD)
}

// km is courier i's route length with the plan orders in list added.
func (p *planner) km(i int, list []Order) float64 {
	ids := make([]string, len(list))
	for k, o := range list {
		ids[k] = o.ID
	}
	sort.Strings(ids)
	key := p.couriers[i].ID + "|" + strings.Join(ids, ",")
	if v, ok := p.memo[key]; ok {
		return v
	}
	newP, newD := p.sequence(i, list)
	v := BuildRoute(p.couriers[i].Start, p.hub, concat(p.heldP[i], newP), concat(p.heldD[i], newD)).TotalKm
	p.memo[key] = v
	return v
}

type option struct {
	courier int
	delta   float64
}

// options lists the couriers who may take o now, cheapest first.
func (p *planner) options(o Order) []option {
	var opts []option
	for i := range p.couriers {
		if p.canTake(i, o, p.added[i]) {
			opts = append(opts, option{i, p.km(i, with(p.added[i], o)) - p.km(i, p.added[i])})
		}
	}
	sort.SliceStable(opts, func(a, b int) bool { return opts[a].delta < opts[b].delta-1e-9 })
	return opts
}

// insertByRegret places orders one by one, always the one with the largest
// regret: the extra km if it went to its second-best courier instead of its
// best. An order with one possible courier has infinite regret.
func (p *planner) insertByRegret(free []Order) {
	left := slices.Clone(free)
	for len(left) > 0 {
		pick, pickOpt, pickRegret := -1, option{}, -1.0
		for k := 0; k < len(left); k++ {
			opts := p.options(left[k])
			if len(opts) == 0 {
				// Loads only grow while inserting, so nobody will take it later.
				left = slices.Delete(left, k, k+1)
				k--
				continue
			}
			regret := math.Inf(1)
			if len(opts) > 1 {
				regret = opts[1].delta - opts[0].delta
			}
			if regret > pickRegret+1e-9 { // ties keep the older order
				pick, pickOpt, pickRegret = k, opts[0], regret
			}
		}
		if pick < 0 {
			return
		}
		p.added[pickOpt.courier] = append(p.added[pickOpt.courier], left[pick])
		left = slices.Delete(left, pick, pick+1)
	}
}

// insertNearest is the one-by-one choice: oldest order first, each to the
// courier ChooseNearest picks given the orders placed before it.
func (p *planner) insertNearest(free, orders []Order) {
	work := slices.Clone(orders)
	at := make(map[string]int, len(work))
	for i, o := range work {
		at[o.ID] = i
	}
	courier := make(map[string]int, len(p.couriers))
	for i, c := range p.couriers {
		courier[c.ID] = i
	}
	seq := math.MaxInt32
	for _, o := range free {
		choice, ok, _ := ChooseNearest(o, p.couriers, work, p.hub)
		if !ok {
			continue
		}
		seq++
		work[at[o.ID]].AssignTo(choice.Courier.ID, seq)
		i := courier[choice.Courier.ID]
		p.added[i] = append(p.added[i], o)
	}
}

// betterThan compares two plans: more orders placed wins, then fewer km.
func (p *planner) betterThan(q *planner) bool {
	if a, b := p.count(), q.count(); a != b {
		return a > b
	}
	return p.totalKm() < q.totalKm()-1e-9
}

func (p *planner) count() int {
	n := 0
	for _, list := range p.added {
		n += len(list)
	}
	return n
}

func (p *planner) totalKm() float64 {
	sum := 0.0
	for i := range p.couriers {
		sum += p.km(i, p.added[i])
	}
	return sum
}

// makeRoom tries to place one order still left out by moving one plan order
// from a courier who could take it to another courier. It makes the cheapest
// such change and reports whether it placed anything.
func (p *planner) makeRoom(free []Order) bool {
	for _, u := range free {
		if p.placed(u.ID) {
			continue
		}
		best, found := math.Inf(1), false
		var bestC, bestX, bestTo int
		for c := range p.couriers {
			for x, moved := range p.added[c] {
				rest := without(p.added[c], x)
				if !p.canTake(c, u, rest) {
					continue
				}
				for to := range p.couriers {
					if to == c || !p.canTake(to, moved, p.added[to]) {
						continue
					}
					cost := p.km(c, with(rest, u)) - p.km(c, p.added[c]) +
						p.km(to, with(p.added[to], moved)) - p.km(to, p.added[to])
					if cost < best-1e-9 {
						best, found, bestC, bestX, bestTo = cost, true, c, x, to
					}
				}
			}
		}
		if found {
			moved := p.added[bestC][bestX]
			p.added[bestC] = with(without(p.added[bestC], bestX), u)
			p.added[bestTo] = with(p.added[bestTo], moved)
			return true
		}
	}
	return false
}

// improve moves or swaps plan orders between couriers while that cuts the
// total km. It takes the first change that helps and starts again.
func (p *planner) improve() {
	for pass := 0; pass < maxImprovePasses && (p.relocate() || p.swap()); pass++ {
	}
}

func (p *planner) relocate() bool {
	for c := range p.couriers {
		for x, o := range p.added[c] {
			rest := without(p.added[c], x)
			for to := range p.couriers {
				if to == c || !p.canTake(to, o, p.added[to]) {
					continue
				}
				delta := p.km(c, rest) + p.km(to, with(p.added[to], o)) - p.km(c, p.added[c]) - p.km(to, p.added[to])
				if delta < -1e-9 {
					p.added[c], p.added[to] = rest, with(p.added[to], o)
					return true
				}
			}
		}
	}
	return false
}

func (p *planner) swap() bool {
	for a := range p.couriers {
		for b := a + 1; b < len(p.couriers); b++ {
			for x, ox := range p.added[a] {
				for y, oy := range p.added[b] {
					restA, restB := without(p.added[a], x), without(p.added[b], y)
					if !p.canTake(a, oy, restA) || !p.canTake(b, ox, restB) {
						continue
					}
					newA, newB := with(restA, oy), with(restB, ox)
					delta := p.km(a, newA) + p.km(b, newB) - p.km(a, p.added[a]) - p.km(b, p.added[b])
					if delta < -1e-9 {
						p.added[a], p.added[b] = newA, newB
						return true
					}
				}
			}
		}
	}
	return false
}

func (p *planner) placed(id string) bool {
	for _, list := range p.added {
		for _, o := range list {
			if o.ID == id {
				return true
			}
		}
	}
	return false
}

// assignments lists the plan per courier in the order to give the orders,
// each with the km it adds after the ones before it.
func (p *planner) assignments() []Assignment {
	out := []Assignment{}
	for i, c := range p.couriers {
		newP, newD := p.sequence(i, p.added[i])
		var gotP, gotD []Order
		prev := BuildRoute(c.Start, p.hub, p.heldP[i], p.heldD[i]).TotalKm
		for k, o := range concat(newP, newD) {
			if k < len(newP) {
				gotP = append(gotP, o)
			} else {
				gotD = append(gotD, o)
			}
			now := BuildRoute(c.Start, p.hub, concat(p.heldP[i], gotP), concat(p.heldD[i], gotD)).TotalKm
			out = append(out, Assignment{OrderID: o.ID, CourierID: c.ID, AddedKm: RoundKm(now - prev)})
			prev = now
		}
	}
	return out
}

func concat(a, b []Order) []Order { return append(slices.Clone(a), b...) }
func with(list []Order, o Order) []Order {
	return append(slices.Clone(list), o)
}
func without(list []Order, k int) []Order {
	return slices.Delete(slices.Clone(list), k, k+1)
}
