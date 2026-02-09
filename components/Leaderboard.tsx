import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { Trophy, Crown, Sparkles, Star, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
// ✅ استيراد مكون الأفاتار بشكل صحيح
import { StudentAvatar } from './StudentAvatar';
// ✅ استيراد الصوت محلياً
import positiveSound from '../assets/positive.mp3';

interface LeaderboardProps {
    students: Student[];
    classes: string[];
    onUpdateStudent?: (student: Student) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ students, classes, onUpdateStudent }) => {
    const { currentSemester } = useApp();
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    
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

        if (searchTerm.trim()) {
            filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
    }, [students, selectedClass, searchTerm, currentMonth, currentYear]);

    const topThree = rankedStudents.slice(0, 3);
    const restOfStudents = rankedStudents.slice(3);

    const handleAddPoints = (student: Student) => {
        if (!onUpdateStudent) return;
        
        // ✅ تشغيل الصوت المحلي
        const audio = new Audio(positiveSound);
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
        <div className="flex flex-col h-full space-y-6 pb-24 md:pb-8 animate-in fade-in duration-500 overflow-hidden">
            
            {/* Header */}
            <header className="fixed md:sticky top-0 z-40 md:z-30 bg-[#446A8D] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300  md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 mb-3 shadow-inner">
                        <Crown className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce" />
                    </div>
                    <h1 className="text-2xl font-black tracking-wide mb-1">فرسان شهر {monthName}</h1>
                    <p className="text-xs text-blue-200 font-bold opacity-80 mb-4">التنافس على أشدّه! من سيعتلي القمة؟</p>
                    
                    <div className="relative w-full max-w-sm mb-4">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <input 
                            type="text" 
                            placeholder="بحث عن طالب..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold text-white placeholder:text-blue-300/70 outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                        />
                    </div>

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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-20 custom-scrollbar pt-2">
                
                {/* Podium (Top 3) */}
                {topThree.length > 0 ? (
                    <div className="flex justify-center items-end gap-2 md:gap-6 py-2 min-h-[260px]">
                        {/* 2nd Place */}
                        {topThree[1] && (
                            <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-100" onClick={() => handleAddPoints(topThree[1])}>
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-300 shadow-xl overflow-hidden mb-2 relative bg-white transform hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                                    <StudentAvatar gender={topThree[1].gender} className="w-full h-full" />
                                    <div className="absolute -bottom-1 -right-1 bg-slate-300 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-sm">2</div>
                                </div>
                                <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-2xl text-center border border-slate-200 w-24 md:w-32 shadow-sm">
                                    <h3 className="font-black text-xs md:text-sm text-slate-800 truncate mb-1">{topThree[1].name.split(' ')[0]}</h3>
                                    <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg">{topThree[1].monthlyPoints} pts</span>
                                </div>
                                <div className="h-20 w-16 bg-gradient-to-t from-slate-200 to-slate-50/0 rounded-t-lg mt-1 mx-auto opacity-50"></div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {topThree[0] && (
                            <div className="flex flex-col items-center z-10 -mb-4 animate-in slide-in-from-bottom-12 duration-700" onClick={() => handleAddPoints(topThree[0])}>
                                <div className="relative cursor-pointer">
                                    <Crown className="w-10 h-10 text-amber-400 fill-amber-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-pulse drop-shadow-md" />
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden mb-2 relative bg-white ring-4 ring-amber-100 transform hover:scale-105 active:scale-95 transition-transform">
                                        <StudentAvatar gender={topThree[0].gender} className="w-full h-full" />
                                        <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-lg">1</div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-b from-amber-50 to-white px-4 py-3 rounded-2xl text-center border border-amber-200 w-28 md:w-40 shadow-lg transform -translate-y-2">
                                    <h3 className="font-black text-sm md:text-base text-slate-900 truncate mb-1">{topThree[0].name.split(' ')[0]}</h3>
                                    <div className="flex items-center justify-center gap-1">
                                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                        <span className="text-amber-600 font-black text-xs">{topThree[0].monthlyPoints} pts</span>
                                    </div>
                                </div>
                                <div className="h-28 w-20 bg-gradient-to-t from-amber-100 to-amber-50/0 rounded-t-lg mt-1 mx-auto opacity-60"></div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {topThree[2] && (
                            <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-700 delay-200" onClick={() => handleAddPoints(topThree[2])}>
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-orange-300 shadow-xl overflow-hidden mb-2 relative bg-white transform hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                                    <StudentAvatar gender={topThree[2].gender} className="w-full h-full" />
                                    <div className="absolute -bottom-1 -right-1 bg-orange-300 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-sm">3</div>
                                </div>
                                <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-2xl text-center border border-orange-200 w-24 md:w-32 shadow-sm">
                                    <h3 className="font-black text-xs md:text-sm text-slate-800 truncate mb-1">{topThree[2].name.split(' ')[0]}</h3>
                                    <span className="text-orange-600/70 font-bold text-[10px] bg-orange-50 px-2 py-0.5 rounded-lg">{topThree[2].monthlyPoints} pts</span>
                                </div>
                                <div className="h-14 w-16 bg-gradient-to-t from-orange-100 to-orange-50/0 rounded-t-lg mt-1 mx-auto opacity-50"></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Trophy className="w-20 h-20 text-slate-300 mb-4" />
                        <p className="font-bold text-slate-400">لا يوجد نقاط مسجلة لهذا الشهر</p>
                    </div>
                )}

                {/* Rest of Students Grid */}
                {restOfStudents.length > 0 && (
                    <div className="mt-4">
                        <h3 className="font-black text-slate-700 mb-4 text-sm flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            باقي الفرسان
                        </h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-8">
                            {restOfStudents.map((student, index) => (
                                <div 
                                    key={student.id}
                                    onClick={() => handleAddPoints(student)}
                                    className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden cursor-pointer active:scale-95 transition-all hover:shadow-md hover:border-indigo-200"
                                >
                                    <div className="absolute top-2 right-2 bg-indigo-50 text-indigo-600 font-bold w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shadow-sm border border-indigo-100">
                                        {index + 4}
                                    </div>
                                    <div className="w-12 h-12 rounded-full border-2 border-white shadow-md bg-slate-50 overflow-hidden mb-2 mt-1">
                                        <StudentAvatar gender={student.gender} className="w-full h-full" />
                                    </div>
                                    <div className="w-full">
                                        <h3 className="font-black text-slate-800 text-xs truncate w-full mb-1">{student.name.split(' ')[0]} {student.name.split(' ')[1]?.charAt(0)}</h3>
                                        <div className="flex items-center justify-center gap-1 bg-slate-50 rounded-lg py-1 px-2 mx-auto w-fit">
                                            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                            <p className="text-[10px] font-bold text-slate-600">
                                                {student.monthlyPoints}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-yellow-400 opacity-0 active:opacity-10 transition-opacity pointer-events-none"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
