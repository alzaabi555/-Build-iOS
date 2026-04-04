import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'glass' | 'ramadan';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // ✅ تم تعيين الثيم الزجاجي الفاخر (glass) كافتراضي بدلاً من الفاتح
    return (localStorage.getItem('rased-theme') as Theme) || 'glass';
  });

  useEffect(() => {
    const root = window.document.documentElement; // وسم <html>

    // تنظيف أي كلاسات قديمة عالقة من النسخة السابقة لتجنب التضارب
    const themes = ['light', 'dark', 'glass', 'ramadan'];
    root.classList.remove(...themes);
    window.document.body.classList.remove(...themes);

    // ✅ السر هنا: يجب حقن الثيم كـ (data-theme) ليتطابق مع ملف tokens.css
    root.setAttribute('data-theme', theme);
    
    localStorage.setItem('rased-theme', theme);
    
    // دليل قاطع للتأكد أن الأوامر وصلت للشاشة بالطريقة الصحيحة
    console.log("🔥 تم حقن الثيم بنجاح! HTML الآن يحتوي على:", `data-theme="${theme}"`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
