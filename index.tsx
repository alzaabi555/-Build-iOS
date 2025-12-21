import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = ReactDOM.createRoot(container);
    root.render(<App />);
    
    // إخفاء اللودر فور رندر المكونات
    const hideLoader = () => {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }
    };

    // ننتظر قليلاً لضمان استقرار الواجهة في المتصفح
    if (document.readyState === 'complete') {
      setTimeout(hideLoader, 600);
    } else {
      window.addEventListener('load', hideLoader);
      // كضمان إضافي إذا لم يعمل مستمع الأحداث
      setTimeout(hideLoader, 2000);
    }
  } catch (err: any) {
    console.error("Mounting error:", err);
    
    // Fix: Cast window to any to access the custom logErrorToScreen property and satisfy TypeScript
    if ((window as any).logErrorToScreen) (window as any).logErrorToScreen("Mount: " + err.message);
  }
}