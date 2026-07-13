import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    // مسار نسبي مناسب لنسخ Android وiOS وWindows.
    base: './',

    // نسخ جميع الملفات الموجودة داخل public إلى ناتج البناء.
    publicDir: 'public',

    server: {
      port: 3000,
      host: '0.0.0.0'
    },

    plugins: [react()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(
        env.GEMINI_API_KEY
      )
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },

    esbuild: {
      target: 'es2020'
    },

    optimizeDeps: {
      esbuildOptions: {
        target: 'es2020'
      }
    },

    build: {
      target: 'es2020',

      // عدم تحويل الصور والملفات إلى Base64.
      assetsInlineLimit: 0,

      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[hash][extname]'
        }
      }
    }
  };
});
