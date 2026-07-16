import React, { useState, useEffect } from 'react';
// 💉 1. حقن ملف التوكنات الأصلي (الذي يحتوي على ألوان وهوية المعلم)
import './theme/tokens.css';

// 💉 2. حقن ملف الستايل الأساسي للمعلم
import './index.css';

import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './theme/ThemeProvider';

// 🚀 Icons
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  BarChart3,
  Settings as SettingsIcon,
  Info,
  FileText,
  BookOpen,
  Medal,
  Loader2,
  CheckSquare,
  Library,
  CloudSync,
  Fingerprint,
  School,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Unlock,
  Gamepad2,
  Mail
} from 'lucide-react';

import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// 🧱 Components
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import TeacherTasks from './components/TeacherTasks';
import AttendanceTracker from './components/AttendanceTracker';
import GradeBook from './components/GradeBook';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Leaderboard from './components/Leaderboard';
import About from './components/About';
import UserGuide from './components/UserGuide';
import BrandLogo from './components/BrandLogo';
import WelcomeScreen from './components/WelcomeScreen';
import StudentGroups from './components/StudentGroups';
import TeacherLibrary from './components/TeacherLibrary';
import GlobalSyncManager from './components/GlobalSyncManager';
import SeniorDashboard from './components/SeniorDashboard';
import VoiceAssistant from './components/VoiceAssistant';
import TeacherMailbox from './components/TeacherMailbox';
import { useAndroidScheduleWidgetSync } from './hooks/useAndroidScheduleWidgetSync';

// 🎮 بنك أسئلة الألعاب التعليمية
import TeacherGameQuestionsManager from './components/TeacherGameQuestionsManager';
import TeacherGameResultsDashboard from './components/TeacherGameResultsDashboard';
import type { TeacherGameResultLogEntry } from './components/TeacherGameResultsDashboard';
import type { PublishGameQuestionsPayload } from './components/TeacherGameQuestionsManager';

import { useSchoolBell } from './hooks/useSchoolBell';

// 🌍 The New Global Layout Engine
import { AppLayout } from './components/layout/AppLayout';

// رابط تطبيق الطالب
const STUDENT_APP_URL =
  'https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec';

// =========================================================================
// 🎮 تجهيز أسئلة الألعاب التعليمية قبل إرسالها لراصد الطالب
// =========================================================================
const sanitizeGameQuestionsForStudent = (questions: any[]) => {
  const today = new Date().toISOString().slice(0, 10);

  return (Array.isArray(questions) ? questions : [])
    .filter(q => q && q.active !== false)
    .filter(q => {
      if (!q.visibleFrom) return true;
      return String(q.visibleFrom) <= today;
    })
    .map(q => ({
      id: q.id,
      subject: q.subject,
      grade: q.grade,
      className: q.classes?.[0] || q.className || '',
      classes: q.classes || [],
      semester: q.semester || '1',
      unit: q.unit,
      lesson: q.lesson,
      gameTypes: q.gameTypes || [],
      questionType: q.questionType,
      question: q.question,
      options:
        q.questionType === 'true_false'
          ? ['صح', 'خطأ']
          : Array.isArray(q.options)
            ? q.options.filter((opt: string) => String(opt || '').trim())
            : [],
      correctAnswerIndex: q.correctAnswerIndex,
      correctAnswerText: q.correctAnswerText || '',
      pairs: q.pairs || [],
      sequence: q.sequence || [],
      hints: q.hints || [],
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'easy',
      skill: q.skill || 'فهم',
      active: q.active !== false,
      visibleFrom: q.visibleFrom || today
    }));
};

