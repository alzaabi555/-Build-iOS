import React, { useEffect } from 'react';

const RamadanTheme: React.FC = () => {
  useEffect(() => {
    document.body.className = 'theme-dark';
    
    // 🎨 تطبيق اللون الأساسي: سماء ليلية عميقة جداً
    document.body.style.backgroundColor = '#050B14'; 
    document.body.style.color = '#ffffff';

    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) metaThemeColor.setAttribute("content", "#050B14");

    window.document.documentElement.classList.add('dark');

    return () => {
      document.body.classList.remove('theme-dark');
      window.document.documentElement.classList.remove('dark');
    };
  }, []);

  return (
    <>
      <style>
        {`
          /* ==================================================================== */
          /* 🌙 الثيم الداكن (مبني بالكامل على نظامك التصميمي الجديد) */
          /* ==================================================================== */
          
          body.theme-dark {
              background-color: #050B14 !important;
              background-image: radial-gradient(circle at 50% 0%, #0d1627 0%, #050B14 80%) !important;
              background-attachment: fixed !important;
          }

          /* 🧊 دمج نظام Glassmorphism الاحترافي (بدون وهج مزعج) */
          .theme-dark aside, 
          .theme-dark .z-\\[100001\\], 
          .theme-dark div.rounded-\\[1\\.5rem\\],
          .theme-dark div.rounded-2xl,
          .theme-dark div.rounded-3xl {
              /* 1. جعل الزجاج أكثر شفافية (2% أبيض فقط بدلاً من 5%) */
              background-color: rgba(255, 255, 255, 0.02) !important;
              
              /* 2. تفعيل ضبابية الزجاج بشكل ناعم */
              backdrop-filter: blur(16px) !important;
              -webkit-backdrop-filter: blur(16px) !important;
              
              /* 3. إطار زجاجي نحيف جداً يعطي فخامة */
              border: 1px solid rgba(255, 255, 255, 0.08) !important;
              
              /* 4. إزالة الوهج النيون الأزرق المزعج، واستبداله بظل هادئ يفصل البطاقة عن الخلفية */
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
              
              transition: all 0.3s ease-in-out !important;
          }

          /* تطبيق تأثير عند مرور الماوس (Hover) */
          .theme-dark div.rounded-\\[1\\.5rem\\]:hover,
          .theme-dark div.rounded-2xl:hover {
              background-color: rgba(255, 255, 255, 0.04) !important;
              border-color: rgba(255, 255, 255, 0.15) !important;
              /* وهج أزرق خفييييف جداً عند اللمس فقط */
              box-shadow: 0 8px 32px rgba(59, 130, 246, 0.1) !important;
              transform: translateY(-2px) !important;
          }

          /* 💎 تخصيص الأزرار السريعة */
          .theme-dark button.bg-blue-600,
          .theme-dark button.bg-gradient-to-r {
              background: linear-gradient(to right, #3b82f6, #06b6d4) !important;
              box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2) !important;
              border: none !important;
          }

          /* مربعات الإدخال (Subtle Glass) */
          .theme-dark input, 
          .theme-dark select, 
          .theme-dark textarea {
              background-color: rgba(255, 255, 255, 0.03) !important;
              backdrop-filter: blur(12px) !important;
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              color: #FFFFFF !important;
              box-shadow: inset 0 2px 4px rgba(0,0,0,0.2) !important;
          }

          .theme-dark input:focus,
          .theme-dark select:focus {
              box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5) !important;
              border-color: rgba(59, 130, 246, 0.5) !important;
              background-color: rgba(255, 255, 255, 0.06) !important;
          }

          /* النصوص (Text System) */
          .theme-dark .text-slate-800,
          .theme-dark .text-slate-900,
          .theme-dark .text-gray-800 { 
              color: #ffffff !important; 
          }
          
          .theme-dark .text-slate-500,
          .theme-dark .text-slate-600 { 
              color: #94a3b8 !important; 
          }
        `}
      </style>

      {/* 🌌 أضواء النيون الخلفية (تم تخفيفها لكي لا تطغى على التطبيق) */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-500 rounded-full blur-[150px] opacity-[0.08]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500 rounded-full blur-[150px] opacity-[0.08]"></div>
      </div>
    </>
  );
};

export default RamadanTheme;
