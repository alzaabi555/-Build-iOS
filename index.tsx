import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(<App />);
    
    // إخفاء شاشة التحميل بعد التأكد من أن React بدأ العمل
    setTimeout(() => {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }
    }, 800);
  } catch (error) {
    console.error("Rendering error:", error);
    // في حال حدوث خطأ أثناء الـ render، نظهر رسالة للمستخدم
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.innerHTML = `<p style="color: red; font-weight: bold; padding: 20px; text-align: center;">حدث خطأ أثناء تشغيل التطبيق. يرجى إعادة المحاولة.</p>`;
    }
  }
}