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

  const isScrolled = scrollY > 10;
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <div className="flex flex-col h-full w-full bg-bgSoft text-textPrimary" dir={dir}>
      
      <header 
        className={`shrink-0 z-30 transition-all duration-300 border-b ${
          isScrolled 
            ? 'bg-bgCard/95 backdrop-blur-md border-borderColor shadow-sm pb-2' 
            : 'bg-bgSoft border-transparent pb-2'
        }`}
        style={{
          // 💉 السر هنا: إرجاع النوتش لحجمه الطبيعي تماماً بدون أي زيادات مبالغ فيها
          paddingTop: 'env(safe-area-inset-top)' 
        }}
      >
        {/* 💉 تقليل المسافة العلوية pt-2 بدلاً من الفراغ الكبير السابق */}
        <div className="px-4 pt-2 flex flex-col w-full">
          <div className="flex items-center justify-between w-full">
            
            <div className="flex items-center gap-3">
              {showBackButton && (
                <button onClick={onBack} className="p-2 -mx-2 rounded-xl text-textSecondary hover:bg-bgCard active:scale-95 transition-all">
                  <BackIcon size={24} />
                </button>
              )}
              
              {icon && (
                <div className={`rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-300 shrink-0 ${isScrolled ? 'w-9 h-9' : 'w-11 h-11'}`}>
                  {icon}
                </div>
              )}
              
              <div className="flex flex-col justify-center">
                <h1 className="font-black text-textPrimary transition-all duration-300 origin-left" style={{ fontSize: isScrolled ? '18px' : '22px' }}>
                  {title}
                </h1>
                
                {subtitle && (
                  <div className="transition-all duration-300 overflow-hidden" style={{ height: isScrolled ? '0px' : '18px', opacity: isScrolled ? 0 : 1 }}>
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

          {/* الفلاتر تنسدل بذكاء */}
          {leftActions && (
            <div 
              className="w-full transition-all duration-300 overflow-hidden origin-top"
              style={{
                maxHeight: isScrolled ? '0px' : '300px',
                opacity: isScrolled ? 0 : 1,
                marginTop: isScrolled ? '0px' : '12px'
              }}
            >
              {leftActions}
            </div>
          )}
        </div>
      </header>

      <main 
        className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full"
        onScroll={handleScroll}
      >
        <div className="px-2 md:px-4 py-4 pb-32 w-full">
          {children}
        </div>
      </main>

    </div>
  );
};

export default PageLayout;
