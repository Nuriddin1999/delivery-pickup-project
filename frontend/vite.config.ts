import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Settings come from the .env in the repository root (one level up).
const envDir = "..";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, "");
  return {
    envDir,
    plugins: [react(), tailwindcss()],
    server: {
      // In development the page runs on :5173 and forwards /api to the Go server.
      proxy: env.API_PROXY_TARGET ? { "/api": env.API_PROXY_TARGET } : undefined,
    },
  };
});
