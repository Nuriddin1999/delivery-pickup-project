// Command server runs the courier auto-assign backend. Settings come from
// .env (see .env.example in the repository root); flags override them.
package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"delivery/internal/api"
	"delivery/internal/config"
	"delivery/internal/store"
)

func main() {
	cfg, err := config.Load(os.Args[1:])
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	s, err := store.LoadFiles(cfg.DataFile, cfg.RegionsFile)
	if err != nil {
		log.Fatalf("load seed: %v", err)
	}
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           api.Handler(s, cfg.StaticDir),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("listening on %s", cfg.Addr)
	log.Fatal(srv.ListenAndServe())
}
