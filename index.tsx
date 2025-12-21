import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
const loader = document.getElementById('initial-loader');

if (container) {
  const root = createRoot(container);
  root.render(<App />);
  
  // إخفاء شاشة التحميل بمجرد بدء React
  if (loader) {
    setTimeout(() => {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }, 500);
  }
} else {
  console.error("Root container not found");
}