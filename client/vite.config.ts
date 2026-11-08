import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Fails a production build when VITE_API_URL is missing or not https, instead of
 * silently shipping a bundle that talks to http://localhost:4000.
 * (Set ALLOW_LOCAL_API_BUILD=1 to build a local preview on purpose.)
 */
function requireApiUrl(apiUrl: string | undefined): Plugin {
  return {
    name: "require-api-url",
    apply: "build",
    configResolved(config) {
      if (config.mode === "development") return;
      if (process.env.ALLOW_LOCAL_API_BUILD === "1") return;

      const value = (apiUrl ?? "").trim();
      if (!value) {
        throw new Error(
          "VITE_API_URL is not set. Set it (for example in your host's build " +
            "environment or in .env.production) before building."
        );
      }
      if (!value.startsWith("https://")) {
        throw new Error(
          `VITE_API_URL must start with https:// for production builds (got "${value}").`
        );
      }
      if (/\/api\/?$/i.test(value)) {
        throw new Error("VITE_API_URL must be the server origin only, without /api.");
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Only VITE_-prefixed variables are read, so no server secrets are ever touched.
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react(), requireApiUrl(env.VITE_API_URL)],
    // No dev proxy: the client calls VITE_API_URL (or http://localhost:4000) directly,
    // so CORS and cookies behave exactly as they will in production.
    server: {
      port: 5173,
      host: true,
    },
    preview: {
      port: 4173,
    },
  };
});
