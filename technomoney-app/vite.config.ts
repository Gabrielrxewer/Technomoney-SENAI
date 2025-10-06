import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "jwt-decode",
      "@fortawesome/fontawesome-svg-core",
      "@fortawesome/free-solid-svg-icons",
      "@fortawesome/react-fontawesome",
    ],
  },
  ssr: {
    noExternal: [
      "@fortawesome/fontawesome-svg-core",
      "@fortawesome/free-solid-svg-icons",
      "@fortawesome/react-fontawesome",
    ],
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api/payments": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/core": {
        target: "http://localhost:4002",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/core/, "/api"),
      },
    },
  },
});
