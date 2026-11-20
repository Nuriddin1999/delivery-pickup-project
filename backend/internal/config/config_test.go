package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnv(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	content := "# comment\n\nT_PLAIN=:9090\nexport T_EXPORTED=yes\nT_QUOTED='a \"b\" c'\nT_EMPTY=\nT_KEEP=from-file\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("T_KEEP", "from-env")
	for _, k := range []string{"T_PLAIN", "T_EXPORTED", "T_QUOTED", "T_EMPTY"} {
		t.Setenv(k, "") // registers cleanup
		os.Unsetenv(k)
	}

	if err := LoadDotEnv(path); err != nil {
		t.Fatal(err)
	}
	want := map[string]string{
		"T_PLAIN": ":9090", "T_EXPORTED": "yes", "T_QUOTED": `a "b" c`, "T_EMPTY": "", "T_KEEP": "from-env",
	}
	for k, v := range want {
		if got := os.Getenv(k); got != v {
			t.Errorf("%s = %q, want %q", k, got, v)
		}
	}
}

func TestLoadDotEnvBadLine(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	os.WriteFile(path, []byte("NOT A SETTING\n"), 0o600)
	if err := LoadDotEnv(path); err == nil {
		t.Fatal("expected an error for a line without =")
	}
}

func TestLoadFlagsWinAndMissingIsAnError(t *testing.T) {
	t.Chdir(t.TempDir()) // no .env here or in the parent
	t.Setenv("SERVER_ADDR", ":1111")
	t.Setenv("DATA_FILE", "d.json")
	t.Setenv("REGIONS_FILE", "r.geojson")
	t.Setenv("STATIC_DIR", "")

	c, err := Load([]string{"-addr", ":2222"})
	if err != nil {
		t.Fatal(err)
	}
	if c.Addr != ":2222" || c.DataFile != "d.json" {
		t.Errorf("got %+v", c)
	}

	t.Setenv("DATA_FILE", "")
	if _, err := Load(nil); err == nil {
		t.Error("expected an error when DATA_FILE is missing")
	}
}
