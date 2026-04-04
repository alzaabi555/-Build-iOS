import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dir: string;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, children, dir }) => {
  const [mounted, setMounted] = useState(false);

  // لضمان عمل createPortal بشكل صحيح في React
  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* 🌌 الخلفية المعتمة */}
      <div 
        className={cn(
          "fixed inset-0 bg-[#0B0F1A]/60 backdrop-blur-sm z-[100000] animate-smooth",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* 🧊 النافذة الزجاجية المنزلقة */}
      <div
        className={cn(
          "fixed z-[100001] flex flex-col glass-panel shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-smooth text-textPrimary",
          "max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[85vh] max-md:rounded-t-[2.5rem]",
          "md:inset-y-0 md:w-[450px] md:h-full",
          dir === 'rtl' ? 'md:left-0 md:rounded-r-[2.5rem]' : 'md:right-0 md:rounded-l-[2.5rem]',
          isOpen ? "translate-y-0 md:translate-x-0" : `max-md:translate-y-full ${dir === 'rtl' ? 'md:-translate-x-full' : 'md:translate-x-full'}`
        )}
      >
        {/* مؤشر السحب للجوال */}
        <div className="md:hidden flex justify-center pt-4 pb-2 cursor-pointer shrink-0" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-textSecondary/30" />
        </div>
        
        {/* زر الإغلاق لسطح المكتب */}
        <button 
          onClick={onClose} 
          className={cn(
            "hidden md:flex absolute top-6 p-2 rounded-full hover:bg-bgCard active:scale-90 transition-all", 
            dir === 'rtl' ? 'right-6' : 'left-6'
          )}
        >
          <X size={20} className="text-textSecondary" />
        </button>
        
        {/* محتوى النافذة */}
        <div className="flex-1 overflow-y-auto custom-scrollbar md:pt-16 p-6">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
};