// ==================================================================
// 🛡️ شاشة تسجيل الدخول الأمنية - راصد المعلم
// ==================================================================
const TeacherLoginScreen: React.FC<{
  onLogin: () => void;
  teacherInfo: any;
  setTeacherInfo: any;
}> = ({ onLogin, teacherInfo, setTeacherInfo }) => {
  const LOCK_READY_KEY = 'rased_teacher_lock_ready';
  const CIVIL_ID_KEY = 'rased_teacher_civil_id';
  const SCHOOL_CODE_KEY = 'rased_admin_school_code';

  const savedCivilId = localStorage.getItem(CIVIL_ID_KEY);
  const savedSchoolCode = localStorage.getItem(SCHOOL_CODE_KEY);
  const lockReady = localStorage.getItem(LOCK_READY_KEY) === 'true';

  const hasSavedLock = Boolean(lockReady && savedCivilId && savedSchoolCode);
  const isFirstTime = !hasSavedLock;

  const [civilId, setCivilId] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const enteredCivilId = civilId.trim();
    const enteredSchoolCode = schoolCode.trim();

    if (!enteredCivilId || !enteredSchoolCode) return;

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      if (!hasSavedLock) {
        localStorage.setItem(CIVIL_ID_KEY, enteredCivilId);
        localStorage.setItem(SCHOOL_CODE_KEY, enteredSchoolCode);
        localStorage.setItem(LOCK_READY_KEY, 'true');

        if (setTeacherInfo) {
          setTeacherInfo((prev: any) => ({
            ...prev,
            civilId: enteredCivilId
          }));
        }

        setIsLoading(false);
        onLogin();
        return;
      }

      const isCivilIdValid = enteredCivilId === savedCivilId;
      const isSchoolCodeValid = enteredSchoolCode === savedSchoolCode;

      if (isCivilIdValid && isSchoolCodeValid) {
        setIsLoading(false);
        onLogin();
        return;
      }

      setIsLoading(false);
      setErrorMsg('بيانات الدخول غير مطابقة. الرجاء التأكد من الرقم الخاص وكود المدرسة.');
    }, 600);
  };

  const handleQuickLogin = () => {
    if (!hasSavedLock) return;

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 350);
  };

  const handleResetLock = () => {
    const confirmed = window.confirm(
      'هل أنت متأكد من رغبتك في فك قفل التطبيق؟ لن يتم مسح بيانات الطلاب أو الدرجات، سيتم فقط السماح بتسجيل بيانات دخول جديدة.'
    );

    if (!confirmed) return;

    localStorage.removeItem(CIVIL_ID_KEY);
    localStorage.removeItem(SCHOOL_CODE_KEY);
    localStorage.removeItem(LOCK_READY_KEY);

    setCivilId('');
    setSchoolCode('');
    setErrorMsg('');

    alert('تم إعادة ضبط قفل التطبيق بنجاح. يمكنك الآن تسجيل بيانات دخول جديدة.');
    window.location.reload();
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center font-sans overflow-hidden relative px-6 bg-bgMain text-textPrimary"
      dir="rtl"
    >
      <main className="w-full max-w-md relative z-10 flex flex-col items-center">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center p-5 rounded-2xl bg-bgCard mb-5 shadow-card border border-borderColor">
            {isFirstTime ? (
              <School className="w-12 h-12 text-primary" />
            ) : (
              <ShieldCheck className="w-12 h-12 text-success" />
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-textPrimary tracking-tight mb-2">
            راصد المعلم
          </h1>

          <p className="text-textSecondary font-bold tracking-wide text-sm">
            {isFirstTime ? 'إعداد قفل التطبيق لأول مرة' : 'بوابة الدخول الآمن'}
          </p>
        </div>

        <div className="w-full bg-bgCard rounded-[2rem] p-7 md:p-9 shadow-card border border-borderColor">
          {hasSavedLock && (
            <div className="mb-6 rounded-2xl border border-success/20 bg-success/10 p-4 text-center">
              <p className="text-sm font-black text-success mb-1">
                تم حفظ بيانات الدخول لهذا الجهاز
              </p>
              <p className="text-xs font-bold text-textSecondary">
                يمكنك الدخول مباشرة، أو إدخال البيانات يدويًا للتحقق.
              </p>

              <button
                type="button"
                onClick={handleQuickLogin}
                disabled={isLoading}
                className="w-full mt-4 bg-success text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <>
                    <span>دخول سريع</span>
                    <ArrowLeft className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-textSecondary px-1 text-right">
                الرقم الخاص للمعلم
              </label>

              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-primary">
                  <Fingerprint className="w-6 h-6" />
                </div>

                <input
                  type="number"
                  value={civilId}
                  onChange={(e) => setCivilId(e.target.value)}
                  className="block w-full pr-14 pl-4 py-4 bg-bgCard border border-borderColor rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary text-textPrimary font-black text-lg outline-none text-left placeholder:text-textSecondary"
                  placeholder="أدخل الرقم"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-textSecondary px-1 text-right">
                كود المدرسة
              </label>

              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-warning">
                  <School className="w-6 h-6" />
                </div>

                <input
                  type="text"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  className="block w-full pr-14 pl-4 py-4 bg-bgCard border border-borderColor rounded-2xl focus:ring-4 focus:ring-warning/10 focus:border-warning text-textPrimary font-black text-lg outline-none text-left placeholder:text-textSecondary uppercase"
                  placeholder="مثال: 1234"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 p-3 rounded-xl text-danger text-xs font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !civilId || !schoolCode}
              className="w-full mt-4 bg-primary hover:bg-primaryHover text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-card active:scale-95 transition-all disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <span>{isFirstTime ? 'تأكيد وحفظ القفل' : 'تحقق من البيانات'}</span>
                  <ArrowLeft className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {hasSavedLock && (
            <div className="mt-8 text-center border-t border-borderColor pt-6">
              <button
                type="button"
                onClick={handleResetLock}
                className="text-[11px] font-bold text-textSecondary hover:text-danger flex items-center justify-center gap-1.5 mx-auto transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" />
                هل نسيت بيانات القفل؟ اضغط هنا
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// ------------------------------------------------------------------
// BUSINESS LOGIC & ROUTING ONLY
// ------------------------------------------------------------------

const AppContent: React.FC = () => {
  const {
    isDataLoaded,
    students,
    setStudents,
    classes,
    setClasses,
    teacherInfo,
    setTeacherInfo,
    schedule,
    setSchedule,
    periodTimes,
    setPeriodTimes,
    currentSemester,
    setCurrentSemester,
    t,
    dir
  } = useApp();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [studentManagementView, setStudentManagementView] = useState<'students' | 'attendance' | 'groups'>('students');
  const [learningView, setLearningView] = useState<'grades' | 'tasks' | 'library'>('grades');
  const [gamesView, setGamesView] = useState<'questions' | 'results'>('questions');
  const [reportsView, setReportsView] = useState<'reports' | 'leaderboard'>('reports');
  const [adminView, setAdminView] = useState<'sync'>('sync');
  const [helpView, setHelpView] = useState<'settings' | 'guide' | 'about'>('guide');
  const [gameResults, setGameResults] = useState<TeacherGameResultLogEntry[]>([]);
  const [isLoadingGameResults, setIsLoadingGameResults] = useState(false);
  const [appVersion, setAppVersion] = useState('4.4.1');

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const lockReady = localStorage.getItem('rased_teacher_lock_ready') === 'true';
    const civilId = localStorage.getItem('rased_teacher_civil_id');
    const schoolCode = localStorage.getItem('rased_admin_school_code');

    return Boolean(lockReady && civilId && schoolCode);
  });

  const [showWelcome, setShowWelcome] = useState<boolean>(() => !localStorage.getItem('rased_welcome_seen'));
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => localStorage.getItem('bell_enabled') === 'true');

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        if ((window as any).electron && (window as any).electron.getAppVersion) {
          const ver = await (window as any).electron.getAppVersion();
          setAppVersion(ver);
        } else if (Capacitor.isNativePlatform()) {
          const info = await CapacitorApp.getInfo();
          setAppVersion(info.version);
        }
      } catch (error) {
        console.error('Version error', error);
      }
    };

    fetchVersion();
  }, []);

