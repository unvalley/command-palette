import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type UserConfig } from "vite"

const config: UserConfig = defineConfig({
  plugins: [tailwindcss(), react()],
  server: { port: 5173 },
})

export default config
