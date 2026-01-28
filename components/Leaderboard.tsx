
import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { Trophy, Crown, Sparkles, Star } from 'lucide-react';

interface LeaderboardProps {
    students: Student[];
    classes: string[];
}

// --- مكونات الشخصيات الكرتونية العمانية (SVG) ---

const OmaniBoyAvatar = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="skin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fde6d3" />
        <stop offset="100%" stopColor="#f5d0b0" />
      </linearGradient>
    </defs>
    {/* الخلفية للدشداشة */}
    <path d="M50 160 C50 120 150 120 150 160 L150 200 L50 200 Z" fill="#FFFFFF" />
    <path d="M100 130 L100 200" stroke="#e2e8f0" strokeWidth="2" />
    
    {/* الرقبة */}
    <rect x="85" y="110" width="30" height="20" fill="url(#skin)" />
    
    {/* الوجه */}
    <circle cx="100" cy="90" r="45" fill="url(#skin)" />
    
    {/* الكمة العمانية */}
    <path d="M55 75 Q100 35 145 75 L145 65 Q100 25 55 65 Z" fill="#FFFFFF" filter="drop-shadow(0 2px 2px rgba(0,0,0,0.1))" />
    <path d="M55 75 Q100 35 145 75" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="3 3" />
    <path d="M60 65 Q100 30 140 65" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="2 2" />
    
    {/* الملامح */}
    <circle cx="85" cy="90" r="5" fill="#1e293b" />
    <circle cx="115" cy="90" r="5" fill="#1e293b" />
    <path d="M82 82 Q95 78 108 82" fill="none" stroke="#1e293b" strokeWidth="1.5" opacity="0.3" />
    <path d="M92 110 Q100 115 108 110" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" />
    
    {/* الياقة */}
    <path d="M85 135 L100 150 L115 135" fill="none" stroke="#e2e8f0" strokeWidth="2" />
  </svg>
);

const OmaniGirlAvatar = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="skin_g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fde6d3" />
        <stop offset="100%" stopColor="#f5d0b0" />
      </linearGradient>
    </defs>
    
    {/* الجسم (المريول المدرسي) */}
    <path d="M40 180 C40 140 160 140 160 180 L160 200 L40 200 Z" fill="#3b82f6" />
    <path d="M70 160 L70 200 M130 160 L130 200" stroke="#2563eb" strokeWidth="15" opacity="0.2" />
    
    {/* الرقبة */}
    <rect x="90" y="110" width="20" height="20" fill="url(#skin_g)" />

    {/* الحجاب الأبيض */}
    <path d="M50 85 Q100 30 150 85 L150 120 Q150 150 100 160 Q50 150 50 120 Z" fill="#FFFFFF" />
    <path d="M55 85 Q100 40 145 85" fill="none" stroke="#e2e8f0" strokeWidth="1" />
    
    {/* الوجه */}
    <circle cx="100" cy="90" r="34" fill="url(#skin_g)" />
    
    {/* الملامح */}
    <circle cx="88" cy="90" r="4.5" fill="#1e293b" />
    <circle cx="112" cy="90" r="4.5" fill="#1e293b" />
    <path d="M85 82 Q100 80 115 82" fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.2" />
    <path d="M94 105 Q100 108 106 105" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" />
    
    {/* خدود */}
    <circle cx="82" cy="98" r="4" fill="#fbcfe8" opacity="0.6" />
    <circle cx="118" cy="98" r="4" fill="#fbcfe8" opacity="0.6" />
  </svg>
);

// ------------------------------------

