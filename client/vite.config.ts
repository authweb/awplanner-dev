// client/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ mode }) => ({
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
            { name: 'removeAttrs', params: { attrs: ['style','class','data-name','stroke','fill','stroke-width'] } },
            { name: 'removeDimensions', active: true },
          ],
        },
        svgProps: { stroke: 'currentColor', fill: 'none' },
      },
    }),
  ],
  // локал/Codespaces → '/', GitHub Pages → '/awplanner-dev/'
  base: mode === 'pages' ? '/awplanner-dev/' : '/',
  server: {
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
}))
