import React, { useEffect } from 'react';

// =========================================================================
// 🔮 الثيم الزجاجي الهادئ (Deep Indigo Glass Theme)
// =========================================================================

const RamadanTheme: React.FC = () => {

  useEffect(() => {
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    // لون شريط المتصفح/الجوال
    metaThemeColor.setAttribute("content", "#1a1b41"); 
    document.body.style.backgroundColor = "#1a1b41";

    document.body.classList.add('ramadan-active');

    return () => {
      document.body.style.backgroundColor = "#f3f4f6";
      document.body.classList.remove('ramadan-active');
    };
  }, []);

  return (
    <>
      <style>
        {`
          /* 🌟 خلفية التطبيق: تدرج نيلي عميق وحيوي (ليس أسود) */
          body.ramadan-active, body.ramadan-active #root {
              background: linear-gradient(135deg, #1a1b41 0%, #0f1123 100%) !important;
              background-attachment: fixed !important;
          }

          /* 🌟 توحيد شكل شريط التمرير */
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02) !important; }
          ::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.4) !important; border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.7) !important; }

          /* 🚀 السلاح الشامل: تحييد الألوان الخضراء المزعجة */
          body.ramadan-active [class*="bg-green-"], 
          body.ramadan-active [class*="bg-emerald-"] { 
              background-color: rgba(255, 255, 255, 0.08) !important; 
              backdrop-filter: blur(12px) !important;
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              --tw-bg-opacity: 1 !important; 
          }
          
          body.ramadan-active [class*="border-green-"], 
          body.ramadan-active [class*="border-emerald-"] { 
              border-color: rgba(99, 102, 241, 0.4) !important; 
              --tw-border-opacity: 1 !important;
          }
          
          body.ramadan-active [class*="text-green-"], 
          body.ramadan-active [class*="text-emerald-"] { 
              color: #a5b4fc !important; /* Indigo 300 */
              --tw-text-opacity: 1 !important;
          }

          body.ramadan-active [class*="ring-green-"],
          body.ramadan-active [class*="ring-emerald-"] {
              --tw-ring-color: rgba(99, 102, 241, 0.5) !important;
          }

          /* ✨ مربعات الإدخال الزجاجية */
          body.ramadan-active input, 
          body.ramadan-active textarea, 
          body.ramadan-active select {
              background-color: rgba(255, 255, 255, 0.05) !important; 
              border: 1px solid rgba(255, 255, 255, 0.15) !important;
              color: white !important;
              border-radius: 0.75rem !important;
              transition: all 0.3s ease !important;
          }
          
          body.ramadan-active input:focus, 
          body.ramadan-active textarea:focus, 
          body.ramadan-active select:focus {
              border-color: #818cf8 !important; /* Indigo 400 */
              box-shadow: 0 0 15px rgba(99, 102, 241, 0.25) !important;
              outline: none !important;
              background-color: rgba(255, 255, 255, 0.1) !important;
          }
          
          body.ramadan-active input::placeholder, 
          body.ramadan-active textarea::placeholder {
              color: rgba(255, 255, 255, 0.5) !important;
          }
          
          /* 🔮 إجبار النوافذ المنزلقة على الشفافية المشرقة الأنيقة */
          body.ramadan-active .z-\\[99999\\], 
          body.ramadan-active .z-\\[100001\\] {
              background-color: rgba(26, 27, 65, 0.6) !important; 
              backdrop-filter: blur(20px) !important;
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              box-shadow: -10px 0 40px rgba(0, 0, 0, 0.4) !important;
          }
        `}
      </style>

      {/* ===================================================== */}
      {/* 🌌 الطبقة الخلفية - إضاءة زجاجية حيوية وهادئة */}
      {/* ===================================================== */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden select-none bg-[#0f1123]">
        
        {/* توهج علوي يمين: أزرق نيلي حيوي ومريح (Indigo) */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/15 rounded-full blur-[140px] -translate-y-1/3 translate-x-1/4"></div>
        
        {/* توهج سفلي يسار: أزرق فاتح هادئ (Cyan/Blue) للمسة حيوية */}
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-blue-500/15 rounded-full blur-[130px] translate-y-1/3 -translate-x-1/4"></div>
        
        {/* توهج وسطي خفيف جداً بلون بنفسجي هادئ للربط بين الألوان */}
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2"></div>

      </div>
    </>
  );
};

export default RamadanTheme;
