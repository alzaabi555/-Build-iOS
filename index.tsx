
import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: any;
}

// Fix: Explicitly define types to help TypeScript's inference for Class Components
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Declaring state as a class property resolves "Property 'state' does not exist" errors
  state: ErrorBoundaryState = {
    hasError: false
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Fix: state is already initialized as a class property above to satisfy TypeScript
  }

  // Fix: Static method signature for error handling
  static getDerivedStateFromError(error: any): ErrorBoundaryState { 
    return { hasError: true, error }; 
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    // Fix: Access state through 'this.state' which is now explicitly declared in the class
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50" style={{direction: 'rtl', fontFamily: 'Tajawal, sans-serif'}}>
          <h2 className="text-xl font-black text-rose-600 mb-4">عذراً، حدث خطأ غير متوقع</h2>
          <p className="text-sm text-gray-500 mb-6 font-bold">قد يكون ذلك بسبب تعارض في إصدارات النظام أو البيانات المخزنة.</p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button 
              onClick={() => window.location.reload()} 
              className="py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-transform"
            >
              إعادة تحميل الصفحة
            </button>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }} 
              className="py-4 bg-gray-200 text-gray-600 rounded-2xl font-black active:scale-95 transition-transform"
            >
              مسح الذاكرة وإعادة الضبط
            </button>
          </div>
          {/* Fix: safely check for error in state before rendering */}
          {this.state.error && (
            <details className="mt-8 text-[8px] text-gray-300 opacity-50 cursor-pointer">
              <summary>تفاصيل الخطأ التقني</summary>
              <pre className="mt-2 text-left bg-gray-100 p-2 rounded overflow-auto max-w-full">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }
    // Fix: Accessing 'this.props' which is inherited from Component
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
