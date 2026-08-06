import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If you're deploying to a custom domain at the root (e.g. tracker.yourdomain.com),
// keep base as "/". If you're deploying to https://username.github.io/repo-name/
// without a custom domain, change base to "/repo-name/".
export default defineConfig({
  plugins: [react()],
  base: "/",
});
