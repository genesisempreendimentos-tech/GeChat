import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'framer-motion', 'recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false, // se 5173 estiver ocupada, tenta 5174, 5175...
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        router: () => {
          const activePortFile = path.resolve(__dirname, '.server-port')
          try {
            const raw = fs.readFileSync(activePortFile, 'utf8').trim()
            const port = Number(raw)
            if (Number.isInteger(port) && port > 0) {
              return `http://localhost:${port}`
            }
          } catch {
            // fallback para porta padrão
          }
          const fallbackPort = Number(process.env.SERVER_PORT || 3001)
          return `http://localhost:${fallbackPort}`
        },
        changeOrigin: true,
        /** Garante Authorization até o Node (evita 401 em dev se o proxy omitir o header). */
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const h = req.headers;
            const auth = h.authorization ?? h.Authorization;
            const value = Array.isArray(auth) ? auth.join(', ') : auth;
            if (value) proxyReq.setHeader('Authorization', value);
          });
        },
      },
    },
  },
})
