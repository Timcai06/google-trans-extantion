import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Use relative paths for Chrome extension compatibility
  base: '',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    outDir: 'dist',
    // Generate stable filenames without hash for Chrome extension
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    // Ensure all dependencies are bundled
    commonjsOptions: {
      include: [/node_modules/]
    },
    // Inline all assets to avoid separate file references
    assetsInlineLimit: 0,
    // Optimize for production using esbuild (faster and no extra dependency)
    minify: 'esbuild',
    sourcemap: false,
    // Ensure CSS is extracted
    cssCodeSplit: false
  }
});
