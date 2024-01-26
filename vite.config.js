import { defineConfig } from 'vite';
import React from '@vitejs/plugin-react';

// vite.config.js
import checker from 'vite-plugin-checker'
export default defineConfig({
  plugins: [
    React(),
    checker({
      // e.g. use TypeScript check
      typescript: true,
    }),
  ],
});
