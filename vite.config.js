import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this repo at https://nagabhadramch.github.io/QuestOmni/
export default defineConfig({
  base: "/QuestOmni/",
  plugins: [react()],
});
