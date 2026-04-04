import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    isRamadan?: boolean; // يمكن الاستغناء عنه إذا كان جزءاً من الثيم العام
    dir: string;
    mode?: 'bottom' | 'side' | 'full'; 
}

const DrawerSheet: React.FC<DrawerSheetProps> = ({ 
    isOpen, onClose, children, isRamadan, dir, mode 
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!mounted) return null;

    // 🧬 تحديد التموضع بناءً على الوضع (Side, Bottom, Full)
    let positioningStyles = '';
    let hiddenStyles = ''; // 👈 السر في إخفاء الخط الأسود

    if (mode === 'full') {
        positioningStyles = 'inset-0 w-full h-full rounded-none';
        hiddenStyles = 'translate-y-full opacity-0';
    } 
    else if (mode === 'side') {
        positioningStyles = `top-0 bottom-0 h-full w-[90%] max-w-[450px] ${
            dir === 'rtl' ? 'left-0 rounded-r-[2rem]' : 'right-0 rounded-l-[2rem]'
        }`;
        // 👈 دفع اللوحة بعيداً بمسافة 110% لإخفاء الظل والحدود تماماً
        hiddenStyles = dir === 'rtl' ? '-translate-x-[110%] opacity-0' : 'translate-x-[110%] opacity-0';
    } 
    else {
        // الوضع الافتراضي (Bottom في الموبايل و Side في الديسكتوب)
        positioningStyles = `max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[92vh] max-md:rounded-t-[2.5rem] md:inset-y-0 ${
            dir === 'rtl' ? 'md:left-0 md:rounded-r-[2.5rem]' : 'md:right-0 md:rounded-l-[2.5rem]'
        } md:w-[450px] md:h-full`;
        
        hiddenStyles = `max-md:translate-y-full ${
            dir === 'rtl' ? 'md:-translate-x-[110%]' : 'md:translate-x-[110%]'
        } opacity-0`;
    }

    const drawerContent = (
        <>
            {/* 🌑 التضليل الخلفي (Backdrop) */}
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500 ease-in-out ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
                style={{ zIndex: 99998 }} 
            />
            
            {/* 🧊 الحاوية المنزلقة (تستخدم الآن كلاسات الثيم المتغيرة) */}
            <div
                className={`fixed flex flex-col glass-panel transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${positioningStyles}
                    ${isOpen ? 'translate-x-0 translate-y-0 opacity-100' : hiddenStyles}
                    ${isRamadan ? 'ramadan-overrides shadow-glow' : ''}
                `}
                style={{ zIndex: 99999 }}
            >
                {/* 🌙 حقن ستايل رمضان الذكي (فقط إذا كان الثيم مفعلاً) */}
                {isRamadan && (
                    <style>{`
                        .ramadan-overrides { --border: rgba(251, 191, 36, 0.3); }
                        .ramadan-overrides .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--primary); }
                    `}</style>
                )}

                {/* 🖐️ مقبض السحب للموبايل */}
                {(!mode || mode === 'bottom') && (
                    <div className="md:hidden flex justify-center pt-4 pb-2 shrink-0 cursor-pointer" onClick={onClose}>
                        <div className="w-12 h-1.5 rounded-full bg-textPrimary/20" />
                    </div>
                )}

                {/* ❌ زر الإغلاق الذكي */}
                <button
                    onClick={onClose}
                    className={`absolute top-6 ${dir === 'rtl' ? 'right-6' : 'left-6'} p-2.5 rounded-xl 
                    transition-all duration-300 hover:scale-110 active:scale-95 z-[102]
                    bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20`}
                >
                    <X size={20} />
                </button>

                {/* 📝 محتوى اللوحة */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className={`flex flex-col min-h-full p-6 ${(!mode || mode === 'bottom') ? 'pt-20' : 'pt-20'}`}
                         style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
                        <div className="text-textPrimary">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return createPortal(drawerContent, document.body);
};

export default DrawerSheet;
