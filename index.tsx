
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
    console.error("Critical rendering error:", error);
    container.innerHTML = `
      <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:20px; font-family:sans-serif;">
        <h2 style="color:#ef4444;">حدث خطأ في تشغيل التطبيق</h2>
        <p style="color:#666;">يرجى محاولة تحديث الصفحة أو مسح ذاكرة التخزين</p>
        <button onclick="location.reload()" style="padding:10px 20px; background:#2563eb; color:white; border:none; border-radius:8px; margin-top:10px;">تحديث</button>
      </div>
    `;
  }
}
