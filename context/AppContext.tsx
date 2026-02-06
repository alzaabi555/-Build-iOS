const AppContent: React.FC = () => {
  const { 
    isDataLoaded, students, setStudents, classes, setClasses, 
    teacherInfo, setTeacherInfo, schedule, setSchedule, 
    periodTimes, setPeriodTimes, currentSemester, setCurrentSemester
  } = useApp();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    return !localStorage.getItem('rased_welcome_seen');
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('bell_enabled') === 'true';
  });

  useSchoolBell(periodTimes, schedule, notificationsEnabled);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      const backListener = CapacitorApp.addListener('backButton', () => {
        if (showMoreMenu) {
          setShowMoreMenu(false);
        } else if (activeTab !== 'dashboard') {
          setActiveTab('dashboard');
        } else {
          CapacitorApp.exitApp();
        }
      });

      return () => {
        backListener.then(listener => listener.remove());
      };
    }
  }, [showMoreMenu, activeTab]);

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

  if (!isDataLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 fixed inset-0 z-[99999]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (showWelcome) {
    return <WelcomeScreen onFinish={handleFinishWelcome} />;
  }

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setShowMoreMenu(false);
  };

  const handleUpdateStudent = (updated: any) =>
    setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));

  const handleAddClass = (name: string) => setClasses(prev => [...prev, name]);

  const handleDeleteClass = (className: string) => {
    setClasses(prev => prev.filter(c => c !== className));
    setStudents(prev => prev.map(s => {
      if (s.classes.includes(className)) {
        return { ...s, classes: s.classes.filter(c => c !== className) };
      }
      return s;
    }));
  };

  const handleAddStudent = (
    name: string,
    className: string,
    phone?: string,
    avatar?: string,
    gender?: 'male' | 'female'
  ) => {
    setStudents(prev => [
      ...prev,
      { 
        id: Math.random().toString(36).substr(2,9), 
        name,
        classes: [className],
        attendance: [],
        behaviors: [],
        grades: [],
        grade: '',
        parentPhone: phone,
        avatar,
        gender: gender || 'male',
      },
    ]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            students={students}
            teacherInfo={teacherInfo}
            onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({...prev, ...i}))}
            schedule={schedule}
            onUpdateSchedule={setSchedule}
            onSelectStudent={() => {}}
            onNavigate={handleNavigate}
            onOpenSettings={() => setActiveTab('settings')}
            periodTimes={periodTimes}
            setPeriodTimes={setPeriodTimes}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={handleToggleNotifications}
            currentSemester={currentSemester}
            onSemesterChange={setCurrentSemester}
          />
        );
      case 'attendance':
        return <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />;
      case 'students':
        return (
          <StudentList 
            students={students}
            classes={classes}
            onAddClass={handleAddClass}
            onAddStudentManually={handleAddStudent}
            onBatchAddStudents={(newS) => setStudents(prev => [...prev, ...newS])}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={(id) => setStudents(prev => prev.filter(s => s.id !== id))}
            onViewReport={() => {}}
            currentSemester={currentSemester}
            onSemesterChange={setCurrentSemester}
            onDeleteClass={handleDeleteClass}
          />
        );
      case 'grades':
        return (
          <GradeBook 
            students={students}
            classes={classes}
            onUpdateStudent={handleUpdateStudent}
            setStudents={setStudents}
            currentSemester={currentSemester}
            onSemesterChange={setCurrentSemester}
            teacherInfo={teacherInfo}
          />
        );
      case 'leaderboard':
        return <Leaderboard students={students} classes={classes} onUpdateStudent={handleUpdateStudent} />;
      case 'reports':
        return <Reports />;
      case 'guide':
        return <UserGuide />;
      case 'settings':
        return <Settings />;
      case 'about':
        return <About />;
      default:
        return null;
    }
  };

  const mobileNavItems = [
    { id: 'dashboard', label: 'الرئيسية', IconComponent: Dashboard3D },
    { id: 'attendance', label: 'الحضور', IconComponent: Attendance3D },
    { id: 'students', label: 'الطلاب', IconComponent: Students3D },
    { id: 'grades', label: 'الدرجات', IconComponent: Grades3D },
  ];

  const desktopNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'attendance', label: 'الحضور', icon: CalendarCheck },
    { id: 'students', label: 'الطلاب', icon: Users },
    { id: 'grades', label: 'الدرجات', icon: BarChart3 },
    { id: 'leaderboard', label: 'فرسان الشهر', icon: Medal },
    { id: 'reports', label: 'التقارير', icon: FileText },
    { id: 'guide', label: 'دليل المستخدم', icon: BookOpen },
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
    { id: 'about', label: 'حول التطبيق', icon: Info },
  ];

  const isMoreActive = !mobileNavItems.some(item => item.id === activeTab);

  return (
    <div className="flex h-full bg-[#f3f4f6] font-sans overflow-hidden text-slate-900 relative">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-l border-slate-200 z-50 shadow-sm transition-all h-full">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12">
            <BrandLogo className="w-full h-full" showText={false} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">راصد</h1>
            <span className="text-[10px] font-bold text-indigo-600 tracking-wider">نسخة المعلم</span>
          </div>
        </div>
        <div className="px-6 mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 shadow-sm shrink-0">
              {teacherInfo.avatar ? (
                <img src={teacherInfo.avatar} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-slate-500 text-lg">
                  {teacherInfo.name?.[0] || 'م'}
                </span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">
                {teacherInfo.name || 'مرحباً بك'}
              </p>
              <p className="text-[10px] text-gray-500 truncate">
                {teacherInfo.school || 'المدرسة'}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-4">
          {desktopNavItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-100'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'
                  } transition-colors`}
                  strokeWidth={2.5}
                />
                <span className="font-bold text-sm">{item.label}</span>
                {isActive && (
                  <div className="mr-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-6 text-center border-t border-slate-200">
          <p className="text-[10px] font-bold text-gray-400">الإصدار 3.6.0</p>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f3f4f6] z-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-32 md:pb-4 px-4 md:px-8 pt-safe overscroll-contain" id="main-scroll-container">
          <div className="max-w-5xl mx-auto w-full min-h-full">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Mobile Nav (3D Icons) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] h-[85px] bg-white/95 backdrop-blur-xl rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] flex justify-around items-end pb-4 border-t border-slate-200/60 pb-safe safe-area-bottom transition-transform duration-300 translate-z-0 pointer-events-auto">
        {mobileNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => handleNavigate(item.id)} 
              className="relative w-full h-full flex flex-col items-center justify-end group pb-1 touch-manipulation active:scale-90 transition-transform"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className={`absolute top-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) pointer-events-none 
                  ${isActive ? '-translate-y-7 scale-110' : 'translate-y-1 scale-90'}`}>
                <div className={`w-11 h-11 ${isActive ? 'drop-shadow-2xl' : ''}`}>
                  <item.IconComponent active={isActive} />
                </div>
              </div>
              
              <span className={`text-[10px] font-black transition-all duration-300 pointer-events-none ${
                isActive ? 'translate-y-0 text-indigo-600 opacity-100' : 'translate-y-4 text-gray-400 opacity-0'
              }`}>
                {item.label}
              </span>
              
              {isActive && <div className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>}
            </button>
          );
        })}

        <button 
          onClick={() => setShowMoreMenu(true)} 
          className="relative w-full h-full flex flex-col items-center justify-end group pb-1 touch-manipulation active:scale-90 transition-transform"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div className={`absolute top-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) pointer-events-none 
              ${isMoreActive ? '-translate-y-7 scale-110' : 'translate-y-1 scale-90'}`}>
            <div className={`w-11 h-11 ${isMoreActive ? 'drop-shadow-2xl' : ''}`}>
              <More3D active={isMoreActive} />
            </div>
          </div>
          <span className={`text-[10px] font-black transition-all duration-300 pointer-events-none ${
            isMoreActive ? 'translate-y-0 text-indigo-600 opacity-100' : 'translate-y-4 text-gray-400 opacity-0'
          }`}>
            المزيد
          </span>
          {isMoreActive && <div className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>}
        </button>
      </div>

      {/* Menu Modal */}
      <Modal isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} className="max-w-md rounded-[2rem] mb-28 md:hidden z-[10000]">
        <div className="text-center mb-6">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <h3 className="font-black text-slate-800 text-lg">القائمة الكاملة</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => handleNavigate('leaderboard')} className="p-4 bg-amber-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-amber-200 aspect-square shadow-sm">
            <Medal className="w-7 h-7 text-amber-600" />
            <span className="font-bold text-[10px] text-amber-800">فرسان الشهر</span>
          </button>
          <button onClick={() => handleNavigate('reports')} className="p-4 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-indigo-200 aspect-square shadow-sm">
            <FileText className="w-7 h-7 text-indigo-600" />
            <span className="font-bold text-[10px] text-indigo-800">التقارير</span>
          </button>
          <button onClick={() => handleNavigate('settings')} className="p-4 bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-gray-300 aspect-square shadow-sm">
            <SettingsIcon className="w-7 h-7 text-gray-600" />
            <span className="font-bold text-[10px] text-gray-800">الإعدادات</span>
          </button>
          <button onClick={() => handleNavigate('guide')} className="p-4 bg-cyan-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-cyan-200 aspect-square shadow-sm">
            <BookOpen className="w-7 h-7 text-cyan-600" />
            <span className="font-bold text-[10px] text-cyan-800">الدليل</span>
          </button>
          <button onClick={() => handleNavigate('about')} className="p-4 bg-purple-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-purple-200 aspect-square shadow-sm">
            <Info className="w-7 h-7 text-purple-600" />
            <span className="font-bold text-[10px] text-purple-800">حول التطبيق</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};
