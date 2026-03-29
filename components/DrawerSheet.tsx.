import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    isRamadan: boolean;
    dir: string;
    mode?: 'bottom' | 'side' | 'full'; 
}

const DrawerSheet: React.FC<DrawerSheetProps> = ({ 
    isOpen, onClose, children, isRamadan, dir, mode 
}) => {
    
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    let positioningStyles = '';
    let transformStyles = '';

    if (mode === 'full') {
        positioningStyles = 'inset-0 w-full h-full rounded-none';
        transformStyles = isOpen ? 'translate-y-0' : 'translate-y-full';
    } 
    else if (mode === 'side') {
        positioningStyles = `top-0 bottom-0 h-full w-[85%] max-w-[450px] ${dir === 'rtl' ? 'left-0 rounded-r-[2.5rem] border-r' : 'right-0 rounded-l-[2.5rem] border-l'}`;
        transformStyles = isOpen ? 'translate-x-0' : (dir === 'rtl' ? '-translate-x-full' : 'translate-x-full');
    } 
    else {
        // الوضع السفلي: تم تحديد الارتفاع الأقصى بـ 85vh لضمان عدم خروج النافذة عن السيطرة
        positioningStyles = `max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[85vh] max-md:rounded-t-[2.5rem] md:inset-y-0 ${dir === 'rtl' ? 'md:left-0 md:rounded-r-[2.5rem] border-r' : 'md:right-0 md:rounded-l-[2.5rem] border-l'} md:w-[450px] md:h-full`;
        transformStyles = isOpen ? 'translate-y-0 md:translate-x-0' : `max-md:translate-y-full ${dir === 'rtl' ? '-translate-x-full' : 'translate-x-full'}`;
    }

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            
            <div
                className={`fixed z-[101] flex flex-col shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${positioningStyles}
                    ${isRamadan ? 'bg-[#1e1b4b] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}
                    ${transformStyles}
                `}
            >
                {/* مقبض السحب */}
                {(!mode || mode === 'bottom') && (
                    <div className="md:hidden flex justify-center pt-3 pb-2 shrink-0 cursor-pointer" onClick={onClose}>
                        <div className={`w-12 h-1.5 rounded-full ${isRamadan ? 'bg-white/20' : 'bg-slate-300'}`} />
                    </div>
                )}

                {/* زر الإغلاق X */}
                <button
                    onClick={onClose}
                    className={`absolute top-4 ${dir === 'rtl' ? 'right-4' : 'left-4'} p-2 rounded-full transition-colors z-[102] ${isRamadan ? 'hover:bg-white/10 text-white/70' : 'hover:bg-slate-100 text-slate-500'} ${(!mode || mode === 'bottom') ? 'hidden md:flex' : 'flex'}`}
                >
                    <X size={20} />
                </button>

                {/* 🚀 الحيلة السحرية هنا: منطقة تمرير تضمن عدم اختفاء أي محتوى سفلي */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className={`flex flex-col min-h-full ${(!mode || mode === 'bottom') ? 'pt-4 md:pt-12' : 'pt-14'}`}
                         style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)' }}>
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
};

export default DrawerSheet;
