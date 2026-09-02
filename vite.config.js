import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/Gestion-Cumplimiento-Ley-21719/',
  plugins: [react(), tailwindcss()],
})
