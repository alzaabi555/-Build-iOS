import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  /**
   * تثبيت المظهر على ثيم أبيض احترافي واحد.
   * حتى لو وُجد زر تبديل ثيم في صفحة أخرى، لن تتغير الخلفية العامة.
   */
  useEffect(() => {
    const fixedLightColor = '#F8FAFC';

    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('rased_theme', 'light');

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', fixedLightColor);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = fixedLightColor;
      document.head.appendChild(meta);
    }

    document.body.style.backgroundColor = fixedLightColor;
    document.documentElement.style.backgroundColor = fixedLightColor;
  }, []);

  const mobileNavIds = mobileNavItems.map(item => item.id);
  const extraNavItems = desktopNavItems.filter(item => !mobileNavIds.includes(item.id));

  const handleExtraNavigate = (tabId: string) => {
    onNavigate(tabId);
    setShowMoreMenu(false);
  };

  const isDesktop =
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('electron');

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
    <div
      className="fixed inset-0 w-full h-[100dvh] flex flex-col font-sans overflow-hidden text-textPrimary animate-smooth bg-bgMain"
      dir={dir}
    >
      {isDesktop && (
        <div
          className="flex justify-between items-center px-4 h-10 shrink-0 z-[99999] border-b border-borderColor bg-bgCard shadow-sm"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <div className="flex items-center gap-2 text-textSecondary text-xs font-bold pointer-events-none">
            {Logo && (
              <div className="w-4 h-4 flex items-center justify-center">
                {Logo}
              </div>
            )}
            <span>{appName}</span>
          </div>

          <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button
              onClick={() => handleWindowControl('minimize')}
              className="p-1.5 rounded text-textSecondary hover:bg-bgSoft hover:text-textPrimary transition-colors"
              aria-label="تصغير النافذة"
            >
              <Minus size={14} />
            </button>

            <button
              onClick={() => handleWindowControl('maximize')}
              className="p-1.5 rounded text-textSecondary hover:bg-bgSoft hover:text-textPrimary transition-colors"
              aria-label="تكبير النافذة"
            >
              <Square size={12} />
            </button>

            <button
              onClick={() => handleWindowControl('close')}
              className="p-1.5 rounded text-textSecondary hover:bg-danger hover:text-white transition-colors"
              aria-label="إغلاق التطبيق"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* خلفية موحدة وثابتة */}
      <div className="fixed inset-0 z-[-2] bg-bgMain" />

      {/* خلفية زخرفية خفيفة جدًا بدل التدرجات الداكنة */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-18%] right-[8%] w-[420px] h-[420px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-18%] left-[8%] w-[360px] h-[360px] bg-info/5 rounded-full blur-[110px]" />
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10 w-full h-full">
        <aside
          className={cn(
            'hidden md:flex w-72 flex-col z-50 h-full relative bg-bgCard rounded-none shadow-sm',
            dir === 'rtl' ? 'border-l border-borderColor' : 'border-r border-borderColor'
          )}
        >
          <div className="p-8 flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 shrink-0">{Logo}</div>

            <div className="flex-1">
              <h1 className="text-2xl font-black tracking-tight text-textPrimary">
                {appName}
              </h1>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                {appSubtitle}
              </span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-4">
            {desktopNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 active:scale-95',
                  activeTab === item.id
                    ? 'bg-primary text-white shadow-card'
                    : 'text-textSecondary hover:bg-bgSoft hover:text-textPrimary'
                )}
              >
                <item.icon size={20} />
                <span className="font-bold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 bg-bgMain">
          {children}
        </main>
      </div>

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 w-full z-[9999] bg-bgCard border-t border-borderColor border-x-0 border-b-0 !rounded-none transition-all duration-500 flex flex-col items-center m-0 shadow-elevated"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="w-full max-w-md flex justify-between items-center px-1 pt-2 pb-1 h-16 relative z-10">
          {mobileNavItems.map(item => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="relative flex flex-col items-center justify-center p-1 flex-1 transition-all duration-300 active:scale-90"
              >
                <div
                  className={cn(
                    'relative z-10 transition-all duration-500',
                    isActive ? 'text-primary scale-110' : 'text-textSecondary opacity-80'
                  )}
                >
                  <item.IconComponent size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>

                <span
                  className={cn(
                    'text-[10px] mt-1 transition-all duration-300',
                    isActive
                      ? 'font-black text-primary opacity-100'
                      : 'font-bold text-textSecondary opacity-0 h-0 overflow-hidden'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {extraNavItems.length > 0 && (
            <button
              onClick={() => setShowMoreMenu(true)}
              className="relative flex flex-col items-center justify-center p-1 flex-1 transition-all duration-300 active:scale-90"
            >
              <div
                className={cn(
                  'relative z-10 transition-all duration-500',
                  showMoreMenu ? 'text-primary scale-110' : 'text-textSecondary opacity-80'
                )}
              >
                <Menu size={24} strokeWidth={showMoreMenu ? 2.5 : 2} />
              </div>

              <span
                className={cn(
                  'text-[10px] mt-1 transition-all duration-300',
                  showMoreMenu
                    ? 'font-black text-primary opacity-100'
                    : 'font-bold text-textSecondary opacity-0 h-0 overflow-hidden'
                )}
              >
                {dir === 'rtl' ? 'المزيد' : 'More'}
              </span>
            </button>
          )}
        </div>
      </div>

      {showMoreMenu && (
        <div className="relative z-[99999]">
          <DrawerSheet
            isOpen={showMoreMenu}
            onClose={() => setShowMoreMenu(false)}
            dir={dir}
            mode="bottom"
          >
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
                          'flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95',
                          isActive
                            ? 'bg-primary/10 border-primary/50 text-primary'
                            : 'bg-bgCard border-borderColor hover:bg-bgSoft text-textSecondary hover:text-textPrimary shadow-sm'
                        )}
                      >
                        <item.icon
                          size={28}
                          className={isActive ? 'text-primary mb-2' : 'mb-2'}
                          strokeWidth={isActive ? 2.5 : 2}
                        />

                        <span
                          className={cn(
                            'text-xs text-center',
                            isActive ? 'font-black' : 'font-bold'
                          )}
                        >
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