useSchoolBell(periodTimes, schedule, notificationsEnabled);

// 📱 مزامنة ويدجيت أندرويد: جدول الحصص الحالي والقادم
useAndroidScheduleWidgetSync({
  schedule,
  periodTimes,
  teacherInfo
});

const handleToggleNotifications = () => {
  setNotificationsEnabled(prev => {
    const newState = !prev;
    localStorage.setItem('bell_enabled', String(newState));
    return newState;
  });
};
  const handleFinishWelcome = () => {
    localStorage.setItem('rased_welcome_seen', 'true');
    setShowWelcome(false);
  };

  // =========================================================================
  // 🎮 نشر أسئلة الألعاب التعليمية إلى سحابة راصد الطالب
  // =========================================================================
  const handlePublishGameQuestions = async (payload: PublishGameQuestionsPayload) => {
    if (!payload.questions || payload.questions.length === 0) {
      alert('لا توجد أسئلة ألعاب صالحة للنشر.');
      return;
    }

    const studentGameQuestions = sanitizeGameQuestionsForStudent(payload.questions);

    localStorage.setItem('rased_teacher_published_game_questions', JSON.stringify(studentGameQuestions));

    const savedTasks = JSON.parse(localStorage.getItem('rased_teacher_tasks') || '[]');

    const gamesPayload = {
      action: 'gameQuestions',
      schoolCode: payload.schoolCode,
      teacherId: payload.teacherId,
      subject: payload.subject,
      grade: payload.grade,
      classes: payload.classes,
      students,
      tasks: savedTasks,
      gameQuestions: studentGameQuestions,
      className: 'الكل',
      timestamp: new Date().toISOString()
    };

    const response = await fetch(STUDENT_APP_URL, {
      method: 'POST',
      body: JSON.stringify(gamesPayload)
    });

    try {
      const result = await response.json();
      if (result && result.success === false) {
        throw new Error(result.error || 'فشل نشر أسئلة الألعاب.');
      }
    } catch {
      // بعض نشرات Apps Script قد لا ترجع JSON بشكل متوقع، لذلك لا نفشل إذا وصل الطلب.
    }
  };

  const fetchGameResults = async () => {
    setIsLoadingGameResults(true);
    try {
      const response = await fetch(STUDENT_APP_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'getGameResults',
          schoolCode:
            localStorage.getItem('rased_admin_school_code') ||
            (teacherInfo as any)?.schoolCode ||
            teacherInfo?.school ||
            'default_school',
          teacherId:
            teacherInfo?.civilId ||
            localStorage.getItem('rased_teacher_civil_id') ||
            'default_teacher'
        })
      });

      const result = await response.json();
      const results = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.results)
          ? result.results
          : [];

      setGameResults(results);
    } catch (error) {
      console.error('Failed to fetch game results', error);
      setGameResults([]);
    } finally {
      setIsLoadingGameResults(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'games' && gamesView === 'results') {
      fetchGameResults();
    }
  }, [activeTab, gamesView]);

  const mobileNavItems = [
    { id: 'dashboard', label: t('navDashboard') || (dir === 'rtl' ? 'الرئيسية' : 'Dashboard'), IconComponent: LayoutDashboard },
    ...(teacherInfo?.role === 'senior' ? [{ id: 'senior_dashboard', label: dir === 'rtl' ? 'القيادة' : 'Leader', IconComponent: ShieldCheck }] : []),
    { id: 'student_management', label: dir === 'rtl' ? 'الطلاب' : 'Students', IconComponent: Users },
    { id: 'mailbox', label: dir === 'rtl' ? 'البريد' : 'Mail', IconComponent: Mail },
    { id: 'learning_evaluation', label: dir === 'rtl' ? 'التعليم' : 'Learning', IconComponent: BookOpen },
    { id: 'games', label: dir === 'rtl' ? 'الألعاب' : 'Games', IconComponent: Gamepad2 },
    { id: 'reports_analysis', label: dir === 'rtl' ? 'التقارير' : 'Reports', IconComponent: BarChart3 },
    { id: 'help_settings', label: dir === 'rtl' ? 'المزيد' : 'More', IconComponent: SettingsIcon }
  ];

  const desktopNavItems = [
    { id: 'dashboard', label: t('navDashboard') || (dir === 'rtl' ? 'الرئيسية' : 'Dashboard'), icon: LayoutDashboard },
    ...(teacherInfo?.role === 'senior' ? [{ id: 'senior_dashboard', label: dir === 'rtl' ? 'إدارة القسم' : 'Dept. Admin', icon: ShieldCheck }] : []),
    { id: 'student_management', label: dir === 'rtl' ? 'إدارة الطلاب' : 'Student Management', icon: Users },
    { id: 'mailbox', label: dir === 'rtl' ? 'المراسلات' : 'Mailbox', icon: Mail },
    { id: 'learning_evaluation', label: dir === 'rtl' ? 'التعليم والتقييم' : 'Learning & Evaluation', icon: BookOpen },
    { id: 'games', label: dir === 'rtl' ? 'الألعاب التعليمية' : 'Educational Games', icon: Gamepad2 },
    { id: 'reports_analysis', label: dir === 'rtl' ? 'التقارير والتحليل' : 'Reports & Analytics', icon: BarChart3 },
    { id: 'admin_sync', label: dir === 'rtl' ? 'الإدارة والمزامنة' : 'Admin & Sync', icon: CloudSync },
    { id: 'help_settings', label: dir === 'rtl' ? 'المساعدة والإعدادات' : 'Help & Settings', icon: SettingsIcon }
  ];

  if (!isDataLoaded) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center fixed inset-0 z-[99999] bg-bgMain" dir={dir}>
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="font-medium text-sm text-textSecondary">
          {t('loadingData') || (dir === 'rtl' ? 'جاري تحميل البيانات...' : 'Loading Data...')}
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <TeacherLoginScreen
        onLogin={() => setIsLoggedIn(true)}
        teacherInfo={teacherInfo}
        setTeacherInfo={setTeacherInfo}
      />
    );
  }

  if (showWelcome) return <WelcomeScreen onFinish={handleFinishWelcome} />;

  const handleNavigate = (tab: string) => {
    if (tab === 'dashboard' || tab === 'home') {
      setActiveTab('dashboard');
      return;
    }
    if (tab === 'senior_dashboard') {
      setActiveTab('senior_dashboard');
      return;
    }
    if (tab === 'attendance') {
      setStudentManagementView('attendance');
      setActiveTab('student_management');
      return;
    }
    if (tab === 'students' || tab === 'student_management') {
      setStudentManagementView('students');
      setActiveTab('student_management');
      return;
    }
    if (tab === 'groups') {
      setStudentManagementView('groups');
      setActiveTab('student_management');
      return;
    }
    if (tab === 'mailbox' || tab === 'messages' || tab === 'inbox') {
      setActiveTab('mailbox');
      return;
    }
    if (tab === 'grades' || tab === 'gradebook' || tab === 'learning_evaluation') {
      setLearningView('grades');
      setActiveTab('learning_evaluation');
      return;
    }
    if (tab === 'tasks') {
      setLearningView('tasks');
      setActiveTab('learning_evaluation');
      return;
    }
    if (tab === 'library') {
      setLearningView('library');
      setActiveTab('learning_evaluation');
      return;
    }
    if (tab === 'game_questions' || tab === 'games' || tab === 'questions') {
      setGamesView('questions');
      setActiveTab('games');
      return;
    }
    if (tab === 'game_results' || tab === 'results') {
      setGamesView('results');
      setActiveTab('games');
      return;
    }
    if (tab === 'leaderboard' || tab === 'knights') {
      setReportsView('leaderboard');
      setActiveTab('reports_analysis');
      return;
    }
    if (tab === 'reports' || tab === 'analytics' || tab === 'reports_analysis') {
      setReportsView('reports');
      setActiveTab('reports_analysis');
      return;
    }
    if (tab === 'sync' || tab === 'admin_sync') {
      setAdminView('sync');
      setActiveTab('admin_sync');
      return;
    }
    if (tab === 'guide' || tab === 'help') {
      setHelpView('guide');
      setActiveTab('help_settings');
      return;
    }
    if (tab === 'settings') {
      setHelpView('settings');
      setActiveTab('help_settings');
      return;
    }
    if (tab === 'about') {
      setHelpView('about');
      setActiveTab('help_settings');
      return;
    }
    setActiveTab(tab);
  };
  const renderHubTabs = <T extends string>(
    items: { id: T; label: string; icon?: React.ElementType }[],
    value: T,
    onChange: (value: T) => void
  ) => (
    <div className="bg-bgCard border border-borderColor rounded-3xl p-2 shadow-sm flex flex-wrap gap-2">
      {items.map(item => {
        const Icon = item.icon;
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`flex-1 min-w-[120px] h-11 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
              active
                ? 'bg-primary text-white shadow-sm'
                : 'bg-bgSoft text-textSecondary hover:text-primary'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {item.label}
          </button>
        );
      })}
    </div>
  );

  // =========================================================================
  // 🔐 أدوات توليد وتثبيت كود RSD للطلاب ومنع التكرار
  // =========================================================================

  const normalizeArabicNameForRased = (value: string) => {
    return String(value || '')
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/[ؤئء]/g, '')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  };

  const normalizeArabicDigitsForRased = (value: string) => {
    const arabicDigits: Record<string, string> = {
      '٠': '0',
      '١': '1',
      '٢': '2',
      '٣': '3',
      '٤': '4',
      '٥': '5',
      '٦': '6',
      '٧': '7',
      '٨': '8',
      '٩': '9',
      '۰': '0',
      '۱': '1',
      '۲': '2',
      '۳': '3',
      '۴': '4',
      '۵': '5',
      '۶': '6',
      '۷': '7',
      '۸': '8',
      '۹': '9'
    };

    return String(value || '').replace(/[٠-٩۰-۹]/g, digit => arabicDigits[digit] || digit);
  };

  const normalizeClassForRased = (value: string) => {
    return normalizeArabicDigitsForRased(value)
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

  const getStudentClassForRased = (student: any) => {
    return String(
      student?.classes?.[0] ||
      student?.className ||
      student?.class ||
      ''
    ).trim();
  };

  const getExistingRasedCode = (student: any) => {
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

  const getSchoolIdentityForRased = () => {
    return String(
      localStorage.getItem('rased_admin_school_code') ||
      (teacherInfo as any)?.schoolCode ||
      teacherInfo?.school ||
      ''
    ).trim();
  };

  const makeStudentIdentityKeyForRased = (
    schoolIdentity: string,
    studentName: string,
    className: string
  ) => {
    const normalizedSchool = String(schoolIdentity || '')
      .trim()
      .replace(/\s+/g, '')
      .toLowerCase();

    const normalizedName = normalizeArabicNameForRased(studentName).replace(/\s+/g, '');
    const normalizedClass = normalizeClassForRased(className);

    return `${normalizedSchool}_${normalizedName}_${normalizedClass}`;
  };

  const hashToRasedCode = (value: string) => {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 33) ^ value.charCodeAt(i);
    }
    const code = Math.abs(hash)
      .toString(36)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .padStart(6, '0')
      .substring(0, 6);
    return `RSD-${code}`;
  };

  const generateStableRasedId = (
    schoolIdentity: string,
    studentName: string,
    className: string
  ) => {
    if (!studentName || !className) return `RSD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const identityKey = makeStudentIdentityKeyForRased(schoolIdentity, studentName, className);
    return hashToRasedCode(identityKey);
  };

  const findExistingStudentByIdentity = (
    studentsList: any[],
    schoolIdentity: string,
    studentName: string,
    className: string
  ) => {
    const targetKey = makeStudentIdentityKeyForRased(schoolIdentity, studentName, className);
    return studentsList.find(student => {
      const currentKey = makeStudentIdentityKeyForRased(
        schoolIdentity,
        student?.name || '',
        getStudentClassForRased(student)
      );
      return currentKey === targetKey;
    });
  };

  const mergeListsWithoutDuplicates = (oldList: any[] = [], newList: any[] = []) => {
    const map = new Map<string, any>();
    [...oldList, ...newList].forEach(item => {
      if (!item) return;
      const key = String(item.id || item.date || JSON.stringify(item));
      if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values());
  };

  const upsertStudentByIdentity = (previousStudents: any[], incomingStudent: any, schoolIdentity: string) => {
    const incomingClass = getStudentClassForRased(incomingStudent);
    const incomingKey = makeStudentIdentityKeyForRased(schoolIdentity, incomingStudent?.name || '', incomingClass);

    const existingIndex = previousStudents.findIndex(student => {
      const existingKey = makeStudentIdentityKeyForRased(schoolIdentity, student?.name || '', getStudentClassForRased(student));
      return existingKey === incomingKey;
    });

    if (existingIndex === -1) return [...previousStudents, incomingStudent];

    const existingStudent = previousStudents[existingIndex];
    const existingCode = getExistingRasedCode(existingStudent);
    const incomingCode = getExistingRasedCode(incomingStudent);

    const mergedStudent = {
      ...existingStudent,
      ...incomingStudent,
      rasedId: existingCode || incomingCode || incomingStudent.rasedId,
      parentCode: existingCode || incomingCode || incomingStudent.parentCode,
      id: existingStudent.id || incomingStudent.id,
      parentPhone: incomingStudent.parentPhone || existingStudent.parentPhone,
      gender: incomingStudent.gender || existingStudent.gender,
      avatar: incomingStudent.avatar || existingStudent.avatar,
      classes: existingStudent.classes?.length ? existingStudent.classes : incomingStudent.classes,
      behaviors: mergeListsWithoutDuplicates(existingStudent.behaviors, incomingStudent.behaviors),
      grades: mergeListsWithoutDuplicates(existingStudent.grades, incomingStudent.grades),
      attendance: mergeListsWithoutDuplicates(existingStudent.attendance, incomingStudent.attendance)
    };

    const nextStudents = [...previousStudents];
    nextStudents[existingIndex] = mergedStudent;
    return nextStudents;
  };

  const handleAddStudentManuallySafely = (
    name: string,
    className: string,
    parentPhone?: string,
    avatar?: string,
    gender?: 'male' | 'female',
    existingCode?: string
  ) => {
    const cleanName = String(name || '').trim();
    const cleanClass = String(className || '').trim();
    const schoolIdentity = getSchoolIdentityForRased();

    if (!cleanName || !cleanClass) return;

    const existingStudent = findExistingStudentByIdentity(students, schoolIdentity, cleanName, cleanClass);
    if (existingStudent) {
      const oldCode = getExistingRasedCode(existingStudent);
      setStudents(prev =>
        prev.map(student => {
          if (student.id !== existingStudent.id) return student;
          return {
            ...student,
            parentPhone: parentPhone || student.parentPhone,
            gender: gender || student.gender,
            avatar: avatar || student.avatar,
            rasedId: oldCode || student.rasedId,
            parentCode: oldCode || (student as any).parentCode
          };
        })
      );
      alert(
        `تم العثور على الطالب مسبقًا في نفس الفصل.\n\n` +
        `الطالب: ${existingStudent.name}\n` +
        `الفصل: ${getStudentClassForRased(existingStudent)}\n` +
        `كود راصد: ${oldCode || 'غير محدد'}\n\n` +
        `تم استخدام نفس الكود ولم يتم إنشاء كود جديد.`
      );
      return;
    }

    const incomingCode = String(existingCode || '').trim().toUpperCase();
    const rasedId = incomingCode.startsWith('RSD-') ? incomingCode : generateStableRasedId(schoolIdentity, cleanName, cleanClass);

    const newStudent: any = {
      id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      classes: [cleanClass],
      attendance: [],
      behaviors: [],
      grades: [],
      grade: '',
      parentPhone,
      avatar,
      gender: gender || 'male',
      rasedId,
      parentCode: rasedId
    };

    setStudents(prev => upsertStudentByIdentity(prev, newStudent, schoolIdentity));
  };

  const handleBatchAddStudentsSafely = (newStudents: any[]) => {
    const schoolIdentity = getSchoolIdentityForRased();
    setStudents(prev => {
      let nextStudents: any[] = [...prev];
      newStudents.forEach((student: any) => {
        const studentName = String(student?.name || '').trim();
        const studentClass = getStudentClassForRased(student);
        if (!studentName || !studentClass) return;
        const existingCode = getExistingRasedCode(student);
        const stableCode = existingCode || generateStableRasedId(schoolIdentity, studentName, studentClass);
        const normalizedStudent = {
          ...student,
          id: student.id || `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: studentName,
          classes: Array.isArray(student.classes) && student.classes.length > 0 ? student.classes : [studentClass],
          attendance: Array.isArray(student.attendance) ? student.attendance : [],
          behaviors: Array.isArray(student.behaviors) ? student.behaviors : [],
          grades: Array.isArray(student.grades) ? student.grades : [],
          rasedId: stableCode,
          parentCode: stableCode
        };
        nextStudents = upsertStudentByIdentity(nextStudents, normalizedStudent, schoolIdentity);
      });
      return nextStudents;
    });
  };

  const renderStudentManagementContent = () => {
    if (studentManagementView === 'attendance') {
      return <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />;
    }
    if (studentManagementView === 'groups') return <StudentGroups />;
    return (
      <StudentList
        students={students}
        classes={classes}
        onAddClass={(n) => setClasses(p => p.includes(n) ? p : [...p, n])}
        onAddStudentManually={(n, c, p, a, g, cid) => handleAddStudentManuallySafely(n, c, p, a, g, cid)}
        onBatchAddStudents={(newS) => handleBatchAddStudentsSafely(newS)}
        onUpdateStudent={(u) => setStudents(p => p.map(s => s.id === u.id ? u : s))}
        onDeleteStudent={(id) => setStudents(p => p.filter(s => s.id !== id))}
        onViewReport={() => {}}
        currentSemester={currentSemester}
        onSemesterChange={setCurrentSemester}
        onDeleteClass={(cn) => setClasses(p => p.filter(c => c !== cn))}
      />
    );
  };

  const renderLearningContent = () => {
    if (learningView === 'tasks') {
      return <TeacherTasks students={students} teacherSubject={teacherInfo?.subject || 'عام'} />;
    }
    if (learningView === 'library') return <TeacherLibrary />;
    return (
      <GradeBook
        students={students}
        classes={classes}
        onUpdateStudent={(u) => setStudents(p => p.map(s => s.id === u.id ? u : s))}
        setStudents={setStudents}
        currentSemester={currentSemester}
        onSemesterChange={setCurrentSemester}
        teacherInfo={teacherInfo}
      />
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            students={students}
            teacherInfo={teacherInfo}
            onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({ ...prev, ...i }))}
            schedule={schedule}
            onUpdateSchedule={setSchedule}
            onSelectStudent={() => {}}
            onNavigate={handleNavigate}
            onOpenSettings={() => {
              setHelpView('settings');
              setActiveTab('help_settings');
            }}
            periodTimes={periodTimes}
            setPeriodTimes={setPeriodTimes}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={handleToggleNotifications}
            currentSemester={currentSemester}
            onSemesterChange={setCurrentSemester}
          />
        );

      case 'senior_dashboard':
        return <SeniorDashboard />;

      case 'mailbox':
        return (
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar space-y-4 pb-24 pr-1">
            <TeacherMailbox
              students={students}
              teacherInfo={teacherInfo}
              currentSemester={currentSemester}
            />
          </div>
        );

      case 'student_management':
        return (
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar space-y-4 pb-24 pr-1">
            {renderHubTabs(
              [
                { id: 'students', label: 'الطلاب', icon: Users },
                { id: 'groups', label: 'المجموعات', icon: Users },
                { id: 'attendance', label: 'الحضور', icon: CalendarCheck }
              ],
              studentManagementView,
              setStudentManagementView
            )}
            {renderStudentManagementContent()}
          </div>
        );

      case 'learning_evaluation':
        return (
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar space-y-4 pb-24 pr-1">
            {renderHubTabs(
              [
                { id: 'grades', label: 'الدرجات', icon: BarChart3 },
                { id: 'tasks', label: 'المهام', icon: CheckSquare },
                { id: 'library', label: 'المكتبة', icon: Library }
              ],
              learningView,
              setLearningView
            )}
            {renderLearningContent()}
          </div>
        );

      case 'games':
        return (
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar space-y-4 pb-24 pr-1">
            <div className="bg-bgCard border border-borderColor rounded-3xl p-2 shadow-sm flex gap-2">
              <button
                type="button"
                onClick={() => setGamesView('questions')}
                className={`flex-1 h-11 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                  gamesView === 'questions'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-bgSoft text-textSecondary hover:text-primary'
                }`}
              >
                الأسئلة
              </button>
              <button
                type="button"
                onClick={() => {
                  setGamesView('results');
                  fetchGameResults();
                }}
                className={`flex-1 h-11 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                  gamesView === 'results'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-bgSoft text-textSecondary hover:text-primary'
                }`}
              >
                النتائج
              </button>
            </div>
            {gamesView === 'questions' ? (
              <TeacherGameQuestionsManager
                schoolCode={localStorage.getItem('rased_admin_school_code') || (teacherInfo as any)?.schoolCode || teacherInfo?.school || 'default_school'}
                teacherId={teacherInfo?.civilId || localStorage.getItem('rased_teacher_civil_id') || 'default_teacher'}
                teacherName={teacherInfo?.name || ''}
                defaultSubject={teacherInfo?.subject || ''}
                defaultGrade=""
                classOptions={classes || []}
                subjectOptions={teacherInfo?.subject ? [teacherInfo.subject] : ['الدراسات الاجتماعية', 'العلوم', 'الرياضيات', 'اللغة العربية', 'اللغة الإنجليزية']}
                gradeOptions={['الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر']}
                onPublish={handlePublishGameQuestions}
              />
            ) : (
              <TeacherGameResultsDashboard
                results={gameResults}
                students={students}
                isLoading={isLoadingGameResults}
                onRefresh={fetchGameResults}
                readLocalStorageFallback={false}
                teacherId={teacherInfo?.civilId || localStorage.getItem('rased_teacher_civil_id') || 'default_teacher'}
                schoolCode={localStorage.getItem('rased_admin_school_code') || (teacherInfo as any)?.schoolCode || teacherInfo?.school || 'default_school'}
              />
            )}
          </div>
        );

      case 'reports_analysis':
        return (
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar space-y-4 pb-24 pr-1">
            {renderHubTabs(
              [
                { id: 'reports', label: 'التقارير', icon: FileText },
                { id: 'leaderboard', label: 'الفرسان', icon: Medal }
              ],
              reportsView,
              setReportsView
            )}
            {reportsView === 'leaderboard' ? (
              <Leaderboard
                students={students}
                classes={classes}
                onUpdateStudent={(u) => setStudents(p => p.map(s => s.id === u.id ? u : s))}
                teacherInfo={teacherInfo}
              />
            ) : (
              <Reports />
            )}
          </div>
        );

      case 'admin_sync':
        return (
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar space-y-4 pb-24 pr-1">
            {renderHubTabs(
              [{ id: 'sync', label: 'مزامنة السحابة', icon: CloudSync }],
              adminView,
              setAdminView
            )}
            <GlobalSyncManager />
          </div>
        );

      case 'help_settings':
        return (
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar space-y-4 pb-24 pr-1">
            {renderHubTabs(
              [
                { id: 'guide', label: 'دليل الاستخدام', icon: BookOpen },
                { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
                { id: 'about', label: 'عن التطبيق', icon: Info }
              ],
              helpView,
              setHelpView
            )}
            {helpView === 'settings' ? <Settings /> : helpView === 'about' ? <About /> : <UserGuide />}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout
      dir={dir}
      activeTab={activeTab}
      onNavigate={handleNavigate}
      desktopNavItems={desktopNavItems}
      mobileNavItems={mobileNavItems}
      Logo={<BrandLogo style={{ width: '100%', height: '100%', objectFit: 'contain' }} showText={false} />}
      appName={t('appNameMain') || 'راصد'}
      appSubtitle={t('appSubtitleMain') || 'النسخة المتقدمة'}
    >
      {renderContent()}
      <VoiceAssistant onNavigate={handleNavigate} />
    </AppLayout>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AppProvider>
      <AppContent />
    </AppProvider>
  </ThemeProvider>
);

export default App;
