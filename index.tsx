import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// ✅ ضروري جداً: استيراد ملف التصميم هنا لتفعيله
import './index.css'; 

const container = document.getElementById('root');

// دالة إخفاء شاشة التحميل
const hideLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 300);
  }
};

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // إخفاء اللودر بمجرد نجاح الرندر
    requestAnimationFrame(() => {
        setTimeout(hideLoader, 100);
    });
  } catch (error) {
    console.error("Failed to mount app:", error);
    throw error; 
  }
}
