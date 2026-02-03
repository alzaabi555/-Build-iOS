import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { Trophy, Crown, Sparkles, Star, LayoutGrid } from 'lucide-react'; // Added LayoutGrid icon

interface LeaderboardProps {
    students: Student[];
    classes: string[];
}

// --- مكونات الشخصيات الكرتونية العمانية (3D Style - مفرغة ومحسنة) ---

const OmaniBoyAvatar = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="boySkin3D" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
        <stop offset="0%" stopColor="#ffdfc4" />
        <stop offset="60%" stopColor="#ebb082" />
        <stop offset="100%" stopColor="#d49066" />
      </radialGradient>
      <linearGradient id="dishdasha3D" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="20%" stopColor="#f1f5f9" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="80%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="kummahBase" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="2" dy="4" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    
    <g filter="url(#softShadow)">
      <path d="M50 170 C50 140 150 140 150 170 L150 210 L50 210 Z" fill="url(#dishdasha3D)" />
      <path d="M100 150 L100 180" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="183" r="3" fill="#cbd5e1" />
    </g>
    <rect x="85" y="115" width="30" height="20" fill="#d49066" />
    <g filter="url(#softShadow)">
      <circle cx="100" cy="95" r="48" fill="url(#boySkin3D)" />
      <path d="M53 85 Q100 95 147 85 L147 65 Q100 15 53 65 Z" fill="url(#kummahBase)" />
      <path d="M53 85 Q100 95 147 85" fill="none" stroke="#e2e8f0" strokeWidth="1" />
      <path d="M60 80 Q100 90 140 80" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2" opacity="0.6" />
      <path d="M65 70 Q100 40 135 70" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="2 2" opacity="0.5" />
      <circle cx="52" cy="95" r="9" fill="#ebb082" />
      <circle cx="148" cy="95" r="9" fill="#ebb082" />
    </g>
    <g>
      <ellipse cx="82" cy="100" rx="6" ry="8" fill="#1e293b" />
      <circle cx="84" cy="98" r="2.5" fill="white" opacity="0.9" />
      <ellipse cx="118" cy="100" rx="6" ry="8" fill="#1e293b" />
      <circle cx="120" cy="98" r="2.5" fill="white" opacity="0.9" />
      <path d="M75 90 Q82 88 89 90" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M111 90 Q118 88 125 90" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M90 120 Q100 128 110 120" fill="none" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="75" cy="115" rx="6" ry="3" fill="#fda4af" opacity="0.4" filter="blur(2px)" />
      <ellipse cx="125" cy="115" rx="6" ry="3" fill="#fda4af" opacity="0.4" filter="blur(2px)" />
    </g>
  </svg>
);

const OmaniGirlAvatar = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="girlSkin3D" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
        <stop offset="0%" stopColor="#ffdfc4" />
        <stop offset="60%" stopColor="#ebb082" />
        <stop offset="100%" stopColor="#d49066" />
      </radialGradient>
      <linearGradient id="hijab3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="uniform3D" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
      <filter id="girlShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="0" dy="4" result="offsetblur" />
        <feComponentTransfer>
           <feFuncA type="linear" slope="0.25"/> 
        </feComponentTransfer>
        <feMerge> 
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/> 
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#girlShadow)">
      <path d="M40 180 C40 130 160 130 160 180 L160 210 L40 210 Z" fill="url(#uniform3D)" />
      <path d="M70 160 L70 210 M130 160 L130 210" stroke="#2563eb" strokeWidth="12" opacity="0.3" />
    </g>
    <rect x="90" y="120" width="20" height="20" fill="#d49066" />
    <g filter="url(#girlShadow)">
      <path d="M45 90 Q100 20 155 90 L155 130 Q155 160 100 170 Q45 160 45 130 Z" fill="url(#hijab3D)" />
      <circle cx="100" cy="95" r="38" fill="url(#girlSkin3D)" />
      <path d="M62 90 Q100 100 138 90 L138 50 Q100 40 62 50 Z" fill="url(#hijab3D)" />
      <path d="M62 90 Q100 100 138 90" fill="none" stroke="#f1f5f9" strokeWidth="1" opacity="0.5" />
    </g>
    <g>
      <ellipse cx="86" cy="100" rx="5.5" ry="7.5" fill="#1e293b" />
      <circle cx="88" cy="98" r="2.5" fill="white" opacity="0.9" />
      <ellipse cx="114" cy="100" rx="5.5" ry="7.5" fill="#1e293b" />
      <circle cx="116" cy="98" r="2.5" fill="white" opacity="0.9" />
      <path d="M80 96 L78 94 M120 96 L122 94" stroke="#1e293b" strokeWidth="1.5" />
      <path d="M94 118 Q100 122 106 118" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" />
      <circle cx="80" cy="110" r="5" fill="#fbcfe8" opacity="0.5" filter="blur(2px)" />
      <circle cx="120" cy="110" r="5" fill="#fbcfe8" opacity="0.5" filter="blur(2px)" />
    </g>
  </svg>
);

