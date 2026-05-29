import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    TanStackRouterVite(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    viteReact(),
  ],
})

export default config
