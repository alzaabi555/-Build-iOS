import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      base: '/',  // ✅ مهم جداً للمسارات
      publicDir: 'public',  // ✅ يضمن نسخ الملفات من public/
      
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      
      plugins: [react()],
      
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),  // ✅ صحّحت المسار
        }
      },
      
      // ✅ إضافة: للتأكد من نسخ الصور
      build: {
        assetsInlineLimit: 0,  // لا تحول الصور إلى base64
        rollupOptions: {
          output: {
            assetFileNames: 'assets/[name].[hash][extname]'
          }
        }
      }
    };
});
