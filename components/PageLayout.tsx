import React, { useState, UIEvent } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useApp } from "../context/AppContext";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightActions?: React.ReactNode;
  leftActions?: React.ReactNode; 
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

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  };

  // 💉 إذا نزل المستخدم للأسفل أكثر من 20 بكسل، نفعّل حالة التقلص
  const isScrolled = scrollY > 20;
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <div className="relative w-full h-[100dvh] flex flex-col bg-bgSoft text-textPrimary overflow-hidden" dir={dir}>
      
      {/* ================= 🩺 الهيدر الثابت (Fixed Edge-to-Edge) ================= */}
      {/* 💉 1. fixed left-0 right-0 w-full تضمن أنه من الحافة للحافة ولن يرتفع أبداً */}
      <header 
        className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 border-b ${
          isScrolled 
            ? 'bg-bgCard/90 backdrop-blur-md border-borderColor shadow-sm' // 💉 4. يدعم الثيم الداكن والزجاجي تلقائياً!
            : 'bg-bgSoft border-transparent'
        }`}
        style={{
          // 💉 2. دالة max تحمي النوتش ولا تترك فراغات ضخمة
          paddingTop: 'max(env(safe-area-inset-top), 12px)' 
        }}
      >
        <div className="px-4 pb-3 flex flex-col w-full">
          <div className="flex items-center justify-between w-full">
            
            <div className="flex items-center gap-3">
              {showBackButton && (
                <button onClick={onBack} className="p-2 -mx-2 rounded-xl text-textSecondary hover:bg-bgCard active:scale-95 transition-all">
                  <BackIcon size={24} />
                </button>
              )}
              
              {icon && (
                <div 
                  className={`rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-300 shrink-0 ${isScrolled ? 'w-9 h-9' : 'w-11 h-11'}`}
                >
                  {icon}
                </div>
              )}
              
              <div className="flex flex-col justify-center">
                <h1 
                  className="font-black text-textPrimary transition-all duration-300 origin-left"
                  style={{ fontSize: isScrolled ? '18px' : '22px' }}
                >
                  {title}
                </h1>
                
                {subtitle && (
                  <div 
                    className="transition-all duration-300 overflow-hidden"
                    style={{
                      height: isScrolled ? '0px' : '18px',
                      opacity: isScrolled ? 0 : 1
                    }}
                  >
                    <p className="text-[11px] font-bold text-textSecondary mt-0.5 whitespace-nowrap">
                      {subtitle}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {rightActions}
            </div>
          </div>

          {/* 💉 الفلاتر والبحث (تختفي بذكاء مع النزول لتوسيع الشاشة) */}
          {leftActions && (
            <div 
              className="w-full transition-all duration-300 overflow-hidden origin-top"
              style={{
                maxHeight: isScrolled ? '0px' : '150px',
                opacity: isScrolled ? 0 : 1,
                marginTop: isScrolled ? '0px' : '16px'
              }}
            >
              {leftActions}
            </div>
          )}
        </div>
      </header>

      {/* ================= 📝 منطقة المحتوى (Scrollable Area) ================= */}
      {/* 💉 3. المحتوى هنا ينزلق بأمان "تحت" الهيدر الثابت */}
      <main 
        className="flex-1 w-full h-full overflow-y-auto custom-scrollbar relative"
        onScroll={handleScroll}
      >
        {/* 💉 مساحة دافعة ديناميكية (Spacer): 
            هذه المساحة تساوي حجم الهيدر تماماً لكي لا يختفي أول عنصر تحت الهيدر 
        */}
        <div 
          className="w-full shrink-0 transition-all duration-300" 
          style={{ height: leftActions ? 'calc(env(safe-area-inset-top) + 130px)' : 'calc(env(safe-area-inset-top) + 70px)' }} 
        />
        
        {/* الحاوية الداخلية للبطاقات */}
        <div className="px-4 pb-32 w-full">
          {children}
        </div>
      </main>

    </div>
  );
};

export default PageLayout;
