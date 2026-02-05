import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // تحميل متغيرات البيئة بشكل صحيح
    const env = loadEnv(mode, process.cwd(), '');

    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [react()],
        define: {
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        },
        resolve: {
            alias: {
                // ✅ التصحيح هنا: النقطة (.) تعني المجلد الحالي (الجذر)
                // هذا سيجعل @ تشير إلى مجلد المشروع الرئيسي مباشرة
                '@': path.resolve(__dirname, '.'), 
            }
        }
    };
});
