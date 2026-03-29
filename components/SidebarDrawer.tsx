import React, { useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface SidebarDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    isRamadan: boolean;
    dir: string;
    title: string;
    showSaveButton?: boolean;
    onSave?: () => void;
    saveButtonText?: string;
}

const SidebarDrawer: React.FC<SidebarDrawerProps> = ({ 
    isOpen, onClose, children, isRamadan, dir, title, 
    showSaveButton = true, onSave, saveButtonText = 'حفظ التغييرات' 
}) => {
    
    // قفل التمرير في الخلفية عند فتح اللوحة
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleClose = () => {
        onClose();
    };

    const ChevronIcon = dir === 'rtl' ? <X size={20} /> : <X size={20} />;

    return (
        <>
            {/* الخلفية المظلمة الشفافة (z-100) */}
            <div
                className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] transition-opacity duration-500 ease-in-out ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={handleClose}
            />
            
            {/* النافذة الجانبية الفضائية (z-101) - تأخذ كامل الارتفاع */}
            <div
                className={`fixed z-[101] top-0 bottom-0 h-full w-[85%] max-w-[450px] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    flex flex-col overflow-hidden
                    ${dir === 'rtl' ? 'right-0 rounded-l-[2rem] border-l' : 'left-0 rounded-r-[2rem] border-r'} 
                    ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}
                    ${isOpen
                        ? 'translate-x-0'
                        : `${dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'}`
                    }
                `}
            >
                {/* هيدر النافذة - ممتد للنوتش الأعلى */}
                <div className={`shrink-0 z-10 px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 border-b ${isRamadan ? 'border-white/5 bg-black/10' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleClose}
                                className={`p-2 rounded-xl transition-colors ${isRamadan ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                            >
                                <X size={20} />
                            </button>
                            <h3 className={`font-black text-xl tracking-wide ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
                                {title}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* جسم النافذة القابل للتمرير عمودياً (overflow-y-auto) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative z-0 p-6">
                    {children}
                </div>

                {/* فوتر النافذة الإلزامي - يحتوي على زر الحفظ وحماية المنطقة الآمنة السفلية */}
                <div className={`mt-auto shrink-0 z-10 p-6 border-t ${isRamadan ? 'border-white/5 bg-black/10' : 'border-slate-100 bg-slate-50'}`} style={{ WebkitAppRegion: 'no-drag' } as any}>
                    {showSaveButton && (
                        <button 
                            onClick={() => { onSave?.(); }}
                            className={`w-full py-4.5 rounded-2xl font-black text-lg transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2
                                ${isRamadan ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/30' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}
                            `}
                        >
                            <Save size={18} /> {saveButtonText}
                        </button>
                    )}
                    {/* أهم سطر: حماية المنطقة الآمنة السفلية الإجبارية للآيفون (حتى لا يغطيها خط السحب) */}
                    <div style={{ height: 'calc(env(safe-area-inset-bottom))' }} />
                </div>
            </div>
        </>
    );
};

export default SidebarDrawer;
