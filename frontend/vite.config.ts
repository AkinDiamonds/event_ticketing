import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const local = command === 'serve' || mode === 'development'
  const backendDir = fileURLToPath(new URL('../backend/', import.meta.url))
  const port = local ? (loadEnv('development', backendDir, 'PORT').PORT || '3000') : ''
  if (local && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)) {
    throw new Error('Set PORT in backend/.env to a valid local API port.')
  }

  return {
    plugins: [tailwindcss(), react()],
    define: {
      'import.meta.env.VITE_LOCAL_API_ORIGIN': JSON.stringify(local ? `http://localhost:${port}` : ''),
    },
  }
})
