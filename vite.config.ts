/// <reference types="vitest" />

import type { UserConfig } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: "./src/setupTests.ts",
  },
} as UserConfig);
