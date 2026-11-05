import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages ("Deploy from a branch": main, folder /docs) serves this repo at
// https://nagabhadramch.github.io/QuestOmni/ . `npm run build` writes the site into docs/, which is committed.
export default defineConfig({
  base: "/QuestOmni/",
  plugins: [react()],
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});
