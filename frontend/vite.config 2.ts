import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173, // 你可以换成你的端口
    allowedHosts: ['kscii.tech'], // 允许 kscii.tech 访问
  },
})
