// Package seed reads the start data: data.json (hub, regions, couriers,
// orders) and regions.geojson (region shapes for the map). Some seed orders
// are broken on purpose; they are loaded and marked, never dropped.
package seed

import (
	"encoding/json"
	"fmt"
	"os"

	"delivery/internal/domain"
)

// Data is the seed turned into domain values.
type Data struct {
	City     domain.City
	Couriers []domain.Courier
	Orders   []domain.Order
}

// file is data.json as written. Order fields are loose on purpose so that
// broken orders still load.
type file struct {
	Hub struct {
		Name string  `json:"name"`
		Lat  float64 `json:"lat"`
		Lng  float64 `json:"lng"`
	} `json:"hub"`
	Regions  []string      `json:"regions"`
	Couriers []courierJSON `json:"couriers"`
	Orders   []orderJSON   `json:"orders"`
}

type courierJSON struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Active     bool     `json:"active"`
	Kinds      []string `json:"kinds"`
	Regions    []string `json:"regions"`
	MaxParcels int      `json:"max_parcels"`
	MaxKg      float64  `json:"max_kg"`
	Start      struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
	} `json:"start"`
}

type orderJSON struct {
	ID        string   `json:"id"`
	Type      string   `json:"type"`
	Region    string   `json:"region"`
	Lat       *float64 `json:"lat"`
	Lng       *float64 `json:"lng"`
	WeightKg  *float64 `json:"weight_kg"`
	CreatedAt string   `json:"created_at"`
}

// Load reads data.json.
func Load(path string) (Data, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return Data{}, err
	}
	var f file
	if err := json.Unmarshal(raw, &f); err != nil {
		return Data{}, fmt.Errorf("%s: %w", path, err)
	}

	city := domain.City{
		Hub:     domain.Hub{Name: f.Hub.Name, Point: domain.Point{Lat: f.Hub.Lat, Lng: f.Hub.Lng}},
		Regions: f.Regions,
	}
	data := Data{City: city}
	for _, c := range f.Couriers {
		data.Couriers = append(data.Couriers, c.toDomain(city))
	}
	usedIDs := map[string]int{}
	for _, o := range f.Orders {
		data.Orders = append(data.Orders, o.toDomain(city, usedIDs))
	}
	return data, nil
}

// LoadShapes reads the region shapes. They are only drawn by the page, so
// they are passed through as they are.
func LoadShapes(path string) ([]byte, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if !json.Valid(raw) {
		return nil, fmt.Errorf("%s: not valid JSON", path)
	}
	return raw, nil
}

func (c courierJSON) toDomain(city domain.City) domain.Courier {
	kinds := make([]domain.Kind, 0, len(c.Kinds))
	for _, k := range c.Kinds {
		kinds = append(kinds, domain.Kind(k))
	}
	regions, err := city.NormalizeRegions(c.Regions)
	if err != nil {
		regions = c.Regions
	}
	return domain.Courier{
		ID: c.ID, Name: c.Name, Active: c.Active, Kinds: kinds, Regions: regions,
		MaxParcels: c.MaxParcels, MaxKg: c.MaxKg,
		Start: domain.Point{Lat: c.Start.Lat, Lng: c.Start.Lng},
	}
}
