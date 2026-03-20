import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, ShieldCheck, Zap, LayoutDashboard } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface WelcomeScreenProps {
    onFinish: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onFinish }) => {
    const [step, setStep] = useState(0);
    
    // 💊 الكبسولة السحرية للثيم الزجاجي تم تفعيلها هنا أيضاً
    const isRamadan = true;

    const slides = [
        {
            id: 0,
            icon: <BrandLogo className="w-32 h-32 relative z-10" showText={false} />,
            title: "مرحباً بك في راصد",
            desc: "المساعد الرقمي الذكي للمعلم العماني المحترف. إدارة متكاملة للفصل الدراسي بلمسة واحدة.",
            color: isRamadan ? "text-white" : "text-[#1e3a8a]",
        },
        {
            id: 1,
            customContent: (
                <div className="grid grid-cols-2 gap-4 w-full px-4 relative z-10">
                    <div className={`p-5 rounded-[2rem] shadow-sm flex flex-col items-center text-center transition-all ${isRamadan ? 'bg-white/5 border border-white/10 backdrop-blur-xl' : 'bg-white border border-slate-100'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isRamadan ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Check className="w-6 h-6"/></div>
                        <h3 className={`font-black text-sm ${isRamadan ? 'text-white' : 'text-slate-800'}`}>حضور ذكي</h3>
                    </div>
                    <div className={`p-5 rounded-[2rem] shadow-sm flex flex-col items-center text-center transition-all ${isRamadan ? 'bg-white/5 border border-white/10 backdrop-blur-xl' : 'bg-white border border-slate-100'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isRamadan ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'}`}><LayoutDashboard className="w-6 h-6"/></div>
                        <h3 className={`font-black text-sm ${isRamadan ? 'text-white' : 'text-slate-800'}`}>سجل درجات</h3>
                    </div>
                    <div className={`p-5 rounded-[2rem] shadow-sm flex flex-col items-center text-center transition-all ${isRamadan ? 'bg-white/5 border border-white/10 backdrop-blur-xl' : 'bg-white border border-slate-100'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isRamadan ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Zap className="w-6 h-6"/></div>
                        <h3 className={`font-black text-sm ${isRamadan ? 'text-white' : 'text-slate-800'}`}>تقارير شاملة</h3>
                    </div>
                    <div className={`p-5 rounded-[2rem] shadow-sm flex flex-col items-center text-center transition-all ${isRamadan ? 'bg-white/5 border border-white/10 backdrop-blur-xl' : 'bg-white border border-slate-100'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isRamadan ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><ShieldCheck className="w-6 h-6"/></div>
                        <h3 className={`font-black text-sm ${isRamadan ? 'text-white' : 'text-slate-800'}`}>يعمل بلا إنترنت</h3>
                    </div>
                </div>
            ),
            title: "كل ما تحتاجه",
            desc: "تخلى عن السجلات الورقية. رصد الغياب، الدرجات، والسلوك، وإصدار التقارير أصبح أسرع وأسهل.",
            color: isRamadan ? "text-white" : "text-slate-800",
        },
        {
            id: 2,
            icon: <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-inner relative z-10 transition-colors ${isRamadan ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-600'}`}><ShieldCheck className="w-14 h-14" /></div>,
            title: "بياناتك في أمان",
            desc: "نحن نحترم خصوصيتك. جميع بيانات طلابك وسجلاتك محفوظة محلياً على جهازك فقط ولا يتم مشاركتها سحابياً.\n\nتحياتي لكم / محمد درويش الزعابي",
            buttonText: "ابدأ التجربة الآن",
            color: isRamadan ? "text-emerald-400" : "text-emerald-600",
        }
    ];

    const nextStep = () => {
        if (step < slides.length - 1) {
            setStep(step + 1);
        } else {
            onFinish();
        }
    };

    return (
        <div className={`fixed inset-0 flex flex-col items-center justify-between py-12 px-6 z-[99999] overflow-hidden font-sans transition-colors duration-500 ${isRamadan ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
            
            {/* ✨ تأثيرات الإضاءة الخلفية (Glow) للشكل الزجاجي ✨ */}
            {isRamadan && (
                <>
                    <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none"></div>
                </>
            )}

            {/* Top Indicator */}
            <div className="w-full flex justify-center gap-2 mt-4 relative z-10">
                {slides.map((s, idx) => (
                    <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-500 ${step === idx ? (isRamadan ? 'w-8 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'w-8 bg-[#1e3a8a]') : (isRamadan ? 'w-2 bg-white/20' : 'w-2 bg-slate-300')}`}
                    />
                ))}
            </div>

            {/* Content Slider */}
            <div className="flex-1 flex items-center justify-center w-full max-w-md relative z-10">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex flex-col items-center text-center w-full"
                    >
                        <div className="mb-10 relative w-full flex justify-center">
                            {slides[step].customContent ? slides[step].customContent : (
                                <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="relative"
                                >
                                    {/* دائرة توهج صغيرة خلف الأيقونات */}
                                    {isRamadan && <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl"></div>}
                                    {slides[step].icon}
                                </motion.div>
                            )}
                        </div>
                        
                        <h1 className={`text-3xl font-black mb-4 tracking-tight transition-colors ${slides[step].color}`}>
                            {slides[step].title}
                        </h1>
                        <p className={`font-medium text-sm leading-relaxed max-w-[90%] whitespace-pre-line transition-colors ${isRamadan ? 'text-indigo-100/70' : 'text-slate-500'}`}>
                            {slides[step].desc}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Actions */}
            <div className="w-full max-w-md space-y-4 relative z-10">
                <button 
                    onClick={nextStep}
                    className={`w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2 ${isRamadan ? 'bg-indigo-600 text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)] hover:bg-indigo-500' : 'bg-[#1e3a8a] text-white shadow-lg shadow-indigo-200/50 hover:bg-[#152c6e]'}`}
                >
                    {step === slides.length - 1 ? (
                        <>لننطلق <span className="text-xl">🚀</span></>
                    ) : (
                        <>التالي <ChevronLeft className="w-5 h-5 rtl:rotate-180" /></>
                    )}
                </button>
                
                {step < slides.length - 1 && (
                    <button 
                        onClick={onFinish}
                        className={`w-full py-2 text-xs font-bold transition-colors ${isRamadan ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        تخطى المقدمة
                    </button>
                )}
            </div>
        </div>
    );
};

export default WelcomeScreen;
