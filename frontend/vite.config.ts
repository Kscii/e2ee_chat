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
  build: {
    // 配置chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // 将React相关库分离成单独的chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI组件库分离
          'ui-vendor': ['antd', '@ant-design/icons'],
          // 编辑器相关库分离
          'editor-vendor': [
            '@tiptap/react', 
            '@tiptap/starter-kit', 
            '@tiptap/extension-image',
            '@tiptap/extension-link',
            '@tiptap/extension-highlight',
            '@tiptap/extension-code-block-lowlight',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-underline'
          ],
          // 国际化相关库分离
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector', 'i18next-http-backend'],
          // 其他工具库分离
          'utils-vendor': ['axios', 'socket.io-client', 'tweetnacl', 'tweetnacl-util'],
        },
        // 对于大型资源，采用hash命名
        assetFileNames: 'assets/[name].[hash].[ext]',
        // 入口文件配置
        entryFileNames: 'js/[name].[hash].js',
        // 代码块配置
        chunkFileNames: 'js/[name].[hash].js',
      }
    },
    // 启用源码映射，方便调试
    sourcemap: true,
    // 启用压缩
    minify: 'terser',
    // terser压缩选项
    terserOptions: {
      compress: {
        drop_console: true,  // 移除console
        drop_debugger: true  // 移除debugger
      }
    }
  }
})