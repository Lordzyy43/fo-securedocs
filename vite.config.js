import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '^/(csrf-token|login|logout|me|users|change-password|documents|document-shares|audit-logs|admin|roles)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
