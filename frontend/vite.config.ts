// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/public": { target: "http://localhost:3000", changeOrigin: true, secure: false },
      "/images": { target: "http://localhost:3000", changeOrigin: true, secure: false },
      "/uploads": { target: "http://localhost:3000", changeOrigin: true, secure: false },
    },
  },
});