// ------------------------------------

const Leaderboard: React.FC<LeaderboardProps> = ({ students, classes }) => {
    const [selectedClass, setSelectedClass] = useState<string>('all');
    
    const today = new Date();
    const currentMonth = today.getMonth(); 
    const currentYear = today.getFullYear();
    
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const monthName = months[currentMonth];

    // تصفية وحساب النقاط وترتيب الطلاب
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

        // ترتيب تنازلي حسب النقاط
        return withPoints.sort((a, b) => b.monthlyPoints - a.monthlyPoints);
    }, [students, selectedClass, currentMonth, currentYear]);

    // أول 3 طلاب للبوديوم
    const topThree = rankedStudents.slice(0, 3);
    // باقي الطلاب (يشمل الجميع حتى من لديهم 0 نقاط)
    const restOfStudents = rankedStudents.slice(3);

    const getAvatar = (student: any) => {
        if (student.avatar) return <img src={student.avatar} className="w-full h-full object-cover" />;
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

            {/* Filters - (تم تحسين التمرير الأفقي هنا) */}
            <div className="flex gap-2 overflow-x-auto pb-2 px-2 custom-scrollbar no-scrollbar snap-x">
                <button 
                    onClick={() => setSelectedClass('all')} 
                    className={`shrink-0 px-6 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border snap-start ${selectedClass === 'all' ? 'bg-slate-800 text-white shadow-lg border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                    الكل
                </button>
                {classes.map(c => (
                    <button 
                        key={c}
                        onClick={() => setSelectedClass(c)} 
                        className={`shrink-0 px-6 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border snap-start ${selectedClass === c ? 'bg-indigo-600 text-white shadow-lg border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            {/* Podium (المراكز الثلاثة الأولى) */}
            {topThree.length > 0 && topThree[0].monthlyPoints > 0 ? (
                <div className="flex justify-center items-end gap-2 md:gap-6 py-6 min-h-[280px]">
                    {/* المركز الثاني */}
                    {topThree[1] && topThree[1].monthlyPoints > 0 && (
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
                    {topThree[0] && topThree[0].monthlyPoints > 0 && (
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
                    {topThree[2] && topThree[2].monthlyPoints > 0 && (
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
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <Trophy className="w-20 h-20 text-slate-300 mb-4" />
                    <p className="font-bold text-slate-400">ابدأ بجمع النقاط لتظهر هنا!</p>
                </div>
            )}

            {/* شبكة عرض باقي الطلاب (Vertical Grid for All Other Students) */}
            <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] p-4 mt-4 border border-white/40 shadow-sm">
                <h3 className="font-black text-slate-700 mb-4 text-sm flex items-center gap-2 px-2">
                    <LayoutGrid className="w-4 h-4 text-indigo-500" />
                    قائمة الأبطال
                </h3>
                
                {restOfStudents.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {restOfStudents.map((student, idx) => (
                            <div 
                                key={student.id} 
                                className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                            >
                                {/* Avatar Mini */}
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full border-2 border-slate-100 shadow-inner overflow-hidden bg-slate-50">
                                        {getAvatar(student)}
                                    </div>
                                    <div className="absolute -top-1 -right-1 bg-slate-700 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-sm">
                                        {idx + 4}
                                    </div>
                                </div>
                                
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-slate-800 text-xs truncate">{student.name.split(' ')[0]} {student.name.split(' ')[1]?.charAt(0)}.</h4>
                                    <p className="text-[9px] text-slate-400 font-bold truncate">{student.classes[0]}</p>
                                </div>

                                {/* Points Badge */}
                                <div className={`${student.monthlyPoints > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'} px-2 py-1 rounded-lg text-xs font-black text-center min-w-[30px]`}>
                                    {student.monthlyPoints}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-slate-400 text-xs font-bold py-4">لا يوجد طلاب آخرين للعرض</p>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;