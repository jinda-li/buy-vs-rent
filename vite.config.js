import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/buy-vs-rent/",
  plugins: [react()],
});
