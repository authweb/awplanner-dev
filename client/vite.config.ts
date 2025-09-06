import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr({
      svgrOptions: {
        icon: true,
        svgo: true,
        svgoConfig: {
          multipass: true,
          plugins: [
            { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
            // Сносим ВСЁ, что мешает управлять извне
            { name: 'removeAttrs', params: { attrs: ['style', 'class', 'data-name', 'stroke', 'fill', 'stroke-width'] } },
            { name: 'removeDimensions', active: true },
          ],
        },
        // Проставим дефолты на корневой <svg>
        svgProps: { stroke: 'currentColor', fill: 'none' },
      },
    })  
  ],
  base: '/aw_dbplanner/',
  server: {
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
})
