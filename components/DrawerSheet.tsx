import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; // 👈 السر هنا
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
    
    // 👈 نضمن أن الـ DOM جاهز قبل حقن المكون
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!mounted) return null;

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
        positioningStyles = `max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[92vh] max-md:rounded-t-[2.5rem] md:inset-y-0 ${dir === 'rtl' ? 'md:left-0 md:rounded-r-[2.5rem] border-r' : 'md:right-0 md:rounded-l-[2.5rem] border-l'} md:w-[450px] md:h-full`;
        transformStyles = isOpen ? 'max-md:translate-y-0 md:translate-x-0' : `max-md:translate-y-full ${dir === 'rtl' ? '-translate-x-full' : 'translate-x-full'}`;
    }

    // 👈 نضع محتوى اللوحة في متغير
    const drawerContent = (
        <>
            {/* التضليل الزجاجي */}
            <div
                className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                style={{ zIndex: 99998 }} 
            />
            
            {/* الحاوية المنزلقة */}
            <div
                className={`fixed flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${positioningStyles}
                    ${isRamadan ? 'bg-[#1e1b4b]/40 backdrop-blur-2xl border-white/20 text-white shadow-[0_0_50px_rgba(168,85,247,0.15)] ramadan-overrides' : 'bg-white border-slate-200 text-slate-800'}
                    ${transformStyles}
                `}
                style={{ zIndex: 99999 }}
            >
                {/* المضاد الحيوي للون الأخضر */}
                {isRamadan && (
                    <style>
                        {`
                            .ramadan-overrides .bg-green-50, 
                            .ramadan-overrides .bg-green-100, 
                            .ramadan-overrides .bg-green-50\\/50 { background-color: rgba(255, 255, 255, 0.05) !important; }
                            .ramadan-overrides .border-green-500, 
                            .ramadan-overrides .border-green-200, 
                            .ramadan-overrides .border-green-300 { border-color: rgba(251, 191, 36, 0.4) !important; }
                            .ramadan-overrides .text-green-700, 
                            .ramadan-overrides .text-green-600 { color: #fbbf24 !important; }
                            .ramadan-overrides .bg-green-500 { background-color: #6366f1 !important; color: white !important; }
                            
                            .ramadan-overrides input:focus, 
                            .ramadan-overrides textarea:focus,
                            .ramadan-overrides select:focus {
                                border-color: rgba(168, 85, 247, 0.5) !important;
                                outline: none !important;
                                box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2) !important;
                            }
                            .ramadan-overrides [class*="ring-green"] {
                                --tw-ring-color: rgba(168, 85, 247, 0.5) !important;
                            }
                        `}
                    </style>
                )}

                {/* مقبض السحب والجزء العلوي */}
                {(!mode || mode === 'bottom') && (
                    <div className="md:hidden flex justify-center pt-4 pb-2 shrink-0 cursor-pointer" onClick={onClose}>
                        <div className={`w-12 h-1.5 rounded-full ${isRamadan ? 'bg-white/20' : 'bg-slate-300'}`} />
                    </div>
                )}

                <button
                    onClick={onClose}
                    className={`absolute top-4 ${dir === 'rtl' ? 'right-4' : 'left-4'} p-2 rounded-full transition-colors z-[102] ${isRamadan ? 'hover:bg-white/10 text-white/70 bg-black/20' : 'hover:bg-slate-100 text-slate-500'} ${(!mode || mode === 'bottom') ? 'max-md:hidden flex' : 'flex'}`}
                >
                    <X size={20} />
                </button>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className={`flex flex-col min-h-full ${(!mode || mode === 'bottom') ? 'pt-4 md:pt-16' : 'pt-16'}`}
                         style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)' }}>
                        {children}
                    </div>
                </div>
            </div>
        </>
    );

    // 🚀 السحر يبدأ هنا: حقن المحتوى مباشرة في الـ body خارج أي مكون أب!
    return createPortal(drawerContent, document.body);
};

export default DrawerSheet;
