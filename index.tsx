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
    
    // محاولة إخفاء الشاشة بعد استقرار التطبيق
    if (document.readyState === 'complete') {
        setTimeout(hideLoader, 500);
    } else {
        window.addEventListener('load', () => setTimeout(hideLoader, 500));
    }
    
    // ضمان أخير للإخفاء
    setTimeout(hideLoader, 2000);
    
  } catch (err: any) {
    console.error("Critical Mount Error:", err);
    hideLoader();
    const consoleDiv = document.getElementById('error-console');
    if (consoleDiv) {
      consoleDiv.style.display = 'block';
      consoleDiv.innerHTML += "<div><b>Mount Fail:</b> " + err.message + "</div>";
    }
  }
} else {
  hideLoader();
}