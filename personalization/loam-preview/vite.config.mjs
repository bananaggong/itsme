import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/personal/projects/loam-demo/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./vendor', import.meta.url)) } },
  build: {
    outDir: '../../public/personal/projects/loam-demo',
    emptyOutDir: true,
  },
});
