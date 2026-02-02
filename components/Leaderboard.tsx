import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { Trophy, Crown, Star, LayoutGrid, Plus, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LeaderboardProps {
    students: Student[];
    classes: string[];
    onUpdateStudent: (student: Student) => void;
}

// ============================================================================
// ✅ 1. الشخصيات العمانية (كما هي بدون تغيير)
// ============================================================================

const OmaniBoyAvatar = () => (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="60" cy="60" r="55" fill="#F1F5F9" />
        <path d="M25 115C25 95 95 95 95 115V120H25V115Z" fill="white" />
        <path d="M25 115C25 90 40 85 60 85C80 85 95 90 95 115" stroke="#E2E8F0" strokeWidth="1" />
        <path d="M60 85V100" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        <circle cx="60" cy="102" r="2" fill="#CBD5E1" />
        <rect x="50" y="70" width="20" height="20" fill="#EBB082" />
        <circle cx="60" cy="65" r="22" fill="#EBB082" />
        <path d="M38 55C38 40 45 35 60 35C75 35 82 40 82 55H38Z" fill="white" />
        <path d="M38 55H82V60C82 60 75 62 60 62C45 62 38 60 38 60V55Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
        <path d="M45 45H75" stroke="#60A5FA" strokeWidth="1" strokeDasharray="2 2" />
        <path d="M42 50H78" stroke="#60A5FA" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="60" cy="40" r="2" fill="#60A5FA" />
        <circle cx="53" cy="65" r="2.5" fill="#1E293B" />
        <circle cx="67" cy="65" r="2.5" fill="#1E293B" />
        <path d="M56 72Q60 75 64 72" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
);

const OmaniGirlAvatar = ({ uniformColor }: { uniformColor: 'blue' | 'maroon' }) => {
    const primaryColor = uniformColor === 'blue' ? '#2563EB' : '#9F1239';
    const secondaryColor = uniformColor === 'blue' ? '#1E40AF' : '#881337';

    return (
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="60" cy="60" r="55" fill="#F1F5F9" />
            <path d="M30 115C30 95 90 95 90 115V120H30V115Z" fill={primaryColor} />
            <path d="M30 115C30 100 45 100 45 120" fill={secondaryColor} opacity="0.2" />
            <path d="M90 115C90 100 75 100 75 120" fill={secondaryColor} opacity="0.2" />
            <rect x="52" y="80" width="16" height="15" fill="white" />
            <path d="M40 60C40 30 50 25 60 25C70 25 80 30 80 60V80C80 90 40 90 40 80V60Z" fill="white" />
            <circle cx="60" cy="62" r="16" fill="#EBB082" />
            <path d="M44 60C44 45 50 40 60 40C70 40 76 45 76 60" stroke="#E2E8F0" strokeWidth="1" />
            <circle cx="55" cy="62" r="2" fill="#1E293B" />
            <circle cx="65" cy="62" r="2" fill="#1E293B" />
            <path d="M57 69Q60 71 63 69" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M53 60L51 58" stroke="#1E293B" strokeWidth="1" />
            <path d="M67 60L69 58" stroke="#1E293B" strokeWidth="1" />
        </svg>
    );
};

const Leaderboard: React.FC<LeaderboardProps> = ({ students, classes, onUpdateStudent }) => {
    const { currentSemester } = useApp();
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [clickedId, setClickedId] = useState<string | null>(null);

    const today = new Date();
    const currentMonth = today.getMonth(); 
    const currentYear = today.getFullYear();
    const monthName = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"][currentMonth];

    const girlUniformColor = (localStorage.getItem('rased_girl_uniform') as 'blue' | 'maroon') || 'blue';

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

        return withPoints.sort((a, b) => b.monthlyPoints - a.monthlyPoints);
    }, [students, selectedClass, currentMonth, currentYear]);

    const topThree = rankedStudents.slice(0, 3);
    const restOfStudents = rankedStudents.slice(3);

    const getAvatar = (student: any) => {
        if (student.avatar) return <img src={student.avatar} className="w-full h-full object-cover" />;
        if (student.gender === 'female') {
            return <OmaniGirlAvatar uniformColor={girlUniformColor} />;
        }
        return <OmaniBoyAvatar />;
    };

    const handleQuickBonus = (studentId: string) => {
        setClickedId(studentId);
        setTimeout(() => setClickedId(null), 300);

        const freshStudent = students.find(s => s.id === studentId);
        if (!freshStudent) return;

        const newBehavior = {
            id: Date.now().toString() + Math.random().toString(36).substring(2),
            date: new Date().toISOString(),
            type: 'positive' as const,
            description: 'تحفيز المعلم (3 نقاط)',
            points: 3, 
            semester: currentSemester || '1'
        };
        
        const updatedStudent = {
            ...freshStudent,
            behaviors: [newBehavior, ...(freshStudent.behaviors || [])]
        };
        
        onUpdateStudent(updatedStudent);
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 relative animate-in fade-in duration-500 font-sans">
            
            {/* ================= HEADER (الأزرق الموحد) ================= */}
            <div className="fixed md:sticky top-0 z-40 md:z-30 bg-[#1e3a8a] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300 rounded-b-[2.5rem] md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto">
                
                {/* العنوان */}
                <div className="text-center space-y-2 mt-4 mb-6">
                    <h2 className="text-2xl font-black tracking-tight drop-shadow-md flex items-center justify-center gap-2">
                        <Crown className="w-6 h-6 text-amber-400 fill-amber-400 animate-bounce" />
                        فرسان شهر {monthName}
                    </h2>
                    <p className="text-xs font-bold text-blue-200 opacity-80">التنافس على أشدّه! من سيعتلي القمة؟</p>
                </div>

                {/* Filters */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar justify-center pb-2">
                        <button 
                            onClick={() => setSelectedClass('all')} 
                            className={`px-5 py-2 text-xs font-bold whitespace-nowrap rounded-full transition-all border ${selectedClass === 'all' ? 'bg-white text-[#1e3a8a] shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30'}`}
                        >
                            الكل
                        </button>
                        {classes.map(c => (
                            <button 
                                key={c}
                                onClick={() => setSelectedClass(c)} 
                                className={`px-5 py-2 text-xs font-bold whitespace-nowrap rounded-full transition-all border ${selectedClass === c ? 'bg-white text-[#1e3a8a] shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ================= CONTENT ================= */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
                
                {/* مساحة فارغة للهيدر الثابت */}
                <div className="w-full h-[200px] shrink-0"></div>

                <div className="px-4 pb-24 -mt-4 relative z-10">
                    
                    {/* Podium */}
                    {topThree.length > 0 ? (
                        <div className="flex justify-center items-end gap-2 md:gap-6 py-6 mb-6">
                            {/* المركز الثاني */}
                            {topThree[1] && (
                                <div 
                                    className={`flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-100 cursor-pointer transition-transform ${clickedId === topThree[1].id ? 'scale-90' : 'active:scale-95'}`}
                                    onClick={() => handleQuickBonus(topThree[1].id)}
                                >
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-300 shadow-xl overflow-hidden mb-2 relative bg-white">
                                        {getAvatar(topThree[1])}
                                        <div className="absolute -bottom-1 -right-1 bg-slate-300 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-sm">2</div>
                                    </div>
                                    <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl text-center border border-slate-200 w-28 md:w-32 shadow-sm relative">
                                        <h3 className="font-black text-xs md:text-sm text-slate-800 truncate mb-1">
                                            {topThree[1].name.split(' ').slice(0, 2).join(' ')}
                                        </h3>
                                        <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg">{topThree[1].monthlyPoints} نقطة</span>
                                        <div className="absolute -top-2 -right-2 bg-white rounded-full border border-emerald-100 shadow-sm p-1 animate-pulse">
                                            <Plus className="w-3 h-3 text-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* المركز الأول */}
                            {topThree[0] && (
                                <div 
                                    className={`flex flex-col items-center z-10 -mb-6 animate-in slide-in-from-bottom-12 duration-700 cursor-pointer transition-transform ${clickedId === topThree[0].id ? 'scale-90' : 'active:scale-95'}`}
                                    onClick={() => handleQuickBonus(topThree[0].id)}
                                >
                                    <div className="relative">
                                        <Crown className="w-12 h-12 text-amber-400 fill-amber-400 absolute -top-10 left-1/2 -translate-x-1/2 animate-pulse drop-shadow-md" />
                                        <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden mb-2 relative bg-white ring-4 ring-amber-100">
                                            {getAvatar(topThree[0])}
                                            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-lg">1</div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-b from-amber-50 to-white px-4 py-3 rounded-2xl text-center border border-amber-200 w-36 md:w-40 shadow-lg transform -translate-y-2 relative">
                                        <h3 className="font-black text-sm md:text-base text-slate-900 truncate mb-1">
                                            {topThree[0].name.split(' ').slice(0, 2).join(' ')}
                                        </h3>
                                        <div className="flex items-center justify-center gap-1">
                                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                            <span className="text-amber-600 font-black text-xs">{topThree[0].monthlyPoints} نقطة</span>
                                        </div>
                                        <div className="absolute -top-2 -right-2 bg-white rounded-full border border-amber-100 shadow-sm p-1 animate-pulse">
                                            <Plus className="w-3 h-3 text-amber-500" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* المركز الثالث */}
                            {topThree[2] && (
                                <div 
                                    className={`flex flex-col items-center animate-in slide-in-from-bottom-4 duration-700 delay-200 cursor-pointer transition-transform ${clickedId === topThree[2].id ? 'scale-90' : 'active:scale-95'}`}
                                    onClick={() => handleQuickBonus(topThree[2].id)}
                                >
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-orange-300 shadow-xl overflow-hidden mb-2 relative bg-white">
                                        {getAvatar(topThree[2])}
                                        <div className="absolute -bottom-1 -right-1 bg-orange-300 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-sm">3</div>
                                    </div>
                                    <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl text-center border border-orange-200 w-28 md:w-32 shadow-sm relative">
                                        <h3 className="font-black text-xs md:text-sm text-slate-800 truncate mb-1">
                                            {topThree[2].name.split(' ').slice(0, 2).join(' ')}
                                        </h3>
                                        <span className="text-orange-600/70 font-bold text-[10px] bg-orange-50 px-2 py-0.5 rounded-lg">{topThree[2].monthlyPoints} نقطة</span>
                                        <div className="absolute -top-2 -right-2 bg-white rounded-full border border-orange-100 shadow-sm p-1 animate-pulse">
                                            <Plus className="w-3 h-3 text-orange-500" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <Trophy className="w-20 h-20 text-slate-300 mb-4" />
                            <p className="font-bold text-slate-400">ابدأ بجمع النقاط لتظهر هنا!</p>
                        </div>
                    )}

                    {/* باقي الطلاب */}
                    <div className="bg-white rounded-[2rem] p-4 mt-8 border border-slate-100 shadow-sm relative z-20">
                        <h3 className="font-black text-slate-700 mb-4 text-sm flex items-center gap-2 px-2 border-b border-slate-100 pb-2">
                            <LayoutGrid className="w-4 h-4 text-indigo-500" />
                            قائمة الأبطال
                        </h3>
                        
                        {restOfStudents.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {restOfStudents.map((student, idx) => (
                                    <div 
                                        key={student.id} 
                                        className={`bg-white rounded-2xl p-3 flex items-center gap-3 border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer ${clickedId === student.id ? 'scale-95 ring-2 ring-indigo-200' : 'active:scale-95'}`}
                                        onClick={() => handleQuickBonus(student.id)}
                                    >
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full border-2 border-slate-100 shadow-inner overflow-hidden bg-slate-50">
                                                {getAvatar(student)}
                                            </div>
                                            <div className="absolute -top-1 -right-1 bg-slate-700 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-sm">
                                                {idx + 4}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-800 text-xs leading-tight line-clamp-2" title={student.name}>
                                                {student.name}
                                            </h4>
                                            <p className="text-[9px] text-slate-400 font-bold truncate mt-1">{student.classes[0]}</p>
                                        </div>

                                        <div className={`${student.monthlyPoints > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'} px-2 py-1 rounded-lg text-xs font-black text-center min-w-[30px] flex flex-col items-center justify-center`}>
                                            {student.monthlyPoints}
                                            {clickedId === student.id && <Sparkles className="w-3 h-3 text-amber-400 absolute -top-1 -right-1 animate-ping" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-400 text-xs font-bold py-4">
                                {topThree.length > 0 ? "جميع الطلاب في المراكز الأولى! 👏" : "لا يوجد طلاب لعرضهم"}
                            </p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
