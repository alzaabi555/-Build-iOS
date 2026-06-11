import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dir: string;
  mode?: 'side' | 'bottom' | 'full' | 'right' | 'left';
  isRamadan?: boolean;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  children,
  dir,
  mode = 'side'
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.backgroundColor = '#F8FAFC';
      document.documentElement.style.backgroundColor = '#F8FAFC';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, mounted]);

  if (!mounted || !isOpen) return null;

  const side =
    mode === 'right'
      ? 'right'
      : mode === 'left'
        ? 'left'
        : dir === 'rtl'
          ? 'left'
          : 'right';

  const isFull = mode === 'full';
  const isBottom = mode === 'bottom';

  return createPortal(
    <>
      {/* خلفية شفافة بدل الخلفية السوداء */}
      <button
        type="button"
        aria-label="إغلاق النافذة"
        className="fixed inset-0 z-[100000] bg-transparent pointer-events-auto"
        onClick={onClose}
      />

      {/* النافذة المنزلقة البيضاء */}
      <div
        className={cn(
          'fixed z-[100001] flex flex-col overflow-hidden bg-bgCard text-textPrimary border-borderColor shadow-card animate-smooth',

          /*
            Full mode:
            يستخدم للشهادات أو النوافذ الكبيرة.
          */
          isFull && 'inset-0 rounded-none border-0',

          /*
            Bottom mode:
            يستخدم لقائمة المزيد في الجوال أو نوافذ سفلية.
          */
          isBottom &&
            'left-0 right-0 bottom-0 max-h-[88vh] rounded-t-[2rem] border-t',

          /*
            Side mode:
            في الجوال يظهر من الأسفل،
            وفي سطح المكتب يظهر من الطرف.
          */
          !isFull &&
            !isBottom &&
            'max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[88vh] max-md:rounded-t-[2rem] max-md:border-t md:inset-y-0 md:w-[450px] md:h-full',

          !isFull &&
            !isBottom &&
            side === 'right' &&
            'md:right-0 md:border-l md:rounded-l-[2rem]',

          !isFull &&
            !isBottom &&
            side === 'left' &&
            'md:left-0 md:border-r md:rounded-r-[2rem]'
        )}
      >
        {/* مؤشر السحب للجوال */}
        {!isFull && (
          <div
            className="md:hidden flex justify-center pt-4 pb-2 cursor-pointer shrink-0 bg-bgCard"
            onClick={onClose}
          >
            <div className="w-12 h-1.5 rounded-full bg-textSecondary/20" />
          </div>
        )}

        {/* زر الإغلاق لسطح المكتب */}
        {!isFull && (
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className={cn(
              'hidden md:flex absolute top-6 p-2 rounded-full bg-bgSoft text-textSecondary hover:bg-bgCard hover:text-danger active:scale-90 transition-all border border-borderColor',
              dir === 'rtl' ? 'right-6' : 'left-6'
            )}
          >
            <X size={20} />
          </button>
        )}

        {/* زر إغلاق خفيف في وضع full */}
        {isFull && (
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className={cn(
              'absolute top-4 z-10 p-2 rounded-full bg-bgSoft text-textSecondary hover:bg-bgCard hover:text-danger active:scale-90 transition-all border border-borderColor',
              dir === 'rtl' ? 'left-4' : 'right-4'
            )}
          >
            <X size={20} />
          </button>
        )}

        {/* محتوى النافذة */}
        <div
          className={cn(
            'flex-1 overflow-y-auto custom-scrollbar bg-bgCard',
            isFull ? 'p-0' : 'md:pt-16 p-6'
          )}
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  );
};
``
