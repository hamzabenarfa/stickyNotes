import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        note: resolve(__dirname, 'src/note.html'),
        settings: resolve(__dirname, 'src/settings.html'),
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
