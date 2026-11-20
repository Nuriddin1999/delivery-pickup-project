package domain

import (
	"math"
	"strconv"
)

// Point is a place on the map.
type Point struct {
	Lat float64
	Lng float64
}

const earthRadiusKm = 6371.0088

// DistanceKm is the straight-line (great-circle) distance between two points.
func DistanceKm(a, b Point) float64 {
	rad := math.Pi / 180
	dLat := (b.Lat - a.Lat) * rad
	dLng := (b.Lng - a.Lng) * rad
	h := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(a.Lat*rad)*math.Cos(b.Lat*rad)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthRadiusKm * math.Asin(math.Min(1, math.Sqrt(h)))
}

// RoundKm rounds to 0.01 km, the precision shown to the dispatcher.
func RoundKm(v float64) float64 { return math.Round(v*100) / 100 }

// FormatKg prints 2.5 as "2.5" and 15 as "15".
func FormatKg(v float64) string { return strconv.FormatFloat(v, 'f', -1, 64) }
