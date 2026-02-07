import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { Trophy, Crown, Sparkles, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
// ✅ استيراد مكون الأفاتار الجديد
import StudentAvatar from './StudentAvatar';

interface LeaderboardProps {
    students: Student[];
    classes: string[];
    onUpdateStudent?: (student: Student) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ students, classes, onUpdateStudent }) => {
    const { currentSemester } = useApp();
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

        // ترتيب الطلاب حسب النقاط (الأكثر نقاطاً أولاً)
        return withPoints.sort((a, b) => b.monthlyPoints - a.monthlyPoints);
    }, [students, selectedClass, currentMonth, currentYear]);

    const topThree = rankedStudents.slice(0, 3);
    const restOfStudents = rankedStudents.slice(3);

    // دالة إضافة النقاط التشجيعية (3 نقاط)
    const handleAddPoints = (student: Student) => {
        if (!onUpdateStudent) return;
        
        // تأثير صوتي بسيط (اختياري)
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});

        const newBehavior = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            type: 'positive' as const,
            description: 'تميز في الفرسان (تشجيع)',
            points: 3,
            semester: currentSemester
        };
        onUpdateStudent({ ...student, behaviors: [newBehavior, ...(student.behaviors || [])] });
        alert(`تم إضافة 3 نقاط للطالب ${student.name} 🌟`);
    };

    return (
        <div className="flex flex-col h-full space-y-6 pb-24 md:pb-8 animate-in fade-in duration-500">
            
            {/* Header */}
            <header className="bg-[#1e3a8a] text-white pt-8 pb-10 px-6 rounded-b-[2.5rem] shadow-lg relative z-10 -mx-4 -mt-4">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 mb-3 shadow-inner">
                        <Crown className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce" />
                    </div>
                    <h1 className="text-2xl font-black tracking-wide mb-1">فرسان شهر {monthName}</h1>
                    <p className="text-xs text-blue-200 font-bold opacity-80 mb-6">التنافس على أشدّه! من سيعتلي القمة؟</p>
                    
                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar px-2 w-full justify-center">
                        <button 
                            onClick={() => setSelectedClass('all')} 
                            className={`px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === 'all' ? 'bg-white text-[#1e3a8a] shadow-lg border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}
                        >
                            الكل
                        </button>
                        {classes.map(c => (
                            <button 
                                key={c}
                                onClick={() => setSelectedClass(c)} 
                                className={`px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === c ? 'bg-white text-[#1e3a8a] shadow-lg border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Podium (Top 3) */}
            {topThree.length > 0 ? (
                <div className="flex justify-center items-end gap-2 md:gap-6 py-6 min-h-[280px]">
                    {/* 2nd Place */}
                    {topThree[1] && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-100" onClick={() => handleAddPoints(topThree[1])}>
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-300 shadow-xl overflow-hidden mb-2 relative bg-white transform hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                                {/* ✅ استخدام StudentAvatar */}
                                <StudentAvatar 
                                    gender={topThree[1].gender} 
                                    className="w-full h-full" 
                                />
                                <div className="absolute -bottom-1 -right-1 bg-slate-300 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-sm">2</div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl text-center border border-slate-200 w-28 md:w-32 shadow-sm">
                                <h3 className="font-black text-xs md:text-sm text-slate-800 truncate mb-1">{topThree[1].name.split(' ')[0]}</h3>
                                <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg">{topThree[1].monthlyPoints} نقطة</span>
                            </div>
                            <div className="h-24 w-full bg-gradient-to-t from-slate-200 to-slate-50/0 rounded-t-lg mt-2 mx-auto opacity-50"></div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {topThree[0] && (
                        <div className="flex flex-col items-center z-10 -mb-4 animate-in slide-in-from-bottom-12 duration-700" onClick={() => handleAddPoints(topThree[0])}>
                            <div className="relative cursor-pointer">
                                <Crown className="w-12 h-12 text-amber-400 fill-amber-400 absolute -top-10 left-1/2 -translate-x-1/2 animate-pulse drop-shadow-md" />
                                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden mb-2 relative bg-white ring-4 ring-amber-100 transform hover:scale-105 active:scale-95 transition-transform">
                                    {/* ✅ استخدام StudentAvatar */}
                                    <StudentAvatar 
                                        gender={topThree[0].gender} 
                                        className="w-full h-full" 
                                    />
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

                    {/* 3rd Place */}
                    {topThree[2] && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-700 delay-200" onClick={() => handleAddPoints(topThree[2])}>
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-orange-300 shadow-xl overflow-hidden mb-2 relative bg-white transform hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                                {/* ✅ استخدام StudentAvatar */}
                                <StudentAvatar 
                                    gender={topThree[2].gender} 
                                    className="w-full h-full" 
                                />
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

            {/* Rest of Students List */}
            {restOfStudents.length > 0 && (
                <div className="px-4">
                    <h3 className="font-black text-slate-700 mb-4 text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        باقي الفرسان
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
                        {restOfStudents.map((student, index) => (
                            <div 
                                key={student.id}
                                onClick={() => handleAddPoints(student)}
                                className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden cursor-pointer active:scale-95 transition-all hover:shadow-md"
                            >
                                {/* 1. Rank (Right in RTL) */}
                                <div className="bg-indigo-50 text-indigo-600 font-bold w-10 h-10 rounded-xl flex items-center justify-center text-sm shadow-sm shrink-0">
                                    {index + 4}
                                </div>

                                {/* 2. Name and Class (Middle) */}
                                <div className="flex-1 text-right px-3 min-w-0">
                                    <h3 className="font-bold text-slate-800 text-sm truncate">{student.name}</h3>
                                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
                                        {student.classes[0]} • <span className="text-indigo-500">{student.monthlyPoints} نقطة</span>
                                    </p>
                                </div>

                                {/* 3. Avatar (Left in RTL) */}
                                <div className="w-12 h-12 rounded-full border-2 border-white shadow-md bg-slate-50 overflow-hidden shrink-0">
                                    {/* ✅ استخدام StudentAvatar */}
                                    <StudentAvatar 
                                        gender={student.gender} 
                                        className="w-full h-full" 
                                    />
                                </div>

                                {/* Flash Effect on Click */}
                                <div className="absolute inset-0 bg-yellow-400 opacity-0 active:opacity-10 transition-opacity pointer-events-none"></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
