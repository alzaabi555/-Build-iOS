import React, { useState, useEffect, useMemo } from 'react';
import { Student, BehaviorType } from '../types';
import { 
    Search, ThumbsUp, ThumbsDown, Edit2, Trash2, LayoutGrid, UserPlus, 
    FileSpreadsheet, MoreVertical, Settings, Users, AlertCircle, X, 
    Dices, Timer, Play, Pause, RotateCcw, CheckCircle2, MessageCircle, Plus,
    Sparkles, Phone, Send, Star, Loader2, Mail, RefreshCcw 
} from 'lucide-react';
import ExcelImport from './ExcelImport';
import { useApp } from '../context/AppContext';
import { StudentAvatar } from './StudentAvatar';
import { Drawer as DrawerSheet } from './ui/Drawer';
import positiveSound from '../assets/positive.mp3';
import negativeSound from '../assets/negative.mp3';
import tadaSound from '../assets/tada.mp3';
import alarmSound from '../assets/alarm.mp3';


interface StudentListProps {
    students: Student[];
    classes: string[];
    onAddClass: (name: string) => void;
    onAddStudentManually: (name: string, className: string, phone?: string, avatar?: string, gender?: 'male'|'female', civilID?: string) => void;
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
}

const NEGATIVE_BEHAVIORS = [
    { id: '1', original: 'إزعاج في الحصة', transKey: 'behNeg1', points: -2 },
    { id: '2', original: 'عدم حل الواجب', transKey: 'behNeg2', points: -2 },
    { id: '3', original: 'نسيان الكتاب والدفتر', transKey: 'behNeg3', points: -1 },
    { id: '4', original: 'تأخر عن الحصة', transKey: 'behNeg4', points: -1 },
    { id: '5', original: 'سلوك غير لائق', transKey: 'behNeg5', points: -3 },
    { id: '6', original: 'النوم في الفصل', transKey: 'behNeg6', points: -2 },
];

const POSITIVE_BEHAVIORS = [
    { id: 'p1', original: 'إجابة متميزة', transKey: 'behPos1', points: 2 },
    { id: 'p2', original: 'إجابة صحيحة', transKey: 'behPos2', points: 1 },
    { id: 'p3', original: 'واجب مميز', transKey: 'behPos3', points: 2 },
    { id: 'p4', original: 'مساعدة الزملاء', transKey: 'behPos4', points: 2 },
    { id: 'p5', original: 'مشاركة صفية متميزة', transKey: 'behPos5', points: 5 },
    { id: 'p6', original: 'إبداع وتميز', transKey: 'behPos6', points: 3 },
];

const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzKPPsQsM_dIttcYSxRLs6LQuvXhT6Qia5TwJ1Tw4ObQ-eZFZeJhV6epXXjxA9_SwWk/exec"; 

