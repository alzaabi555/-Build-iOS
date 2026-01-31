import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ✅ هذا السطر هو الذي "يلبس" التطبيق تصميمه
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
