import React, { useState, useEffect, useMemo } from 'react';
import { Student, BehaviorType } from '../types';
import {
    Search, ThumbsUp, ThumbsDown, Edit2, Trash2, LayoutGrid, UserPlus,
    FileSpreadsheet, MoreVertical, Settings, Users, AlertCircle,
    Dices, Timer, Play, Pause, RotateCcw, CheckCircle2, MessageCircle, Plus,
    Sparkles, Send, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import ExcelImport from './ExcelImport';
import { useApp } from '../context/AppContext';
import { StudentAvatar } from './StudentAvatar';
import { Drawer as DrawerSheet } from './ui/Drawer';
import PageLayout from '../components/PageLayout';
import { StudentRow } from './StudentRow';
import positiveSound from '../assets/positive.mp3';
import negativeSound from '../assets/negative.mp3';
import tadaSound from '../assets/tada.mp3';
import alarmSound from '../assets/alarm.mp3';

interface StudentListProps {
    students: Student[];
    classes: string[];
    onAddClass: (name: string) => void;
    onAddStudentManually: (name: string, className: string, phone?: string, avatar?: string, gender?: 'male' | 'female', civilID?: string) => void;
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


// =========================================================================
// 🔐 أدوات منع تكرار الطالب داخل StudentList
// =========================================================================

const normalizeArabicNameForIdentity = (value: string) => {
    return String(value || '')
        .trim()
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ؤئء]/g, '')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[ًٌٍَُِّْـ]/g, '')
        .replace(/عبد\s+/g, 'عبد')
        .replace(/\s+/g, ' ')
        .toLowerCase();
};

const normalizeArabicDigitsForIdentity = (value: string) => {
    const arabicDigits: Record<string, string> = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
    };

    return String(value || '').replace(/[٠-٩۰-۹]/g, digit => arabicDigits[digit] || digit);
};

const normalizeClassForIdentity = (value: string) => {
    return normalizeArabicDigitsForIdentity(value)
        .trim()
        .replace(/\s+/g, '')
        .replace(/الصف/g, '')
        .replace(/صف/g, '')
        .replace(/الفصل/g, '')
        .replace(/الشعبة/g, '')
        .replace(/شعبة/g, '')
        .replace(/\\/g, '/')
        .replace(/-/g, '/')
        .replace(/الأول|اول/g, '1')
        .replace(/الثاني|ثاني/g, '2')
        .replace(/الثالث|ثالث/g, '3')
        .replace(/الرابع|رابع/g, '4')
        .replace(/الخامس|خامس/g, '5')
        .replace(/السادس|سادس/g, '6')
        .replace(/السابع|سابع/g, '7')
        .replace(/الثامن|ثامن/g, '8')
        .replace(/التاسع|تاسع/g, '9')
        .replace(/العاشر|عاشر/g, '10')
        .replace(/الحاديعشر|حاديعشر/g, '11')
        .replace(/الثانيعشر|ثانيعشر/g, '12')
        .toLowerCase();
};

const getStudentClassValueForIdentity = (student: Partial<Student> | any) => {
    return String(
        student?.classes?.[0] ||
        student?.className ||
        student?.class ||
        ''
    ).trim();
};

const getExistingRasedCodeFromStudent = (student: any) => {
    const code = String(
        student?.rasedId ||
        student?.rasedID ||
        student?.parentCode ||
        student?.secretCode ||
        student?.civilID ||
        student?.civilId ||
        ''
    ).trim().toUpperCase();

    return code.startsWith('RSD-') ? code : '';
};

const makeStudentIdentityKey = (name: string, className: string) => {
    const normalizedName = normalizeArabicNameForIdentity(name).replace(/\s+/g, '');
    const normalizedClass = normalizeClassForIdentity(className);
    return `${normalizedName}_${normalizedClass}`;
};

const findExistingStudentByNameAndClass = (
    studentsList: Student[],
    name: string,
    className: string
) => {
    const targetKey = makeStudentIdentityKey(name, className);

    return studentsList.find(student => {
        const studentKey = makeStudentIdentityKey(
            student.name || '',
            getStudentClassValueForIdentity(student)
        );

        return studentKey === targetKey;
    });
};

const mergeListByLooseId = (oldList: any[] = [], newList: any[] = []) => {
    const map = new Map<string, any>();

    [...oldList, ...newList].forEach(item => {
        if (!item) return;
        const key = String(item.id || item.date || JSON.stringify(item));
        if (!map.has(key)) map.set(key, item);
    });

    return Array.from(map.values());
};

const mergeStudentKeepingOldCode = (existing: Student, incoming: Student): Student => {
    const oldCode = getExistingRasedCodeFromStudent(existing);
    const incomingCode = getExistingRasedCodeFromStudent(incoming);
    const rasedCode = oldCode || incomingCode || (existing as any).rasedId || (incoming as any).rasedId;

    return {
        ...existing,
        ...incoming,
        id: existing.id || incoming.id,
        name: incoming.name || existing.name,
        classes: existing.classes?.length ? existing.classes : incoming.classes,
        parentPhone: incoming.parentPhone || existing.parentPhone,
        avatar: incoming.avatar || existing.avatar,
        gender: incoming.gender || existing.gender,
        behaviors: mergeListByLooseId(existing.behaviors, incoming.behaviors),
        grades: mergeListByLooseId(existing.grades, incoming.grades),
        attendance: mergeListByLooseId(existing.attendance, incoming.attendance),
        rasedId: rasedCode,
        parentCode: rasedCode,
        secretCode: rasedCode
    } as Student;
};

