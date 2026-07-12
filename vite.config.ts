import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    // مسار نسبي مناسب لنسخ Android وiOS وWindows.
    base: './',

    // نسخ جميع الملفات الموجودة في public إلى مجلد البناء.
    publicDir: 'public',

    server: {
      port: 3000,
      host: '0.0.0.0'
    },

    plugins: [react()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },

    // دعم Top-level await المستخدم في pdfjs-dist.
    esbuild: {
      target: 'es2022'
    },

    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022'
      }
    },

    build: {
      target: 'es2022',

      // عدم تحويل الصور والملفات إلى بيانات Base64.
      assetsInlineLimit: 0,

      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[hash][extname]'
        }
      }
    }
  };
});
