
import React, { createContext, useContext, useEffect, useState } from 'react';

// تثبيت الثيم على 'ceramic' (النهاري) فقط
export type ThemeMode = 'ceramic'; 

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
  isLowPower: boolean;
  toggleLowPower: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // تثبيت القيمة
  const [theme] = useState<ThemeMode>('ceramic');

  const [isLowPower, setIsLowPower] = useState<boolean>(() => {
      return localStorage.getItem('app-low-power') === 'true';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // تنظيف شامل لأي كلاسات قديمة
    root.classList.remove('dark', 'vision', 'android-mode');
    
    // إجبار الوضع النهاري
    root.classList.add('light');
    root.setAttribute('data-theme', 'ceramic');
    
    // تثبيت خلفية الجسم
    document.body.style.backgroundColor = '#f3f4f6';
    document.body.style.color = '#1f2937';

    if (isLowPower) {
        root.classList.add('low-power');
    } else {
        root.classList.remove('low-power');
    }

    // حفظ الإعدادات
    localStorage.setItem('app-theme', 'ceramic');
    localStorage.setItem('app-low-power', String(isLowPower));
  }, [isLowPower]);

  // دالة فارغة لأننا ألغينا التغيير
  const setTheme = () => {};

  const toggleLowPower = () => {
      setIsLowPower(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: false, isLowPower, toggleLowPower }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
