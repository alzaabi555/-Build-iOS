import React, { useEffect } from 'react';

// =========================================================================
// 🔮 الثيم الزجاجي الداكن (Royal Purple & Gold Glass Theme)
// =========================================================================

const RamadanTheme: React.FC = () => {
  // تم إزالة شروط التاريخ، هذا الثيم سيعمل دائماً لدعم التصميم الزجاجي الفاخر

  // تغيير لون شريط هاتف المستخدم (أو المتصفح) ليتناسب مع الثيم البنفسجي الداكن
  useEffect(() => {
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", "#1e1b4b"); 
    document.body.style.backgroundColor = "#1e1b4b";

    // تنظيف في حال تم إلغاء المكون
    return () => {
      document.body.style.backgroundColor = "#f3f4f6";
    };
  }, []);

  return (
    <>
      <style>
        {`
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: transparent !important; }
          /* شريط التمرير باللون الذهبي الرمضاني */
          ::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.25) !important; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(251, 191, 36, 0.8) !important; }

          .custom-scrollbar::-webkit-scrollbar-track { background: transparent !important; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.3) !important; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(251, 191, 36, 0.9) !important; }
        `}
      </style>

      {/* ===================================================== */}
      {/* 🌌 الطبقة الخلفية (z-0) - السماء البنفسجية العميقة والتوهج الذهبي */}
      {/* ===================================================== */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        
        {/* السماء الليلية (بنفسجي ملكي داكن مستوحى من صورتك الرائعة) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a1b54] via-[#1a103c] to-[#0f0726]"></div>
        
        {/* تأثيرات الإضاءة (توهج ذهبي في الأعلى وبنفسجي/وردي في الأسفل لإبراز الزجاج) */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-fuchsia-600/15 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>

      </div>
    </>
  );
};

export default RamadanTheme;
