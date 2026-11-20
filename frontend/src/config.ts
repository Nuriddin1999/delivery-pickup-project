// Page settings from the root .env (VITE_* variables). The values live only
// in .env; a missing one stops the page with a clear message.

function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value === "") {
    throw new Error(`Missing ${name}: copy .env.example to .env in the repository root and restart npm run dev`);
  }
  return value;
}

export const config = {
  tileUrl: required("VITE_TILE_URL"),
  tileAttribution: required("VITE_TILE_ATTRIBUTION"),
  mapZoom: Number(required("VITE_MAP_ZOOM")),
};
