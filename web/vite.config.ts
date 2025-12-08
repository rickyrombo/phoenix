import tanstackRouter from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import fs from "fs"
import path from "path"
import { defineConfig } from "vite"

let server = {}
if (process.env.NODE_ENV !== "production") {
  server = {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "../certs/key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "../certs/cert.pem")),
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  server,
})
