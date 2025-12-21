import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

const hideLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      if (loader.parentNode) loader.remove();
    }, 500);
  }
};

// إزالة قسرية لشاشة التحميل بعد 5 ثوانٍ مهما حدث لضمان عدم تعليق المستخدم
setTimeout(hideLoader, 5000);

if (container) {
  try {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // إخفاء التحميل بعد نجاح البدء بفترة بسيطة لضمان ظهور الواجهة
    setTimeout(hideLoader, 800);
    
  } catch (err: any) {
    console.error("Critical mounting error:", err);
    hideLoader(); 
    const consoleDiv = document.getElementById('error-console');
    if (consoleDiv) {
      consoleDiv.style.display = 'block';
      consoleDiv.innerText += "\nخطأ في التشغيل: " + err.message;
    }
  }
} else {
  hideLoader();
}