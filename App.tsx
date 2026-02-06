// App.tsx
import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import LoginScreen from './components/LoginScreen';
import AppContent from './AppContentWrapper'; // سنعرّف هذا بالأسفل

// مكوّن صغير يلف AppContent بـ AppProvider ويستدعيه
const AppContentWrapper: React.FC = () => {
  return (
    <AppProvider>
      <InnerAppContent />
    </AppProvider>
  );
};

// هذا هو AppContent الذي أعطيتك إياه (استخدم هنا الاسم InnerAppContent فقط)
import { InnerAppContent } from './components/InnerAppContent'; // انقل AppContent إلى هذا الملف والاسم

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = (user: any | null) => {
    // لا يهم نوع الدخول الآن، المهم أن ننتقل للتطبيق
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <ThemeProvider>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppContentWrapper />
    </ThemeProvider>
  );
};

export default App;
