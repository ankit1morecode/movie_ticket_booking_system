import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Requests to /api are forwarded to the Express server
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': process.env.API_URL || 'http://localhost:5000' },
  },
});
