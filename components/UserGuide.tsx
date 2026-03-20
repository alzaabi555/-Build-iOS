import React, { useState, useMemo } from 'react';
import {
  Home, Users, Calendar, BarChart, Award, Settings, BookOpen, 
  Download, Menu, X, WifiOff, MessageCircle, FileText, Shield, 
  CheckCircle, PenTool, PieChart, Printer, Save, RefreshCw, 
  Trash2, Share2, MousePointer, User, Bell, File, Clock, Star
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext'; // 🌍 استيراد محرك اللغات

// --- Components ---

type DetailCardProps = {
  icon: React.ElementType;
  title: string;
  desc: string;
  details?: string[];
  colorClass?: string;
  isRamadan?: boolean;
};

const DetailCard: React.FC<DetailCardProps> = ({ icon: Icon, title, desc, details, colorClass, isRamadan }) => (
  <div className={`p-6 rounded-[2rem] border transition-all duration-300 ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-400/50 backdrop-blur-xl shadow-lg' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500/30'}`}>
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-2xl shrink-0 ${isRamadan ? 'bg-white/10 text-white shadow-inner' : colorClass ?? 'bg-indigo-600/30 text-white'}`}>
        <Icon size={24} />
      </div>
      <div>
        <h4 className={`font-black text-lg mb-2 ${isRamadan ? 'text-white' : 'text-white'}`}>{title}</h4>
        <p className={`text-sm leading-relaxed font-bold mb-3 ${isRamadan ? 'text-indigo-200/80' : 'text-slate-400'}`}>{desc}</p>
        {details && (
          <ul className={`space-y-2 mt-3 border-t pt-3 ${isRamadan ? 'border-white/10' : 'border-slate-700/50'}`}>
            {details.map((item, idx) => (
              <li key={idx} className={`flex items-start gap-2 text-xs font-bold ${isRamadan ? 'text-slate-300' : 'text-slate-300'}`}>
                <span className={`${isRamadan ? 'text-amber-400' : 'text-indigo-500'} mt-0.5`}>•</span>
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
  const { t, dir } = useApp(); // 🌍 محرك اللغات
  const [activeSection, setActiveSection] = useState('hero');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 💊 الكبسولة السحرية للثيم الزجاجي
  const isRamadan = true;

  // 🌍 تحديث الـ Menu Items ليقرأ من الترجمة الديناميكية
  const menuItems = useMemo(
    () => [
      { id: 'dashboard', label: t('dashboardMenu'), icon: Home },
      { id: 'attendance', label: t('attendanceMenu'), icon: Calendar },
      { id: 'students', label: t('studentsMenu'), icon: Users },
      { id: 'grades', label: t('gradesMenu'), icon: BarChart },
      { id: 'knights', label: t('knightsMenu'), icon: Award },
      { id: 'reports', label: t('reportsMenu'), icon: Printer },
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
            backgroundColor: '#0f172a',
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

  // 🌍 التحكم في اتجاه التطبيق بالكامل والانزلاقات
  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-500 ${isRamadan ? 'bg-[#0f172a] text-white' : 'bg-slate-950 text-slate-100'} ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
      
      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed inset-y-0 ${dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'} z-50 w-72 shadow-2xl transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : (dir === 'rtl' ? 'translate-x-full' : '-translate-x-full')} lg:translate-x-0 lg:static
          ${isRamadan ? 'bg-[#0f172a]/90 backdrop-blur-2xl border-white/10' : 'bg-slate-900 border-slate-800'}
        `}
      >
        <div className="h-full flex flex-col pt-[env(safe-area-inset-top)]">
          <div className={`p-6 border-b flex justify-between items-center ${isRamadan ? 'border-white/10' : 'border-slate-800'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isRamadan ? 'bg-white/10 text-white' : 'bg-indigo-600 text-white'}`}>
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-black text-xl">{t('rasedGuideTitle')}</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className={`lg:hidden p-2 rounded-xl transition-colors ${isRamadan ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-bold transition-all duration-200
                  ${
                    activeSection === item.id
                      ? (isRamadan ? `bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg ${dir === 'rtl' ? 'translate-x-[-4px]' : 'translate-x-[4px]'}` : `bg-indigo-600 text-white shadow-lg ${dir === 'rtl' ? 'translate-x-[-4px]' : 'translate-x-[4px]'}`)
                      : (isRamadan ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white')
                  }`}
              >
                <item.icon className={`w-4 h-4 ${activeSection === item.id ? (isRamadan ? 'text-indigo-400' : 'text-white') : 'text-slate-500'}`} />
                {item.label}
              </button>
            ))}
          </div>

          <div className={`p-4 border-t ${isRamadan ? 'border-white/10' : 'border-slate-800'}`}>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${isRamadan ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth custom-scrollbar bg-transparent">
        
        {/* Mobile Menu Button - متوافق مع النوتش */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`fixed top-[calc(env(safe-area-inset-top)+1rem)] ${dir === 'rtl' ? 'right-4' : 'left-4'} z-40 p-3 rounded-xl shadow-lg lg:hidden backdrop-blur-xl transition-all ${isRamadan ? 'bg-white/10 border border-white/20 text-white' : 'bg-slate-800/80 border border-slate-700 text-white'}`}
        >
          <Menu size={24} />
        </button>

        <div id="guide-content-inner" className="w-full" dir={dir}>

            {/* الهيدر المفتوح (Hero) */}
            <header id="hero" className={`relative px-6 text-center border-b transition-all pb-12 pt-[calc(env(safe-area-inset-top)+4rem)] ${isRamadan ? 'border-white/10 bg-transparent' : 'border-slate-900 bg-slate-950'}`}>
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border ${isRamadan ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-200' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'}`}>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> {t('versionTag')}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
                {t('userGuideComprehensive')} <span className={isRamadan ? "text-amber-400" : "text-indigo-500"}>{t('comprehensiveText')}</span>
              </h1>
              <p className={`text-lg max-w-2xl mx-auto font-bold ${isRamadan ? 'text-indigo-100/70' : 'text-slate-400'}`}>
                {t('heroDescription')}
              </p>
            </header>

            <div className="max-w-5xl mx-auto px-6 pb-32 space-y-24 pt-12">
              
              {/* 1. Dashboard */}
              <section id="dashboard" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className={`p-3 rounded-2xl ${isRamadan ? 'bg-white/10 shadow-inner' : 'bg-indigo-600'}`}>
                    <Home className={`w-6 h-6 ${isRamadan ? 'text-indigo-400' : 'text-white'}`} />
                  </div>
                  <h2 className="text-3xl font-black text-white">{t('sec1Title')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={User}
                    colorClass="bg-indigo-600"
                    title={t('sec1Card1Title')}
                    desc={t('sec1Card1Desc')}
                    details={[t('sec1Card1Det1'), t('sec1Card1Det2'), t('sec1Card1Det3'), t('sec1Card1Det4')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Calendar}
                    colorClass="bg-amber-600"
                    title={t('sec1Card2Title')}
                    desc={t('sec1Card2Desc')}
                    details={[t('sec1Card2Det1'), t('sec1Card2Det2'), t('sec1Card2Det3')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Bell}
                    colorClass="bg-rose-600"
                    title={t('sec1Card3Title')}
                    desc={t('sec1Card3Desc')}
                    details={[t('sec1Card3Det1'), t('sec1Card3Det2'), t('sec1Card3Det3')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Clock}
                    colorClass="bg-emerald-600"
                    title={t('sec1Card4Title')}
                    desc={t('sec1Card4Desc')}
                    details={[t('sec1Card4Det1'), t('sec1Card4Det2')]}
                  />
                </div>
              </section>

              {/* 2. Attendance */}
              <section id="attendance" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className={`p-3 rounded-2xl ${isRamadan ? 'bg-white/10 shadow-inner' : 'bg-emerald-600'}`}>
                    <Calendar className={`w-6 h-6 ${isRamadan ? 'text-emerald-400' : 'text-white'}`} />
                  </div>
                  <h2 className="text-3xl font-black text-white">{t('sec2Title')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={CheckCircle}
                    title={t('sec2Card1Title')}
                    desc={t('sec2Card1Desc')}
                    details={[t('sec2Card1Det1'), t('sec2Card1Det2'), t('sec2Card1Det3'), t('sec2Card1Det4')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={MousePointer}
                    title={t('sec2Card2Title')}
                    desc={t('sec2Card2Desc')}
                    details={[t('sec2Card2Det1'), t('sec2Card2Det2'), t('sec2Card2Det3'), t('sec2Card2Det4'), t('sec2Card2Det5')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={MessageCircle}
                    title={t('sec2Card3Title')}
                    desc={t('sec2Card3Desc')}
                    details={[t('sec2Card3Det1'), t('sec2Card3Det2'), t('sec2Card3Det3')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Share2}
                    title={t('sec2Card4Title')}
                    desc={t('sec2Card4Desc')}
                    details={[t('sec2Card4Det1'), t('sec2Card4Det2'), t('sec2Card4Det3')]}
                  />
                </div>
              </section>

              {/* 3. Students */}
              <section id="students" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className={`p-3 rounded-2xl ${isRamadan ? 'bg-white/10 shadow-inner' : 'bg-pink-600'}`}>
                    <Users className={`w-6 h-6 ${isRamadan ? 'text-pink-400' : 'text-white'}`} />
                  </div>
                  <h2 className="text-3xl font-black text-white">{t('sec3Title')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Award}
                    title={t('sec3Card1Title')}
                    desc={t('sec3Card1Desc')}
                    details={[t('sec3Card1Det1'), t('sec3Card1Det2'), t('sec3Card1Det3')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Clock}
                    title={t('sec3Card2Title')}
                    desc={t('sec3Card2Desc')}
                    details={[t('sec3Card2Det1'), t('sec3Card2Det2'), t('sec3Card2Det3')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={File}
                    title={t('sec3Card3Title')}
                    desc={t('sec3Card3Desc')}
                    details={[t('sec3Card3Det1'), t('sec3Card3Det2'), t('sec3Card3Det3')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Star}
                    title={t('sec3Card4Title')}
                    desc={t('sec3Card4Desc')}
                    details={[t('sec3Card4Det1'), t('sec3Card4Det2')]}
                  />
                </div>
              </section>

              {/* 4. Grades */}
              <section id="grades" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className={`p-3 rounded-2xl ${isRamadan ? 'bg-white/10 shadow-inner' : 'bg-blue-600'}`}>
                    <BarChart className={`w-6 h-6 ${isRamadan ? 'text-blue-400' : 'text-white'}`} />
                  </div>
                  <h2 className="text-3xl font-black text-white">{t('sec4Title')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={PenTool}
                    title={t('sec4Card1Title')}
                    desc={t('sec4Card1Desc')}
                    details={[t('sec4Card1Det1')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Settings}
                    title={t('sec4Card2Title')}
                    desc={t('sec4Card2Desc')}
                    details={[t('sec4Card2Det1')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={PieChart}
                    title={t('sec4Card3Title')}
                    desc={t('sec4Card3Desc')}
                    details={[t('sec4Card3Det1')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={FileText}
                    title={t('sec4Card4Title')}
                    desc={t('sec4Card4Desc')}
                    details={[t('sec4Card4Det1')]}
                  />
                </div>
              </section>

              {/* 5. Knights */}
              <section id="knights" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className={`p-3 rounded-2xl ${isRamadan ? 'bg-white/10 shadow-inner' : 'bg-amber-600'}`}>
                    <Award className={`w-6 h-6 ${isRamadan ? 'text-amber-400' : 'text-white'}`} />
                  </div>
                  <h2 className="text-3xl font-black text-white">{t('sec5Title')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Award}
                    title={t('sec5Card1Title')}
                    desc={t('sec5Card1Desc')}
                    details={[t('sec5Card1Det1')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={FileText}
                    title={t('sec5Card2Title')}
                    desc={t('sec5Card2Desc')}
                    details={[t('sec5Card2Det1')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Users}
                    title={t('sec5Card3Title')}
                    desc={t('sec5Card3Desc')}
                    details={[t('sec5Card3Det1')]}
                  />
                </div>
              </section>

              {/* 6. Reports */}
              <section id="reports" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className={`p-3 rounded-2xl ${isRamadan ? 'bg-white/10 shadow-inner' : 'bg-indigo-600'}`}>
                    <Printer className={`w-6 h-6 ${isRamadan ? 'text-indigo-400' : 'text-white'}`} />
                  </div>
                  <h2 className="text-3xl font-black text-white">{t('sec6Title')}</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={FileText}
                    title={t('sec6Card1Title')}
                    desc={t('sec6Card1Desc')}
                    details={[t('sec6Card1Det1')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Printer}
                    title={t('sec6Card2Title')}
                    desc={t('sec6Card2Desc')}
                    details={[t('sec6Card2Det1')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Shield}
                    title={t('sec6Card3Title')}
                    desc={t('sec6Card3Desc')}
                    details={[t('sec6Card3Det1')]}
                  />
                </div>
              </section>

              {/* 7. Settings */}
              <section id="settings" className="scroll-mt-24 border-t border-slate-800 pt-12">
                <div className="flex items-center gap-3 mb-8">
                  <div className={`p-3 rounded-2xl ${isRamadan ? 'bg-white/10 shadow-inner' : 'bg-slate-700'}`}>
                    <Settings className={`w-6 h-6 ${isRamadan ? 'text-slate-400' : 'text-white'}`} />
                  </div>
                  <h2 className="text-3xl font-black text-white">{t('sec7Title')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Save}
                    title={t('sec7Card1Title')}
                    desc={t('sec7Card1Desc')}
                    details={[t('sec7Card1Det1')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={RefreshCw}
                    title={t('sec7Card2Title')}
                    desc={t('sec7Card2Desc')}
                    details={[t('sec7Card2Det1')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={Trash2}
                    title={t('sec7Card3Title')}
                    desc={t('sec7Card3Desc')}
                    details={[t('sec7Card3Det1')]}
                  />
                  <DetailCard
                    isRamadan={isRamadan}
                    icon={WifiOff}
                    title={t('sec7Card4Title')}
                    desc={t('sec7Card4Desc')}
                    details={[t('sec7Card4Det1')]}
                  />
                </div>
              </section>
            </div>

            <div className={`text-center py-12 text-sm font-bold border-t ${isRamadan ? 'border-white/10 text-indigo-200/50' : 'border-slate-900 text-slate-500 bg-slate-950'}`}>
              {t('footerText1')} {new Date().getFullYear()}
            </div>

        </div> 
      </main>
    </div>
  );
};

export default UserGuide;
