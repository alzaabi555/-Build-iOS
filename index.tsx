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

if (container) {
  try {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // محاولة إخفاء شاشة التحميل بعد وقت قصير من البدء
    setTimeout(hideLoader, 800);
    
  } catch (err: any) {
    console.error("Mounting error:", err);
    if ((window as any).logErrorToScreen) {
      (window as any).logErrorToScreen("فشل في بدء التطبيق: " + err.message);
    }
  }
} else {
  if ((window as any).logErrorToScreen) {
    (window as any).logErrorToScreen("خطأ: لم يتم العثور على عنصر root في الصفحة");
  }
}