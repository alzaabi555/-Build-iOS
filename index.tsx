import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

const hideLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.transition = 'opacity 0.4s ease';
    loader.style.opacity = '0';
    setTimeout(() => {
      if (loader.parentNode) loader.remove();
    }, 400);
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
    
    // إخفاء شاشة التحميل فوراً بعد المعالجة
    setTimeout(hideLoader, 500);
    
  } catch (err: any) {
    console.error("Mounting error:", err);
    const consoleDiv = document.getElementById('error-console');
    if (consoleDiv) {
      consoleDiv.style.display = 'block';
      consoleDiv.innerText += "\nFail: " + err.message;
    }
  }
}