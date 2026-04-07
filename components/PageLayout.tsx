import React, { useState, UIEvent } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useApp } from "../context/AppContext";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightActions?: React.ReactNode;
  leftActions?: React.ReactNode; // 👈 ممتاز لشريط البحث أو فلاتر التصفية
  children: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  icon,
  rightActions,
  leftActions,
  children,
  showBackButton,
  onBack
}) => {
  const { dir } = useApp();
  const [scrollY, setScrollY] = useState(0);

  // 💉 قراءة الانسيابية من حركة الإصبع داخل الصفحة
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  };

  // حساب درجة التقلص والشفافية (من 0 إلى 1)
  const progress = Math.min(scrollY / 60, 1);
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    // 💉 إجبار الصفحة على أخذ حجم الشاشة الكامل مع منع تسرب النظام
    <div className="relative w-full h-[100dvh] flex flex-col bg-bgSoft text-textPrimary overflow-hidden" dir={dir}>
      
      {/* ================= 🩺 الهيدر الزجاجي العائم (Fixed & Glassy) ================= */}
      <div 
        className="absolute top-0 left-0 w-full z-50 transition-all duration-300 border-b"
        style={{
          // 💉 التأثير الزجاجي الذي يجعل المحتوى يظهر بضبابية تحته عند التمرير
          backgroundColor: `rgba(var(--bg-card-rgb, 255, 255, 255), ${0.6 + progress * 0.35})`,
          backdropFilter: `blur(${10 + progress * 10}px)`,
          WebkitBackdropFilter: `blur(${10 + progress * 10}px)`,
          borderColor: `rgba(var(--border-color-rgb, 226, 232, 240), ${progress})`, // الخط السفلي يظهر فقط مع النزول
          paddingTop: 'env(safe-area-inset-top)' // 💉 حماية الكاميرا في الآيفون/الأندرويد
        }}
      >
        <div className="px-4 py-3 flex flex-col">
          <div className="flex items-center justify-between">
            
            <div className="flex items-center gap-3">
              {showBackButton && (
                <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-textSecondary hover:bg-bgCard active:scale-95 transition-all">
                  <BackIcon size={24} />
                </button>
              )}
              
              {icon && (
                <div 
                  className="rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-300 shadow-sm"
                  style={{
                    width: `${44 - progress * 10}px`,
                    height: `${44 - progress * 10}px`,
                    opacity: 1 - progress * 0.1
                  }}
                >
                  {icon}
                </div>
              )}
              
              <div className="flex flex-col justify-center">
                <h1 
                  className="font-black text-textPrimary transition-all duration-300 origin-left"
                  style={{
                    fontSize: `${22 - progress * 4}px`,
                    transform: `translateY(${progress * 2}px)`
                  }}
                >
                  {title}
                </h1>
                
                {subtitle && (
                  <p 
                    className="text-[11px] font-bold text-textSecondary transition-all duration-300"
                    style={{
                      height: `${(1 - progress) * 16}px`,
                      opacity: Math.max(0, 1 - progress * 2),
                      overflow: 'hidden'
                    }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {rightActions}
            </div>
          </div>

          {/* 💉 الفلاتر أو الأزرار السفلية (تختفي بذكاء مع التمرير للأسفل) */}
          {leftActions && (
            <div 
              className="transition-all duration-300 overflow-hidden"
              style={{
                height: `${(1 - progress) * 44}px`,
                opacity: Math.max(0, 1 - progress * 1.5),
                marginTop: `${(1 - progress) * 12}px`
              }}
            >
              {leftActions}
            </div>
          )}
        </div>
      </div>

      {/* ================= 📝 منطقة المحتوى الانسيابي ================= */}
      {/* 💉 custom-scrollbar تحتوي على webkit-overflow-scrolling للانسيابية */}
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar w-full h-full relative"
        onScroll={handleScroll}
      >
        {/* 💉 هذه المساحة الفارغة المخفية تجعل المحتوى يبدأ من تحت الهيدر بالضبط */}
        <div 
          className="w-full shrink-0 transition-all duration-300" 
          style={{ height: leftActions ? '145px' : '95px' }} 
        />
        
        {/* 💉 pb-32 هي ما يمنع القائمة السفلية من تغطية آخر عنصر في الصفحة! */}
        <div className="px-4 pb-32 min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
