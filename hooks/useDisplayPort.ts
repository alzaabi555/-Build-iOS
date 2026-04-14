// hooks/useDisplayPort.ts
import { useEffect, useState, useCallback } from 'react';

export interface DisplayPortState {
  height: number;
  width: number;
  isLandscape: boolean;
  isMobile: boolean;
  safeAreaTop: number;
  safeAreaBottom: number;
  viewportHeight: number; // 💉 Dynamic VH fallback
}

export const useDisplayPort = (): DisplayPortState => {
  const [state, setState] = useState<DisplayPortState>({
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    isLandscape: false,
    isMobile: false,
    safeAreaTop: 0,
    safeAreaBottom: 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // 💉 حساب مساحات الأمان (Safe Areas)
  const calculateSafeAreas = useCallback(() => {
    if (typeof window === 'undefined') return { top: 0, bottom: 0 };
    
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: fixed;
      top: env(safe-area-inset-top, 0px);
      left: 0;
      width: 1px;
      height: 1px;
      pointer-events: none;
      visibility: hidden;
    `;
    document.body.appendChild(tempDiv);
    
    const top = parseInt(getComputedStyle(tempDiv).top, 10) || 0;
    tempDiv.style.top = 'auto';
    tempDiv.style.bottom = 'env(safe-area-inset-bottom, 0px)';
    const bottom = parseInt(getComputedStyle(tempDiv).bottom, 10) || 0;
    
    document.body.removeChild(tempDiv);
    
    return { top, bottom };
  }, []);

  // 💉 تحديث أبعاد العرض مع معالجة ديناميكية لـ 100dvh
  const updateDimensions = useCallback(() => {
    if (typeof window === 'undefined') return;

    const { innerWidth, innerHeight } = window;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isLandscape = innerWidth > innerHeight;
    
    // 💉 فالدحة ديناميكية لـ 100dvh للأجهزة القديمة
    const vh = innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // 💉 تحديث متغيرات CSS للحدود الآمنة
    const { top, bottom } = calculateSafeAreas();
    document.documentElement.style.setProperty('--safe-top', `${top}px`);
    document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`);

    setState({
      height: innerHeight,
      width: innerWidth,
      isLandscape,
      isMobile,
      safeAreaTop: top,
      safeAreaBottom: bottom,
      viewportHeight: innerHeight,
    });
  }, [calculateSafeAreas]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // التحديث الأولي
    updateDimensions();

    // 💉 معالجة التغييرات مع Debounce لتحسين الأداء
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 150);
    };

    // 💉 الاستماع لأحداث متعددة لضمان التغطية الشاملة
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // 💉 مراقبة تغييرات شريط العنوان في المتصفح
    window.addEventListener('scroll', handleResize, { passive: true });
    
    // 💉 مراقبة وضع الشاشة الكاملة (Fullscreen)
    document.addEventListener('fullscreenchange', handleResize);
    document.addEventListener('webkitfullscreenchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('scroll', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      document.removeEventListener('webkitfullscreenchange', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [updateDimensions]);

  return state;
};
