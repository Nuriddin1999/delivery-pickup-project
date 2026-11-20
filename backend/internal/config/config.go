// Package config reads the server settings from the environment, which is
// filled from a .env file when one is found. Command-line flags win over both.
package config

import (
	"bufio"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Addr        string // SERVER_ADDR
	DataFile    string // DATA_FILE
	RegionsFile string // REGIONS_FILE
	StaticDir   string // STATIC_DIR (optional)
}

// envFiles are tried in order; the first one found is loaded. The server
// usually runs from backend/, and .env lives in the repository root.
var envFiles = []string{".env", filepath.Join("..", ".env")}

// Load reads .env (if any), then the environment, then flags in args.
func Load(args []string) (Config, error) {
	for _, f := range envFiles {
		if err := LoadDotEnv(f); err == nil {
			break
		} else if !errors.Is(err, os.ErrNotExist) {
			return Config{}, err
		}
	}

	fs := flag.NewFlagSet("server", flag.ContinueOnError)
	var c Config
	fs.StringVar(&c.Addr, "addr", os.Getenv("SERVER_ADDR"), "listen address (SERVER_ADDR)")
	fs.StringVar(&c.DataFile, "data", os.Getenv("DATA_FILE"), "seed data file (DATA_FILE)")
	fs.StringVar(&c.RegionsFile, "geo", os.Getenv("REGIONS_FILE"), "region shapes file (REGIONS_FILE)")
	fs.StringVar(&c.StaticDir, "static", os.Getenv("STATIC_DIR"), "optional folder with the built page (STATIC_DIR)")
	if err := fs.Parse(args); err != nil {
		return Config{}, err
	}

	var missing []string
	required := []struct{ name, value string }{
		{"SERVER_ADDR", c.Addr}, {"DATA_FILE", c.DataFile}, {"REGIONS_FILE", c.RegionsFile},
	}
	for _, r := range required {
		if r.value == "" {
			missing = append(missing, r.name)
		}
	}
	if len(missing) > 0 {
		return Config{}, fmt.Errorf("missing settings %s: copy .env.example to .env in the repository root", strings.Join(missing, ", "))
	}
	return c, nil
}

// LoadDotEnv sets variables from a KEY=VALUE file. Variables already set in
// the environment are kept, so the real environment wins over the file.
// Blank lines, # comments, an "export " prefix and quotes are handled.
func LoadDotEnv(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for n := 1; sc.Scan(); n++ {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		key, value, ok := strings.Cut(line, "=")
		key = strings.TrimSpace(key)
		if !ok || key == "" {
			return fmt.Errorf("%s:%d: expected KEY=VALUE", path, n)
		}
		value = strings.TrimSpace(value)
		if len(value) >= 2 && (value[0] == '"' || value[0] == '\'') && value[len(value)-1] == value[0] {
			value = value[1 : len(value)-1]
		}
		if _, set := os.LookupEnv(key); !set {
			os.Setenv(key, value)
		}
	}
	return sc.Err()
}
