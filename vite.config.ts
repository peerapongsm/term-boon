import { defineConfig } from "vite";

export default defineConfig({
  base: "/", // custom domain term-boon.peerapongsm.dev — no basePath
  build: { rollupOptions: { input: { main: "index.html", about: "about.html" } } },
  test: { environment: "jsdom", testTimeout: 120_000 },
});
