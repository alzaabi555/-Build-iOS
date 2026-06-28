import React, { useEffect } from 'react';

const LightTheme: React.FC = () => {
  useEffect(() => {
    // 1. تنظيف الجسم وتطبيق كلاس الثيم الفاتح
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    
    // 2. تطبيق ألوان النظام الحكومي (Background Main)
    document.body.style.backgroundColor = '#F8FAFC';
    document.body.style.color = '#0F172A';

    // 3. لون شريط الهاتف المتوافق مع الثيم
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", "#F8FAFC");
    }

    return () => {
      document.body.classList.remove('theme-light');
    };
  }, []);

  return (
    <>
      <style>
        {`
          /* ==================================================================== */
          /* 🏛️ النظام الحكومي الرسمي (Government School Theme) - الثيم الفاتح */
          /* ==================================================================== */
          
          /* 🧱 2️⃣ Layout Base (خلفية نظيفة) */
          body.theme-light, body.theme-light #root {
              background-color: #F8FAFC !important;
              background-image: none !important;
              color: #0F172A !important;
          }

          /* 🧊 3️⃣ Card System (بطاقات رسمية نظيفة) */
          .theme-light aside, 
          .theme-light .z-\\[100001\\], 
          .theme-light div.rounded-\\[1\\.5rem\\],
          .theme-light div.rounded-2xl,
          .theme-light div.rounded-3xl {
              /* Surface */
              background-color: #FFFFFF !important;
              backdrop-filter: none !important; 
              
              /* Border */
              border: 1px solid #E2E8F0 !important;
              
              /* Hover & Shadow */
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important; /* shadow-sm */
              transition: all 0.2s ease-in-out !important;
          }

          /* تأثير المرور (Hover) للبطاقات */
          .theme-light div.rounded-\\[1\\.5rem\\]:hover,
          .theme-light div.rounded-2xl:hover {
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          }

          /* 🔘 4️⃣ Buttons System (تخصيص الأزرار الرسمية) */
          .theme-light button.bg-blue-600,
          .theme-light button.bg-gradient-to-r {
              background: #1E3A8A !important; /* Primary (أزرق رسمي) */
              color: #FFFFFF !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0.5rem !important; /* rounded-lg */
          }
          
          .theme-light button.bg-blue-600:hover,
          .theme-light button.bg-gradient-to-r:hover {
              background: #1D4ED8 !important; /* Primary Hover */
          }

          /* مربعات الإدخال والبحث */
          .theme-light input, 
          .theme-light select, 
          .theme-light textarea {
              background-color: #FFFFFF !important;
              border: 1px solid #E2E8F0 !important;
              color: #0F172A !important;
          }
          
          .theme-light input:focus {
              border-color: #1E3A8A !important;
              box-shadow: 0 0 0 1px #1E3A8A !important; /* تركيز أزرق رسمي */
              outline: none !important;
          }

          /* 🎨 1️⃣ Color System - النصوص (Text Colors) */
          .theme-light .text-slate-800,
          .theme-light .text-slate-900,
          .theme-light .text-gray-800,
          .theme-light .text-white { 
              color: #0F172A !important; /* Text Primary */
          }
          
          .theme-light .text-slate-500,
          .theme-light .text-slate-600,
          .theme-light .text-blue-200 { 
              color: #64748B !important; /* Text Muted */
          }

          .theme-light .text-blue-400,
          .theme-light .text-primaryLight {
              color: #1E3A8A !important; /* تحويل النصوص الزرقاء الفاتحة إلى الأزرق الرسمي */
          }

          /* إخفاء حدود Tailwind الرمادية الافتراضية وتوحيدها مع النظام */
          .theme-light .border-slate-200,
          .theme-light .border-slate-100 {
              border-color: #E2E8F0 !important;
          }

          /* حماية: إخفاء نيون الثيم الزجاجي تماماً في هذا الوضع */
          .theme-light .neon-glow {
              display: none !important;
              opacity: 0 !important;
          }
        `}
      </style>
    </>
  );
};

export default LightTheme;
