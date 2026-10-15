import { defineConfig } from 'vite';

// The base must match the GitHub repository name, or every asset 404s on Pages.
export default defineConfig({
  base: '/Outpost-/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
