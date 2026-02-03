
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, ShieldCheck, Zap, LayoutDashboard, ArrowLeft } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface WelcomeScreenProps {
    onFinish: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onFinish }) => {
    const [step, setStep] = useState(0);

    const slides = [
        {
            id: 0,
            icon: <BrandLogo className="w-32 h-32" showText={false} />,
            title: "مرحباً بك في راصد",
            desc: "المساعد الرقمي الذكي للمعلم العماني المحترف. إدارة متكاملة للفصل الدراسي بلمسة واحدة.",
            color: "text-indigo-600",
            bg: "bg-indigo-50"
        },
        {
            id: 1,
            customContent: (
                <div className="grid grid-cols-2 gap-4 w-full px-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2"><Check className="w-5 h-5"/></div>
                        <h3 className="font-black text-xs text-slate-800">حضور ذكي</h3>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-2"><LayoutDashboard className="w-5 h-5"/></div>
                        <h3 className="font-black text-xs text-slate-800">سجل درجات</h3>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-2"><Zap className="w-5 h-5"/></div>
                        <h3 className="font-black text-xs text-slate-800">تحفيز وتنافس</h3>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2"><ShieldCheck className="w-5 h-5"/></div>
                        <h3 className="font-black text-xs text-slate-800">يعمل بلا إنترنت</h3>
                    </div>
                </div>
            ),
            title: "كل ما تحتاجه",
            desc: "تخلى عن السجلات الورقية. رصد الغياب، الدرجات، والسلوك، وإصدار التقارير أصبح أسرع وأسهل.",
            color: "text-slate-800",
            bg: "bg-white"
        },
        {
            id: 2,
            icon: <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center shadow-inner"><ShieldCheck className="w-12 h-12" /></div>,
            title: "بياناتك في أمان",
            desc: "نحن نحترم خصوصيتك. جميع بيانات طلابك وسجلاتك محفوظة محلياً على جهازك فقط ولا يتم مشاركتها سحابياً.",
            buttonText: "ابدأ التجربة الآن",
            color: "text-emerald-600",
            bg: "bg-emerald-50"
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
        <div className="fixed inset-0 bg-[#f8fafc] flex flex-col items-center justify-between py-12 px-6 z-[99999] overflow-hidden">
            
            {/* Top Indicator */}
            <div className="w-full flex justify-center gap-2 mt-4">
                {slides.map((s, idx) => (
                    <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-500 ${step === idx ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300'}`}
                    />
                ))}
            </div>

            {/* Content Slider */}
            <div className="flex-1 flex items-center justify-center w-full max-w-md relative">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex flex-col items-center text-center w-full"
                    >
                        <div className="mb-10 relative">
                            {slides[step].customContent ? slides[step].customContent : (
                                <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    {slides[step].icon}
                                </motion.div>
                            )}
                        </div>
                        
                        <h1 className={`text-3xl font-black mb-4 tracking-tight ${slides[step].color}`}>
                            {slides[step].title}
                        </h1>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-[85%]">
                            {slides[step].desc}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Actions */}
            <div className="w-full max-w-md space-y-4">
                <button 
                    onClick={nextStep}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-indigo-700"
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
                        className="w-full py-2 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
                    >
                        تخطي المقدمة
                    </button>
                )}
            </div>
        </div>
    );
};

export default WelcomeScreen;
