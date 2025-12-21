import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Error Boundary Props and State interfaces to ensure type safety and fix property access errors
interface ErrorBoundaryProps {
  // Fix: Making children optional helps resolve TypeScript errors where children passed via JSX 
  // are not correctly inferred as part of the props object in certain strict configurations.
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary بسيط لالتقاط الأخطاء في شجرة المكونات
// Explicitly using interfaces to help TypeScript resolve inherited properties like this.props and this.state
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare props and state to avoid "Property does not exist" errors in strict environments
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(): ErrorBoundaryState { 
    return { hasError: true }; 
  }

  render() {
    // Checking this.state.hasError
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
          <h2 className="text-xl font-black text-rose-600 mb-4">عذراً، حدث خطأ غير متوقع</h2>
          <p className="text-sm text-gray-500 mb-6 font-bold">قد يكون ذلك بسبب خلل في البيانات المخزنة</p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => location.reload()} className="py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">إعادة تحميل الصفحة</button>
            <button onClick={() => { localStorage.clear(); location.reload(); }} className="py-4 bg-gray-200 text-gray-600 rounded-2xl font-black">مسح كافة البيانات (إعادة ضبط)</button>
          </div>
        </div>
      );
    }
    // Accessing this.props.children
    return this.props.children;
  }
}

const container = document.getElementById('root');
const splash = document.getElementById('splash-screen');

if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  
  // إخفاء شاشة التحميل بعد وقت قصير من البدء لضمان ظهور الواجهة
  setTimeout(() => {
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 500);
    }
  }, 1000);
}