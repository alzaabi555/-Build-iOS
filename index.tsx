import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';

const container = document.getElementById('root');

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
        {/* 👇 2. تغليف التطبيق بـ HashRouter هو السر لعمل Electron 👇 */}
        <HashRouter>
           <App />
        </HashRouter>
      </React.StrictMode>
    );
    
    requestAnimationFrame(() => {
        setTimeout(hideLoader, 100);
    });
  } catch (error) {
    console.error("Failed to mount app:", error);
    throw error; 
  }
}
