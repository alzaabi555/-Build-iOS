import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  // نستخدم Render مباشر بدون StrictMode لحل مشاكل التداخل في بعض البيئات
  root.render(<App />);
} else {
  console.error("Root container not found");
}