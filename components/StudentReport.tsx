import React, { useState, useEffect, useMemo } from 'react';
import { Student, BehaviorType } from '../types';
import { 
    Search, ThumbsUp, ThumbsDown, Edit2, Trash2, LayoutGrid, UserPlus, 
    FileSpreadsheet, MoreVertical, Settings, Users, AlertCircle, X, 
    Dices, Timer, Play, Pause, RotateCcw, CheckCircle2, MessageCircle, Plus,
    Sparkles, Phone, Send, Star, CloudUpload, Loader2, Mail, RefreshCcw 
} from 'lucide-react';
import Modal from './Modal';
import ExcelImport from './ExcelImport';
import { useApp } from '../context/AppContext';
import { StudentAvatar } from './StudentAvatar';

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
    { id: '1', title: 'إزعاج في الحصة', points: -2 },
    { id: '2', title: 'عدم حل الواجب', points: -2 },
    { id: '3', title: 'نسيان الكتاب والدفتر', points: -1 },
    { id: '4', title: 'تأخر عن الحصة', points: -1 },
    { id: '5', title: 'سلوك غير لائق', points: -3 },
    { id: '6', title: 'النوم في الفصل', points: -2 },
];

const POSITIVE_BEHAVIORS = [
    { id: 'p1', title: 'إجابة متميزة', points: 2 },
    { id: 'p2', title: 'إجابة صحيحة', points: 1 },
    { id: 'p3', title: 'واجب مميز', points: 2 },
    { id: 'p4', title: 'مساعدة الزملاء', points: 2 },
    { id: 'p5', title: 'مشاركة صفية متميزة', points: 5 },
    { id: 'p6', title: 'إبداع وتميز', points: 3 },
];

