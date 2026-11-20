// Command server runs the courier dispatch backend.
//
// This is the composition root: the only place that knows every layer and
// wires them together. Settings come from .env (see .env.example in the
// repository root); flags override them.
package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"delivery/internal/config"
	"delivery/internal/repository/memory"
	"delivery/internal/seed"
	"delivery/internal/transport/httpapi"
	"delivery/internal/usecase"
)

func main() {
	cfg, err := config.Load(os.Args[1:])
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	data, err := seed.Load(cfg.DataFile)
	if err != nil {
		log.Fatalf("seed data: %v", err)
	}
	shapes, err := seed.LoadShapes(cfg.RegionsFile)
	if err != nil {
		log.Fatalf("region shapes: %v", err)
	}

	repo := memory.New(data.Couriers, data.Orders)
	dispatcher := usecase.NewDispatcher(data.City, repo)

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpapi.NewRouter(dispatcher, shapes, cfg.StaticDir),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("listening on %s", cfg.Addr)
	log.Fatal(srv.ListenAndServe())
}
