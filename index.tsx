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
    
    // إخفاء التحميل بعد نجاح الرندر مباشرة
    requestAnimationFrame(() => {
      setTimeout(hideLoader, 500);
    });
    
  } catch (err: any) {
    console.error("Mount error:", err);
    hideLoader();
    const consoleDiv = document.getElementById('error-console');
    if (consoleDiv) {
      consoleDiv.style.display = 'block';
      consoleDiv.innerText += "\n[MOUNT_FAIL]: " + err.message;
    }
  }
} else {
  hideLoader();
}