import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import fs from "fs";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "../certs/key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "../certs/cert.pem")),
    },
  },
});
