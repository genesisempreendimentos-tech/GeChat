import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const BACKEND_DIR = path.resolve(__dirname, '../backend')

function readServerPortFromEnvFile(): number | null {
  const envPath = path.join(BACKEND_DIR, '.env')
  try {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^SERVER_PORT=(\d+)/)
      if (match) {
        const port = Number(match[1])
        if (Number.isFinite(port) && port > 0) return port
      }
    }
  } catch {
    /* backend/.env ausente */
  }
  return null
}

function getBackendPort(): number {
  const portFile = path.join(BACKEND_DIR, '.server-port')
  try {
    const port = Number(fs.readFileSync(portFile, 'utf8').trim())
    if (Number.isFinite(port) && port > 0) return port
  } catch {
    /* backend ainda não gravou a porta */
  }

  const fromBackendEnv = readServerPortFromEnvFile()
  if (fromBackendEnv) return fromBackendEnv

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
