import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  envDir: '../',
  define: {
    'process.env': process.env
  },
  optimizeDeps: {
    include: [
      '@dfinity/principal',
      '@dfinity/identity',
      '@dfinity/agent',
      '@dfinity/candid',
      '@dfinity/auth-client'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'dfinity-core': ['@dfinity/principal', '@dfinity/identity'],
          'dfinity-agent': ['@dfinity/agent', '@dfinity/auth-client'],
          'dfinity-candid': ['@dfinity/candid']
        }
      }
    }
  },
  server: {
    host: '127.0.0.1'
  }
});
