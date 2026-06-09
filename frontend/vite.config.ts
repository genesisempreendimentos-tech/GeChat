import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function getBackendPort(): number {
  const portFile = path.resolve(__dirname, '../backend/.server-port')
  try {
    const port = Number(fs.readFileSync(portFile, 'utf8').trim())
    if (Number.isFinite(port) && port > 0) return port
  } catch {
    /* backend ainda não gravou a porta */
  }

  const fromEnv = process.env.VITE_API_URL?.match(/:(\d+)/)?.[1]
  if (fromEnv) return Number(fromEnv)

  return 3001
}

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
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'framer-motion', 'recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: `http://localhost:${getBackendPort()}`,
        changeOrigin: true,
        router: () => `http://localhost:${getBackendPort()}`,
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
