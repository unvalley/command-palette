import tailwindcss from "@tailwindcss/vite"
import vue from "@vitejs/plugin-vue"
import { defineConfig, type UserConfig } from "vite"

const config: UserConfig = defineConfig({
  plugins: [tailwindcss(), vue()],
  server: { port: 5174 },
})

export default config
