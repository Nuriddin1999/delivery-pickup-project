package domain

// OptimizeRoute reorders pickups (between start and hub) and deliveries
// (after the hub) to cut the total km. The pickups → hub → deliveries shape
// is kept: a parcel must reach the hub before it can go out again. The
// result is never longer than the route in the given order.
func OptimizeRoute(start, hub Point, pickups, deliveries []Order) Route {
	better := BuildRoute(start, hub, shortestPath(start, &hub, pickups), shortestPath(hub, nil, deliveries))
	given := BuildRoute(start, hub, pickups, deliveries)
	if better.TotalKm > given.TotalKm {
		return given
	}
	return better
}

// exactLimit is the largest number of stops solved by trying every order
// (7! = 5040 orders); longer paths use a heuristic.
const exactLimit = 7

// shortestPath orders the stops of a path that starts at from and, if end
// is set, finishes at end.
func shortestPath(from Point, end *Point, orders []Order) []Order {
	pts := make([]Order, 0, len(orders))
	for _, o := range orders {
		if o.Location != nil {
			pts = append(pts, o)
		}
	}
	length := func(seq []Order) float64 { return pathKm(from, end, seq) }
	if len(pts) <= exactLimit {
		return bestPermutation(pts, length)
	}
	seq := nearestNeighbour(from, pts)
	twoOpt(seq, length)
	return seq
}

func pathKm(from Point, end *Point, seq []Order) float64 {
	cur, sum := from, 0.0
	for _, o := range seq {
		sum += DistanceKm(cur, *o.Location)
		cur = *o.Location
	}
	if end != nil {
		sum += DistanceKm(cur, *end)
	}
	return sum
}

func bestPermutation(pts []Order, length func([]Order) float64) []Order {
	best := append([]Order(nil), pts...)
	bestKm := length(best)
	cur := append([]Order(nil), pts...)
	var permute func(k int)
	permute = func(k int) {
		if k == len(cur) {
			if km := length(cur); km < bestKm-1e-12 {
				bestKm = km
				copy(best, cur)
			}
			return
		}
		for i := k; i < len(cur); i++ {
			cur[k], cur[i] = cur[i], cur[k]
			permute(k + 1)
			cur[k], cur[i] = cur[i], cur[k]
		}
	}
	permute(0)
	return best
}

func nearestNeighbour(from Point, pts []Order) []Order {
	left := append([]Order(nil), pts...)
	out := make([]Order, 0, len(pts))
	cur := from
	for len(left) > 0 {
		bi := 0
		for i := range left {
			if DistanceKm(cur, *left[i].Location) < DistanceKm(cur, *left[bi].Location) {
				bi = i
			}
		}
		out = append(out, left[bi])
		cur = *left[bi].Location
		left = append(left[:bi], left[bi+1:]...)
	}
	return out
}

// twoOpt keeps reversing segments of seq while that makes it shorter.
func twoOpt(seq []Order, length func([]Order) float64) {
	reverse := func(i, j int) {
		for ; i < j; i, j = i+1, j-1 {
			seq[i], seq[j] = seq[j], seq[i]
		}
	}
	for improved := true; improved; {
		improved = false
		for i := 0; i < len(seq)-1; i++ {
			for j := i + 1; j < len(seq); j++ {
				before := length(seq)
				reverse(i, j)
				if length(seq) < before-1e-12 {
					improved = true
				} else {
					reverse(i, j)
				}
			}
		}
	}
}
