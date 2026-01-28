
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

const hideLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    // Remove quickly to prevent blocking interaction
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
    // Hide loader immediately after render works
    requestAnimationFrame(() => {
        setTimeout(hideLoader, 100);
    });
  } catch (error) {
    console.error("Failed to mount app:", error);
    // The error will be caught by window.onerror in index.html
    throw error; 
  }
}