const StudentList: React.FC<StudentListProps> = ({
    students = [],
    classes = [],
    onAddClass,
    onAddStudentManually,
    onUpdateStudent,
    onDeleteStudent,
    currentSemester,
    onDeleteClass
}) => {
    const { defaultStudentGender, setDefaultStudentGender, setStudents, teacherInfo, t, dir, language } = useApp();
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedGrade, setSelectedGrade] = useState<string>(() => sessionStorage.getItem('rased_grade') || 'all');
    const [selectedClass, setSelectedClass] = useState<string>(() => sessionStorage.getItem('rased_class') || 'all');

    const isRamadan = false;

    useEffect(() => {
        sessionStorage.setItem('rased_grade', selectedGrade);
        sessionStorage.setItem('rased_class', selectedClass);
    }, [selectedGrade, selectedClass]);

    const [showManualAddModal, setShowManualAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAddClassModal, setShowAddClassModal] = useState(false);
    const [showManageClasses, setShowManageClasses] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const [showCardsModal, setShowCardsModal] = useState(false);

    const [newClassInput, setNewClassInput] = useState('');
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentPhone, setNewStudentPhone] = useState('');
    const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>(defaultStudentGender);
    const [newStudentClass, setNewStudentClass] = useState('');

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

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isTimerRunning && timerSeconds > 0) {
            if (timerSeconds === 10) {
                const countdownAudio = new Audio(SOUNDS.tada);
                countdownAudio.volume = 1.0;
                countdownAudio.play().catch((e) => console.error('Error playing audio', e));
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
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning, timerSeconds, t]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startTimer = (minutes: number) => {
        if (!Number.isFinite(minutes) || minutes <= 0) return;
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
    }, [safeClasses, newStudentClass]);

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
                if ((s as any).grade) {
                    grades.add((s as any).grade);
                } else if (s.classes && s.classes[0]) {
                    const normalizedClass = normalizeArabicDigitsForIdentity(s.classes[0]);
                    const match = normalizedClass.match(/^(\d+)/);
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
                matchesGrade = (student as any).grade === selectedGrade || normalizeArabicDigitsForIdentity(firstClass).startsWith(selectedGrade);
            }

            return nameMatch && matchesClass && matchesGrade;
        });
    }, [safeStudents, searchTerm, selectedClass, selectedGrade]);

    const studentsForCodesExport = useMemo(() => {
        return safeStudents.filter(student => {
            if (!student) return false;

            const studentClasses = student.classes || [];
            const matchesClass = selectedClass === 'all' || studentClasses.includes(selectedClass);

            let matchesGrade = true;
            if (selectedGrade !== 'all') {
                const firstClass = studentClasses[0] || '';
                matchesGrade = (student as any).grade === selectedGrade || normalizeArabicDigitsForIdentity(firstClass).startsWith(selectedGrade);
            }

            return matchesClass && matchesGrade;
        });
    }, [safeStudents, selectedClass, selectedGrade]);

    const sanitizeFileName = (value: string) => {
        return String(value || 'students')
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, '_')
            .slice(0, 80);
    };

    const getStudentRasedCode = (student: Student) => {
        return String(
            (student as any).rasedId ||
            (student as any).parentCode ||
            (student as any).secretCode ||
            student.id ||
            ''
        ).trim().toUpperCase();
    };

    const handleExportStudentCodesExcel = async () => {
        if (studentsForCodesExport.length === 0) {
            alert('لا توجد أسماء طلاب للتصدير حسب الصف أو الفصل المحدد.');
            return;
        }

        const exportRows = studentsForCodesExport.map((student, index) => {
            const className = student.classes && student.classes.length > 0 ? student.classes[0] : 'غير محدد';

            return {
                'م': index + 1,
                'اسم الطالب': student.name || '',
                'الصف / الفصل': className,
                'كود راصد السري': getStudentRasedCode(student),
                'رقم ولي الأمر': student.parentPhone || '',
                'النوع': student.gender === 'female' ? 'طالبة' : 'طالب'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        worksheet['!cols'] = [
            { wch: 6 },
            { wch: 32 },
            { wch: 18 },
            { wch: 20 },
            { wch: 18 },
            { wch: 12 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'أكواد الطلاب');

        const datePart = new Date().toLocaleDateString('en-CA');
        const filterPart = selectedClass !== 'all'
            ? selectedClass
            : selectedGrade !== 'all'
                ? `الصف_${selectedGrade}`
                : 'كل_الطلاب';

        const fileName = `Rased_Student_Codes_${sanitizeFileName(filterPart)}_${datePart}.xlsx`;

        try {
            if (Capacitor.isNativePlatform()) {
                const base64Data = XLSX.write(workbook, {
                    bookType: 'xlsx',
                    type: 'base64'
                });

                await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Documents
                });

                alert(
                    `تم حفظ ملف أكواد الطلاب بنجاح على الجهاز.\n\n` +
                    `اسم الملف:\n${fileName}\n\n` +
                    `الموقع: مستندات التطبيق / Documents`
                );

                return;
            }

            XLSX.writeFile(workbook, fileName);
        } catch (error) {
            console.error('Export student codes failed:', error);
            alert('تعذر إنشاء ملف Excel. حاول مرة أخرى.');
        }
    };

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

        const eligibleStudents = filteredStudents.filter(student => {
            const attendanceRecord = student.attendance?.find(a => a.date === todayStr);
            const isAbsentOrTruant = attendanceRecord?.status === 'absent' || attendanceRecord?.status === 'truant';
            if (isAbsentOrTruant) return false;

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
            alert(t('alertNoPresentStudentsForDraw') || 'لا يوجد طلاب متاحين للقرعة (الجميع غائب أو لديه سلوك سلبي)');
            return;
        }

        let candidates = eligibleStudents.filter(s => !pickedStudentIds.includes(s.id));

        if (candidates.length === 0) {
            if (confirm(t('alertAllPresentSelected') || 'تم سحب جميع الطلاب المتاحين. هل تريد تصفير القرعة والبدء من جديد؟')) {
                setPickedStudentIds([]);
                candidates = eligibleStudents;
            } else {
                return;
            }
        }

        const randomIndex = Math.floor(Math.random() * candidates.length);
        const winner = candidates[randomIndex];

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
            points,
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
            points,
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
        const name = newStudentName.trim();
        const className = newStudentClass.trim();
        if (!name || !className) {
            alert(t('alertEnterStudentInfo'));
            return;
        }

        const existingStudent = findExistingStudentByNameAndClass(safeStudents, name, className);
        if (existingStudent) {
            alert(
                `تم العثور على الطالب مسبقًا في نفس الفصل.\n\n` +
                `الطالب: ${existingStudent.name}\n` +
                `الفصل: ${getStudentClassValueForIdentity(existingStudent)}\n` +
                `كود راصد: ${getExistingRasedCodeFromStudent(existingStudent) || 'غير محدد'}\n\n` +
                `لن يتم إنشاء كود جديد للطالب.`
            );
            setNewStudentName('');
            setNewStudentPhone('');
            setShowManualAddModal(false);
            return;
        }

        onAddStudentManually(name, className, newStudentPhone, undefined, newStudentGender);
        setNewStudentName('');
        setNewStudentPhone('');
        setShowManualAddModal(false);
    };

    const handleAddClassSubmit = () => {
        const className = newClassInput.trim();
        if (className) {
            onAddClass(className);
            setNewClassInput('');
            setShowAddClassModal(false);
        }
    };

    const handleEditStudentSave = () => {
        if (editingStudent) {
            const editedClass = getStudentClassValueForIdentity(editingStudent);
            const duplicate = safeStudents.find(student => {
                if (student.id === editingStudent.id) return false;
                return makeStudentIdentityKey(student.name || '', getStudentClassValueForIdentity(student)) ===
                    makeStudentIdentityKey(editingStudent.name || '', editedClass);
            });

            if (duplicate) {
                alert(
                    `يوجد طالب آخر بنفس الاسم والفصل.\n\n` +
                    `الطالب: ${duplicate.name}\n` +
                    `الفصل: ${getStudentClassValueForIdentity(duplicate)}\n` +
                    `كود راصد: ${getExistingRasedCodeFromStudent(duplicate) || 'غير محدد'}\n\n` +
                    `يرجى تعديل الاسم أو الفصل لتجنب دمج طالبين مختلفين.`
                );
                return;
            }
            onUpdateStudent(editingStudent);
            setEditingStudent(null);
        }
    };

    const handleBatchGenderUpdate = (gender: 'male' | 'female') => {
        if (confirm(t('alertConfirmGenderChange'))) {
            setDefaultStudentGender(gender);
            setStudents(prev => prev.map(s => ({ ...s, gender, avatar: undefined })));
        }
    };

    return (
        <PageLayout
            title={t('studentsTitle')}
            subtitle={`${safeStudents.length} ${t('registeredStudents')}`}
            icon={<Users size={24} />}
            rightActions={
                <div className="flex items-center gap-2 flex-nowrap shrink-0 overflow-visible" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <div className="relative shrink-0">
                        <button
                            data-voice-command="فتح المؤقت مؤقت الحصة افتح العداد"
                            aria-label="فتح المؤقت"
                            onClick={() => setShowTimerModal(true)}
                            className={`w-10 h-10 shrink-0 rounded-xl border active:scale-95 transition-all flex items-center justify-center shadow-sm ${
                                timerSeconds > 0
                                    ? 'bg-warning text-white border-warning animate-pulse'
                                    : 'bg-bgCard border-borderColor text-textPrimary hover:bg-bgSoft'
                            }`}
                            title={t('timerTitle')}
                        >
                            <Timer className="w-5 h-5" />
                        </button>
                        {timerSeconds > 0 && (
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black bg-warning text-white px-1.5 py-0.5 rounded-full shadow">
                                {formatTime(timerSeconds)}
                            </span>
                        )}
                    </div>

                    <button
                        data-voice-command="اختيار طالب عشوائي القرعة قرعة عشوائية اختر طالب"
                        aria-label="اختيار طالب عشوائي"
                        onClick={handleRandomPick}
                        className="w-10 h-10 shrink-0 rounded-xl border border-borderColor bg-bgCard text-textPrimary hover:bg-bgSoft active:scale-95 transition-all flex items-center justify-center shadow-sm"
                        title={t('randomDraw')}
                    >
                        <Dices className="w-5 h-5 text-primary" />
                    </button>

                    <div className="relative z-[9999] shrink-0">
                        <button
                            data-voice-command="فتح قائمة الطلاب المزيد خيارات الطلاب"
                            aria-label="فتح قائمة الطلاب"
                            onClick={() => setShowMenu(!showMenu)}
                            className={`w-10 h-10 shrink-0 rounded-xl border active:scale-95 transition-all flex items-center justify-center shadow-sm ${
                                showMenu
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-bgCard border-borderColor text-textPrimary hover:bg-bgSoft'
                            }`}
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                <div className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-full mt-2 w-60 rounded-2xl shadow-elevated border overflow-hidden z-50 animate-in zoom-in-95 origin-top-left bg-bgCard border-borderColor text-textPrimary`}>
                                    <div className="p-1.5">
                                        <button
                                            data-voice-command="تحميل أكواد الطلاب Excel تصدير أكواد الطلاب أسماء الطلاب"
                                            onClick={() => {
                                                handleExportStudentCodesExcel();
                                                setShowMenu(false);
                                            }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold hover:bg-bgSoft text-textPrimary`}
                                        >
                                            <FileSpreadsheet className="w-4 h-4 text-success" />
                                            تحميل أسماء وأكواد الطلاب Excel
                                        </button>

                                        <div className="my-1 border-t border-borderColor" />

                                        <button
                                            data-voice-command="هدوء وانضباط مكافأة الانضباط تعزيز الجميع"
                                            onClick={handleQuietAndDiscipline}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold hover:bg-bgSoft text-textPrimary`}
                                        >
                                            <Sparkles className="w-4 h-4 text-warning" />
                                            {t('rewardDiscipline')}
                                        </button>

                                        <button
                                            data-voice-command="إضافة طالب يدوي إضافة طالب جديد"
                                            onClick={() => { setShowManualAddModal(true); setShowMenu(false); }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold hover:bg-bgSoft text-textPrimary`}
                                        >
                                            <UserPlus className="w-4 h-4 text-primary" />
                                            {t('addStudentManually')}
                                        </button>

                                        <button
                                            data-voice-command="استيراد الطلاب من إكسل استيراد إكسل"
                                            onClick={() => { setShowImportModal(true); setShowMenu(false); }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold hover:bg-bgSoft text-textPrimary`}
                                        >
                                            <FileSpreadsheet className="w-4 h-4 text-success" />
                                            {t('importFromExcelMenu')}
                                        </button>

                                        <div className="my-1 border-t border-borderColor" />

                                        <button
                                            data-voice-command="إضافة فصل جديد فصل جديد"
                                            onClick={() => { setShowAddClassModal(true); setShowMenu(false); }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold hover:bg-bgSoft text-textPrimary`}
                                        >
                                            <LayoutGrid className="w-4 h-4 text-warning" />
                                            {t('addNewClassMenu')}
                                        </button>

                                        <button
                                            data-voice-command="إدارة الفصول إعدادات الفصول"
                                            onClick={() => { setShowManageClasses(true); setShowMenu(false); }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} text-xs font-bold hover:bg-bgSoft text-textPrimary`}
                                        >
                                            <Settings className="w-4 h-4 text-textSecondary" />
                                            {t('manageClassesMenu')}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            }
            leftActions={
                <div className="space-y-3 relative z-10 w-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <div className="w-full flex flex-col md:flex-row gap-2 md:items-center">
                        <div className="overflow-x-auto no-scrollbar flex-1">
                            <div className="inline-flex items-center p-1 rounded-2xl border transition-all bg-bgCard border-borderColor shadow-sm">
                                <button
                                    type="button"
                                    data-voice-command="عرض كل الطلاب كل الطلاب"
                                    aria-label="عرض كل الطلاب"
                                    onClick={() => {
                                        setSelectedGrade('all');
                                        setSelectedClass('all');
                                    }}
                                    className={`px-5 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                                        selectedGrade === 'all' && selectedClass === 'all'
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-textSecondary hover:text-textPrimary hover:bg-bgSoft'
                                    }`}
                                >
                                    {t('all')}
                                </button>
                                {availableGrades.map(g => (
                                    <React.Fragment key={`grade-${g}`}>
                                        <div className="w-[1px] h-4 mx-1 rounded-full shrink-0 bg-borderColor" />
                                        <button
                                            type="button"
                                            data-voice-command={`عرض الصف ${g}`}
                                            aria-label={`عرض الصف ${g}`}
                                            onClick={() => {
                                                setSelectedGrade(g);
                                                setSelectedClass('all');
                                            }}
                                            className={`px-5 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                                                selectedGrade === g && selectedClass === 'all'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-textSecondary hover:text-textPrimary hover:bg-bgSoft'
                                            }`}
                                        >
                                            {t('gradePrefix')} {g}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        <div className="relative w-full md:w-60 shrink-0">
                            <select
                                data-voice-field="فصل الطلاب"
                                aria-label="اختيار فصل الطلاب"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full h-11 rounded-2xl border border-borderColor bg-bgCard px-4 text-sm font-black text-textPrimary outline-none shadow-sm transition-all focus:border-primary/40 focus:bg-bgSoft"
                            >
                                <option value="all">كل الفصول</option>
                                {safeClasses
                                    .filter(c => selectedGrade === 'all' || normalizeArabicDigitsForIdentity(c).startsWith(selectedGrade))
                                    .map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                            </select>
                        </div>
                    </div>
                </div>
            }
        >
            <div className="animate-in fade-in duration-500 pt-2">
                <div className="relative w-full mb-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <Search className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} top-3.5 w-5 h-5 text-textSecondary`} />
                    <input
                        type="text"
                        data-voice-field="بحث الطلاب"
                        aria-label="بحث الطلاب"
                        placeholder={t('searchStudent')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full border rounded-2xl py-3 ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm font-bold outline-none transition-all bg-bgCard border-borderColor text-textPrimary placeholder:text-textSecondary focus:bg-bgSoft focus:border-primary/40`}
                    />
                </div>

                {filteredStudents.length > 0 ? (
                    <div className="space-y-2.5 pb-6">
                        {filteredStudents.map((student, index) => {
                            const totalPoints = calculateTotalPoints(student);
                            const studentClass = student.classes && student.classes.length > 0 ? student.classes[0] : t('unspecified');

                            return (
                                <StudentRow
                                    key={student.id}
                                    student={student}
                                    dir={dir}
                                    subtitle={studentClass}
                                    badge={totalPoints !== 0 ? `${totalPoints}` : undefined}
                                    badgeTone={totalPoints >= 0 ? 'warning' : 'danger'}
                                    statusText={totalPoints !== 0 ? `${totalPoints} نقطة هذا الشهر` : undefined}
                                    statusTone={totalPoints >= 0 ? 'warning' : 'danger'}
                                    indexLabel={index + 1}
                                    actions={[
                                        { key: 'positive', label: 'تعزيز', icon: ThumbsUp, tone: 'success', showOnMobile: true, voiceCommand: `تعزيز إيجابي ${student.name} افتح تعزيز ${student.name} نقاط تعزيز ${student.name}`, ariaLabel: `تعزيز إيجابي ${student.name}`, title: `تعزيز إيجابي ${student.name}`, onClick: () => handleBehavior(student, 'positive') },
                                        { key: 'negative', label: 'تنبيه', icon: ThumbsDown, tone: 'danger', showOnMobile: true, voiceCommand: `سلوك سلبي ${student.name} تنبيه سلوكي ${student.name} افتح تنبيه ${student.name} خصم سلوك ${student.name}`, ariaLabel: `تنبيه سلوكي ${student.name}`, title: `تنبيه سلوكي ${student.name}`, danger: true, onClick: () => handleBehavior(student, 'negative') },
                                        { key: 'smart-report', label: 'تميز', icon: MessageCircle, tone: 'info', showOnMobile: false, voiceCommand: `تقرير تميز ${student.name} تقرير درجات ${student.name} واتساب ${student.name}`, ariaLabel: `تقرير الدرجات والتميز ${student.name}`, title: 'تقرير الدرجات والتميز (واتساب)', onClick: () => handleSendSmartReport(student) },
                                        { key: 'negative-report', label: 'إنذار', icon: Send, tone: 'warning', showOnMobile: false, voiceCommand: `تقرير سلوكي ${student.name} إنذار ${student.name} إرسال إنذار ${student.name}`, ariaLabel: `تقرير سلوكي إنذار ${student.name}`, title: 'تقرير سلوكي إنذار (واتساب)', onClick: () => handleSendNegativeReport(student) },
                                        { key: 'edit', label: 'تعديل', icon: Edit2, tone: 'neutral', showOnMobile: false, voiceCommand: `تعديل بيانات ${student.name} تعديل الطالب ${student.name}`, ariaLabel: `تعديل بيانات ${student.name}`, title: t('editStudentData'), onClick: () => setEditingStudent(student) }
                                    ]}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
                        <UserPlus className="w-16 h-16 mb-4 text-textSecondary/50" />
                        <p className="text-sm font-bold text-textSecondary">{t('noMatchingStudents')}</p>
                        {safeClasses.length === 0 && (
                            <p className="text-xs mt-2 font-bold cursor-pointer text-primary" onClick={() => setShowAddClassModal(true)}>
                                {t('startByAddingClass')}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <DrawerSheet isOpen={showCardsModal} onClose={() => setShowCardsModal(false)} isRamadan={isRamadan} dir={dir} mode="full">
                <div className="flex flex-col h-full w-full bg-bgSoft">
                    <div className="flex justify-between items-center p-6 border-b border-borderColor bg-bgCard shrink-0 print:hidden">
                        <div><h3 className="font-black text-xl text-primary flex items-center gap-2"><Printer className="w-6 h-6" /> بطاقات راصد السرية (جوازات المرور)</h3><p className="text-xs text-textSecondary font-bold mt-1">قم بطباعة هذه البطاقات وتوزيعها على الطلاب ليتمكن أولياء الأمور من الدخول</p></div>
                        <button onClick={() => window.print()} className="px-6 py-2.5 bg-primary text-white text-sm font-black rounded-xl shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2"><Printer size={18} /> بدء الطباعة</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible"><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-2 print:gap-4 print:w-full print:bg-white">{filteredStudents.map(student => <div key={student.id} className="bg-bgCard print:bg-white border-2 border-dashed border-borderColor print:border-gray-400 p-5 rounded-2xl flex flex-col items-center text-center shadow-sm relative overflow-hidden"><div className="absolute inset-0 flex items-center justify-center opacity-[0.03] print:opacity-[0.05] pointer-events-none"><Sparkles className="w-32 h-32 text-primary print:text-black" /></div><div className="relative z-10 w-full"><h4 className="font-black text-lg text-textPrimary print:text-black mb-1 line-clamp-1">{student.name}</h4><span className="text-xs font-bold bg-bgSoft print:bg-gray-100 text-textSecondary print:text-gray-600 px-3 py-1 rounded-full">الصف: {student.classes[0]}</span><div className="mt-5 mb-4 p-4 bg-primary/5 print:bg-gray-50 border border-primary/20 print:border-gray-300 rounded-xl w-full"><p className="text-[10px] font-bold text-textSecondary print:text-gray-500 mb-1 uppercase tracking-wider">كود الدخول السري</p><p className="font-mono text-xl md:text-2xl font-black text-primary print:text-black tracking-widest">{(student as any).rasedId || (student as any).parentCode || 'جاري التوليد...'}</p></div><p className="text-[9px] font-bold text-textSecondary/70 print:text-gray-500 leading-relaxed">يرجى إدخال هذا الكود في بوابة (ولي الأمر) أو (الطالب) لمتابعة التقييم المستمر.</p></div></div>)}</div></div>
                </div>
            </DrawerSheet>

            <DrawerSheet isOpen={showManualAddModal} onClose={() => setShowManualAddModal(false)} isRamadan={isRamadan} dir={dir} mode="side">
                <div className="flex flex-col h-full w-full text-center pb-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border shrink-0 bg-primary/10 text-primary border-primary/20"><UserPlus className="w-8 h-8" /></div>
                    <h3 className="font-black text-xl mb-6 shrink-0">{t('addStudentTitle')}</h3>
                    <div className="space-y-3 overflow-y-auto custom-scrollbar px-1 pb-4"><input type="text" placeholder={t('studentNamePlaceholder')} value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary" /><select value={newStudentClass} onChange={(e) => setNewStudentClass(e.target.value)} className="w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary"><option value="" disabled className="bg-bgCard">{t('selectClassPlaceholder')}</option>{safeClasses.map(c => <option key={c} value={c} className="bg-bgCard">{c}</option>)}</select><input type="tel" placeholder={t('parentPhoneOptional')} value={newStudentPhone} onChange={(e) => setNewStudentPhone(e.target.value)} className="w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary" /><div className="flex gap-2"><button onClick={() => setNewStudentGender('male')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${newStudentGender === 'male' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-transparent border-borderColor text-textSecondary'}`}>{t('maleStudent')}</button><button onClick={() => setNewStudentGender('female')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${newStudentGender === 'female' ? 'bg-pink-500/10 border-pink-500/30 text-pink-500' : 'bg-transparent border-borderColor text-textSecondary'}`}>{t('femaleStudent')}</button></div></div>
                    <div className="mt-auto pt-2 shrink-0"><button onClick={handleManualAddSubmit} disabled={!newStudentName || !newStudentClass} className="w-full py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 bg-primary text-white hover:bg-primary/80">{t('saveStudentBtn')}</button></div>
                </div>
            </DrawerSheet>

            <DrawerSheet isOpen={showImportModal} onClose={() => setShowImportModal(false)} isRamadan={isRamadan} dir={dir} mode="full"><div className="flex-1 w-full h-full flex flex-col"><ExcelImport existingClasses={safeClasses} onImport={(importedStudents) => { setStudents(prevStudents => { const updatedStudents: Student[] = [...prevStudents]; importedStudents.forEach((imported: Student) => { const importedClass = getStudentClassValueForIdentity(imported); const existingIndex = updatedStudents.findIndex(existing => makeStudentIdentityKey(existing.name || '', getStudentClassValueForIdentity(existing)) === makeStudentIdentityKey(imported.name || '', importedClass)); if (existingIndex >= 0) { updatedStudents[existingIndex] = mergeStudentKeepingOldCode(updatedStudents[existingIndex], imported); } else { updatedStudents.push(imported); } }); return updatedStudents; }); setShowImportModal(false); }} onAddClass={onAddClass} /></div></DrawerSheet>

            <DrawerSheet isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} isRamadan={isRamadan} dir={dir}><div className="flex flex-col h-full w-full text-center pb-4"><h3 className="font-black text-lg mb-4 shrink-0">{t('addNewClassTitle')}</h3><div className="flex-1"><input type="text" placeholder={t('classNameExample')} value={newClassInput} onChange={(e) => setNewClassInput(e.target.value)} className="w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary" /></div><div className="mt-auto pt-4 shrink-0"><button onClick={handleAddClassSubmit} className="w-full py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-colors bg-primary text-white hover:bg-primary/80">{t('addBtnSimple')}</button></div></div></DrawerSheet>

            <DrawerSheet isOpen={showManageClasses} onClose={() => setShowManageClasses(false)} isRamadan={isRamadan} dir={dir}><div className="flex flex-col h-full w-full text-center"><h3 className="font-black text-xl mb-6 shrink-0">{t('classSettingsTitle')}</h3><div className="rounded-2xl p-4 mb-6 border shrink-0 bg-primary/10 border-primary/20"><div className="flex items-center justify-center gap-2 mb-3 text-primary"><Users className="w-4 h-4" /><span className="font-bold text-sm">{t('schoolTypeBatchChange')}</span></div><div className="flex gap-3 mb-2"><button onClick={() => handleBatchGenderUpdate('male')} className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${defaultStudentGender === 'male' ? 'bg-bgCard border-blue-500 shadow-md text-blue-500' : 'bg-bgSoft border-borderColor hover:bg-bgCard text-textSecondary'}`}><span className="text-xl">👨‍🎓</span><span className="font-black text-sm">{t('boys')}</span></button><button onClick={() => handleBatchGenderUpdate('female')} className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${defaultStudentGender === 'female' ? 'bg-bgCard border-pink-500 shadow-md text-pink-500' : 'bg-bgSoft border-borderColor hover:bg-bgCard text-textSecondary'}`}><span className="text-xl">👩‍🎓</span><span className="font-black text-sm">{t('girls')}</span></button></div><p className="text-[10px] font-bold text-primary">{t('iconUnificationNote')}</p></div><div className="w-full h-px mb-6 shrink-0 bg-borderColor" /><div className="flex justify-between items-center mb-2 px-2 shrink-0"><span className="text-xs font-bold text-textSecondary">{t('deleteClassInstruction')}</span><span className="text-[10px] font-bold text-rose-500">{t('deleteClassWarning')}</span></div><div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-2">{safeClasses.map(cls => <div key={cls} className="flex justify-between items-center p-3 rounded-xl border transition-colors bg-transparent border-borderColor"><span className="font-bold text-sm text-textPrimary">{cls}</span><div className="flex gap-2"><button onClick={() => { if (onDeleteClass && confirm(t('alertConfirmDeleteClass'))) onDeleteClass(cls); }} className="p-2 rounded-lg transition-colors text-rose-500 bg-rose-500/10 hover:bg-rose-500/20"><Trash2 className="w-4 h-4" /></button></div></div>)}{safeClasses.length === 0 && <p className="text-xs text-textSecondary">{t('noClassesAdded')}</p>}</div></div></DrawerSheet>

            <DrawerSheet isOpen={showPositiveModal} onClose={() => { setShowPositiveModal(false); setSelectedStudentForBehavior(null); }} isRamadan={isRamadan} dir={dir}><div className="flex flex-col h-full w-full text-center pb-4"><h3 className="font-black text-lg flex items-center justify-center gap-2 mb-4 shrink-0 text-textPrimary"><CheckCircle2 className="w-5 h-5 text-emerald-500" />{t('positiveReinforcement')}</h3><p className="text-xs font-bold mb-4 shrink-0 text-textSecondary">{t('chooseExcellenceType')} <bdi className="text-primary">{selectedStudentForBehavior?.name}</bdi></p><div className="flex-1 overflow-y-auto custom-scrollbar px-1"><div className="grid grid-cols-2 gap-2 mb-4">{POSITIVE_BEHAVIORS.map(b => <button key={b.id} onClick={() => confirmPositiveBehavior(b.original, b.points)} className="p-3 border rounded-xl text-xs font-bold active:scale-95 transition-all flex flex-col items-center gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20"><span>{t(b.transKey)}</span><span className="text-[10px] px-2 py-0.5 rounded-full shadow-sm bg-bgCard text-emerald-600">+{b.points}</span></button>)}</div></div><div className="pt-3 border-t shrink-0 mt-auto border-borderColor"><p className={`text-[10px] font-bold mb-2 ${dir === 'rtl' ? 'text-right' : 'text-left'} text-textSecondary`}>{t('orAddCustomBehavior')}</p><div className="flex gap-2"><input type="text" value={customPositiveReason} onChange={(e) => setCustomPositiveReason(e.target.value)} placeholder={t('otherReasonPlaceholder')} className="flex-1 border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-colors bg-bgCard border-borderColor focus:border-emerald-500 text-textPrimary" /><button onClick={() => { if (customPositiveReason.trim()) confirmPositiveBehavior(customPositiveReason, 1); }} className="px-4 py-2 rounded-lg text-xs font-bold active:scale-95 flex items-center gap-1 transition-colors bg-emerald-500 text-white hover:bg-emerald-600"><Plus size={14} /> {t('addBtnSmall')}</button></div></div></div></DrawerSheet>

            <DrawerSheet isOpen={showNegativeModal} onClose={() => { setShowNegativeModal(false); setSelectedStudentForBehavior(null); }} isRamadan={isRamadan} dir={dir}><div className="flex flex-col h-full w-full text-center pb-4"><h3 className="font-black text-lg flex items-center justify-center gap-2 mb-4 shrink-0 text-textPrimary"><AlertCircle className="w-5 h-5 text-rose-500" />{t('behavioralAlert')}</h3><p className="text-xs font-bold mb-4 shrink-0 text-textSecondary">{t('chooseNoteType')} <bdi className="text-primary">{selectedStudentForBehavior?.name}</bdi></p><div className="flex-1 overflow-y-auto custom-scrollbar px-1"><div className="grid grid-cols-2 gap-2 mb-4">{NEGATIVE_BEHAVIORS.map(b => <button key={b.id} onClick={() => confirmNegativeBehavior(b.original, b.points)} className="p-3 border rounded-xl text-xs font-bold active:scale-95 transition-all flex flex-col items-center gap-1 bg-rose-500/10 border-rose-500/30 text-rose-600 hover:bg-rose-500/20"><span>{t(b.transKey)}</span><span className="text-[10px] px-2 py-0.5 rounded-full shadow-sm bg-bgCard text-rose-600">{b.points}</span></button>)}</div></div><div className="pt-3 border-t shrink-0 mt-auto border-borderColor"><p className={`text-[10px] font-bold mb-2 ${dir === 'rtl' ? 'text-right' : 'text-left'} text-textSecondary`}>{t('orAddCustomNote')}</p><div className="flex gap-2"><input type="text" value={customNegativeReason} onChange={(e) => setCustomNegativeReason(e.target.value)} placeholder={t('otherReasonPlaceholder')} className="flex-1 border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-colors bg-bgCard border-borderColor focus:border-rose-500 text-textPrimary" /><button onClick={() => { if (customNegativeReason.trim()) confirmNegativeBehavior(customNegativeReason, -1); }} className="px-4 py-2 rounded-lg text-xs font-bold active:scale-95 flex items-center gap-1 transition-colors bg-rose-500 text-white hover:bg-rose-600"><Plus size={14} /> {t('addBtnSmall')}</button></div></div></div></DrawerSheet>

            <DrawerSheet isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} isRamadan={isRamadan} dir={dir}>{editingStudent && <div className="flex flex-col h-full w-full text-center pb-4"><h3 className="font-black text-xl mb-6 shrink-0 text-textPrimary">{t('editStudentData')}</h3><div className="space-y-3 flex-1 overflow-y-auto px-1 custom-scrollbar"><input type="text" value={editingStudent.name} onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })} className="w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary" placeholder={t('namePlaceholderSimple')} /><select value={editingStudent.classes && editingStudent.classes.length > 0 ? editingStudent.classes[0] : ''} onChange={(e) => setEditingStudent({ ...editingStudent, classes: [e.target.value] })} className="w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary">{safeClasses.map(c => <option key={c} value={c} className="bg-bgCard">{c}</option>)}</select><input type="tel" value={editingStudent.parentPhone || ''} onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })} className="w-full p-4 rounded-xl font-bold text-sm outline-none border transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary" placeholder={t('phoneNumberPlaceholder')} /><div className="flex gap-2 pt-2"><button onClick={() => setEditingStudent({ ...editingStudent, gender: 'male' })} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${editingStudent.gender === 'male' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : 'bg-transparent border-borderColor text-textSecondary'}`}>{t('maleStudent')}</button><button onClick={() => setEditingStudent({ ...editingStudent, gender: 'female' })} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${editingStudent.gender === 'female' ? 'bg-pink-500/10 border-pink-500/30 text-pink-500' : 'bg-transparent border-borderColor text-textSecondary'}`}>{t('femaleStudent')}</button></div></div><div className="flex gap-2 mt-4 shrink-0"><button onClick={handleEditStudentSave} className="flex-1 py-3 rounded-xl font-black text-sm shadow-lg transition-colors bg-primary text-white hover:bg-primary/80">{t('saveChangesBtn')}</button><button onClick={() => { if (confirm(t('alertConfirmDeleteStudent'))) { onDeleteStudent(editingStudent.id); setEditingStudent(null); } }} className="px-4 py-3 border rounded-xl font-black text-sm transition-colors bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20"><Trash2 className="w-5 h-5" /></button></div></div>}</DrawerSheet>

            <DrawerSheet isOpen={!!randomWinner} onClose={() => setRandomWinner(null)} isRamadan={isRamadan} dir={dir}>{randomWinner && <div className="flex flex-col h-full w-full text-center items-center justify-center pb-8 animate-in zoom-in duration-300"><div className="mb-6 relative inline-block"><div className="w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden mx-auto transition-colors border-purple-500/30 bg-purple-500/10"><StudentAvatar gender={randomWinner.gender} className="w-full h-full" /></div><div className={`absolute -top-3 ${dir === 'rtl' ? '-right-3' : '-left-3'} text-4xl animate-bounce`}>🎉</div><div className={`absolute -bottom-2 ${dir === 'rtl' ? '-left-2' : '-right-2'} text-4xl animate-bounce`} style={{ animationDelay: '0.2s' }}>✨</div></div><h2 className="text-2xl font-black mb-1 text-textPrimary">{randomWinner.name}</h2><p className="text-sm font-bold inline-block px-3 py-1 rounded-full mb-6 transition-colors bg-purple-500/10 text-purple-500">{randomWinner.classes[0]}</p><div className="flex gap-3 w-full"><button onClick={() => { handleBehavior(randomWinner, 'positive'); setRandomWinner(null); }} className="flex-1 py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all bg-emerald-500 text-white hover:bg-emerald-600">{t('reinforceBtn')}</button></div></div>}</DrawerSheet>

            <DrawerSheet isOpen={showTimerModal} onClose={() => setShowTimerModal(false)} isRamadan={isRamadan} dir={dir} mode="bottom"><div className="flex flex-col h-full w-full text-center pb-4"><h3 className="font-black text-lg mb-6 flex items-center justify-center gap-2 shrink-0 text-textPrimary"><Timer className="w-5 h-5 text-amber-500" /> {t('timerTitle')}</h3><div className="flex-1 overflow-y-auto custom-scrollbar"><div className="grid grid-cols-3 gap-2 mb-6">{[1, 3, 5, 10, 15, 20].map(min => <button key={min} onClick={() => startTimer(min)} className="border rounded-xl py-3 text-xs font-bold transition-all active:scale-95 bg-transparent border-borderColor text-textSecondary hover:bg-primary/10 hover:border-primary/30 hover:text-primary">{min} {t('minuteAbbrev')}</button>)}</div><div className="flex gap-2 items-center mb-6"><input type="number" value={timerInput} onChange={(e) => setTimerInput(e.target.value)} className="w-full border rounded-xl py-3 px-3 text-center font-black outline-none transition-colors bg-transparent border-borderColor focus:border-primary text-textPrimary placeholder:text-textSecondary" placeholder={t('minutePlaceholder')} /><button onClick={() => startTimer(Number(timerInput))} className="p-3.5 rounded-xl active:scale-95 shadow-lg transition-colors bg-primary hover:bg-primary/80"><Play size={18} className="text-white fill-white" /></button></div>{isTimerRunning && <div className="border-t pt-6 mt-4 border-borderColor"><h2 className="text-5xl font-black mb-6 font-mono text-textPrimary">{formatTime(timerSeconds)}</h2><div className="flex gap-3 justify-center"><button onClick={() => setIsTimerRunning(false)} className="p-4 rounded-full border active:scale-95 transition-colors bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20"><Pause size={24} fill="currentColor" /></button><button onClick={() => { setIsTimerRunning(false); setTimerSeconds(0); }} className="p-4 rounded-full border active:scale-95 transition-colors bg-bgSoft border-borderColor hover:bg-bgCard text-textPrimary"><RotateCcw size={24} /></button></div></div>}</div></div></DrawerSheet>
        </PageLayout>
    );
};

export default StudentList;
