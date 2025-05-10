import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173, // 你可以换成你的端口
    allowedHosts: ['kang-mi.com'], // 允许外部域名访问
  },
})
