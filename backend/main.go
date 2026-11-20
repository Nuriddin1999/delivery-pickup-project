// Command server runs the courier auto-assign backend.
package main

import (
	"flag"
	"log"
	"net/http"
	"time"

	"delivery/internal/api"
	"delivery/internal/store"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	dataPath := flag.String("data", "../data/data.json", "seed data file")
	geoPath := flag.String("geo", "../data/regions.geojson", "region shapes file")
	staticDir := flag.String("static", "", "optional folder with the built page to serve")
	flag.Parse()

	s, err := store.LoadFiles(*dataPath, *geoPath)
	if err != nil {
		log.Fatalf("load seed: %v", err)
	}
	srv := &http.Server{
		Addr:              *addr,
		Handler:           api.Handler(s, *staticDir),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("listening on %s", *addr)
	log.Fatal(srv.ListenAndServe())
}
