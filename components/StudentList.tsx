import React, { useState, useEffect, useMemo } from 'react';
import { Student, BehaviorType } from '../types';
import { 
    Search, ThumbsUp, ThumbsDown, Edit2, Trash2, LayoutGrid, UserPlus, 
    FileSpreadsheet, MoreVertical, Settings, Users, AlertCircle, X, 
    Dices, Timer, Play, Pause, RotateCcw, CheckCircle2, MessageCircle, Plus 
} from 'lucide-react';
import Modal from './Modal';
import ExcelImport from './ExcelImport';
import { useApp } from '../context/AppContext';
// import { StudentAvatar } from './StudentAvatar'; 

// ✅ استيراد الكابستور والمتصفح لضمان عمل الواتساب على الوندوز والموبايل
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// استيراد الأصوات (Relative Paths)
import positiveSound from '../assets/positive.mp3';
import negativeSound from '../assets/negative.mp3';
import tadaSound from '../assets/tada.mp3';
import alarmSound from '../assets/alarm.mp3';

interface StudentListProps {
    students: Student[];
    classes: string[];
    onAddClass: (name: string) => void;
    onAddStudentManually: (name: string, className: string, phone?: string, avatar?: string, gender?: 'male'|'female') => void;
    onBatchAddStudents: (students: Student[]) => void;
    onUpdateStudent: (student: Student) => void;
    onDeleteStudent: (id: string) => void;
    onViewReport: (student: Student) => void;
    currentSemester: '1' | '2';
    onDeleteClass?: (className: string) => void; 
    onSemesterChange?: (sem: '1' | '2') => void;
    onEditClass?: (oldName: string, newName: string) => void;
}

const SOUNDS = {
    positive: positiveSound,
    negative: negativeSound,
    tada: tadaSound, 
    alarm: alarmSound
};

const NEGATIVE_BEHAVIORS = [
    { id: '1', title: 'إزعاج في الحصة', points: -1 },
    { id: '2', title: 'عدم حل الواجب', points: -2 },
    { id: '3', title: 'نسيان الكتاب', points: -1 },
    { id: '4', title: 'تأخر عن الحصة', points: -1 },
    { id: '5', title: 'سلوك غير لائق', points: -3 },
    { id: '6', title: 'النوم في الفصل', points: -1 },
];

const POSITIVE_BEHAVIORS = [
    { id: 'p1', title: 'مشاركة فعالة', points: 1 },
    { id: 'p2', title: 'إجابة صحيحة', points: 1 },
    { id: 'p3', title: 'واجب مميز', points: 2 },
    { id: 'p4', title: 'مساعدة الزملاء', points: 2 },
    { id: 'p5', title: 'نظام وانضباط', points: 1 },
    { id: 'p6', title: 'إبداع وتميز', points: 3 },
];

