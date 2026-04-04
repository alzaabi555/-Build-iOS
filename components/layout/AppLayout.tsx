import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../theme/ThemeProvider';
import { Menu, X, Minus, Square } from 'lucide-react'; 

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

  // 💉 الضربة القاضية المطلقة: السيطرة على لون نظام تشغيل الهاتف نفسه!
  useEffect(() => {
    // نحدد اللون بناءً على الثيم (رمادي فاتح للثيم الفاتح، وكحلي عميق للداكن والزجاجي)
    const systemColor = theme === 'light' ? '#f1f5f9' : '#0f172a'; 
    
    // 1. إجبار الميتا تاج الخاص بمتصفح الجوال
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', systemColor);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = systemColor;
      document.head.appendChild(meta);
    }

    // 2. إجبار الجدار الخلفي المطلق للمتصفح (HTML & Body) لكي لا يظهر أي بياض عند السحب
    document.body.style.backgroundColor = systemColor;
    document.documentElement.style.backgroundColor = systemColor;
  }, [theme]);

  const mobileNavIds = mobileNavItems.map(item => item.id);
  const extraNavItems = desktopNavItems.filter(item => !mobileNavIds.includes(item.id));

  const handleExtraNavigate = (tabId: string) => {
    onNavigate(tabId);
    setShowMoreMenu(false);
  };

  const isDesktop = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.send(action);
    } else if ((window as any).electron) {
      (window as any).electron.send(action);
    } else if ((window as any).ipcRenderer) {
      (window as any).ipcRenderer.send(action);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col font-sans overflow-hidden text-textPrimary animate-smooth bg-transparent" dir={dir}>
      
      {isDesktop && (
        <div 
          className="flex justify-between items-center px-4 h-10 shrink-0 z-[99999] glass-panel border-b border-borderColor rounded-none bg-bgCard/40 backdrop-blur-md"
          style={{ WebkitAppRegion: 'drag' } as any} 
        >
          <div className="flex items-center gap-2 text-textSecondary text-xs font-bold pointer-events-none">
            {Logo && <div className="w-4 h-4 flex items-center justify-center">{Logo}</div>}
            <span>{appName}</span>
          </div>
          <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button onClick={() => handleWindowControl('minimize')} className="p-1.5 rounded text-textSecondary hover:bg-bgSoft hover:text-textPrimary transition-colors">
              <Minus size={14} />
            </button>
            <button onClick={() => handleWindowControl('maximize')} className="p-1.5 rounded text-textSecondary hover:bg-bgSoft hover:text-textPrimary transition-colors">
              <Square size={12} />
            </button>
            <button onClick={() => handleWindowControl('close')} className="p-1.5 rounded text-textSecondary hover:bg-red-500/80 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-[-2] transition-colors duration-500" style={{ background: 'var(--bg)' }} />
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] bg-glow rounded-full blur-[100px] opacity-40" />
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10 w-full h-full">
        
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

        <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6 px-4 md:px-10 pt-safe">
            <div className="max-w-5xl mx-auto w-full min-h-full py-6">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* 💉 الجراحة النهائية للشريط السفلي: استخدام fixed بدلاً من absolute، وتمديد الشريط للأسفل عبر الـ padding */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 w-full z-[9999] glass-panel border-t border-borderColor border-x-0 border-b-0 !rounded-none transition-all duration-500 flex flex-col m-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around items-center px-1 pt-2 pb-1 h-16 w-full relative z-10">
          {mobileNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="relative flex flex-col items-center justify-center p-2 min-w-[4rem] transition-all duration-300 active:scale-90"
              >
                <div className={cn(
                  "relative z-10 transition-all duration-500",
                  isActive ? "text-primary scale-110" : "text-textSecondary opacity-80"
                )}>
                  <item.IconComponent size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[10px] mt-1 transition-all duration-300",
                  isActive ? "font-black text-primary opacity-100" : "font-bold text-textSecondary opacity-0 h-0 overflow-hidden"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {extraNavItems.length > 0 && (
             <button
                onClick={() => setShowMoreMenu(true)}
                className="relative flex flex-col items-center justify-center p-2 min-w-[4rem] transition-all duration-300 active:scale-90"
              >
                <div className={cn(
                  "relative z-10 transition-all duration-500",
                  showMoreMenu ? "text-primary scale-110" : "text-textSecondary opacity-80"
                )}>
                  <Menu size={24} strokeWidth={showMoreMenu ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[10px] mt-1 transition-all duration-300",
                  showMoreMenu ? "font-black text-primary opacity-100" : "font-bold text-textSecondary opacity-0 h-0 overflow-hidden"
                )}>
                   {dir === 'rtl' ? 'المزيد' : 'More'}
                </span>
              </button>
          )}
        </div>
      </div>

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
