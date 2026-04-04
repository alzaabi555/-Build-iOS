import React, { useEffect } from 'react';

interface ThemeManagerProps {
  theme: 'dark' | 'light';
}

const ThemeManager: React.FC<ThemeManagerProps> = ({ theme }) => {
  useEffect(() => {
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    // لون الهاتف العلوي
    metaThemeColor.setAttribute("content", theme === 'dark' ? '#080C17' : '#F4F7F9');
    
    // إبلاغ التطبيق بالثيم الحالي
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <style>
        {`
          /* ========================================================== */
          /* 🌙 الثيم الداكن (Glowing Midnight Blue) - الأساس السليم */
          /* ========================================================== */
          body[data-theme='dark'] {
              background: radial-gradient(circle at 10% 0%, #1A2345 0%, #080C17 100%) !important;
              color: #FFFFFF !important;
              background-attachment: fixed !important;
          }

          /* لمسة زجاجية فقط للشريط الجانبي ولوحة المزيد لتطابق تصميمك */
          body[data-theme='dark'] aside,
          body[data-theme='dark'] .z-\\[100001\\] {
              background: linear-gradient(160deg, rgba(30, 43, 77, 0.6) 0%, rgba(12, 18, 36, 0.9) 100%) !important;
              border-top: 1px solid rgba(100, 140, 255, 0.2) !important; 
          }

          /* ========================================================== */
          /* ☀️ الثيم الفاتح النظيف - لن يتدخل في كروت الطلاب نهائياً */
          /* ========================================================== */
          body[data-theme='light'] {
              background: #F4F7F9 !important;
              color: #1E293B !important;
          }
          
          /* إخفاء التوهج الكحلي في الثيم الفاتح */
          body[data-theme='light'] .dark-glow {
              opacity: 0 !important;
              display: none !important;
          }
        `}
      </style>

      {/* 🌌 التوهج الخلفي المضيء (يظهر فقط في الثيم الداكن ليعطي الستايل الفاخر) */}
      <div className="dark-glow fixed inset-0 z-[-1] pointer-events-none overflow-hidden select-none bg-transparent transition-opacity duration-1000">
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-600 rounded-full blur-[160px] opacity-[0.15]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-400 rounded-full blur-[140px] opacity-[0.1]"></div>
      </div>
    </>
  );
};

export default ThemeManager;
