import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // Относительные пути для Telegram
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})