const Leaderboard: React.FC<LeaderboardProps> = ({ students, classes }) => {
    const [selectedClass, setSelectedClass] = useState<string>('all');
    
    // تحديد الشهر الحالي
    const today = new Date();
    const currentMonth = today.getMonth(); 
    const currentYear = today.getFullYear();
    
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const monthName = months[currentMonth];

    // تصفية وحساب النقاط
    const rankedStudents = useMemo(() => {
        let filtered = students;
        if (selectedClass !== 'all') {
            filtered = students.filter(s => s.classes && s.classes.includes(selectedClass));
        }

        const withPoints = filtered.map(student => {
            const monthlyPoints = (student.behaviors || [])
                .filter(b => {
                    try {
                        const d = new Date(b.date);
                        return b.type === 'positive' && 
                               d.getMonth() === currentMonth && 
                               d.getFullYear() === currentYear;
                    } catch (e) {
                        return false;
                    }
                })
                .reduce((acc, b) => acc + b.points, 0);
            
            return { ...student, monthlyPoints };
        });

        // ترتيب الطلاب حسب النقاط
        const activeStudents = withPoints.filter(s => s.monthlyPoints > 0);
        return activeStudents.sort((a, b) => b.monthlyPoints - a.monthlyPoints);
    }, [students, selectedClass, currentMonth, currentYear]);

    const topThree = rankedStudents.slice(0, 3);
    const restOfStudents = rankedStudents.slice(3);

    const getAvatar = (student: any) => {
        if (student.avatar) return <img src={student.avatar} className="w-full h-full object-cover" />;
        // اختيار الشخصية حسب الجنس
        return student.gender === 'female' ? <OmaniGirlAvatar /> : <OmaniBoyAvatar />;
    };

    return (
        <div className="flex flex-col h-full space-y-6 pb-24 md:pb-8 animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="glass-heavy p-6 rounded-[2.5rem] relative overflow-hidden text-center border border-white/20">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 z-0"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center justify-center gap-2">
                        <Crown className="w-8 h-8 text-amber-500 fill-amber-500 animate-bounce" />
                        فرسان شهر {monthName}
                    </h2>
                    <p className="text-xs font-bold text-slate-500">التنافس على أشدّه! من سيعتلي القمة؟</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar px-2">
                <button 
                    onClick={() => setSelectedClass('all')} 
                    className={`px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === 'all' ? 'bg-slate-800 text-white shadow-lg border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                    الكل
                </button>
                {classes.map(c => (
                    <button 
                        key={c}
                        onClick={() => setSelectedClass(c)} 
                        className={`px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === c ? 'bg-indigo-600 text-white shadow-lg border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            {/* Podium (المراكز الثلاثة الأولى) */}
            {topThree.length > 0 ? (
                <div className="flex justify-center items-end gap-2 md:gap-6 py-6 min-h-[280px]">
                    {/* المركز الثاني */}
                    {topThree[1] && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-100">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-300 shadow-xl overflow-hidden mb-2 relative bg-white transform hover:scale-105 transition-transform">
                                {getAvatar(topThree[1])}
                                <div className="absolute -bottom-1 -right-1 bg-slate-300 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-sm">2</div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl text-center border border-slate-200 w-28 md:w-32 shadow-sm">
                                <h3 className="font-black text-xs md:text-sm text-slate-800 truncate mb-1">{topThree[1].name.split(' ')[0]}</h3>
                                <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg">{topThree[1].monthlyPoints} نقطة</span>
                            </div>
                            <div className="h-24 w-full bg-gradient-to-t from-slate-200 to-slate-50/0 rounded-t-lg mt-2 mx-auto opacity-50"></div>
                        </div>
                    )}

                    {/* المركز الأول */}
                    {topThree[0] && (
                        <div className="flex flex-col items-center z-10 -mb-4 animate-in slide-in-from-bottom-12 duration-700">
                            <div className="relative">
                                <Crown className="w-12 h-12 text-amber-400 fill-amber-400 absolute -top-10 left-1/2 -translate-x-1/2 animate-pulse drop-shadow-md" />
                                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden mb-2 relative bg-white ring-4 ring-amber-100 transform hover:scale-105 transition-transform">
                                    {getAvatar(topThree[0])}
                                    <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-lg">1</div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-b from-amber-50 to-white px-5 py-4 rounded-2xl text-center border border-amber-200 w-36 md:w-40 shadow-lg transform -translate-y-2">
                                <h3 className="font-black text-sm md:text-base text-slate-900 truncate mb-1">{topThree[0].name.split(' ')[0]}</h3>
                                <div className="flex items-center justify-center gap-1">
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    <span className="text-amber-600 font-black text-xs">{topThree[0].monthlyPoints} نقطة</span>
                                </div>
                            </div>
                            <div className="h-32 w-full bg-gradient-to-t from-amber-100 to-amber-50/0 rounded-t-lg mt-2 mx-auto opacity-60"></div>
                        </div>
                    )}

                    {/* المركز الثالث */}
                    {topThree[2] && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-700 delay-200">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-orange-300 shadow-xl overflow-hidden mb-2 relative bg-white transform hover:scale-105 transition-transform">
                                {getAvatar(topThree[2])}
                                <div className="absolute -bottom-1 -right-1 bg-orange-300 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-sm">3</div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl text-center border border-orange-200 w-28 md:w-32 shadow-sm">
                                <h3 className="font-black text-xs md:text-sm text-slate-800 truncate mb-1">{topThree[2].name.split(' ')[0]}</h3>
                                <span className="text-orange-600/70 font-bold text-[10px] bg-orange-50 px-2 py-0.5 rounded-lg">{topThree[2].monthlyPoints} نقطة</span>
                            </div>
                            <div className="h-16 w-full bg-gradient-to-t from-orange-100 to-orange-50/0 rounded-t-lg mt-2 mx-auto opacity-50"></div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Trophy className="w-20 h-20 text-slate-300 mb-4" />
                    <p className="font-bold text-slate-400">لا يوجد نقاط مسجلة لهذا الشهر</p>
                </div>
            )}

            {/* الشريط الأفقي لباقي الطلاب (Horizontal Scroll Strip) */}
            {restOfStudents.length > 0 && (
                <div className="bg-transparent mt-4">
                    <h3 className="font-black text-slate-700 mb-4 text-sm flex items-center gap-2 px-4">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        باقي المبدعين
                    </h3>
                    
                    {/* الحاوية الأفقية */}
                    <div className="overflow-x-auto pb-4 px-4 custom-scrollbar snap-x">
                        <div className="flex gap-3 w-max">
                            {restOfStudents.map((student, idx) => (
                                <div 
                                    key={student.id} 
                                    className="snap-start min-w-[120px] w-[120px] bg-white rounded-3xl p-3 flex flex-col items-center border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
                                >
                                    {/* Avatar */}
                                    <div className="relative mb-3 transform group-hover:scale-105 transition-transform duration-300">
                                        <div className="w-16 h-16 rounded-full border-4 border-indigo-50 shadow-inner overflow-hidden bg-slate-50">
                                            {getAvatar(student)}
                                        </div>
                                        {/* الترتيب */}
                                        <div className="absolute -top-1 -right-1 bg-slate-800 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                            #{idx + 4}
                                        </div>
                                    </div>
                                    
                                    {/* الاسم (أسفل الصورة كما طلبت) */}
                                    <h4 className="font-black text-slate-800 text-xs text-center truncate w-full mb-1">{student.name.split(' ')[0]} {student.name.split(' ')[1]?.charAt(0)}.</h4>
                                    
                                    {/* الصف */}
                                    <p className="text-[9px] text-slate-400 font-bold mb-2 truncate w-full text-center bg-slate-50 rounded-lg py-0.5">{student.classes[0]}</p>
                                    
                                    {/* النقاط */}
                                    <div className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl text-xs w-full text-center shadow-sm">
                                        {student.monthlyPoints}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
