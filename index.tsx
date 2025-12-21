import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

const cleanupLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      if (loader.parentNode) loader.remove();
    }, 500);
  }
};

if (container) {
  const root = ReactDOM.createRoot(container);
  try {
    root.render(<App />);
    // إخفاء اللودر فوراً بعد أول رندر ناجح
    setTimeout(cleanupLoader, 1000);
  } catch (err) {
    console.error("Critical error during render:", err);
    cleanupLoader();
  }
} else {
  cleanupLoader();
}