// ✅ الرابط السحابي الموحد
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
    const { defaultStudentGender, setDefaultStudentGender, setStudents, teacherInfo } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedGrade, setSelectedGrade] = useState<string>(() => sessionStorage.getItem('rased_grade') || 'all');
    const [selectedClass, setSelectedClass] = useState<string>(() => sessionStorage.getItem('rased_class') || 'all');

    const [isRamadan] = useState(() => {
      try {
          const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' }).formatToParts(new Date());
          return parseInt(parts.find(p => p.type === 'month')?.value || '0') === 9;
      } catch(e) {
          return false;
      }
    });

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
    
    const [isSyncing, setIsSyncing] = useState(false);

    // 📥 حالات صندوق الوارد (Messages)
    const [messages, setMessages] = useState<any[]>([]);
    const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
    const [isFetchingMsgs, setIsFetchingMsgs] = useState(false);

    // 🔔 عداد الرسائل المقروءة (ذاكرة لحل مشكلة الإشعارات المزعجة)
    const [readMessagesCount, setReadMessagesCount] = useState<number>(() => {
        return parseInt(localStorage.getItem('rased_read_messages_count') || '0', 10);
    });

    // 🔔 تحديث العداد الذكي بمجرد فتح الصندوق
    useEffect(() => {
        if (isMessagesModalOpen && messages.length > 0) {
            setReadMessagesCount(messages.length);
            localStorage.setItem('rased_read_messages_count', messages.length.toString());
        }
    }, [isMessagesModalOpen, messages.length]);

    // 📥 دالة جلب الرسائل من السحابة
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

    // 💬 دالة الرد المباشر على رسالة ولي الأمر عبر الواتساب
    const handleReplyToMessage = (msg: any) => {
        // [التعديل الجراحي هنا]: تحويل كلا الرقمين إلى نصوص وتنظيفهما من أي مسافات لضمان التطابق 100%
        const student = students.find(s => 
            String(s.parentCode || '').trim() === String(msg.civilID || '').trim()
        );
        
        if (!student) {
            alert('⚠️ لم يتم العثور على طالب بهذا الرقم المدني في القائمة الحالية.');
            return;
        }
        if (!student.parentPhone) {
            alert(`⚠️ لا يوجد رقم هاتف مسجل لولي أمر الطالب: ${student.name}`);
            return;
        }

        const truncatedMsg = msg.message.length > 60 ? msg.message.substring(0, 60) + '...' : msg.message;
        const replyText = `أهلاً بك ولي أمر الطالب "${student.name}"،\nبخصوص استفساركم: "${truncatedMsg}"\n\nنود إفادتكم بـ: `;
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
    // جلب الرسائل تلقائياً عند فتح التطبيق
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

    // ☁️ خوارزمية المزامنة السحابية المحدثة
    const handleCloudSync = async () => {
        const payload = students
            .filter(s => s.parentCode && s.parentCode.trim() !== "")
            .map(s => {
                return {
                    parentCode: s.parentCode,
                    name: s.name,
                    className: s.classes[0] || "",
                    subject: teacherInfo?.subject || "بدون مادة", 
                    schoolName: teacherInfo?.school || "مدرسة غير محددة",
                    totalPoints: calculateTotalPoints(s),
                    behaviors: s.behaviors || [],
                    grades: s.grades || [],
                    attendance: s.attendance || [] 
                };
            });

        if (payload.length === 0) {
            alert("لا يوجد طلاب لديهم (رقم مدني) ليتم مزامنتهم! تأكد من إضافة الرقم المدني للطلاب.");
            return;
        }

        try {
            setIsSyncing(true);
            const response = await fetch(GOOGLE_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.status === "success") {
                playSound('tada');
                alert(`تمت المزامنة بنجاح! ☁️✅\nتم رفع بيانات ${payload.length} طالب إلى السحابة.`);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error("Sync Error:", error);
            alert("حدث خطأ أثناء المزامنة. تأكد من اتصالك بالإنترنت.");
        } finally {
            setIsSyncing(false);
        }
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
        setCustomPositiveReason('');
        setCustomNegativeReason('');
        
        if (type === 'positive') {
            setShowPositiveModal(true);
        } else {
            setShowNegativeModal(true);
        }
    };

    // ================= دمج دوال إرسال الواتساب (الإيجابي والسلبي) =================
    const handleSendSmartReport = (student: Student) => {
        if (!student.parentPhone) {
            alert('⚠️ عذراً، لا يوجد رقم هاتف مسجل لولي الأمر.');
            return;
        }

        const currentGrades = (student.grades || []).filter(g => (g.semester || '1') === currentSemester);
        const totalScore = currentGrades.reduce((acc, curr) => acc + (curr.score || 0), 0);

        const positiveBehaviors = (student.behaviors || []).filter(b => b.type === 'positive');
        const topBehavior = positiveBehaviors.length > 0 
            ? positiveBehaviors[0].description 
            : (student.gender === 'female' ? 'انضباطها وتميزها العام' : 'انضباطه وتميزه العام');

        const isFemale = student.gender === 'female';
        const childTitle = isFemale ? 'ابنتكم الطالبة' : 'ابنكم الطالب';
        const scoreText = isFemale ? 'حصلت على مجموع' : 'حصل على مجموع';
        const behaviorText = isFemale ? 'وتميزت في' : 'وتميز في';
        const teacherTitle = teacherInfo?.gender === 'female' ? 'المعلمة' : 'المعلم';

        const message = `السلام عليكم ورحمة الله، ولي أمر ${childTitle} (${student.name}) المحترم.\n\nيسرنا إعلامكم بأن ${childTitle} ${scoreText} (${totalScore}) درجة في مادة ${teacherInfo?.subject || '...'}، ${behaviorText}: "${topBehavior}".\n\nشاكرين لكم حسن متابعتكم.\nإدارة تطبيق راصد - ${teacherTitle}: ${teacherInfo?.name || ''}`;

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
            alert('⚠️ عذراً، لا يوجد رقم هاتف مسجل لولي الأمر.');
            return;
        }

        const negativeBehaviors = (student.behaviors || []).filter(b => b.type === 'negative');

        if (negativeBehaviors.length === 0) {
            alert('🎉 هذا الطالب متميز! لا توجد لديه سلوكيات سلبية مسجلة.');
            return;
        }

        let message = `السلام عليكم، ولي أمر الطالب *${student.name}* المحترم.\n`;
        message += `تحية طيبة،\nنود إشعاركم بتقرير بالملاحظات السلوكية المسجلة على الطالب مؤخراً:\n\n`;

        negativeBehaviors.slice(0, 5).forEach(b => {
            const dateObj = new Date(b.date);
            const date = dateObj.toLocaleDateString('ar-EG');
            const time = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            
            message += `🔴 *${b.description}*\n📅 ${date} - ⏰ ${time}\n─────────────────\n`;
        });

        message += `\nنأمل منكم التكرم بمتابعة الطالب وتوجيهه.\nشكراً لتعاونكم.\n*إدارة المدرسة*`;
        
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
    // =======================================================================

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

    const handleQuietAndDiscipline = () => {
        if (!confirm('هل تريد إضافة نقطتين (هدوء وانضباط) لجميع الطلاب الحاضرين والمنضبطين في القائمة المعروضة؟')) return;

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
            alert('لا يوجد طلاب مستحقين للنقاط في القائمة الحالية (بسبب الغياب أو وجود مخالفات).');
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
        alert(`تم إضافة نقطتي (هدوء وانضباط) لـ ${eligibleStudents.length} طالب ✅\nتم استبعاد الغائبين والمخالفين.`);
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
            alert('الرجاء إدخال اسم الطالب، الفصل، والرقم المدني.');
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
                alert('الرقم المدني مطلوب جداً لربط الطالب بالسحابة.');
                return;
            }
            onUpdateStudent(editingStudent);
            setEditingStudent(null);
        }
    };

    const handleBatchGenderUpdate = (gender: 'male' | 'female') => {
        if (confirm('هل أنت متأكد؟ سيتم تغيير أيقونات جميع الطلاب المسجلين حالياً ليتناسب مع النوع المختار.')) {
            setDefaultStudentGender(gender);
            setStudents(prev => prev.map(s => ({ ...s, gender: gender, avatar: undefined })));
        }
    };

    return (
    <div className={`flex flex-col h-full overflow-hidden ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
        
        {/* ================= FIXED HEADER ================= */}
        <header 
            className={`fixed md:sticky top-0 z-40 md:z-30 shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 md:pl-40 transition-all duration-500 md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto ${isRamadan ? 'bg-white/5 border-b border-white/10 text-white' : 'bg-[#446A8D] text-white'}`}
            style={{ WebkitAppRegion: 'drag' } as any}
        >
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-xl border border-white/20">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-wide">الطلاب</h1>
                        <p className={`text-[10px] font-bold opacity-80 ${isRamadan ? 'text-indigo-200' : 'text-blue-200'}`}>{safeStudents.length} طالب مسجل</p>
                    </div>
                </div>

                <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    
                    {/* 📥 صندوق الوارد (رسائل الآباء) */}
                    <button 
                        onClick={() => { setIsMessagesModalOpen(true); fetchParentMessages(); }} 
                        className={`relative p-2.5 rounded-xl border active:scale-95 transition-all flex items-center gap-2 ${isRamadan ? 'bg-purple-600/80 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-purple-600 border-purple-500 text-white shadow-lg hover:bg-purple-700'}`}
                        title="صندوق الوارد للرسائل"
                    >
                        <Mail className="w-5 h-5" />
                        <span className="hidden md:inline text-xs font-black">الوارد</span>
                        {messages.length > readMessagesCount && (
                            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-bounce border border-white">
                                {messages.length - readMessagesCount}
                            </span>
                        )}
                    </button>

                    {/* ☁️ زر المزامنة السحابية */}
                    <button 
                        onClick={handleCloudSync} 
                        disabled={isSyncing}
                        className={`p-2.5 rounded-xl border active:scale-95 transition-all flex items-center gap-2 ${isSyncing ? 'opacity-70 cursor-not-allowed' : ''} ${isRamadan ? 'bg-indigo-600/80 border-indigo-400 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-indigo-600 border-indigo-500 text-white shadow-lg hover:bg-indigo-700'}`}
                        title="مزامنة بيانات أولياء الأمور للسحابة"
                    >
                        {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                        <span className="text-xs font-black hidden md:inline">مزامنة الآباء</span>
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => setShowTimerModal(true)} 
                            className={`p-2.5 rounded-xl border active:scale-95 transition-all flex items-center gap-2 ${timerSeconds > 0 ? (isRamadan ? 'bg-amber-500/80 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse' : 'bg-amber-500 border-amber-400 text-white shadow-lg animate-pulse') : (isRamadan ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white/10 border-white/20 text-white hover:bg-white/20')}`}
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
                        className={`p-2.5 rounded-xl border active:scale-95 transition-all ${isRamadan ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                        title="القرعة العشوائية"
                    >
                        <Dices className="w-5 h-5" />
                    </button>

                    <div className="relative z-[9999]">
                        <button onClick={() => setShowMenu(!showMenu)} className={`p-2.5 rounded-xl border active:scale-95 transition-all ${showMenu ? (isRamadan ? 'bg-white/20 border-white/30 text-white' : 'bg-white text-[#1e3a8a]') : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}>
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                            <div className={`absolute left-0 top-full mt-2 w-56 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in zoom-in-95 origin-top-left ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
                                <div className="p-1">
                                        <button onClick={handleQuietAndDiscipline} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full text-right text-xs font-bold border-b ${isRamadan ? 'hover:bg-purple-900/40 border-white/10 text-purple-200' : 'hover:bg-purple-50 border-slate-50 text-slate-700'}`}>
                                            <Sparkles className={`w-4 h-4 ${isRamadan ? 'text-purple-400' : 'text-purple-600'}`} /> مكافأة الانضباط (هدوء)
                                        </button>
                                        <button onClick={() => { setShowManualAddModal(true); setShowMenu(false); }} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full text-right text-xs font-bold ${isRamadan ? 'hover:bg-white/10 text-indigo-100' : 'hover:bg-slate-50 text-slate-700'}`}>
                                            <UserPlus className={`w-4 h-4 ${isRamadan ? 'text-indigo-400' : 'text-indigo-600'}`} /> إضافة طالب يدوياً
                                        </button>
                                        <button onClick={() => { setShowImportModal(true); setShowMenu(false); }} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full text-right text-xs font-bold ${isRamadan ? 'hover:bg-white/10 text-indigo-100' : 'hover:bg-slate-50 text-slate-700'}`}>
                                            <FileSpreadsheet className={`w-4 h-4 ${isRamadan ? 'text-emerald-400' : 'text-emerald-600'}`} /> استيراد من Excel
                                        </button>
                                        <div className={`my-1 border-t ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}></div>
                                        <button onClick={() => { setShowAddClassModal(true); setShowMenu(false); }} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full text-right text-xs font-bold ${isRamadan ? 'hover:bg-white/10 text-indigo-100' : 'hover:bg-slate-50 text-slate-700'}`}>
                                            <LayoutGrid className={`w-4 h-4 ${isRamadan ? 'text-amber-400' : 'text-amber-600'}`} /> إضافة فصل جديد
                                        </button>
                                        <button onClick={() => { setShowManageClasses(true); setShowMenu(false); }} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full text-right text-xs font-bold ${isRamadan ? 'hover:bg-white/10 text-indigo-100' : 'hover:bg-slate-50 text-slate-700'}`}>
                                            <Settings className={`w-4 h-4 ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`} /> إدارة الفصول
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
                    <Search className="absolute right-4 top-3.5 w-5 h-5 text-blue-200" />
                    <input 
                        type="text" 
                        placeholder="بحث عن طالب..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full border rounded-2xl py-3 pr-12 pl-4 text-sm font-bold outline-none transition-all ${isRamadan ? 'bg-white/10 border-white/20 text-white placeholder:text-blue-200/50 focus:bg-white/20' : 'bg-white/20 border-white/30 text-white placeholder:text-blue-100 focus:bg-white/30'}`}
                    />
                </div>
                
                <div className="flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible pb-2">
                    <button onClick={() => { setSelectedGrade('all'); setSelectedClass('all'); }} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedGrade === 'all' && selectedClass === 'all' ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a] shadow-md border-white') : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>الكل</button>
                    {availableGrades.map(g => (
                         <button key={g} onClick={() => { setSelectedGrade(g); setSelectedClass('all'); }} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedGrade === g ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a] shadow-md border-white') : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>صف {g}</button>
                    ))}
                    {safeClasses.filter(c => selectedGrade === 'all' || c.startsWith(selectedGrade)).map(c => (
                        <button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedClass === c ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a] shadow-md border-white') : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>{c}</button>
                    ))}
                </div>
            </div>
        </header>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-20 custom-scrollbar pt-64 md:pt-2 relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                    const totalPoints = calculateTotalPoints(student);
                    return (
                    <div key={student.id} className={`rounded-[1.5rem] border flex flex-col items-center overflow-hidden transition-all duration-300 ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                        <div className="p-4 flex flex-col items-center w-full relative">
                            
                            <div className="relative mb-3">
                                <StudentAvatar 
                                    gender={student.gender}
                                    className={`w-16 h-16 ${isRamadan ? 'opacity-90' : ''}`}
                                />
                                {totalPoints !== 0 && (
                                   <div className={`absolute -top-3 -right-5 z-10 flex items-center justify-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm border-2 ${isRamadan ? 'border-amber-500/30 bg-amber-500/20 text-amber-300' : 'border-white bg-amber-100 text-amber-600'}`}>
                                        <Star size={10} className={isRamadan ? "fill-amber-400 text-amber-400" : "fill-amber-500 text-amber-500"} />
                                        {totalPoints}
                                    </div>
                                )}
                            </div>

                            <h3 className={`font-black text-sm text-center line-clamp-1 w-full ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{student.name}</h3>
                            <div className="flex gap-1 mt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isRamadan ? 'bg-white/10 text-indigo-200' : 'bg-slate-100 text-slate-500'}`}>{student.classes && student.classes.length > 0 ? student.classes[0] : 'غير محدد'}</span>
                            </div>
                        </div>

                        <div className={`w-full h-px ${isRamadan ? 'bg-white/10' : 'bg-slate-100'}`}></div>

                        {/* أزرار الإجراءات */}
                        <div className={`flex w-full divide-x divide-x-reverse ${isRamadan ? 'divide-white/10' : 'divide-slate-100'}`}>
                            
                            <button onClick={() => handleBehavior(student, 'positive')} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors group ${isRamadan ? 'hover:bg-emerald-500/20 active:bg-emerald-500/30' : 'hover:bg-emerald-50 active:bg-emerald-100'}`} title="تعزيز إيجابي">
                                <ThumbsUp className={`w-4 h-4 group-hover:scale-110 transition-transform ${isRamadan ? 'text-emerald-400' : 'text-emerald-500'}`} />
                            </button>
                            
                            <button onClick={() => handleBehavior(student, 'negative')} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors group ${isRamadan ? 'hover:bg-rose-500/20 active:bg-rose-500/30' : 'hover:bg-rose-50 active:bg-rose-100'}`} title="سلوك سلبي">
                                <ThumbsDown className={`w-4 h-4 group-hover:scale-110 transition-transform ${isRamadan ? 'text-rose-400' : 'text-rose-500'}`} />
                            </button>

                            <button onClick={() => handleSendSmartReport(student)} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors group ${isRamadan ? 'hover:bg-blue-500/20 active:bg-blue-500/30' : 'hover:bg-blue-50 active:bg-blue-100'}`} title="تقرير الدرجات والتميز (واتساب)">
                                <MessageCircle className={`w-4 h-4 group-hover:scale-110 transition-transform ${isRamadan ? 'text-blue-400' : 'text-blue-500'}`} />
                            </button>

                            <button onClick={() => handleSendNegativeReport(student)} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors group ${isRamadan ? 'hover:bg-amber-500/20 active:bg-amber-500/30' : 'hover:bg-amber-50 active:bg-amber-100'}`} title="تقرير سلوكي إنذار (واتساب)">
                                <Send className={`w-4 h-4 group-hover:scale-110 transition-transform ${isRamadan ? 'text-amber-400' : 'text-amber-500'}`} />
                            </button>
                            
                            <button onClick={() => setEditingStudent(student)} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors group ${isRamadan ? 'hover:bg-white/10 active:bg-white/20' : 'hover:bg-slate-50 active:bg-slate-100'}`} title="تعديل">
                                <Edit2 className={`w-4 h-4 transition-colors ${isRamadan ? 'text-slate-400 group-hover:text-indigo-300' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                            </button>
                            
                        </div>
                    </div>
                )}) : (
                    <div className={`flex flex-col items-center justify-center py-20 col-span-full text-center ${isRamadan ? 'opacity-70' : 'opacity-50'}`}>
                        <UserPlus className={`w-16 h-16 mb-4 ${isRamadan ? 'text-white/20' : 'text-gray-300'}`} />
                        <p className={`text-sm font-bold ${isRamadan ? 'text-indigo-200/50' : 'text-gray-400'}`}>لا يوجد طلاب مطابقين للبحث</p>
                        {safeClasses.length === 0 && <p className={`text-xs mt-2 font-bold cursor-pointer ${isRamadan ? 'text-amber-400' : 'text-indigo-400'}`} onClick={() => setShowAddClassModal(true)}>ابدأ بإضافة فصل جديد</p>}
                    </div>
                )}
            </div>
        </div>

        {/* ================= نوافذ منبثقة (Modals) ================= */}

        {/* 📥 نافذة صندوق الوارد للرسائل */}
        <Modal isOpen={isMessagesModalOpen} onClose={() => setIsMessagesModalOpen(false)} className={`max-w-2xl rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
            <div className={`p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white shadow-2xl' : 'bg-white border-transparent text-slate-800 shadow-2xl'}`}>
                <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-100">
                    <h3 className="font-black text-xl flex items-center gap-2 text-purple-600">
                        <Mail className="w-6 h-6" />
                        صندوق وارد الآباء
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={fetchParentMessages} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors" title="تحديث الرسائل">
                            <RefreshCcw className={`w-5 h-5 ${isFetchingMsgs ? 'animate-spin text-purple-600' : ''}`} />
                        </button>
                        <button onClick={() => setIsMessagesModalOpen(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {isFetchingMsgs && messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-2" />
                            <p className="text-slate-500 font-bold">جاري جلب الرسائل...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-10">
                            <Mail className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-bold">لا توجد رسائل جديدة من أولياء الأمور</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => (
                            <div key={index} className="p-5 border border-slate-200 rounded-2xl bg-slate-50 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                                <div className="flex justify-between items-start mb-3 pl-2">
                                    <div>
                                        <h4 className="font-black text-slate-800 text-lg">{msg.studentName}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">رقم مدني: {msg.civilID}</p>
                                    </div>
                                    <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-lg border text-slate-500 shadow-sm">
                                        {new Date(msg.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 text-sm font-bold text-slate-700 leading-relaxed shadow-inner">
                                    {msg.message}
                                </div>
                                {/* 💬 زر الرد عبر الواتساب الجديد */}
                                <div className="mt-3 flex justify-end">
                                    <button 
                                        onClick={() => handleReplyToMessage(msg)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black shadow-sm active:scale-95 transition-all ${isRamadan ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'}`}
                                    >
                                        <MessageCircle size={14} />
                                        رد عبر الواتساب
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>

        {/* باقي النوافذ المعتادة (الإضافة اليدوية، الاستيراد، الفصول، السلوكيات...) */}
        <Modal isOpen={showManualAddModal} onClose={() => setShowManualAddModal(false)} className={`max-w-md rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
             <div className={`text-center p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white shadow-2xl' : 'bg-white border-transparent text-slate-800 shadow-2xl'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${isRamadan ? 'bg-indigo-900/50 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-500 border-transparent'}`}>
                    <UserPlus className="w-8 h-8" />
                </div>
                <h3 className="font-black text-xl mb-6">إضافة طالب جديد</h3>
                <div className="space-y-3">
                    <input type="text" placeholder="اسم الطالب" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-indigo-400 text-white placeholder:text-indigo-200/40' : 'bg-gray-50 border-gray-200 focus:border-indigo-500 text-slate-800'}`} />
                    <select value={newStudentClass} onChange={(e) => setNewStudentClass(e.target.value)} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-gray-50 border-gray-200 focus:border-indigo-500 text-slate-800'}`}>
                        <option value="" disabled className={isRamadan ? 'text-slate-500' : ''}>اختر الفصل</option>
                        {safeClasses.map(c => <option key={c} value={c} className={isRamadan ? 'bg-[#0f172a]' : ''}>{c}</option>)}
                    </select>
                    <input type="number" placeholder="الرقم المدني (أساسي)" value={newStudentCivilID} onChange={(e) => setNewStudentCivilID(e.target.value)} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-indigo-400 text-white placeholder:text-indigo-200/40' : 'bg-amber-50 border-amber-200 focus:border-amber-500 text-slate-800'}`} />
                    <input type="tel" placeholder="رقم ولي الأمر (اختياري)" value={newStudentPhone} onChange={(e) => setNewStudentPhone(e.target.value)} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-indigo-400 text-white placeholder:text-indigo-200/40' : 'bg-gray-50 border-gray-200 focus:border-indigo-500 text-slate-800'}`} />
                     <div className="flex gap-2">
                        <button onClick={() => setNewStudentGender('male')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${newStudentGender === 'male' ? (isRamadan ? 'bg-blue-500/20 border-blue-400/50 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-600') : (isRamadan ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-400')}`}>طالب 👨‍🎓</button>
                        <button onClick={() => setNewStudentGender('female')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${newStudentGender === 'female' ? (isRamadan ? 'bg-pink-500/20 border-pink-400/50 text-pink-300' : 'bg-pink-50 border-pink-200 text-pink-600') : (isRamadan ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-400')}`}>طالبة 👩‍🎓</button>
                    </div>
                    <button onClick={handleManualAddSubmit} disabled={!newStudentName || !newStudentClass || !newStudentCivilID} className={`w-full py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 mt-2 ${isRamadan ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>حفظ الطالب</button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} className={`max-w-lg rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
            <div className={isRamadan ? 'bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden' : ''}>
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
        </Modal>

        <Modal isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} className={`max-w-sm rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
             <div className={`text-center p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white shadow-2xl' : 'bg-white border-transparent text-slate-800 shadow-2xl'}`}>
                <h3 className="font-black text-lg mb-4">إضافة فصل جديد</h3>
                <input autoFocus type="text" placeholder="اسم الفصل (مثال: 5/1)" value={newClassInput} onChange={(e) => setNewClassInput(e.target.value)} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border mb-4 transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-indigo-400 text-white placeholder:text-indigo-200/40' : 'bg-gray-50 border-gray-200 focus:border-indigo-500 text-slate-800'}`} />
                <button onClick={handleAddClassSubmit} className={`w-full py-3 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-colors ${isRamadan ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>إضافة</button>
             </div>
        </Modal>

        <Modal isOpen={showManageClasses} onClose={() => setShowManageClasses(false)} className={`max-w-md rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
            <div className={`text-center p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white shadow-2xl' : 'bg-white border-transparent text-slate-800 shadow-2xl'}`}>
                <h3 className="font-black text-xl mb-6">إعدادات الفصول والصفوف</h3>
                <div className={`rounded-2xl p-4 mb-6 border ${isRamadan ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-100'}`}>
                    <div className={`flex items-center justify-center gap-2 mb-3 ${isRamadan ? 'text-indigo-300' : 'text-indigo-900'}`}>
                        <Users className="w-4 h-4" />
                        <span className="font-bold text-sm">نوع المدرسة (تغيير جماعي)</span>
                    </div>
                    <div className="flex gap-3 mb-2">
                        <button 
                            onClick={() => handleBatchGenderUpdate('male')}
                            className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${defaultStudentGender === 'male' ? (isRamadan ? 'bg-blue-500/20 border-blue-400/50 text-blue-300 shadow-md' : 'bg-white border-blue-200 shadow-md text-blue-700') : (isRamadan ? 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10' : 'bg-white/50 border-transparent text-slate-500 hover:bg-white')}`}
                        >
                            <span className="text-xl">👨‍🎓</span>
                            <span className="font-black text-sm">بنين</span>
                        </button>
                        <button 
                            onClick={() => handleBatchGenderUpdate('female')}
                            className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${defaultStudentGender === 'female' ? (isRamadan ? 'bg-pink-500/20 border-pink-400/50 text-pink-300 shadow-md' : 'bg-white border-pink-200 shadow-md text-pink-700') : (isRamadan ? 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10' : 'bg-white/50 border-transparent text-slate-500 hover:bg-white')}`}
                        >
                            <span className="text-xl">👩‍🎓</span>
                            <span className="font-black text-sm">بنات</span>
                        </button>
                    </div>
                    <p className={`text-[10px] font-bold ${isRamadan ? 'text-indigo-200/60' : 'text-indigo-400'}`}>* سيتم توحيد أيقونات جميع الطلاب حسب اختيارك.</p>
                </div>
                <div className={`w-full h-px mb-6 ${isRamadan ? 'bg-white/10' : 'bg-gray-100'}`}></div>
                <div className="flex justify-between items-center mb-2 px-2">
                      <span className={`text-xs font-bold ${isRamadan ? 'text-slate-400' : 'text-slate-400'}`}>يمكنك هنا حذف الفصول الدراسية بالكامل.</span>
                      <span className={`text-[10px] font-bold ${isRamadan ? 'text-rose-400' : 'text-red-400'}`}>تنبيه: الحذف سيؤثر على جميع الصفحات.</span>
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 space-y-2">
                    {safeClasses.map(cls => (
                        <div key={cls} className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${isRamadan ? 'bg-[#1e293b] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                            <span className={`font-bold text-sm ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{cls}</span>
                            <div className="flex gap-2">
                                <button onClick={() => { if(onDeleteClass && confirm('هل أنت متأكد من حذف هذا الفصل؟ سيتم إخفاء الطلاب المرتبطين به.')) onDeleteClass(cls); }} className={`p-2 rounded-lg transition-colors ${isRamadan ? 'text-rose-400 bg-rose-500/20 hover:bg-rose-500/30' : 'text-rose-500 bg-rose-50 hover:bg-rose-100'}`}><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                    {safeClasses.length === 0 && <p className={`text-xs ${isRamadan ? 'text-slate-500' : 'text-gray-400'}`}>لا توجد فصول مضافة</p>}
                </div>
                <button onClick={() => setShowManageClasses(false)} className={`mt-4 w-full py-3 rounded-xl font-bold text-xs transition-colors ${isRamadan ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`}>إغلاق</button>
            </div>
        </Modal>
        
        <Modal isOpen={showPositiveModal} onClose={() => { setShowPositiveModal(false); setSelectedStudentForBehavior(null); }} className={`max-w-sm rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
            <div className={`text-center p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white shadow-2xl' : 'bg-white border-transparent text-slate-800 shadow-2xl'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-lg flex items-center gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${isRamadan ? 'text-emerald-400' : 'text-emerald-500'}`} />
                        تعزيز إيجابي
                    </h3>
                    <button onClick={() => setShowPositiveModal(false)} className={`p-2 rounded-full transition-colors ${isRamadan ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}><X className="w-4 h-4"/></button>
                </div>
                <p className={`text-xs font-bold mb-4 ${isRamadan ? 'text-slate-300' : 'text-gray-500'}`}>اختر نوع التميز للطالب <span className={isRamadan ? 'text-amber-400' : 'text-indigo-600'}>{selectedStudentForBehavior?.name}</span></p>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {POSITIVE_BEHAVIORS.map(b => (
                        <button 
                            key={b.id}
                            onClick={() => confirmPositiveBehavior(b.title, b.points)}
                            className={`p-3 border rounded-xl text-xs font-bold active:scale-95 transition-all flex flex-col items-center gap-1 ${isRamadan ? 'bg-[#1e293b] border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30' : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'}`}
                        >
                            <span>{b.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full shadow-sm ${isRamadan ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white text-emerald-600'}`}>+{b.points}</span>
                        </button>
                    ))}
                </div>

                <div className={`pt-3 border-t ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
                    <p className={`text-[10px] font-bold mb-2 text-right ${isRamadan ? 'text-slate-400' : 'text-slate-400'}`}>أو أضف سلوكاً مخصصاً:</p>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={customPositiveReason}
                            onChange={(e) => setCustomPositiveReason(e.target.value)}
                            placeholder="سبب آخر..." 
                            className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-emerald-400 text-white placeholder:text-indigo-200/40' : 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-800'}`}
                        />
                        <button 
                            onClick={() => {
                                if(customPositiveReason.trim()) {
                                    confirmPositiveBehavior(customPositiveReason, 1);
                                }
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold active:scale-95 flex items-center gap-1 transition-colors ${isRamadan ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                        >
                            <Plus size={14} /> إضافة
                        </button>
                    </div>
                </div>
            </div>
        </Modal>

        <Modal isOpen={showNegativeModal} onClose={() => { setShowNegativeModal(false); setSelectedStudentForBehavior(null); }} className={`max-w-sm rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
            <div className={`text-center p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white shadow-2xl' : 'bg-white border-transparent text-slate-800 shadow-2xl'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-lg flex items-center gap-2">
                        <AlertCircle className={`w-5 h-5 ${isRamadan ? 'text-rose-400' : 'text-rose-500'}`} />
                        تنبيه سلوكي
                    </h3>
                    <button onClick={() => setShowNegativeModal(false)} className={`p-2 rounded-full transition-colors ${isRamadan ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}><X className="w-4 h-4"/></button>
                </div>
                <p className={`text-xs font-bold mb-4 ${isRamadan ? 'text-slate-300' : 'text-gray-500'}`}>اختر نوع الملاحظة للطالب <span className={isRamadan ? 'text-amber-400' : 'text-indigo-600'}>{selectedStudentForBehavior?.name}</span></p>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {NEGATIVE_BEHAVIORS.map(b => (
                        <button 
                            key={b.id}
                            onClick={() => confirmNegativeBehavior(b.title, b.points)}
                            className={`p-3 border rounded-xl text-xs font-bold active:scale-95 transition-all flex flex-col items-center gap-1 ${isRamadan ? 'bg-[#1e293b] border-rose-400/30 text-rose-300 hover:bg-rose-500/30' : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100'}`}
                        >
                            <span>{b.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full shadow-sm ${isRamadan ? 'bg-rose-500/30 text-rose-200' : 'bg-white text-rose-600'}`}>{b.points}</span>
                        </button>
                    ))}
                </div>

                <div className={`pt-3 border-t ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
                    <p className={`text-[10px] font-bold mb-2 text-right ${isRamadan ? 'text-slate-400' : 'text-slate-400'}`}>أو أضف ملاحظة مخصصة:</p>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={customNegativeReason}
                            onChange={(e) => setCustomNegativeReason(e.target.value)}
                            placeholder="سبب آخر..." 
                            className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-rose-400 text-white placeholder:text-indigo-200/40' : 'bg-slate-50 border-slate-200 focus:border-rose-500 text-slate-800'}`}
                        />
                        <button 
                            onClick={() => {
                                if(customNegativeReason.trim()) {
                                    confirmNegativeBehavior(customNegativeReason, -1);
                                }
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold active:scale-95 flex items-center gap-1 transition-colors ${isRamadan ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
                        >
                            <Plus size={14} /> إضافة
                        </button>
                    </div>
                </div>
            </div>
        </Modal>

        <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} className={`max-w-md rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
            {editingStudent && (
                 <div className={`text-center p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white shadow-2xl' : 'bg-white border-transparent text-slate-800 shadow-2xl'}`}>
                    <h3 className="font-black text-xl mb-6">تعديل بيانات الطالب</h3>
                    <div className="space-y-3">
                        <input type="text" value={editingStudent.name} onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-gray-50 border-gray-200 focus:border-indigo-500 text-slate-800'}`} placeholder="الاسم" />
                        <select value={editingStudent.classes && editingStudent.classes.length > 0 ? editingStudent.classes[0] : ''} onChange={(e) => setEditingStudent({...editingStudent, classes: [e.target.value]})} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-gray-50 border-gray-200 focus:border-indigo-500 text-slate-800'}`}>
                            {safeClasses.map(c => <option key={c} value={c} className={isRamadan ? 'bg-[#0f172a]' : ''}>{c}</option>)}
                        </select>
                        <input type="tel" value={editingStudent.parentPhone || ''} onChange={(e) => setEditingStudent({...editingStudent, parentPhone: e.target.value})} className={`w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-indigo-400 text-white placeholder:text-indigo-200/40' : 'bg-gray-50 border-gray-200 focus:border-indigo-500 text-slate-800'}`} placeholder="رقم الهاتف" />
                        
                        <div className="relative mt-2">
                            <p className={`text-[10px] text-right mb-1 font-bold ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`}>الرقم المدني للطالب (أساسي لدخول ولي الأمر):</p>
                            <input 
                                type="number" 
                                value={editingStudent.parentCode || ''} 
                                onChange={(e) => setEditingStudent({...editingStudent, parentCode: e.target.value})}
                                placeholder="أدخل الرقم المدني هنا..."
                                className={`w-full p-4 rounded-xl font-mono text-center font-black tracking-widest outline-none border transition-colors ${isRamadan ? 'bg-black/50 border-amber-500/50 focus:border-amber-400 text-amber-400' : 'bg-amber-50 border-amber-200 focus:border-amber-500 text-slate-800'}`} 
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setEditingStudent({...editingStudent, gender: 'male'})} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${editingStudent.gender === 'male' ? (isRamadan ? 'bg-blue-500/20 border-blue-400/50 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-600') : (isRamadan ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-400')}`}>طالب 👨‍🎓</button>
                            <button onClick={() => setEditingStudent({...editingStudent, gender: 'female'})} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${editingStudent.gender === 'female' ? (isRamadan ? 'bg-pink-500/20 border-pink-400/50 text-pink-300' : 'bg-pink-50 border-pink-200 text-pink-600') : (isRamadan ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-400')}`}>طالبة 👩‍🎓</button>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={handleEditStudentSave} className={`flex-1 py-3 rounded-xl font-black text-sm shadow-lg transition-colors ${isRamadan ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>حفظ التعديلات</button>
                            <button onClick={() => { if(confirm('هل أنت متأكد من حذف الطالب؟')) { onDeleteStudent(editingStudent.id); setEditingStudent(null); }}} className={`px-4 py-3 border rounded-xl font-black text-sm transition-colors ${isRamadan ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}><Trash2 className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>

        <Modal isOpen={!!randomWinner} onClose={() => setRandomWinner(null)} className={`max-w-sm rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
            {randomWinner && (
                <div className={`text-center py-6 px-4 animate-in zoom-in duration-300 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white shadow-2xl' : 'bg-white border-transparent text-slate-800 shadow-2xl'}`}>
                    <div className="mb-6 relative inline-block">
                        <div className={`w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden mx-auto transition-colors ${isRamadan ? 'border-purple-500/50 bg-purple-900/30' : 'border-purple-200 bg-purple-50'}`}>
                            <StudentAvatar 
                                gender={randomWinner.gender}
                                className="w-full h-full"
                            />
                        </div>
                        <div className="absolute -top-3 -right-3 text-4xl animate-bounce">🎉</div>
                        <div className="absolute -bottom-2 -left-2 text-4xl animate-bounce" style={{animationDelay: '0.2s'}}>✨</div>
                    </div>
                    <h2 className="text-2xl font-black mb-1">{randomWinner.name}</h2>
                    <p className={`text-sm font-bold inline-block px-3 py-1 rounded-full mb-6 transition-colors ${isRamadan ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600'}`}>
                        {randomWinner.classes[0]}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => { handleBehavior(randomWinner, 'positive'); setRandomWinner(null); }} className={`flex-1 py-3 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all ${isRamadan ? 'bg-emerald-500 text-white shadow-emerald-900/50 hover:bg-emerald-400' : 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600'}`}>
                            تعزيز
                        </button>
                        <button onClick={() => setRandomWinner(null)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${isRamadan ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            إغلاق
                        </button>
                    </div>
                </div>
            )}
        </Modal>

        <Modal isOpen={showTimerModal} onClose={() => setShowTimerModal(false)} className={`max-w-xs rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
            <div className={`text-center p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white shadow-2xl' : 'bg-white border-transparent text-slate-800 shadow-2xl'}`}>
                <h3 className="font-black text-lg mb-4 flex items-center justify-center gap-2">
                    <Timer className={`w-5 h-5 ${isRamadan ? 'text-amber-400' : 'text-amber-500'}`}/> المؤقت
                </h3>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {[1, 3, 5, 10, 15, 20].map(min => (
                        <button 
                            key={min} 
                            onClick={() => startTimer(min)} 
                            className={`border rounded-xl py-2 text-xs font-bold transition-all active:scale-95 ${isRamadan ? 'bg-[#1e293b] border-white/10 text-slate-300 hover:bg-indigo-500/20 hover:border-indigo-400/50 hover:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600'}`}
                        >
                            {min} د
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 items-center mb-4">
                    <input 
                        type="number" 
                        value={timerInput} 
                        onChange={(e) => setTimerInput(e.target.value)} 
                        className={`w-full border rounded-xl py-2 px-3 text-center font-black outline-none transition-colors ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-indigo-400 text-white placeholder:text-indigo-200/40' : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400'}`} 
                        placeholder="دقيقة"
                    />
                    <button 
                        onClick={() => startTimer(Number(timerInput))} 
                        className={`p-2.5 rounded-xl active:scale-95 shadow-lg transition-colors ${isRamadan ? 'bg-indigo-500 shadow-indigo-900/50 hover:bg-indigo-400' : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'}`}
                    >
                        <Play size={16} fill="white" className="text-white" />
                    </button>
                </div>

                {isTimerRunning && (
                    <div className={`border-t pt-4 mt-2 ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
                        <h2 className="text-4xl font-black mb-4 font-mono">{formatTime(timerSeconds)}</h2>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => setIsTimerRunning(false)} className={`p-3 rounded-full border active:scale-95 transition-colors ${isRamadan ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}>
                                <Pause size={20} fill="currentColor" />
                            </button>
                            <button onClick={() => { setIsTimerRunning(false); setTimerSeconds(0); }} className={`p-3 rounded-full border active:scale-95 transition-colors ${isRamadan ? 'bg-white/10 text-slate-300 border-white/20 hover:bg-white/20' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}>
                                <RotateCcw size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>

    </div>
  );
};

export default StudentList;
