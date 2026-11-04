import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite設定ファイル: React + Tailwind CSS v4 構成（GitHub Pages サブパス対応で base: './' を指定）
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
  },
})
