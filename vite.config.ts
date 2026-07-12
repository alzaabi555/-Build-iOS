import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    // مسار نسبي مناسب لبناء Android وiOS وWindows.
    base: './',

    // يضمن نسخ الملفات الموجودة داخل public إلى ناتج البناء.
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

    /*
     * pdfjs-dist الإصدار الرابع يستخدم Top-level await.
     * لذلك يجب أن يكون هدف البناء ES2022 بدل ES2020.
     */
    esbuild: {
      target: 'es*022'
    },

    optimizeDeps: {
 *    esbuildOptions: {
        targ*t: 'es2022'
      }
    },

    bu*ld: {
      target: 'es2022',

   *  // عدم تحويل الصور والملفات إلى *ase64.
      assetsInlineLimit: 0,*
      rollupOptions: {
        ou*put: {
          assetFileNames: '*ssets/[name].[hash][extname]'
    *   }
      }
    }
  };
});