const StudentList: React.FC<StudentListProps> = ({ 
    students = [], 
    classes = [], 
    onAddClass, 
    onAddStudentManually, 
    onBatchAddStudents, 
    onUpdateStudent, 
    onDeleteStudent, 
    onViewReport,
    currentSemester, 
    onDeleteClass 
}) => {
    const { defaultStudentGender, setDefaultStudentGender, setStudents } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGrade, setSelectedGrade] = useState<string>('all');
    const [selectedClass, setSelectedClass] = useState<string>('all');
    
    const [showManualAddModal, setShowManualAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAddClassModal, setShowAddClassModal] = useState(false);
    const [showManageClasses, setShowManageClasses] = useState(false); 
    const [showMenu, setShowMenu] = useState(false);

    const [newClassInput, setNewClassInput] = useState('');
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentPhone, setNewStudentPhone] = useState('');
    const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>(defaultStudentGender);
    const [newStudentClass, setNewStudentClass] = useState('');

    const [showNegativeModal, setShowNegativeModal] = useState(false);
    const [showPositiveModal, setShowPositiveModal] = useState(false);
    const [selectedStudentForBehavior, setSelectedStudentForBehavior] = useState<Student | null>(null);

    // حالة جديدة للإدخال اليدوي للسلوكيات
    const [customPositiveReason, setCustomPositiveReason] = useState('');
    const [customNegativeReason, setCustomNegativeReason] = useState('');

    const [randomWinner, setRandomWinner] = useState<Student | null>(null);
    const [pickedStudentIds, setPickedStudentIds] = useState<string[]>([]);

    // --- Timer Logic ---
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerInput, setTimerInput] = useState('5');

    useEffect(() => {
        let interval: any;
        if (isTimerRunning && timerSeconds > 0) {
            if (timerSeconds === 10) {
                const countdownAudio = new Audio(SOUNDS.tada);
                countdownAudio.volume = 1.0;
                countdownAudio.play().catch((e) => console.error("Error playing audio", e));
            }
            interval = setInterval(() => {
                setTimerSeconds((prev) => prev - 1);
            }, 1000);
        } else if (timerSeconds === 0 && isTimerRunning) {
            setIsTimerRunning(false);
            if (navigator.vibrate) {
                navigator.vibrate([500, 200, 500]);
            }
            setTimeout(() => alert('⏰ انتهى الوقت!'), 500);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timerSeconds]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startTimer = (minutes: number) => {
        setTimerSeconds(minutes * 60);
        setIsTimerRunning(true);
        setShowTimerModal(false);
    };

    const safeClasses = useMemo(() => Array.isArray(classes) ? classes : [], [classes]);
    const safeStudents = useMemo(() => Array.isArray(students) ? students : [], [students]);

    useEffect(() => {
        if (safeClasses.length > 0 && !newStudentClass) {
            setNewStudentClass(safeClasses[0]);
        }
    }, [safeClasses]);

    useEffect(() => {
        setPickedStudentIds([]);
    }, [selectedClass, selectedGrade]);

    useEffect(() => {
        setNewStudentGender(defaultStudentGender);
    }, [defaultStudentGender]);

    const availableGrades = useMemo(() => {
        const grades = new Set<string>();
        if (safeStudents.length > 0) {
            safeStudents.forEach(s => {
                if (!s) return;
                if (s.grade) {
                    grades.add(s.grade);
                } else if (s.classes && s.classes[0]) {
                    const match = s.classes[0].match(/^(\d+)/);
                    if (match) grades.add(match[1]);
                }
            });
        }
        return Array.from(grades).sort();
    }, [safeStudents]);

    const filteredStudents = useMemo(() => {
        if (safeStudents.length === 0) return [];
        return safeStudents.filter(student => {
            if (!student) return false;
            const nameMatch = (student.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const studentClasses = student.classes || [];
            const matchesClass = selectedClass === 'all' || studentClasses.includes(selectedClass);
            
            let matchesGrade = true;
            if (selectedGrade !== 'all') {
               const firstClass = studentClasses[0] || '';
               matchesGrade = student.grade === selectedGrade || firstClass.startsWith(selectedGrade);
            }
            return nameMatch && matchesClass && matchesGrade;
        });
    }, [safeStudents, searchTerm, selectedClass, selectedGrade]);

    const playSound = (type: 'positive' | 'negative' | 'tada') => {
        const audio = new Audio(SOUNDS[type]);
        audio.volume = 0.5;
        audio.play().catch(e => console.error(e));
    };

    const handleRandomPick = () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const presentStudents = filteredStudents.filter(s => {
            const attendanceRecord = s.attendance.find(a => a.date === todayStr);
            const isAbsentOrTruant = attendanceRecord?.status === 'absent' || attendanceRecord?.status === 'truant';
            return !isAbsentOrTruant;
        });

        if (presentStudents.length === 0) {
            alert('لا يوجد طلاب حضور في القائمة الحالية لإجراء القرعة.');
            return;
        }

        const eligibleCandidates = presentStudents.filter(s => !pickedStudentIds.includes(s.id));

        if (eligibleCandidates.length === 0) {
            if (confirm('تم اختيار جميع الطلاب الحاضرين في هذه الحصة. هل تريد بدء دورة جديدة؟')) {
                setPickedStudentIds([]);
            }
            return;
        }

        const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
        const winner = eligibleCandidates[randomIndex];

        setPickedStudentIds(prev => [...prev, winner.id]);
        setRandomWinner(winner);
        playSound('positive'); 
        setShowMenu(false);
    };

    const handleBehavior = (student: Student, type: BehaviorType) => {
        setSelectedStudentForBehavior(student);
        // تصفير الحقول اليدوية عند الفتح
        setCustomPositiveReason('');
        setCustomNegativeReason('');
        
        if (type === 'positive') {
            setShowPositiveModal(true);
        } else {
            setShowNegativeModal(true);
        }
    };

    // ✅ دالة إرسال تقرير الواتساب المعدلة (محدثة حسب الطلب)
    const handleSendWhatsAppReport = async (student: Student) => {
        if (!student.parentPhone) {
            alert('⚠️ عذراً، لا يوجد رقم هاتف مسجل لولي أمر هذا الطالب.\nيرجى تعديل بيانات الطالب وإضافة الرقم أولاً.');
            return;
        }

        // 1. حساب الإحصائيات
        const positivePoints = (student.behaviors || []).filter(b => b.type === 'positive').reduce((acc, b) => acc + b.points, 0);
        const negativePoints = (student.behaviors || []).filter(b => b.type === 'negative').reduce((acc, b) => acc + Math.abs(b.points), 0);
        const absenceCount = (student.attendance || []).filter(a => a.status === 'absent').length;
        const truantCount = (student.attendance || []).filter(a => a.status === 'truant').length;

        // 2. بناء الرسالة
        let message = `*تقرير متابعة الطالب: ${student.name}*\n`;
        message += `الصف: ${student.classes[0] || 'غير محدد'}\n`;
        message += `------------------\n`;
        message += `📊 *الإحصائيات السلوكية والحضور:*\n`;
        message += `✅ نقاط التميز: ${positivePoints}\n`;
        message += `❌ نقاط الملاحظات: ${negativePoints}\n`;
        message += `🚫 أيام الغياب: ${absenceCount}\n`;
        message += `🏃 مرات الهروب: ${truantCount}\n`;
        message += `------------------\n`;

        const negativeBehaviors = (student.behaviors || []).filter(b => b.type === 'negative');
        
        if (negativeBehaviors.length > 0) {
            message += `⚠️ *أبرز الملاحظات السلوكية المسجلة:*\n`;
            // عرض آخر 5 ملاحظات
            negativeBehaviors.slice(0, 5).forEach(b => {
                const dateObj = new Date(b.date);
                const date = dateObj.toLocaleDateString('ar-EG');
                message += `- ${b.description} (${date})\n`;
            });
            message += `------------------\n`;
        } else {
            message += `🎉 *سجل الطالب السلوكي نظيف وممتاز.*\n`;
            message += `------------------\n`;
        }

        message += `\nنأمل منكم التكرم بمتابعة الطالب وتوجيهه.\nشكراً لتعاونكم.\n*إدارة المدرسة*`;

        // 3. معالجة الرقم والرابط
        const cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
        // const fullPhone = cleanPhone.startsWith('9') || cleanPhone.startsWith('7') ? `968${cleanPhone}` : cleanPhone;
        const fullPhone = cleanPhone; 
        
        const encodedMsg = encodeURIComponent(message);

        // 4. الفتح حسب المنصة
        if (window.electron) {
            // للويندوز: استخدام واتساب ويب
            window.electron.openExternal(`https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedMsg}`);
        } else {
            const universalUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedMsg}`;
            try {
                if (Capacitor.isNativePlatform()) {
                    await Browser.open({ url: universalUrl });
                } else {
                    window.open(universalUrl, '_blank');
                }
            } catch (e) {
                window.open(universalUrl, '_blank');
            }
        }
    };

    const confirmPositiveBehavior = (title: string, points: number) => {
        if (!selectedStudentForBehavior) return;
        playSound('positive');
        const newBehavior = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            type: 'positive' as const,
            description: title,
            points: points,
            semester: currentSemester
        };
        onUpdateStudent({ 
            ...selectedStudentForBehavior, 
            behaviors: [newBehavior, ...(selectedStudentForBehavior.behaviors || [])] 
        });
        setShowPositiveModal(false);
        setSelectedStudentForBehavior(null);
    };

    const confirmNegativeBehavior = (title: string, points: number) => {
        if (!selectedStudentForBehavior) return;
        playSound('negative');
        const newBehavior = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            type: 'negative' as const,
            description: title,
            points: points,
            semester: currentSemester
        };
        onUpdateStudent({ 
            ...selectedStudentForBehavior, 
            behaviors: [newBehavior, ...(selectedStudentForBehavior.behaviors || [])] 
        });
        setShowNegativeModal(false);
        setSelectedStudentForBehavior(null);
    };

    const handleManualAddSubmit = () => {
        if (newStudentName && newStudentClass) {
            onAddStudentManually(newStudentName, newStudentClass, newStudentPhone, undefined, newStudentGender);
            setNewStudentName('');
            setNewStudentPhone('');
            setShowManualAddModal(false);
        }
    };

    const handleAddClassSubmit = () => {
        if (newClassInput.trim()) {
            onAddClass(newClassInput.trim());
            setNewClassInput('');
            setShowAddClassModal(false);
        }
    };
    
    const handleEditStudentSave = () => {
        if (editingStudent) {
            onUpdateStudent(editingStudent);
            setEditingStudent(null);
        }
    };

    // ✅ التصحيح هنا: تصفير الأيقونة (Avatar) عند تغيير الجنس لضمان ظهور الأيقونة الجديدة
    const handleBatchGenderUpdate = (gender: 'male' | 'female') => {
        if (confirm('هل أنت متأكد؟ سيتم تغيير أيقونات جميع الطلاب المسجلين حالياً ليتناسب مع النوع المختار.')) {
            setDefaultStudentGender(gender);
            setStudents(prev => prev.map(s => ({
                ...s,
                gender: gender,
                avatar: undefined // ✅ إعادة تعيين الأفاتار ليأخذ الافتراضي الجديد
            })));
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
            
            {/* Header */}
            <header className="fixed md:sticky top-0 z-40 md:z-30 bg-[#446A8D] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300 md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-wide">الطلاب</h1>
                            <p className="text-[10px] text-blue-200 font-bold opacity-80">{safeStudents.length} طالب مسجل</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative">
                            <button 
                                onClick={() => setShowTimerModal(true)} 
                                className={`p-2.5 rounded-xl backdrop-blur-md border active:scale-95 transition-all hover:bg-white/20 flex items-center gap-2 ${timerSeconds > 0 ? 'bg-amber-500 border-amber-400 text-white shadow-lg animate-pulse' : 'bg-white/10 border-white/20 text-white'}`}
                                title="المؤقت"
                            >
                                <Timer className="w-5 h-5" />
                                {timerSeconds > 0 && (
                                    <span className="text-xs font-black min-w-[30px]">{formatTime(timerSeconds)}</span>
                                )}
                            </button>
                        </div>

                        <button 
                            onClick={handleRandomPick} 
                            className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20 active:scale-95 transition-all hover:bg-white/20"
                            title="القرعة العشوائية"
                        >
                            <Dices className="w-5 h-5 text-white" />
                        </button>

                        <div className="relative">
                            <button 
                                onClick={() => setShowMenu(!showMenu)} 
                                className={`p-2.5 rounded-xl backdrop-blur-md border active:scale-95 transition-all hover:bg-white/20 ${showMenu ? 'bg-white text-[#446A8D] border-white' : 'bg-white/10 border-white/20 text-white'}`}
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                            
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 z-20 py-2 overflow-hidden animate-in zoom-in-95 origin-top-left">
                                        <button onClick={() => { setShowManualAddModal(true); setShowMenu(false); }} className="w-full text-right px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-bold text-slate-700">
                                            <UserPlus className="w-4 h-4 text-indigo-500" /> إضافة طالب
                                        </button>
                                        <button onClick={() => { setShowImportModal(true); setShowMenu(false); }} className="w-full text-right px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-bold text-slate-700">
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> استيراد Excel
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button onClick={() => { setShowManageClasses(true); setShowMenu(false); }} className="w-full text-right px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-bold text-slate-700">
                                            <Settings className="w-4 h-4 text-slate-500" /> إدارة الفصول
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <div className="px-4 py-2">
                                            <p className="text-[10px] font-bold text-slate-400 mb-2">نوع الطلاب الافتراضي</p>
                                            <div className="flex bg-slate-100 rounded-lg p-1">
                                                <button onClick={() => handleBatchGenderUpdate('male')} className={`flex-1 py-1 rounded text-[10px] font-bold ${defaultStudentGender === 'male' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>بنين 👦</button>
                                                <button onClick={() => handleBatchGenderUpdate('female')} className={`flex-1 py-1 rounded text-[10px] font-bold ${defaultStudentGender === 'female' ? 'bg-white shadow text-pink-600' : 'text-slate-500'}`}>بنات 👧</button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute right-3 top-3 w-4 h-4 text-white/50" />
                        <input 
                            type="text" 
                            placeholder="ابحث عن طالب..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/10 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm font-bold text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 transition-all text-right"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        <button 
                            onClick={() => setSelectedClass('all')} 
                            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === 'all' ? 'bg-white text-[#446A8D] shadow-lg border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}
                        >
                            الكل
                        </button>
                        {safeClasses.map(c => (
                            <button 
                                key={c}
                                onClick={() => setSelectedClass(c)} 
                                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === c ? 'bg-white text-[#446A8D] shadow-lg border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pt-20 md:pt-4 pb-20">
                <div className="mt-[160px] md:mt-0"> {/* Spacing for fixed header on mobile */}
                    {filteredStudents.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredStudents.map(student => {
                                const positivePoints = (student.behaviors || []).filter(b => b.type === 'positive').reduce((acc, b) => acc + b.points, 0);
                                const negativePoints = (student.behaviors || []).filter(b => b.type === 'negative').reduce((acc, b) => acc + Math.abs(b.points), 0);
                                
                                return (
                                    <div key={student.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all hover:shadow-md">
                                        <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onViewReport(student)}>
                                            <div className="w-12 h-12 rounded-full bg-slate-50 border-2 border-slate-100 overflow-hidden shrink-0 relative">
                                                {/* <StudentAvatar student={student} className="w-full h-full object-cover" />  -- Replaced with img/fallback */}
                                                <img 
                                                    src={student.avatar || (student.gender === 'female' ? '/student-girl.png' : '/student-boy.jpg')} 
                                                    className="w-full h-full object-cover" 
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.classList.add('flex','items-center','justify-center'); e.currentTarget.parentElement!.innerText=student.gender==='female'?'👩‍🎓':'👨‍🎓'; }}
                                                />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h3 className="font-bold text-slate-900 text-sm truncate">{student.name}</h3>
                                                <p className="text-[10px] text-slate-400 font-bold">{student.classes[0]}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-end gap-1 mr-2">
                                                <div className="flex gap-1">
                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{positivePoints}</span>
                                                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{negativePoints}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-1">
                                                <button onClick={() => handleBehavior(student, 'positive')} className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 hover:bg-emerald-100 active:scale-90 transition-all shadow-sm">
                                                    <ThumbsUp className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleBehavior(student, 'negative')} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 hover:bg-rose-100 active:scale-90 transition-all shadow-sm">
                                                    <ThumbsDown className="w-4 h-4" />
                                                </button>
                                            </div>
                                            
                                            <div className="w-px h-8 bg-slate-100 mx-1"></div>

                                            <button onClick={() => handleSendWhatsAppReport(student)} className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-200 hover:bg-green-100 active:scale-90 transition-all shadow-sm">
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                            
                                            <button onClick={() => setEditingStudent(student)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-200 hover:bg-slate-100 active:scale-90 transition-all">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-60">
                            <Users className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-sm font-bold text-slate-400">لا يوجد طلاب مطابقين للبحث</p>
                            {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-4 text-indigo-600 text-xs font-bold underline">مسح البحث</button>}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {/* Modal: Positive Behavior */}
            <Modal isOpen={showPositiveModal} onClose={() => setShowPositiveModal(false)} className="max-w-sm rounded-[2rem]">
                <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg animate-bounce">
                        <ThumbsUp className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="font-black text-lg text-slate-900 mb-1">تعزيز إيجابي</h3>
                    <p className="text-xs text-slate-500 mb-6 font-bold">{selectedStudentForBehavior?.name}</p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {POSITIVE_BEHAVIORS.map(b => (
                            <button 
                                key={b.id} 
                                onClick={() => confirmPositiveBehavior(b.title, b.points)}
                                className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all active:scale-95 flex flex-col items-center gap-1"
                            >
                                <span className="font-bold text-xs text-emerald-800">{b.title}</span>
                                <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-full text-emerald-600 border border-emerald-200">+{b.points}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="سبب آخر..." 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 pr-10"
                            value={customPositiveReason}
                            onChange={(e) => setCustomPositiveReason(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && customPositiveReason.trim()) {
                                    confirmPositiveBehavior(customPositiveReason, 1);
                                }
                            }}
                        />
                        <button 
                            onClick={() => { if(customPositiveReason.trim()) confirmPositiveBehavior(customPositiveReason, 1); }}
                            className="absolute left-1 top-1 bottom-1 px-3 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                        >
                            <Plus size={16}/>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Negative Behavior */}
            <Modal isOpen={showNegativeModal} onClose={() => setShowNegativeModal(false)} className="max-w-sm rounded-[2rem]">
                <div className="text-center">
                    <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg animate-pulse">
                        <ThumbsDown className="w-8 h-8 text-rose-600" />
                    </div>
                    <h3 className="font-black text-lg text-slate-900 mb-1">ملاحظة سلوكية</h3>
                    <p className="text-xs text-slate-500 mb-6 font-bold">{selectedStudentForBehavior?.name}</p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {NEGATIVE_BEHAVIORS.map(b => (
                            <button 
                                key={b.id} 
                                onClick={() => confirmNegativeBehavior(b.title, b.points)}
                                className="p-3 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all active:scale-95 flex flex-col items-center gap-1"
                            >
                                <span className="font-bold text-xs text-rose-800">{b.title}</span>
                                <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-full text-rose-600 border border-rose-200">{b.points}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="سبب آخر..." 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-rose-500 pr-10"
                            value={customNegativeReason}
                            onChange={(e) => setCustomNegativeReason(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && customNegativeReason.trim()) {
                                    confirmNegativeBehavior(customNegativeReason, -1);
                                }
                            }}
                        />
                        <button 
                            onClick={() => { if(customNegativeReason.trim()) confirmNegativeBehavior(customNegativeReason, -1); }}
                            className="absolute left-1 top-1 bottom-1 px-3 bg-rose-500 text-white rounded-lg text-xs font-bold"
                        >
                            <Plus size={16}/>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Winner (Random Pick) */}
            <Modal isOpen={!!randomWinner} onClose={() => setRandomWinner(null)} className="max-w-xs rounded-[3rem] overflow-visible">
                <div className="text-center relative pt-8">
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-28 h-28 bg-white rounded-full p-2 shadow-2xl border-4 border-amber-400">
                        <img 
                            src={randomWinner?.avatar || (randomWinner?.gender === 'female' ? '/student-girl.png' : '/student-boy.jpg')} 
                            className="w-full h-full rounded-full object-cover" 
                            onError={(e) => {e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerHTML='<div class="w-full h-full flex items-center justify-center text-4xl">🎉</div>'}}
                        />
                    </div>
                    <h2 className="text-2xl font-black text-amber-500 mb-2 mt-4">مبروك!</h2>
                    <h3 className="text-xl font-black text-slate-800 mb-4">{randomWinner?.name}</h3>
                    <div className="flex gap-2 justify-center">
                        <button onClick={() => { if(randomWinner) confirmPositiveBehavior('اختيار عشوائي', 1); setRandomWinner(null); }} className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 active:scale-95">منح نقطة</button>
                        <button onClick={() => setRandomWinner(null)} className="bg-slate-100 text-slate-500 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-200">إغلاق</button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Timer */}
            <Modal isOpen={showTimerModal} onClose={() => setShowTimerModal(false)} className="max-w-xs rounded-[2.5rem]">
                <div className="text-center">
                    <h3 className="font-black text-lg text-slate-800 mb-6">المؤقت</h3>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[1, 2, 3, 5, 10, 15].map(m => (
                            <button key={m} onClick={() => startTimer(m)} className="py-3 bg-slate-50 rounded-xl font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition-colors">
                                {m} د
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input 
                            type="number" 
                            value={timerInput} 
                            onChange={(e) => setTimerInput(e.target.value)} 
                            className="w-full bg-white rounded-lg py-2 text-center font-black text-lg outline-none"
                            placeholder="دقيقة"
                        />
                        <button onClick={() => startTimer(Number(timerInput))} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">بدء</button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Manual Add Student */}
            <Modal isOpen={showManualAddModal} onClose={() => setShowManualAddModal(false)} className="max-w-sm rounded-[2rem]">
                <h3 className="font-black text-lg text-slate-900 mb-4">إضافة طالب جديد</h3>
                <div className="space-y-3">
                    <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="اسم الطالب" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" />
                    <input value={newStudentPhone} onChange={e => setNewStudentPhone(e.target.value)} placeholder="رقم ولي الأمر" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" dir="ltr" />
                    
                    <div className="flex bg-slate-50 p-1 rounded-xl">
                        <button onClick={() => setNewStudentGender('male')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newStudentGender === 'male' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>ولد</button>
                        <button onClick={() => setNewStudentGender('female')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newStudentGender === 'female' ? 'bg-white shadow text-pink-600' : 'text-slate-400'}`}>بنت</button>
                    </div>

                    <select value={newStudentClass} onChange={e => setNewStudentClass(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500">
                        {safeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    
                    <button onClick={handleManualAddSubmit} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg mt-2">إضافة</button>
                </div>
            </Modal>

            {/* Modal: Excel Import */}
            <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} className="max-w-md rounded-[2rem]">
                <ExcelImport 
                    existingClasses={safeClasses} 
                    onImport={(newStudents) => { onBatchAddStudents(newStudents); setShowImportModal(false); }} 
                    onAddClass={onAddClass}
                />
            </Modal>

            {/* Modal: Manage Classes */}
            <Modal isOpen={showManageClasses} onClose={() => setShowManageClasses(false)} className="max-w-sm rounded-[2rem]">
                <h3 className="font-black text-lg text-slate-900 mb-4">إدارة الفصول</h3>
                
                <div className="space-y-2 mb-6 max-h-40 overflow-y-auto custom-scrollbar">
                    {safeClasses.map(cls => (
                        <div key={cls} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="font-bold text-sm text-slate-700">{cls}</span>
                            <button onClick={() => { if(confirm('حذف الفصل؟ سيتم حذف طلابه من القائمة.')) onDeleteClass?.(cls); }} className="text-rose-500 bg-rose-50 p-1.5 rounded-lg hover:bg-rose-100"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-400 mb-2">إضافة فصل جديد</p>
                    <div className="flex gap-2">
                        <input value={newClassInput} onChange={e => setNewClassInput(e.target.value)} placeholder="اسم الفصل (مثال: 5/1)" className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" />
                        <button onClick={handleAddClassSubmit} className="bg-indigo-600 text-white px-4 rounded-xl font-bold shadow-md"><Plus size={20}/></button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Edit Student */}
            <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} className="max-w-sm rounded-[2rem]">
                {editingStudent && (
                    <div className="space-y-4">
                        <h3 className="font-black text-lg text-slate-900 mb-2">تعديل بيانات الطالب</h3>
                        
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden relative">
                                <img 
                                    src={editingStudent.avatar || (editingStudent.gender === 'female' ? '/student-girl.png' : '/student-boy.jpg')} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => { e.currentTarget.style.display='none'; }}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400">الاسم</label>
                                <input value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400">رقم ولي الأمر</label>
                                <input value={editingStudent.parentPhone || ''} onChange={e => setEditingStudent({...editingStudent, parentPhone: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" dir="ltr" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400">الفصل</label>
                                <select value={editingStudent.classes[0]} onChange={e => setEditingStudent({...editingStudent, classes: [e.target.value]})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500">
                                    {safeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            
                            <div className="flex bg-slate-50 p-1 rounded-xl mt-2">
                                <button onClick={() => setEditingStudent({...editingStudent, gender: 'male'})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editingStudent.gender === 'male' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>ولد</button>
                                <button onClick={() => setEditingStudent({...editingStudent, gender: 'female'})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editingStudent.gender === 'female' ? 'bg-white shadow text-pink-600' : 'text-slate-400'}`}>بنت</button>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                            <button onClick={() => { onDeleteStudent(editingStudent.id); setEditingStudent(null); }} className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors">حذف الطالب</button>
                            <button onClick={handleEditStudentSave} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-indigo-700 transition-colors">حفظ التعديلات</button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default StudentList;