const StudentList: React.FC<StudentListProps> = ({ 
    students = [], 
    classes = [], 
    onAddClass, 
    onAddStudentManually, 
    onBatchAddStudents, 
    onUpdateStudent, 
    onDeleteStudent, 
    currentSemester, 
    onDeleteClass 
}) => {
    const { defaultStudentGender, setDefaultStudentGender, setStudents, teacherInfo, t, dir, language } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedGrade, setSelectedGrade] = useState<string>(() => sessionStorage.getItem('rased_grade') || 'all');
    const [selectedClass, setSelectedClass] = useState<string>(() => sessionStorage.getItem('rased_class') || 'all');

    const isRamadan = true;

    useEffect(() => {
        sessionStorage.setItem('rased_grade', selectedGrade);
        sessionStorage.setItem('rased_class', selectedClass);
    }, [selectedGrade, selectedClass]);
    
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
    const [newStudentCivilID, setNewStudentCivilID] = useState(''); 

    const [showNegativeModal, setShowNegativeModal] = useState(false);
    const [showPositiveModal, setShowPositiveModal] = useState(false);
    const [selectedStudentForBehavior, setSelectedStudentForBehavior] = useState<Student | null>(null);

    const [customPositiveReason, setCustomPositiveReason] = useState('');
    const [customNegativeReason, setCustomNegativeReason] = useState('');

    const [randomWinner, setRandomWinner] = useState<Student | null>(null);
    const [pickedStudentIds, setPickedStudentIds] = useState<string[]>([]);

    const [showTimerModal, setShowTimerModal] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerInput, setTimerInput] = useState('5');

    const [messages, setMessages] = useState<any[]>([]);
    const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
    const [isFetchingMsgs, setIsFetchingMsgs] = useState(false);

    const [readMessagesCount, setReadMessagesCount] = useState<number>(() => {
        return parseInt(localStorage.getItem('rased_read_messages_count') || '0', 10);
    });

    useEffect(() => {
        if (isMessagesModalOpen && messages.length > 0) {
            setReadMessagesCount(messages.length);
            localStorage.setItem('rased_read_messages_count', messages.length.toString());
        }
    }, [isMessagesModalOpen, messages.length]);

    const fetchParentMessages = async () => {
        if (!teacherInfo?.school || !teacherInfo?.subject) return;
        setIsFetchingMsgs(true);
        try {
            const url = `${GOOGLE_WEB_APP_URL}?action=getMessages&school=${encodeURIComponent(teacherInfo.school)}&subject=${encodeURIComponent(teacherInfo.subject)}`;
            const response = await fetch(url);
            const result = await response.json();
            if (result.status === 'success') {
                setMessages(result.messages || []);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setIsFetchingMsgs(false);
        }
    };

    const handleReplyToMessage = (msg: any) => {
        const student = students.find(s => 
            String(s.parentCode || '').trim() === String(msg.civilID || '').trim()
        );
        
        if (!student) {
            alert(t('alertNoStudentFoundWithCivilId'));
            return;
        }
        if (!student.parentPhone) {
            alert(`${t('alertNoParentPhone')} ${student.name}`);
            return;
        }

        const truncatedMsg = msg.message.length > 60 ? msg.message.substring(0, 60) + '...' : msg.message;
        const replyText = `${t('whatsappReplyIntro')} "${student.name}"${t('whatsappReplyRegarding')} "${truncatedMsg}"${t('whatsappReplyInform')}`;
        const encodedText = encodeURIComponent(replyText);

        let cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
        if (cleanPhone.length === 8) cleanPhone = '968' + cleanPhone;
        else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) cleanPhone = '968' + cleanPhone.substring(1);

        if ((window as any).electron) { 
            (window as any).electron.openExternal(`whatsapp://send?phone=${cleanPhone}&text=${encodedText}`); 
        } else { 
            const universalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`; 
            window.open(universalUrl, '_blank'); 
        }
    };

    useEffect(() => {
        fetchParentMessages();
    }, [teacherInfo?.school, teacherInfo?.subject]);

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
            setTimeout(() => alert(t('alertTimerEnded')), 500);
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

    const calculateTotalPoints = (student: Student) => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const monthlyPoints = (student.behaviors || [])
            .filter(b => {
                const d = new Date(b.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((acc, b) => acc + b.points, 0); 
        return monthlyPoints;
    };

    const handleRandomPick = () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const now = new Date();

        // 1. تصفية الطلاب المتاحين (استبعاد الغائبين + أصحاب السلوك السلبي اليوم)
        const eligibleStudents = filteredStudents.filter(student => {
            // استبعاد الغائب أو الهارب
            const attendanceRecord = student.attendance?.find(a => a.date === todayStr);
            const isAbsentOrTruant = attendanceRecord?.status === 'absent' || attendanceRecord?.status === 'truant';
            if (isAbsentOrTruant) return false;

            // استبعاد من لديه سلوك سلبي في نفس اليوم
            const hasNegativeToday = (student.behaviors || []).some(b => {
                const bDate = new Date(b.date);
                return b.type === 'negative' && 
                       bDate.getDate() === now.getDate() &&
                       bDate.getMonth() === now.getMonth() &&
                       bDate.getFullYear() === now.getFullYear();
            });
            if (hasNegativeToday) return false;

            return true; // الطالب حاضر وسلوكه نظيف اليوم!
        });

        // إذا لم يكن هناك أي طالب متاح (الكل إما غائب أو معاقب)
        if (eligibleStudents.length === 0) {
            alert(t('alertNoPresentStudentsForDraw') || 'لا يوجد طلاب متاحين للقرعة (الجميع غائب أو لديه سلوك سلبي)');
            return;
        }

        // 2. تصفية الطلاب الذين لم يسبق اختيارهم في هذه الجولة
        let candidates = eligibleStudents.filter(s => !pickedStudentIds.includes(s.id));

        // 3. إعادة الضبط الذكي في حال تم سحب جميع الطلاب المتاحين
        if (candidates.length === 0) {
            if (confirm(t('alertAllPresentSelected') || 'تم سحب جميع الطلاب المتاحين. هل تريد تصفير القرعة والبدء من جديد؟')) {
                setPickedStudentIds([]); // تصفير الذاكرة
                candidates = eligibleStudents; // إعادة إدخال جميع الطلاب المتاحين للقرعة من جديد
            } else {
                return; // إلغاء العملية إذا لم يرد المعلم التصفير
            }
        }

        // 4. السحب العشوائي العادل من القائمة النقية
        const randomIndex = Math.floor(Math.random() * candidates.length);
        const winner = candidates[randomIndex];

        // تسجيل الطالب كـ "تم اختياره" حتى لا يتكرر
        setPickedStudentIds(prev => [...prev, winner.id]);
        setRandomWinner(winner);
        playSound('positive'); 
        setShowMenu(false);
    };

    const handleBehavior = (student: Student, type: BehaviorType) => {
        setSelectedStudentForBehavior(student);
        setCustomPositiveReason('');
        setCustomNegativeReason('');
        
        if (type === 'positive') {
            setShowPositiveModal(true);
        } else {
            setShowNegativeModal(true);
        }
    };

    const handleSendSmartReport = (student: Student) => {
        if (!student.parentPhone) {
            alert(t('alertNoParentPhone'));
            return;
        }

        const currentGrades = (student.grades || []).filter(g => (g.semester || '1') === currentSemester);
        const totalScore = currentGrades.reduce((acc, curr) => acc + (curr.score || 0), 0);

        const positiveBehaviors = (student.behaviors || []).filter(b => b.type === 'positive');
        
        const isFemale = student.gender === 'female';
        const topBehavior = positiveBehaviors.length > 0 
            ? positiveBehaviors[0].description 
            : (isFemale ? t('whatsappSmartGeneralBehaviorFemale') : t('whatsappSmartGeneralBehaviorMale'));

        const childTitle = isFemale ? t('whatsappSmartIntroFemale') : t('whatsappSmartIntroMale');
        const scoreText = isFemale ? t('whatsappSmartScoreFemale') : t('whatsappSmartScoreMale');
        const behaviorText = isFemale ? t('whatsappSmartBehaviorFemale') : t('whatsappSmartBehaviorMale');
        const teacherTitle = teacherInfo?.gender === 'female' ? t('whatsappSmartTeacherFemale') : t('whatsappSmartTeacherMale');

        const message = `${t('whatsappSmartMsg1')} ${childTitle} (${student.name}) ${t('whatsappSmartMsg2')} ${childTitle} ${scoreText} (${totalScore}) ${t('whatsappSmartMsg3')} ${teacherInfo?.subject || '...'}، ${behaviorText}: "${topBehavior}"${t('whatsappSmartMsg4')} ${teacherTitle}: ${teacherInfo?.name || ''}`;

        const msg = encodeURIComponent(message);
        let cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
        if (cleanPhone.length === 8) cleanPhone = '968' + cleanPhone;
        else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) cleanPhone = '968' + cleanPhone.substring(1);

        if ((window as any).electron) { 
            (window as any).electron.openExternal(`whatsapp://send?phone=${cleanPhone}&text=${msg}`); 
        } else { 
            const universalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`; 
            window.open(universalUrl, '_blank'); 
        }
    };

    const handleSendNegativeReport = async (student: Student) => {
        if (!student.parentPhone) {
            alert(t('alertNoParentPhone'));
            return;
        }

        const negativeBehaviors = (student.behaviors || []).filter(b => b.type === 'negative');

        if (negativeBehaviors.length === 0) {
            alert(t('alertStudentIsExcellent'));
            return;
        }

        let message = `${t('whatsappNegMsg1')}${student.name}${t('whatsappNegMsg2')}`;

        negativeBehaviors.slice(0, 5).forEach(b => {
            const dateObj = new Date(b.date);
            const date = dateObj.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
            const time = dateObj.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
            
            message += `🔴 *${b.description}*\n📅 ${date} - ⏰ ${time}\n─────────────────\n`;
        });

        message += t('whatsappNegMsg3');
        
        const msg = encodeURIComponent(message);
        let cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
        
        if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
        if (cleanPhone.length === 8) cleanPhone = '968' + cleanPhone;
        else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) cleanPhone = '968' + cleanPhone.substring(1);

        if ((window as any).electron) { 
            (window as any).electron.openExternal(`whatsapp://send?phone=${cleanPhone}&text=${msg}`); 
        } else { 
            const universalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`; 
            window.open(universalUrl, '_blank'); 
        }
    };

    const confirmPositiveBehavior = (originalTitle: string, points: number) => {
        if (!selectedStudentForBehavior) return;
        playSound('positive');
        const newBehavior = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            type: 'positive' as const,
            description: originalTitle,
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

    const confirmNegativeBehavior = (originalTitle: string, points: number) => {
        if (!selectedStudentForBehavior) return;
        playSound('negative');
        const newBehavior = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            type: 'negative' as const,
            description: originalTitle,
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

    const handleQuietAndDiscipline = () => {
        if (!confirm(t('alertConfirmAddDiscipline'))) return;

        const todayStr = new Date().toLocaleDateString('en-CA');
        const now = new Date();

        const eligibleStudents = filteredStudents.filter(student => {
            const attendance = student.attendance.find(a => a.date === todayStr);
            const isAbsent = attendance?.status === 'absent' || attendance?.status === 'truant';
            if (isAbsent) return false;

            const hasNegativeToday = (student.behaviors || []).some(b => {
                const bDate = new Date(b.date);
                return b.type === 'negative' && 
                       bDate.getDate() === now.getDate() &&
                       bDate.getMonth() === now.getMonth() &&
                       bDate.getFullYear() === now.getFullYear();
            });
            if (hasNegativeToday) return false;

            return true;
        });

        if (eligibleStudents.length === 0) {
            alert(t('alertNoEligibleStudents'));
            return;
        }

        const updatedStudents = students.map(student => {
            if (eligibleStudents.find(es => es.id === student.id)) {
                const newBehavior = {
                    id: Math.random().toString(36).substr(2, 9),
                    date: new Date().toISOString(),
                    type: 'positive' as const,
                    description: 'هدوء وانضباط',
                    points: 2,
                    semester: currentSemester
                };
                return { ...student, behaviors: [newBehavior, ...(student.behaviors || [])] };
            }
            return student;
        });

        setStudents(updatedStudents);
        playSound('positive');
        alert(`${t('alertDisciplineAdded1')} ${eligibleStudents.length} ${t('alertDisciplineAdded2')}`);
        setShowMenu(false);
    };

    const handleManualAddSubmit = () => {
        if (newStudentName && newStudentClass && newStudentCivilID) {
            onAddStudentManually(newStudentName, newStudentClass, newStudentPhone, undefined, newStudentGender, newStudentCivilID);
            setNewStudentName('');
            setNewStudentPhone('');
            setNewStudentCivilID('');
            setShowManualAddModal(false);
        } else {
            alert(t('alertEnterStudentInfo'));
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
            if (!editingStudent.parentCode || editingStudent.parentCode.trim() === '') {
                alert(t('alertCivilIdRequiredForCloud'));
                return;
            }
            onUpdateStudent(editingStudent);
            setEditingStudent(null);
        }
    };

    const handleBatchGenderUpdate = (gender: 'male' | 'female') => {
        if (confirm(t('alertConfirmGenderChange'))) {
            setDefaultStudentGender(gender);
            setStudents(prev => prev.map(s => ({ ...s, gender: gender, avatar: undefined })));
        }
    };

    return (
   <div className={`flex flex-col h-full space-y-6 pb-24 md:pb-8 overflow-hidden relative text-textPrimary ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
            
<header 
    className={`shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent text-textPrimary`}
    style={{ WebkitAppRegion: 'drag' } as any}
>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-bgSoft p-2 rounded-xl border border-borderColor transition-all duration-300">
                        <Users className="w-5 h-5 text-textPrimary" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-wide">{t('studentsTitle')}</h1>
                        <p className={`text-[10px] font-bold opacity-80 text-textSecondary`}>{safeStudents.length} {t('registeredStudents')}</p>
                    </div>
                </div>

                <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    
                    {/* 📥 صندوق الوارد (رسائل الآباء) */}
                    <button 
                        onClick={() => { setIsMessagesModalOpen(true); fetchParentMessages(); }} 
                        className={`relative p-2.5 rounded-xl border active:scale-95 transition-all flex items-center gap-2 ${isRamadan ? 'bg-purple-600/80 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-purple-600 border-purple-500 text-white shadow-lg hover:bg-purple-700'}`}
                        title={t('parentsInboxTitle')}
                    >
                        <Mail className="w-5 h-5" />
                        <span className="hidden md:inline text-xs font-black">{t('inboxInbox')}</span>
                        {messages.length > readMessagesCount && (
                            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-bounce border border-white">
                                {messages.length - readMessagesCount}
                            </span>
                        )}
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => setShowTimerModal(true)} 
                            className={`p-2.5 rounded-xl border active:scale-95 transition-all flex items-center gap-2 ${timerSeconds > 0 ? (isRamadan ? 'bg-amber-500/80 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse' : 'bg-amber-500 border-amber-400 text-white shadow-lg animate-pulse') : 'bg-bgSoft border-borderColor text-textPrimary hover:bg-bgCard'}`}
                            title={t('timerTitle')}
                        >
                            <Timer className="w-5 h-5" />
                            {timerSeconds > 0 && (
                                <span className="text-xs font-black min-w-[30px]">{formatTime(timerSeconds)}</span>
                            )}
                        </button>
                    </div>

                    <button 
                        onClick={handleRandomPick} 
                        className={`p-2.5 rounded-xl border active:scale-95 transition-all bg-bgSoft border-borderColor text-textPrimary hover:bg-bgCard`}
                        title={t('randomDraw')}
                    >
                        <Dices className="w-5 h-5" />
                    </button>

                    <div className="relative z-[9999]">
                        <button onClick={() => setShowMenu(!showMenu)} className={`p-2.5 rounded-xl border active:scale-95 transition-all ${showMenu ? 'bg-bgCard border-borderColor text-textPrimary' : 'bg-bgSoft border-borderColor text-textPrimary hover:bg-bgCard'}`}>
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                            <div className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-full mt-2 w-56 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in zoom-in-95 origin-top-left bg-bgCard border-borderColor text-textPrimary`}>
                                <div className="p-1">
                                        <button onClick={handleQuietAndDiscipline} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold border-b hover:bg-bgSoft border-borderColor text-textPrimary`}>
                                            <Sparkles className={`w-4 h-4 text-purple-500`} /> {t('rewardDiscipline')}
                                        </button>
                                        <button onClick={() => { setShowManualAddModal(true); setShowMenu(false); }} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold hover:bg-bgSoft text-textPrimary`}>
                                            <UserPlus className={`w-4 h-4 text-primary`} /> {t('addStudentManually')}
                                        </button>
                                        <button onClick={() => { setShowImportModal(true); setShowMenu(false); }} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold hover:bg-bgSoft text-textPrimary`}>
                                            <FileSpreadsheet className={`w-4 h-4 text-success`} /> {t('importFromExcelMenu')}
                                        </button>
                                        <div className={`my-1 border-t border-borderColor`}></div>
                                        <button onClick={() => { setShowAddClassModal(true); setShowMenu(false); }} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold hover:bg-bgSoft text-textPrimary`}>
                                            <LayoutGrid className={`w-4 h-4 text-warning`} /> {t('addNewClassMenu')}
                                        </button>
                                        <button onClick={() => { setShowManageClasses(true); setShowMenu(false); }} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold hover:bg-bgSoft text-textPrimary`}>
                                            <Settings className={`w-4 h-4 text-textSecondary`} /> {t('manageClassesMenu')}
                                        </button>
                                </div>
                            </div>
                        </>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-3 relative z-10" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <div className="relative">
                    <Search className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} top-3.5 w-5 h-5 text-textSecondary`} />
                    <input 
                        type="text" 
                        placeholder={t('searchStudent')} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full border rounded-2xl py-3 ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm font-bold outline-none transition-all bg-bgCard border-borderColor text-textPrimary placeholder:text-textSecondary focus:bg-bgSoft`}
                    />
                </div>
                
               {/* ================= شريط اختيار الفصول (الكبسولة الزجاجية الفخمة) ================= */}
                <div className="w-full overflow-x-auto no-scrollbar pb-2 mt-2">
                    <div className={`inline-flex items-center p-1.5 rounded-full border backdrop-blur-md transition-all bg-bgSoft border-borderColor`}>
                        
                        {/* زر (الكل) */}
                        <button 
                            onClick={() => { setSelectedGrade('all'); setSelectedClass('all'); }} 
                            className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${selectedGrade === 'all' && selectedClass === 'all' ? 'bg-bgCard text-primary shadow-sm' : 'bg-transparent text-textSecondary hover:text-textPrimary'}`}
                        >
                            {t('all')}
                        </button>

                        {/* أزرار الصفوف (Grades) */}
                        {availableGrades.map(g => (
                            <React.Fragment key={`grade-${g}`}>
                                <div className={`w-[1px] h-5 mx-1.5 rounded-full shrink-0 bg-borderColor`} />
                                <button 
                                    onClick={() => { setSelectedGrade(g); setSelectedClass('all'); }} 
                                    className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${selectedGrade === g && selectedClass === 'all' ? 'bg-bgCard text-primary shadow-sm' : 'bg-transparent text-textSecondary hover:text-textPrimary'}`}
                                >
                                    {t('gradePrefix')} {g}
                                </button>
                            </React.Fragment>
                        ))}

                        {/* أزرار الفصول (Classes) */}
                        {safeClasses.filter(c => selectedGrade === 'all' || c.startsWith(selectedGrade)).map(c => (
                            <React.Fragment key={`class-${c}`}>
                                <div className={`w-[1px] h-5 mx-1.5 rounded-full shrink-0 bg-borderColor`} />
                                <button 
                                    onClick={() => setSelectedClass(c)} 
                                    className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${selectedClass === c ? 'bg-bgCard text-primary shadow-sm' : 'bg-transparent text-textSecondary hover:text-textPrimary'}`}
                                >
                                    {c}
                                </button>
                            </React.Fragment>
                        ))}

                   </div>
                </div>
            </div> 
        </header>

        {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-28 custom-scrollbar relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                    const totalPoints = calculateTotalPoints(student);
                    return (
                    <div key={student.id} className={`glass-panel border-borderColor rounded-[1.5rem] flex flex-col items-center overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
                        <div className="p-4 flex flex-col items-center w-full relative">
                            
                            <div className="relative mb-3">
                                <StudentAvatar 
                                    gender={student.gender}
                                    className={`w-16 h-16 ${isRamadan ? 'opacity-90' : ''}`}
                                />
                                {totalPoints !== 0 && (
                                   <div className={`absolute -top-3 ${dir === 'rtl' ? '-right-5' : '-left-5'} z-10 flex items-center justify-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm border-2 ${isRamadan ? 'border-amber-500/30 bg-amber-500/20 text-amber-300' : 'border-white bg-amber-100 text-amber-600'}`}>
                                        <Star size={10} className={isRamadan ? "fill-amber-400 text-amber-400" : "fill-amber-500 text-amber-500"} />
                                        {totalPoints}
                                    </div>
                                )}
                            </div>

                            <h3 className={`font-black text-sm text-center line-clamp-1 w-full text-textPrimary`}>{student.name}</h3>
                            <div className="flex gap-1 mt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-bgSoft text-textSecondary`}>{student.classes && student.classes.length > 0 ? student.classes[0] : t('unspecified')}</span>
                            </div>
                        </div>

                        <div className={`w-full h-px bg-borderColor`}></div>

                        {/* أزرار الإجراءات */}
                        <div className={`flex w-full divide-x ${dir === 'rtl' ? 'divide-x-reverse' : ''} divide-borderColor`}>
                            
                            <button onClick={() => handleBehavior(student, 'positive')} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors group hover:bg-emerald-500/10 active:bg-emerald-500/20`} title={t('positiveReinforcement')}>
                                <ThumbsUp className={`w-4 h-4 group-hover:scale-110 transition-transform text-emerald-500`} />
                            </button>
                            
                            <button onClick={() => handleBehavior(student, 'negative')} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors group hover:bg-rose-500/10 active:bg-rose-500/20`} title={t('behavioralAlert')}>
                                <ThumbsDown className={`w-4 h-4 group-hover:scale-110 transition-transform text-rose-500`} />
                            </button>

                            <button onClick={() => handleSendSmartReport(student)} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors group hover:bg-blue-500/10 active:bg-blue-500/20`} title="تقرير الدرجات والتميز (واتساب)">
                                <MessageCircle className={`w-4 h-4 group-hover:scale-110 transition-transform text-blue-500`} />
                            </button>

                            <button onClick={() => handleSendNegativeReport(student)} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors group hover:bg-amber-500/10 active:bg-amber-500/20`} title="تقرير سلوكي إنذار (واتساب)">
                                <Send className={`w-4 h-4 group-hover:scale-110 transition-transform text-amber-500`} />
                            </button>
                            
                            <button onClick={() => setEditingStudent(student)} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors group hover:bg-bgSoft active:bg-bgSoft/80`} title={t('editStudentData')}>
                                <Edit2 className={`w-4 h-4 transition-colors text-textSecondary group-hover:text-primary`} />
                            </button>
                            
                        </div>
                    </div>
                )}) : (
                    <div className={`flex flex-col items-center justify-center py-20 col-span-full text-center opacity-70`}>
                        <UserPlus className={`w-16 h-16 mb-4 text-textSecondary/50`} />
                        <p className={`text-sm font-bold text-textSecondary`}>{t('noMatchingStudents')}</p>
                        {safeClasses.length === 0 && <p className={`text-xs mt-2 font-bold cursor-pointer text-primary`} onClick={() => setShowAddClassModal(true)}>{t('startByAddingClass')}</p>}
                    </div>
                )}
            </div>
        </div>

        {/* ================= النوافذ المنزلقة الجديدة (DrawerSheets) ================= */}

        {/* 📥 1. نافذة صندوق الوارد للرسائل */}
        <DrawerSheet isOpen={isMessagesModalOpen} onClose={() => setIsMessagesModalOpen(false)} isRamadan={isRamadan} dir={dir}>
            <div className="flex flex-col h-full w-full">
                <div className={`flex justify-between items-center mb-6 border-b pb-4 shrink-0 border-borderColor`}>
                    <h3 className="font-black text-xl flex items-center gap-2 text-primary">
                        <Mail className="w-6 h-6" />
                        {t('parentsInboxTitle')}
                    </h3>
                    <button onClick={fetchParentMessages} className="p-2 bg-bgSoft text-textSecondary rounded-full hover:bg-bgCard transition-colors" title={t('refreshMessages')}>
                        <RefreshCcw className={`w-5 h-5 ${isFetchingMsgs ? 'animate-spin text-primary' : ''}`} />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                    {isFetchingMsgs && messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 h-full">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
                            <p className="bg-transparent font-bold text-textSecondary">{t('fetchingMessages')}</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-10 h-full flex flex-col justify-center">
                            <Mail className="w-16 h-16 text-textSecondary/30 mx-auto mb-4" />
                            <p className="bg-transparent font-bold text-textSecondary">{t('noNewMessages')}</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => (
                            <div key={index} className="p-5 border border-borderColor rounded-2xl bg-transparent relative overflow-hidden group">
                                <div className={`absolute top-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-2 h-full bg-primary`}></div>
                                <div className={`flex justify-between items-start mb-3 ${dir === 'rtl' ? 'pl-2' : 'pr-2'}`}>
                                    <div>
                                        <h4 className="font-black text-textPrimary text-lg">{msg.studentName}</h4>
                                        <p className="text-[10px] font-bold text-textSecondary font-mono mt-0.5">{t('civilIdPrefix')} {msg.civilID}</p>
                                    </div>
                                    <span className="text-[10px] font-bold bg-bgCard text-textSecondary px-2 py-1 rounded-lg border border-borderColor shadow-sm">
                                        {new Date(msg.date).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </div>
                                <div className={`glass-panel p-4 rounded-xl border border-borderColor text-sm font-bold text-textPrimary leading-relaxed shadow-sm ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                                    {msg.message}
                                </div>
                                {/* 💬 زر الرد عبر الواتساب */}
                                <div className="mt-3 flex justify-end">
                                    <button 
                                        onClick={() => handleReplyToMessage(msg)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black shadow-sm active:scale-95 transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20`}
                                    >
                                        <MessageCircle size={14} />
                                        {t('replyViaWhatsapp')}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </DrawerSheet>

        {/* ➕ 2. الإضافة اليدوية */}
        <DrawerSheet isOpen={showManualAddModal} onClose={() => setShowManualAddModal(false)} isRamadan={isRamadan} dir={dir} mode="side">
             <div className="flex flex-col h-full w-full text-center pb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border shrink-0 bg-primary/10 text-primary border-primary/20`}>
                    <UserPlus className="w-8 h-8" />
                </div>
                <h3 className="font-black text-xl mb-6 shrink-0">{t('addStudentTitle')}</h3>
                <div className="space-y-3 overflow-y-auto custom-scrollbar px-1 pb-4">
                    <input type="text" placeholder={t('studentNamePlaceholder')} value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`} />
                    <select value={newStudentClass} onChange={(e) => setNewStudentClass(e.target.value)} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`}>
                        <option value="" disabled className="bg-bgCard">{t('selectClassPlaceholder')}</option>
                        {safeClasses.map(c => <option key={c} value={c} className="bg-bgCard">{c}</option>)}
                    </select>
                    <input type="number" placeholder={t('civilIdPlaceholderMandatory')} value={newStudentCivilID} onChange={(e) => setNewStudentCivilID(e.target.value)} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-amber-500/10 border-amber-500/30 focus:border-amber-500 text-textPrimary`} />
                    <input type="tel" placeholder={t('parentPhoneOptional')} value={newStudentPhone} onChange={(e) => setNewStudentPhone(e.target.value)} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`} />
                     <div className="flex gap-2">
                        <button onClick={() => setNewStudentGender('male')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${newStudentGender === 'male' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-transparent border-borderColor text-textSecondary'}`}>{t('maleStudent')}</button>
                        <button onClick={() => setNewStudentGender('female')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${newStudentGender === 'female' ? 'bg-pink-500/10 border-pink-500/30 text-pink-500' : 'bg-transparent border-borderColor text-textSecondary'}`}>{t('femaleStudent')}</button>
                    </div>
                </div>
                <div className="mt-auto pt-2 shrink-0">
                    <button onClick={handleManualAddSubmit} disabled={!newStudentName || !newStudentClass || !newStudentCivilID} className={`w-full py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 bg-primary text-white hover:bg-primary/80`}>{t('saveStudentBtn')}</button>
                </div>
            </div>
        </DrawerSheet>

        {/* 📊 3. استيراد إكسل */}
        <DrawerSheet isOpen={showImportModal} onClose={() => setShowImportModal(false)} isRamadan={isRamadan} dir={dir} mode="full">
            <div className="flex-1 w-full h-full flex flex-col">
                <ExcelImport 
                    existingClasses={safeClasses} 
                    onImport={(importedStudents) => {
                        const normalizeArabicName = (name: string) => {
                            if (!name) return '';
                            return name
                                .replace(/[أإآءؤئ]/g, 'ا')
                                .replace(/ة/g, 'ه')
                                .replace(/ى/g, 'ي')
                                .replace(/عبد /g, 'عبد')
                                .replace(/\s+/g, '')
                                .trim();
                        };
                        setStudents(prevStudents => {
                            const updatedStudents = [...prevStudents];
                            importedStudents.forEach(imported => {
                                const normalizedImportedName = normalizeArabicName(imported.name);
                                let existingIndex = -1;
                                if (imported.parentCode && imported.parentCode.trim() !== '') {
                                    existingIndex = updatedStudents.findIndex(s => s.parentCode === imported.parentCode);
                                }
                                if (existingIndex === -1) {
                                    existingIndex = updatedStudents.findIndex(s => normalizeArabicName(s.name) === normalizedImportedName);
                                }
                                if (existingIndex >= 0) {
                                    updatedStudents[existingIndex] = {
                                        ...updatedStudents[existingIndex],
                                        parentCode: (imported.parentCode && imported.parentCode.trim() !== '') ? imported.parentCode : updatedStudents[existingIndex].parentCode,
                                        parentPhone: (imported.parentPhone && imported.parentPhone.trim() !== '') ? imported.parentPhone : updatedStudents[existingIndex].parentPhone,
                                        gender: imported.gender || updatedStudents[existingIndex].gender
                                    };
                                } else {
                                    updatedStudents.push(imported);
                                }
                            });
                            return updatedStudents;
                        });
                        setShowImportModal(false); 
                    }} 
                    onAddClass={onAddClass} 
                />
            </div>
        </DrawerSheet>

        {/* 🏫 4. إضافة فصل جديد */}
        <DrawerSheet isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} isRamadan={isRamadan} dir={dir}>
             <div className="flex flex-col h-full w-full text-center pb-4">
                <h3 className="font-black text-lg mb-4 shrink-0">{t('addNewClassTitle')}</h3>
                <div className="flex-1">
                    <input type="text" placeholder={t('classNameExample')} value={newClassInput} onChange={(e) => setNewClassInput(e.target.value)} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`} />
                </div>
                <div className="mt-auto pt-4 shrink-0">
                    <button onClick={handleAddClassSubmit} className={`w-full py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-colors bg-primary text-white hover:bg-primary/80`}>{t('addBtnSimple')}</button>
                </div>
             </div>
        </DrawerSheet>

        {/* ⚙️ 5. إدارة الفصول */}
        <DrawerSheet isOpen={showManageClasses} onClose={() => setShowManageClasses(false)} isRamadan={isRamadan} dir={dir}>
            <div className="flex flex-col h-full w-full text-center">
                <h3 className="font-black text-xl mb-6 shrink-0">{t('classSettingsTitle')}</h3>
                <div className={`rounded-2xl p-4 mb-6 border shrink-0 bg-primary/10 border-primary/20`}>
                    <div className={`flex items-center justify-center gap-2 mb-3 text-primary`}>
                        <Users className="w-4 h-4" />
                        <span className="font-bold text-sm">{t('schoolTypeBatchChange')}</span>
                    </div>
                    <div className="flex gap-3 mb-2">
                        <button 
                            onClick={() => handleBatchGenderUpdate('male')}
                            className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${defaultStudentGender === 'male' ? 'bg-bgCard border-blue-500 shadow-md text-blue-500' : 'bg-bgSoft border-borderColor hover:bg-bgCard text-textSecondary'}`}
                        >
                            <span className="text-xl">👨‍🎓</span>
                            <span className="font-black text-sm">{t('boys')}</span>
                        </button>
                        <button 
                            onClick={() => handleBatchGenderUpdate('female')}
                            className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${defaultStudentGender === 'female' ? 'bg-bgCard border-pink-500 shadow-md text-pink-500' : 'bg-bgSoft border-borderColor hover:bg-bgCard text-textSecondary'}`}
                        >
                            <span className="text-xl">👩‍🎓</span>
                            <span className="font-black text-sm">{t('girls')}</span>
                        </button>
                    </div>
                    <p className={`text-[10px] font-bold text-primary`}>{t('iconUnificationNote')}</p>
                </div>
                <div className={`w-full h-px mb-6 shrink-0 bg-borderColor`}></div>
                <div className="flex justify-between items-center mb-2 px-2 shrink-0">
                      <span className={`text-xs font-bold text-textSecondary`}>{t('deleteClassInstruction')}</span>
                      <span className={`text-[10px] font-bold text-rose-500`}>{t('deleteClassWarning')}</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-2">
                    {safeClasses.map(cls => (
                        <div key={cls} className={`flex justify-between items-center p-3 rounded-xl border transition-colors bg-transparent border-borderColor`}>
                            <span className={`font-bold text-sm text-textPrimary`}>{cls}</span>
                            <div className="flex gap-2">
                                <button onClick={() => { if(onDeleteClass && confirm(t('alertConfirmDeleteClass'))) onDeleteClass(cls); }} className={`p-2 rounded-lg transition-colors text-rose-500 bg-rose-500/10 hover:bg-rose-500/20`}><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                    {safeClasses.length === 0 && <p className={`text-xs text-textSecondary`}>{t('noClassesAdded')}</p>}
                </div>
            </div>
        </DrawerSheet>
        
        {/* 👍 6. السلوك الإيجابي */}
        <DrawerSheet isOpen={showPositiveModal} onClose={() => { setShowPositiveModal(false); setSelectedStudentForBehavior(null); }} isRamadan={isRamadan} dir={dir}>
            <div className="flex flex-col h-full w-full text-center pb-4">
                <h3 className="font-black text-lg flex items-center justify-center gap-2 mb-4 shrink-0 text-textPrimary">
                    <CheckCircle2 className={`w-5 h-5 text-emerald-500`} />
                    {t('positiveReinforcement')}
                </h3>
                <p className={`text-xs font-bold mb-4 shrink-0 text-textSecondary`}>
                    {t('chooseExcellenceType')} <bdi className="text-primary">{selectedStudentForBehavior?.name}</bdi>
                </p>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {POSITIVE_BEHAVIORS.map(b => (
                            <button 
                                key={b.id}
                                onClick={() => confirmPositiveBehavior(b.original, b.points)}
                                className={`p-3 border rounded-xl text-xs font-bold active:scale-95 transition-all flex flex-col items-center gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20`}
                            >
                                <span>{t(b.transKey)}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full shadow-sm bg-bgCard text-emerald-600`}>+{b.points}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`pt-3 border-t shrink-0 mt-auto border-borderColor`}>
                    <p className={`text-[10px] font-bold mb-2 ${dir === 'rtl' ? 'text-right' : 'text-left'} text-textSecondary`}>{t('orAddCustomBehavior')}</p>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={customPositiveReason}
                            onChange={(e) => setCustomPositiveReason(e.target.value)}
                            placeholder={t('otherReasonPlaceholder')} 
                            className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-colors bg-bgCard border-borderColor focus:border-emerald-500 text-textPrimary`}
                        />
                        <button 
                            onClick={() => {
                                if(customPositiveReason.trim()) {
                                    confirmPositiveBehavior(customPositiveReason, 1);
                                }
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold active:scale-95 flex items-center gap-1 transition-colors bg-emerald-500 text-white hover:bg-emerald-600`}
                        >
                            <Plus size={14} /> {t('addBtnSmall')}
                        </button>
                    </div>
                </div>
            </div>
        </DrawerSheet>

        {/* 👎 7. السلوك السلبي */}
        <DrawerSheet isOpen={showNegativeModal} onClose={() => { setShowNegativeModal(false); setSelectedStudentForBehavior(null); }} isRamadan={isRamadan} dir={dir}>
            <div className="flex flex-col h-full w-full text-center pb-4">
                <h3 className="font-black text-lg flex items-center justify-center gap-2 mb-4 shrink-0 text-textPrimary">
                    <AlertCircle className={`w-5 h-5 text-rose-500`} />
                    {t('behavioralAlert')}
                </h3>
                <p className={`text-xs font-bold mb-4 shrink-0 text-textSecondary`}>
                    {t('chooseNoteType')} <bdi className="text-primary">{selectedStudentForBehavior?.name}</bdi>
                </p>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {NEGATIVE_BEHAVIORS.map(b => (
                            <button 
                                key={b.id}
                                onClick={() => confirmNegativeBehavior(b.original, b.points)}
                                className={`p-3 border rounded-xl text-xs font-bold active:scale-95 transition-all flex flex-col items-center gap-1 bg-rose-500/10 border-rose-500/30 text-rose-600 hover:bg-rose-500/20`}
                            >
                                <span>{t(b.transKey)}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full shadow-sm bg-bgCard text-rose-600`}>{b.points}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`pt-3 border-t shrink-0 mt-auto border-borderColor`}>
                    <p className={`text-[10px] font-bold mb-2 ${dir === 'rtl' ? 'text-right' : 'text-left'} text-textSecondary`}>{t('orAddCustomNote')}</p>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={customNegativeReason}
                            onChange={(e) => setCustomNegativeReason(e.target.value)}
                            placeholder={t('otherReasonPlaceholder')} 
                            className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-colors bg-bgCard border-borderColor focus:border-rose-500 text-textPrimary`}
                        />
                        <button 
                            onClick={() => {
                                if(customNegativeReason.trim()) {
                                    confirmNegativeBehavior(customNegativeReason, -1);
                                }
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold active:scale-95 flex items-center gap-1 transition-colors bg-rose-500 text-white hover:bg-rose-600`}
                        >
                            <Plus size={14} /> {t('addBtnSmall')}
                        </button>
                    </div>
                </div>
            </div>
        </DrawerSheet>

        {/* ✏️ 8. تعديل بيانات طالب */}
        <DrawerSheet isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} isRamadan={isRamadan} dir={dir}>
            {editingStudent && (
                 <div className="flex flex-col h-full w-full text-center pb-4">
                    <h3 className="font-black text-xl mb-6 shrink-0 text-textPrimary">{t('editStudentData')}</h3>
                    <div className="space-y-3 flex-1 overflow-y-auto px-1 custom-scrollbar">
                        <input type="text" value={editingStudent.name} onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`} placeholder={t('namePlaceholderSimple')} />
                        <select value={editingStudent.classes && editingStudent.classes.length > 0 ? editingStudent.classes[0] : ''} onChange={(e) => setEditingStudent({...editingStudent, classes: [e.target.value]})} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`}>
                            {safeClasses.map(c => <option key={c} value={c} className="bg-bgCard">{c}</option>)}
                        </select>
                        <input type="tel" value={editingStudent.parentPhone || ''} onChange={(e) => setEditingStudent({...editingStudent, parentPhone: e.target.value})} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`} placeholder={t('phoneNumberPlaceholder')} />
                        
                        <div className="relative mt-2">
                            <p className={`text-[10px] ${dir === 'rtl' ? 'text-right' : 'text-left'} mb-1 font-bold text-textSecondary`}>{t('civilIdEssentialNote')}</p>
                            <input 
                                type="number" 
                                value={editingStudent.parentCode || ''} 
                                onChange={(e) => setEditingStudent({...editingStudent, parentCode: e.target.value})}
                                placeholder={t('enterCivilIdHere')}
                                className={`w-full p-4 rounded-xl font-mono text-center font-black tracking-widest outline-none border transition-colors bg-amber-500/10 border-amber-500/30 focus:border-amber-500 text-textPrimary`} 
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setEditingStudent({...editingStudent, gender: 'male'})} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${editingStudent.gender === 'male' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-transparent border-borderColor text-textSecondary'}`}>{t('maleStudent')}</button>
                            <button onClick={() => setEditingStudent({...editingStudent, gender: 'female'})} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${editingStudent.gender === 'female' ? 'bg-pink-500/10 border-pink-500/30 text-pink-500' : 'bg-transparent border-borderColor text-textSecondary'}`}>{t('femaleStudent')}</button>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4 shrink-0">
                        <button onClick={handleEditStudentSave} className={`flex-1 py-3 rounded-xl font-black text-sm shadow-lg transition-colors bg-primary text-white hover:bg-primary/80`}>{t('saveChangesBtn')}</button>
                        <button onClick={() => { if(confirm(t('alertConfirmDeleteStudent'))) { onDeleteStudent(editingStudent.id); setEditingStudent(null); }}} className={`px-4 py-3 border rounded-xl font-black text-sm transition-colors bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20`}><Trash2 className="w-5 h-5"/></button>
                    </div>
                </div>
            )}
        </DrawerSheet>

        {/* 🎲 9. الفائز العشوائي */}
        <DrawerSheet isOpen={!!randomWinner} onClose={() => setRandomWinner(null)} isRamadan={isRamadan} dir={dir}>
            {randomWinner && (
                <div className="flex flex-col h-full w-full text-center items-center justify-center pb-8 animate-in zoom-in duration-300">
                    <div className="mb-6 relative inline-block">
                        <div className={`w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden mx-auto transition-colors border-purple-500/30 bg-purple-500/10`}>
                            <StudentAvatar 
                                gender={randomWinner.gender}
                                className="w-full h-full"
                            />
                        </div>
                        <div className={`absolute -top-3 ${dir === 'rtl' ? '-right-3' : '-left-3'} text-4xl animate-bounce`}>🎉</div>
                        <div className={`absolute -bottom-2 ${dir === 'rtl' ? '-left-2' : '-right-2'} text-4xl animate-bounce`} style={{animationDelay: '0.2s'}}>✨</div>
                    </div>
                    <h2 className="text-2xl font-black mb-1 text-textPrimary">{randomWinner.name}</h2>
                    <p className={`text-sm font-bold inline-block px-3 py-1 rounded-full mb-6 transition-colors bg-purple-500/10 text-purple-500`}>
                        {randomWinner.classes[0]}
                    </p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => { handleBehavior(randomWinner, 'positive'); setRandomWinner(null); }} className={`flex-1 py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all bg-emerald-500 text-white hover:bg-emerald-600`}>
                            {t('reinforceBtn')}
                        </button>
                    </div>
                </div>
            )}
        </DrawerSheet>

        {/* ⏱️ 10. المؤقت */}
       <DrawerSheet isOpen={showTimerModal} onClose={() => setShowTimerModal(false)} isRamadan={isRamadan} dir={dir} mode="bottom">
            <div className="flex flex-col h-full w-full text-center pb-4">
                <h3 className="font-black text-lg mb-6 flex items-center justify-center gap-2 shrink-0 text-textPrimary">
                    <Timer className={`w-5 h-5 text-amber-500`}/> {t('timerTitle')}
                </h3>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {[1, 3, 5, 10, 15, 20].map(min => (
                            <button 
                                key={min} 
                                onClick={() => startTimer(min)} 
                                className={`border rounded-xl py-3 text-xs font-bold transition-all active:scale-95 bg-transparent border-borderColor text-textSecondary hover:bg-primary/10 hover:border-primary/30 hover:text-primary`}
                            >
                                {min} {t('minuteAbbrev')}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2 items-center mb-6">
                        <input 
                            type="number" 
                            value={timerInput} 
                            onChange={(e) => setTimerInput(e.target.value)} 
                            className={`w-full border rounded-xl py-3 px-3 text-center font-black outline-none transition-colors bg-transparent border-borderColor focus:border-primary text-textPrimary placeholder:text-textSecondary`} 
                            placeholder={t('minutePlaceholder')}
                        />
                        <button 
                            onClick={() => startTimer(Number(timerInput))} 
                            className={`p-3.5 rounded-xl active:scale-95 shadow-lg transition-colors bg-primary hover:bg-primary/80`}
                        >
                            <Play size={18} className="text-white fill-white" />
                        </button>
                    </div>

                    {isTimerRunning && (
                        <div className={`border-t pt-6 mt-4 border-borderColor`}>
                            <h2 className="text-5xl font-black mb-6 font-mono text-textPrimary">{formatTime(timerSeconds)}</h2>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setIsTimerRunning(false)} className={`p-4 rounded-full border active:scale-95 transition-colors bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20`}>
                                    <Pause size={24} fill="currentColor" />
                                </button>
                                <button onClick={() => { setIsTimerRunning(false); setTimerSeconds(0); }} className={`p-4 rounded-full border active:scale-95 transition-colors bg-bgSoft border-borderColor hover:bg-bgCard text-textPrimary`}>
                                    <RotateCcw size={24} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DrawerSheet>

    </div>
  );
};

export default StudentList;
