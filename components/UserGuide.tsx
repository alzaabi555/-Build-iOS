import React, { useState, useMemo } from 'react';
import {
  Home, Users, Calendar, BarChart, Award, Settings, BookOpen, 
  Download, Menu, X, WifiOff, MessageCircle, FileText, Shield, 
  CheckCircle, PenTool, PieChart, Printer, Save, RefreshCw, 
  Trash2, Share2, MousePointer, User, Bell, File, Clock, Star,
  ListTodo, Cloud, Sparkles
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext'; 

// --- Components ---

type DetailCardProps = {
  icon: React.ElementType;
  title: string;
  desc: string;
  details?: string[];
  isNew?: boolean; 
  newLabel?: string; 
};

const DetailCard: React.FC<DetailCardProps> = ({ icon: Icon, title, desc, details, isNew, newLabel }) => (
  <div className="glass-card p-6 border border-borderColor transition-all duration-300 hover:border-primary/50 hover:bg-bgSoft rounded-2xl">
    <div className="flex items-start gap-4">
      <div className="p-3 rounded-2xl shrink-0 bg-primary/10 text-primary shadow-inner">
        <Icon size={24} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
            <h4 className="font-black text-lg text-textPrimary">{title}</h4>
            {isNew && (
                <span className="flex items-center gap-1 text-[10px] font-black bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">
                    <Sparkles size={10} /> {newLabel}
                </span>
            )}
        </div>
        <p className="text-sm leading-relaxed font-bold mb-3 text-textSecondary">{desc}</p>
        {details && (
          <ul className="space-y-2 mt-3 border-t border-borderColor/50 pt-3">
            {details.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs font-bold text-textSecondary">
                <span className="text-primary mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);

const UserGuide: React.FC = () => {
  const { t, dir } = useApp(); 
  const [activeSection, setActiveSection] = useState('hero');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const menuItems = useMemo(
    () => [
      { id: 'dashboard', label: t('dashboardMenu'), icon: Home },
      { id: 'attendance', label: t('attendanceMenu'), icon: Calendar },
      { id: 'students', label: t('studentsMenu'), icon: Users },
      { id: 'grades', label: t('gradesMenu'), icon: BarChart },
      { id: 'tasks', label: t('tasksMenu'), icon: ListTodo, isNew: true }, 
      { id: 'library', label: t('libraryMenu'), icon: BookOpen, isNew: true }, 
      { id: 'knights', label: t('knightsMenu'), icon: Award },
      { id: 'reports', label: t('reportsMenu'), icon: Printer },
      { id: 'sync', label: t('syncMenu'), icon: Cloud, isNew: true }, 
      { id: 'settings', label: t('settingsMenu'), icon: Settings },
    ],
    [t]
  );

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSidebarOpen(false);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);
      const element = document.getElementById('guide-content-inner');
      
      if (!element) {
        alert(t('alertNoContentFound'));
        return;
      }

      const opt = {
        margin: [5, 5, 5, 5],
        filename: 'Rased_Manual.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff', 
            scrollY: 0 
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      const worker = html2pdf().set(opt).from(element);

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await worker.output('datauristring');
        const base64Data = pdfBase64.split(',')[1];
        const result = await Filesystem.writeFile({
          path: `Rased_Manual_${new Date().getTime()}.pdf`,
          data: base64Data,
          directory: Directory.Cache,
        });
        
        await Share.share({ 
            title: t('exportPdfTitle'), 
            url: result.uri,
            dialogTitle: t('exportPdfDialogTitle')
        });
      } else {
        worker.save();
      }
    } catch (e) {
      console.error("PDF Export Error:", e);
      alert(t('pdfErrorMsg'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex h-full font-sans overflow-hidden ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
      
      <aside
        className={`
          fixed inset-y-0 ${dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'} z-50 w-72 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : (dir === 'rtl' ? 'translate-x-full' : '-translate-x-full')} lg:translate-x-0 lg:static
          glass-panel border-borderColor rounded-none
        `}
      >
        <div className="h-full flex flex-col pt-[max(env(safe-area-inset-top),16px)] pb-[env(safe-area-inset-bottom)]">
          <div className="p-6 border-b border-borderColor flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-black text-xl text-textPrimary">{t('rasedGuideTitle')}</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-xl text-textSecondary hover:bg-bgSoft hover:text-textPrimary transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl text-sm font-bold transition-all duration-200
                  ${activeSection === item.id
                      ? `bg-primary text-white shadow-lg shadow-primary/20 ${dir === 'rtl' ? 'translate-x-[-4px]' : 'translate-x-[4px]'}`
                      : 'text-textSecondary hover:bg-bgSoft hover:text-textPrimary'
                  }`}
              >
                <div className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${activeSection === item.id ? 'text-white' : 'text-textSecondary'}`} />
                    {item.label}
                </div>
                {item.isNew && (
                    <Sparkles size={12} className={activeSection === item.id ? "text-amber-300 animate-pulse" : "text-primary animate-pulse"} />
                )}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-borderColor shrink-0">
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
            >
              {isExporting ? (
                <span className="animate-pulse">{t('savingStatus')}</span>
              ) : (
                <>
                  <Download size={16} /> {t('downloadPdfBtn')}
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative scroll-smooth custom-scrollbar bg-bgMain">
        
        <button
          onClick={() => setSidebarOpen(true)}
          className={`fixed top-[calc(env(safe-area-inset-top)+1rem)] ${dir === 'rtl' ? 'right-4' : 'left-4'} z-40 p-3 rounded-xl shadow-lg lg:hidden glass-panel border-borderColor text-textPrimary`}
        >
          <Menu size={24} />
        </button>

        {/* 💉 أضفنا pb-32 لمنع اختفاء المحتوى خلف القائمة السفلية */}
        <div id="guide-content-inner" className="w-full pb-32" dir={dir}>

            <header id="hero" className="relative px-6 text-center border-b border-borderColor transition-all pb-12 pt-[calc(env(safe-area-inset-top)+4rem)]">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6 bg-primary/10 border border-primary/20 text-primary">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> {t('versionTag')}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-textPrimary mb-4 leading-tight">
                {t('userGuideComprehensive')} <span className="text-primary">{t('comprehensiveText')}</span>
              </h1>
              <p className="text-lg max-w-2xl mx-auto font-bold text-textSecondary">
                {t('heroDescription')}
              </p>
            </header>

            <div className="max-w-5xl mx-auto px-6 space-y-24 pt-12">
              
              <section id="dashboard" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <Home className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary">{t('sec1Title')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard icon={User} title={t('sec1Card1Title')} desc={t('sec1Card1Desc')} details={[t('sec1Card1Det1'), t('sec1Card1Det2')]} />
                  <DetailCard icon={Calendar} title={t('sec1Card2Title')} desc={t('sec1Card2Desc')} details={[t('sec1Card2Det1')]} />
                  <DetailCard icon={Bell} title={t('sec1Card3Title')} desc={t('sec1Card3Desc')} details={[t('sec1Card3Det1')]} />
                </div>
              </section>

              <section id="attendance" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary">{t('sec2Title')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard icon={CheckCircle} title={t('sec2Card1Title')} desc={t('sec2Card1Desc')} details={[t('sec2Card1Det1')]} />
                  <DetailCard icon={MousePointer} title={t('sec2Card2Title')} desc={t('sec2Card2Desc')} details={[t('sec2Card2Det1')]} />
                </div>
              </section>

              <section id="students" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <Users className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary">{t('sec3Title')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard icon={Users} title={t('sec3Card1Title')} desc={t('sec3Card1Desc')} details={[t('sec3Card1Det1')]} />
                </div>
              </section>

              <section id="grades" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <BarChart className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary">{t('sec4Title')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard icon={PenTool} title={t('sec4Card1Title')} desc={t('sec4Card1Desc')} />
                </div>
              </section>

              <section id="tasks" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <ListTodo className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary">{t('secTasksTitle')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard isNew newLabel={t('newBadge')} icon={ListTodo} title={t('secTasksCard1Title')} desc={t('secTasksCard1Desc')} />
                  <DetailCard isNew newLabel={t('newBadge')} icon={CheckCircle} title={t('secTasksCard2Title')} desc={t('secTasksCard2Desc')} />
                </div>
              </section>

              <section id="library" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary">{t('secLibraryTitle')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard isNew newLabel={t('newBadge')} icon={File} title={t('secLibraryCard1Title')} desc={t('secLibraryCard1Desc')} />
                  <DetailCard isNew newLabel={t('newBadge')} icon={Star} title={t('secLibraryCard2Title')} desc={t('secLibraryCard2Desc')} />
                </div>
              </section>

              <section id="knights" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <Award className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary">{t('sec5Title')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard icon={Award} title={t('sec5Card1Title')} desc={t('sec5Card1Desc')} />
                </div>
              </section>

              <section id="reports" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <Printer className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary">{t('sec6Title')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard icon={PieChart} title={t('sec6Card1Title')} desc={t('sec6Card1Desc')} />
                </div>
              </section>

              <section id="sync" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary">{t('secSyncTitle')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard isNew newLabel={t('newBadge')} icon={Cloud} title={t('secSyncCard1Title')} desc={t('secSyncCard1Desc')} />
                  <DetailCard isNew newLabel={t('newBadge')} icon={Save} title={t('secSyncCard2Title')} desc={t('secSyncCard2Desc')} />
                </div>
              </section>

              <section id="settings" className="scroll-mt-24 border-t border-borderColor pt-12">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <Settings className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-textPrimary">{t('sec7Title')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard icon={Settings} title={t('sec7Card1Title')} desc={t('sec7Card1Desc')} />
                </div>
              </section>

            </div>

            <div className="text-center py-12 text-sm font-bold border-t border-borderColor text-textSecondary">
              {t('footerText1')} {new Date().getFullYear()}
            </div>

        </div> 
      </main>
    </div>
  );
};

export default UserGuide;
