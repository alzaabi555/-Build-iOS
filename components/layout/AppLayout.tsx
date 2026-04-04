// components/layout/AppLayout.tsx

import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../theme/ThemeProvider';
import { Menu, X, Minus, Square } from 'lucide-react'; // 👈 تمت إضافة أيقونات الشريط العلوي

import { Drawer as DrawerSheet } from '../ui/Drawer'; 

interface AppLayoutProps {
  children: React.ReactNode;
  dir: string;
  activeTab: string;
  onNavigate: (tab: string) => void;
  desktopNavItems: any[];
  mobileNavItems: any[];
  Logo: React.ReactNode;
  appName: string;
  appSubtitle: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  dir,
  activeTab,
  onNavigate,
  desktopNavItems,
  mobileNavItems,
  Logo,
  appName,
  appSubtitle
}) => {
  const { theme } = useTheme();
  
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mobileNavIds = mobileNavItems.map(item => item.id);
  const extraNavItems = desktopNavItems.filter(item => !mobileNavIds.includes(item.id));

  const handleExtraNavigate = (tabId: string) => {
    onNavigate(tabId);
    setShowMoreMenu(false);
  };

  // 💻 دوال التحكم في نافذة سطح المكتب (Electron)
  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
    if ((window as any).electron) {
      (window as any).electron.send(action); 
    }
  };

  // 🔍 فحص ذكي: هل التطبيق يعمل حالياً في بيئة ويندوز (Electron) أم موبايل/متصفح؟
  const isDesktop = !!(window as any).electron;

  return (
    <div className="flex flex-col h-screen font-sans overflow-hidden text-textPrimary animate-smooth relative" dir={dir}>
      
      {/* 👑 الشريط العلوي المخصص لسطح المكتب (يظهر فقط في الويندوز) */}
      {isDesktop && (
        <div 
          className="flex justify-between items-center px-4 h-10 shrink-0 z-[99999] glass-panel border-b border-borderColor rounded-none bg-bgCard/40 backdrop-blur-md"
          style={{ WebkitAppRegion: 'drag' } as any} // 👈 يسمح بسحب النافذة من الشريط
        >
          {/* عنوان التطبيق المصغر */}
          <div className="flex items-center gap-2 text-textSecondary text-xs font-bold pointer-events-none">
            {Logo && <div className="w-4 h-4 flex items-center justify-center">{Logo}</div>}
            <span>{appName}</span>
          </div>

          {/* أزرار التحكم بالنافذة */}
          <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button 
              onClick={() => handleWindowControl('minimize')}
              className="p-1.5 rounded text-textSecondary hover:bg-bgSoft hover:text-textPrimary transition-colors"
              title={dir === 'rtl' ? 'تصغير' : 'Minimize'}
            >
              <Minus size={14} />
            </button>
            <button 
              onClick={() => handleWindowControl('maximize')}
              className="p-1.5 rounded text-textSecondary hover:bg-bgSoft hover:text-textPrimary transition-colors"
              title={dir === 'rtl' ? 'تكبير' : 'Maximize'}
            >
              <Square size={12} />
            </button>
            <button 
              onClick={() => handleWindowControl('close')}
              className="p-1.5 rounded text-textSecondary hover:bg-red-500/80 hover:text-white transition-colors"
              title={dir === 'rtl' ? 'إغلاق' : 'Close'}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 🌟 طبقة الخلفية الديناميكية */}
      <div 
        className="fixed inset-0 z-[-2] transition-all duration-500" 
        style={{ background: 'var(--bg)' }} 
      />

      {/* ✨ تأثيرات الإضاءة (السديم) */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] bg-glow rounded-full blur-[100px] opacity-40" />
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10 w-full">
        
        {/* 💻 القائمة الجانبية (سطح المكتب) */}
        <aside className={cn(
          "hidden md:flex w-72 flex-col z-50 h-full relative glass-panel rounded-none",
          dir === 'rtl' ? 'border-l border-borderColor' : 'border-r border-borderColor'
        )}>
          <div className="p-8 flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 shrink-0">{Logo}</div>
            <div className="flex-1">
              <h1 className="text-2xl font-black tracking-tight">{appName}</h1>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{appSubtitle}</span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-4">
            {desktopNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 active:scale-95",
                  activeTab === item.id 
                    ? "bg-primary text-white shadow-[0_0_20px_var(--glow)]" 
                    : "text-textSecondary hover:bg-bgSoft hover:text-textPrimary"
                )}
              >
                <item.icon size={20} />
                <span className="font-bold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* 📄 المحتوى الرئيسي */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 md:pb-6 px-4 md:px-10 pt-safe">
            <div className="max-w-5xl mx-auto w-full min-h-full py-6">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* 📱 شريط التنقل السفلي للهاتف */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-[9999]">
        <div className="glass-panel rounded-[2.5rem] p-2 flex justify-around items-center border border-borderColor">
          
          {mobileNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="relative flex flex-col items-center justify-center py-2 px-3 transition-all duration-300 active:scale-75"
              >
                <div className={cn(
                  "p-2 rounded-2xl transition-all duration-500",
                  isActive ? "bg-primary/20 text-primary shadow-[0_0_15px_var(--glow)] scale-110" : "text-textSecondary opacity-80"
                )}>
                  <item.IconComponent size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                {isActive && (
                  <span className="text-[10px] font-black mt-1 text-primary animate-smooth whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}

          {/* ➕ زر المزيد */}
          {extraNavItems.length > 0 && (
             <button
                onClick={() => setShowMoreMenu(true)}
                className="relative flex flex-col items-center justify-center py-2 px-3 transition-all duration-300 active:scale-75"
              >
                <div className={cn(
                  "p-2 rounded-2xl transition-all duration-500",
                  showMoreMenu ? "bg-primary/20 text-primary scale-110" : "text-textSecondary opacity-80"
                )}>
                  <Menu size={24} strokeWidth={showMoreMenu ? 2.5 : 2} />
                </div>
                {showMoreMenu && (
                  <span className="text-[10px] font-black mt-1 text-primary animate-smooth whitespace-nowrap">
                     {dir === 'rtl' ? 'المزيد' : 'More'}
                  </span>
                )}
              </button>
          )}

        </div>
      </div>

      {/* 🗄️ القائمة السفلية "المزيد" (بالشكل الذكي الجديد) */}
      {showMoreMenu && (
        <div className="relative z-[99999]">
            <DrawerSheet isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} dir={dir} mode="bottom">
                <div className="flex flex-col h-full w-full">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-borderColor shrink-0">
                        <h3 className="font-black text-xl text-textPrimary">
                            {dir === 'rtl' ? 'مزيد من الخيارات' : 'More Options'}
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-3 gap-3 p-1">
                            {extraNavItems.map(item => {
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleExtraNavigate(item.id)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95",
                                            isActive 
                                                ? "bg-primary/10 border-primary/50 text-primary" 
                                                : "glass-card hover:bg-bgSoft text-textSecondary hover:text-textPrimary"
                                        )}
                                    >
                                        <item.icon size={28} className={isActive ? "text-primary mb-2" : "mb-2"} strokeWidth={isActive ? 2.5 : 2} />
                                        <span className={cn(
                                            "text-xs text-center",
                                            isActive ? "font-black" : "font-bold"
                                        )}>
                                            {item.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </DrawerSheet>
        </div>
      )}

    </div>
  );
};
