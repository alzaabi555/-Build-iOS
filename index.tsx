import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("خطأ أثناء تشغيل التطبيق:", error);
    container.innerHTML = `<div style="padding: 20px; text-align: center; font-family: sans-serif;">
      <h2>حدث خطأ أثناء تحميل التطبيق</h2>
      <p>يرجى إعادة تحديث الصفحة أو مسح ذاكرة التخزين المؤقت.</p>
    </div>`;
  }
} else {
  console.error("عنصر root غير موجود");
}