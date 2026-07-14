import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Globe,
  Key,
  Loader2,
  Save,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  UploadCloud,
  UserCircle
} from 'lucide-react';
import { useApp, RASED_DB_FILENAME } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Drawer as DrawerSheet } from './ui/Drawer';

type DrawerName = 'language' | 'profile' | 'system' | 'leadership' | null;
type LoadingAction = 'backup' | 'restore' | 'reset' | null;

const RASED_STORAGE_PREFIXES = [
  'teacher_',
  'rased_term_plan',
  'rased_assessment_plan',
  'rased_teacher_tasks',
  'rased_library_archive',
  'rased_teacher_sent_messages_local',
  'rased_grading_settings',
  'rased_game_questions',
  'rased_teacher_game_questions_',
  'rased_student_game_results_log_',
  'rased_student_latest_game_result_'
];

const Settings: React.FC = () => {
  const {
    teacherInfo,
    setTeacherInfo,
    language,
    setLanguage,
    t,
    dir,
    createBackupPayload,
    restoreBackupPayload
  } = useApp();

  const [name, setName] = useState(teacherInfo?.name || '');
  const [school, setSchool] = useState(teacherInfo?.school || '');
  const [civilId, setCivilId] = useState(teacherInfo?.civilId || '');
  const [role, setRole] = useState<'teacher' | 'senior'>(
    teacherInfo?.role === 'senior' ? 'senior' : 'teacher'
  );
  const [departmentName, setDepartmentName] = useState(
    teacherInfo?.departmentName || ''
  );
  const [leadershipPasscode, setLeadershipPasscode] = useState('');
  const [isLeadershipUnlocked, setIsLeadershipUnlocked] = useState(
    teacherInfo?.role === 'senior'
  );
  const [loading, setLoading] = useState<LoadingAction>(null);
  const [activeDrawer, setActiveDrawer] = useState<DrawerName>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(teacherInfo?.name || '');
    setSchool(teacherInfo?.school || '');
    setCivilId(teacherInfo?.civilId || '');
    setRole(teacherInfo?.role === 'senior' ? 'senior' : 'teacher');
    setDepartmentName(teacherInfo?.departmentName || '');
    setIsLeadershipUnlocked(teacherInfo?.role === 'senior');
  }, [teacherInfo]);

  const handleBackup = async () => {
    setLoading('backup');
    try {
      const payload = createBackupPayload();
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `Rased_Backup_${date}.json`;
      const jsonString = JSON.stringify(payload, null, 2);

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: 'Rased Backup',
          text: 'نسخة احتياطية شاملة من راصد المعلم',
          url: result.uri,
          dialogTitle: 'حفظ أو مشاركة النسخة الاحتياطية'
        });
      } else {
        const blob = new Blob([jsonString], {
          type: 'application/json;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      alert(t('alertExportSuccess'));
    } catch (error) {
      console.error('Backup export failed:', error);
      alert(t('alertExportError'));
    } finally {
      setLoading(null);
      setActiveDrawer(null);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!window.confirm(t('alertConfirmRestore'))) return;

    setLoading('restore');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('INVALID_BACKUP_FILE');
      }

      await restoreBackupPayload(parsed, {
        saveToDeviceFile: true,
        reloadAfterRestore: false
      });

      alert(`${t('alertRestoreSuccess')} 🚀`);
      setActiveDrawer(null);
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Backup restore failed:', error);
      alert(t('alertInvalidFile'));
    } finally {
      setLoading(null);
    }
  };

  const handleFactoryReset = async () => {
    if (!window.confirm(t('alertConfirmReset'))) return;
    setLoading('reset');

    try {
      const keysToDelete: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key) continue;
        if (RASED_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix))) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => localStorage.removeItem(key));

      if (Capacitor.isNativePlatform() || (window as any).electron) {
        await Filesystem.deleteFile({
          path: RASED_DB_FILENAME,
          directory: Directory.Data
        }).catch(() => undefined);
      }

      alert(t('alertResetSuccess'));
      window.location.hash = '#/';
      window.location.reload();
    } catch (error) {
      console.error('Factory reset failed:', error);
      alert('تعذر إتمام إعادة الضبط. حاول مرة أخرى.');
    } finally {
      setLoading(null);
      setActiveDrawer(null);
    }
  };

  const saveProfile = () => {
    setTeacherInfo(previous => ({
      ...previous,
      name: name.trim(),
      school: school.trim(),
      civilId: civilId.trim()
    }));
    setActiveDrawer(null);
  };

  const saveLeadership = () => {
    setTeacherInfo(previous => ({
      ...previous,
      role,
      departmentName: role === 'senior' ? departmentName.trim() : ''
    }));
    setLeadershipPasscode('');
    setActiveDrawer(null);
  };

  const ChevronIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const busy = loading !== null;

  return (
    <div
      className={`flex flex-col h-full overflow-hidden transition-colors duration-500 relative z-10 text-textPrimary ${
        language === 'ar' ? 'text-right' : 'text-left'
      }`}
      dir={dir}
    >
      <header
        className="shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full bg-transparent text-textPrimary"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex justify-between items-center max-w-4xl mx-auto w-full pb-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <div style={{ WebkitAppRegion: 'no-drag' } as any}>
              <h1 className="text-xl md:text-2xl font-black tracking-wide">
                {t('settingsTitle')}
              </h1>
              <p className="text-[10px] font-bold text-textSecondary">
                {t('settingsSubtitle')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-28 custom-scrollbar relative z-10">
        <div className="space-y-6 max-w-2xl mx-auto w-full">
          <section className="space-y-2">
            <h3 className="px-2 text-[10px] font-black uppercase tracking-wider text-textSecondary">
              {t('preferencesSection')}
            </h3>
            <div className="glass-card rounded-2xl overflow-hidden border border-borderColor">
              <button
                type="button"
                onClick={() => setActiveDrawer('language')}
                className="w-full p-4 flex items-center justify-between hover:bg-bgSoft active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Globe size={20} />
                  </div>
                  <span className="font-bold text-sm">{t('appLanguageLabel')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-textSecondary">
                    {language === 'ar' ? 'العربية' : 'English'}
                  </span>
                  <ChevronIcon size={16} className="text-textSecondary" />
                </div>
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="px-2 text-[10px] font-black uppercase tracking-wider text-textSecondary">
              {t('accountAndSchoolSection')}
            </h3>
            <div className="glass-card rounded-2xl overflow-hidden border border-borderColor">
              <button
                type="button"
                onClick={() => setActiveDrawer('profile')}
                className="w-full p-4 flex items-center justify-between hover:bg-bgSoft active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <UserCircle size={20} />
                  </div>
                  <span className="font-bold text-sm">{t('profileTitle')}</span>
                </div>
                <ChevronIcon size={16} className="text-textSecondary" />
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="px-2 text-[10px] font-black uppercase tracking-wider text-textSecondary">
              {t('systemAndDataSection')}
            </h3>
            <div className="glass-card rounded-2xl overflow-hidden border border-borderColor">
              <button
                type="button"
                onClick={() => setActiveDrawer('system')}
                className="w-full p-4 flex items-center justify-between hover:bg-bgSoft active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Database size={20} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-sm">{t('backupTitle')}</span>
                    <span className="text-[10px] text-textSecondary">
                      {t('systemAndDataDesc')}
                    </span>
                  </div>
                </div>
                <ChevronIcon size={16} className="text-textSecondary" />
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="px-2 text-[10px] font-black uppercase tracking-wider text-textSecondary">
              إدارة الصلاحيات
            </h3>
            <div className="glass-card rounded-2xl overflow-hidden border border-borderColor">
              <button
                type="button"
                onClick={() => setActiveDrawer('leadership')}
                className="w-full p-4 flex items-center justify-between hover:bg-bgSoft active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                    <Shield size={20} />
                  </div>
                  <span className="font-bold text-sm">إعدادات المعلم الأول</span>
                </div>
                <ChevronIcon size={16} className="text-textSecondary" />
              </button>
            </div>
          </section>
        </div>
      </div>

      <DrawerSheet
        isOpen={activeDrawer === 'language'}
        onClose={() => setActiveDrawer(null)}
        dir={dir}
        mode="side"
      >
        <div className="flex flex-col h-full w-full">
          <div className="px-6 pb-4 border-b border-borderColor">
            <h3 className="font-black text-xl">{t('appLanguageTitle')}</h3>
          </div>
          <div className="p-6 space-y-3">
            {(['ar', 'en'] as const).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setLanguage(item);
                  setActiveDrawer(null);
                }}
                className={`w-full p-4 rounded-xl border-2 flex items-center justify-between ${
                  language === item
                    ? 'border-primary bg-primary/10'
                    : 'border-borderColor bg-bgCard hover:bg-bgSoft'
                }`}
              >
                <span className="font-bold text-lg">
                  {item === 'ar' ? t('arabicLangLabel') : t('englishLangLabel')}
                </span>
                {language === item && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary text-white">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </DrawerSheet>

      <DrawerSheet
        isOpen={activeDrawer === 'profile'}
        onClose={() => setActiveDrawer(null)}
        dir={dir}
        mode="side"
      >
        <div className="flex flex-col h-full w-full">
          <div className="px-6 pb-4 border-b border-borderColor">
            <h3 className="font-black text-xl">{t('profileTitle')}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-textSecondary">
                {t('teacherNameLabel')}
              </span>
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                className="w-full rounded-xl px-4 py-3.5 outline-none text-sm font-bold border bg-bgSoft border-borderColor focus:border-primary"
                placeholder={t('teacherNamePlaceholder')}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-textSecondary">
                {t('schoolNameLabel')}
              </span>
              <input
                value={school}
                onChange={event => setSchool(event.target.value)}
                className="w-full rounded-xl px-4 py-3.5 outline-none text-sm font-bold border bg-bgSoft border-borderColor focus:border-primary"
                placeholder={t('schoolNamePlaceholder')}
              />
            </label>
            <label className="block space-y-1 pt-2">
              <span className="text-xs font-bold flex items-center gap-1 text-amber-500">
                <Key size={14} /> كود المعلم السري للسحابة
              </span>
              <input
                value={civilId}
                onChange={event => setCivilId(event.target.value)}
                className="w-full rounded-xl px-4 py-3.5 outline-none font-mono font-black tracking-widest text-center border bg-amber-500/5 border-amber-500/20 focus:border-amber-500"
                placeholder="أدخل رقم الهاتف أو كودًا خاصًا"
                dir="ltr"
              />
            </label>
          </div>
          <div className="p-4 border-t border-borderColor bg-bgCard">
            <button
              type="button"
              onClick={saveProfile}
              className="w-full py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 flex items-center justify-center gap-2 bg-primary text-white"
            >
              <Save size={18} /> {t('saveProfileBtn')}
            </button>
          </div>
        </div>
      </DrawerSheet>

      <DrawerSheet
        isOpen={activeDrawer === 'system'}
        onClose={() => setActiveDrawer(null)}
        dir={dir}
        mode="side"
      >
        <div className="flex flex-col h-full w-full">
          <div className="px-6 pb-4 border-b border-borderColor">
            <h3 className="font-black text-xl">{t('backupTitle')}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 text-xs font-bold text-textSecondary leading-6">
              النسخة الشاملة تتضمن الطلاب، الخطط، المجموعات، المهام، المكتبة، سجل الرسائل المحلي، إعدادات التقارير والشهادات، وبنوك ونتائج الألعاب المحلية.
            </div>
            <div className="glass-card rounded-2xl overflow-hidden border border-borderColor divide-y divide-borderColor/50">
              <button
                type="button"
                disabled={busy}
                onClick={handleBackup}
                className="w-full p-4 flex items-center justify-between hover:bg-bgSoft disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    {loading === 'backup' ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Download size={18} />
                    )}
                  </div>
                  <span className="font-bold text-sm">{t('exportBackupLocal')}</span>
                </div>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 flex items-center justify-between hover:bg-bgSoft disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    {loading === 'restore' ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <UploadCloud size={18} />
                    )}
                  </div>
                  <span className="font-bold text-sm">{t('importBackup')}</span>
                </div>
              </button>
            </div>
            <div className="pt-4">
              <p className="text-[10px] font-bold px-2 mb-2 uppercase text-rose-500">
                {t('dangerZoneTitle')}
              </p>
              <div className="rounded-2xl overflow-hidden border border-rose-500/20 bg-rose-500/5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleFactoryReset}
                  className="w-full p-4 flex items-center justify-between hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                      {loading === 'reset' ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </div>
                    <span className="font-bold text-sm text-rose-500">
                      {t('dangerZoneBtn')}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="application/json,.json"
            onChange={handleRestore}
          />
        </div>
      </DrawerSheet>

      <DrawerSheet
        isOpen={activeDrawer === 'leadership'}
        onClose={() => {
          setActiveDrawer(null);
          setLeadershipPasscode('');
        }}
        dir={dir}
        mode="side"
      >
        <div className="flex flex-col h-full w-full">
          <div className="px-6 pb-4 border-b border-borderColor">
            <h3 className="font-black text-xl flex items-center gap-2">
              <Shield className="text-purple-500" /> إعدادات القيادة
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {!isLeadershipUnlocked ? (
              <div className="space-y-4 text-center mt-10">
                <div className="w-16 h-16 mx-auto bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center">
                  <Key size={32} />
                </div>
                <h4 className="font-bold">بوابة المعلم الأول</h4>
                <p className="text-xs text-textSecondary">
                  أدخل الرمز السري لتفعيل الصلاحيات الإشرافية.
                </p>
                <input
                  type="password"
                  value={leadershipPasscode}
                  onChange={event => {
                    const nextValue = event.target.value;
                    setLeadershipPasscode(nextValue);
                    if (nextValue === '5555') setIsLeadershipUnlocked(true);
                  }}
                  className="w-full max-w-xs mx-auto text-center rounded-xl px-4 py-4 outline-none font-black tracking-[1em] border bg-bgSoft border-borderColor focus:border-purple-500 text-xl"
                  placeholder="****"
                  maxLength={4}
                  dir="ltr"
                />
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex gap-3">
                  <Shield className="w-6 h-6 shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">
                    يمكنك تفعيل صلاحيات المعلم الأول وإدخال القسم الذي تشرف عليه.
                  </p>
                </div>
                <label className="flex items-center justify-between p-4 rounded-xl border border-borderColor bg-bgSoft cursor-pointer">
                  <span className="font-bold text-sm">تفعيل صلاحيات المعلم الأول</span>
                  <input
                    type="checkbox"
                    checked={role === 'senior'}
                    onChange={event =>
                      setRole(event.target.checked ? 'senior' : 'teacher')
                    }
                    className="w-5 h-5 accent-purple-500"
                  />
                </label>
                {role === 'senior' && (
                  <label className="block space-y-2">
                    <span className="text-xs font-bold text-textSecondary">
                      القسم الذي تشرف عليه
                    </span>
                    <input
                      value={departmentName}
                      onChange={event => setDepartmentName(event.target.value)}
                      className="w-full rounded-xl px-4 py-3.5 outline-none text-sm font-bold border bg-bgSoft border-borderColor focus:border-purple-500"
                      placeholder="مثال: قسم الرياضيات"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
          {isLeadershipUnlocked && (
            <div className="p-4 border-t border-borderColor bg-bgCard">
              <button
                type="button"
                onClick={saveLeadership}
                className="w-full py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Save size={18} /> حفظ الصلاحيات
              </button>
            </div>
          )}
        </div>
      </DrawerSheet>
    </div>
  );
};

export default Settings;
