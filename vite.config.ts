import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), ...(process.env.VITEST ? [] : [cloudflare()])],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: "./src/setupTests.ts",
  },
});
