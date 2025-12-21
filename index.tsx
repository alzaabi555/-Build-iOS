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
    
    // إخفاء شاشة التحميل بمجرد أن يصبح المتصفح جاهزاً
    if (document.readyState === 'complete') {
      setTimeout(hideLoader, 300);
    } else {
      window.addEventListener('load', () => setTimeout(hideLoader, 300));
    }

    // صمام أمان إضافي
    setTimeout(hideLoader, 2500);
    
  } catch (err: any) {
    console.error("Mounting error:", err);
    hideLoader();
    const debugDiv = document.getElementById('debug-console');
    if (debugDiv) {
      debugDiv.style.display = 'block';
      debugDiv.innerHTML += "<div><b>فشل في بناء التطبيق:</b> " + err.message + "</div>";
    }
  }
} else {
  hideLoader();
}