import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // 3D 库（Three.js + r3f + drei）整体随 GameCanvas 懒加载，是单个较大的异步块，
      // 不在首屏，提高阈值避免无意义的体积告警。
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // 分块原则：只把「确定 eager（首屏就要）且变动极少」的库拆出来做长期缓存；
          // three / r3f / drei 及其传递依赖一律【不】强制分块，交给 Rollup 留在懒加载的
          // GameCanvas 异步块内——任何把它们并入命名块的做法，都会因共享模块（如 Vite
          // 预加载助手、zustand 等）被放入该块而让入口静态依赖它、把 770KB 的 three 拽到首屏。
          manualChunks(id: string) {
            // Vite 预加载助手必须留在 eager 块，否则会被并入懒加载块拖累首屏。
            if (id.includes('vite/preload-helper')) return 'react-vendor';
            if (!id.includes('node_modules')) return;
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'react-vendor';
            if (id.includes('socket.io') || id.includes('engine.io')) return 'socket';
            return;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          ws: true,
        },
        '/avatars': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
