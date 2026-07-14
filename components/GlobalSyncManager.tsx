import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  CloudDownload,
  CloudSync,
  CloudUpload,
  GraduationCap,
  Loader2,
  Server,
  Smartphone,
  Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageLayout from '../components/PageLayout';
import type { RasedBackupPayload } from '../types';

const STUDENT_APP_URL =
  'https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec';
const PARENT_APP_URL =
  'https://script.google.com/macros/s/AKfycbzKPPsQsM_dIttcYSxRLs6LQuvXhT6Qia5TwJ1Tw4ObQ-eZFZeJhV6epXXjxA9_SwWk/exec';
const DEVICE_SYNC_URL =
  'https://script.google.com/macros/s/AKfycbxXUII_Q_6K6TuewJ0k44mi8mCB-6LQNbDo9rhVdaVOvYCyKFRNCBuddLe_PyLorCdT/exec';
const ADMIN_APP_URL =
  'https://script.google.com/macros/s/AKfycbwZHhZ-RPWUpBGIlw0qTFPUmOPmq9WpcvW4WLklcjb_A9U3MW0luIXYPnHznI29ThpbMA/exec';

const CLOUD_PAYLOAD_CHUNK_SIZE = 30000;

type SyncType = 'student' | 'parent' | 'backup' | 'restore' | 'admin';
type SyncState = 'idle' | 'syncing' | 'success' | 'error';

interface CloudRecord {
  id: string;
  type: string;
  data: string;
  lastUpdated: number;
}

const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const splitText = (value: string, size = CLOUD_PAYLOAD_CHUNK_SIZE) => {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [''];
};

const parseChunkIndex = (id: string, prefix: string) => {
  const parsed = Number(id.replace(prefix, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildFullBackupRecords = (
  payload: RasedBackupPayload,
  timestamp: number
): CloudRecord[] => {
  const serialized = JSON.stringify(payload);
  const chunks = splitText(serialized);

  return [
    {
      id: 'full_backup_manifest',
      type: 'FullBackupManifest',
      data: JSON.stringify({
        schemaVersion: payload.schemaVersion,
        version: payload.version,
        chunkCount: chunks.length,
        totalLength: serialized.length,
        timestamp: payload.timestamp
      }),
      lastUpdated: timestamp
    },
    ...chunks.map((chunk, index) => ({
      id: `full_backup_chunk_${index}`,
      type: 'FullBackupChunk',
      data: chunk,
      lastUpdated: timestamp
    }))
  ];
};

const restoreFullBackupFromRecords = (
  records: any[]
): RasedBackupPayload | null => {
  const manifestRecord = records.find(
    record => record.id === 'full_backup_manifest'
  );
  const chunks = records
    .filter(
      record =>
        record.type === 'FullBackupChunk' ||
        String(record.id || '').startsWith('full_backup_chunk_')
    )
    .sort(
      (left, right) =>
        parseChunkIndex(String(left.id), 'full_backup_chunk_') -
        parseChunkIndex(String(right.id), 'full_backup_chunk_')
    );

  if (!manifestRecord || chunks.length === 0) return null;

  const manifest = safeJsonParse<any>(manifestRecord.data, null);
  if (!manifest || chunks.length < Number(manifest.chunkCount || 0)) {
    throw new Error('النسخة السحابية غير مكتملة. أعد رفع النسخة ثم حاول مجددًا.');
  }

  const serialized = chunks.map(record => String(record.data || '')).join('');
  if (
    manifest.totalLength &&
    serialized.length !== Number(manifest.totalLength)
  ) {
    throw new Error('تعذر تجميع النسخة السحابية بصورة صحيحة.');
  }

  return JSON.parse(serialized) as RasedBackupPayload;
};

const GlobalSyncManager: React.FC = () => {
  const {
    students,
    classes,
    teacherInfo,
    assessmentTools,
    t,
    createBackupPayload,
    restoreBackupPayload
  } = useApp();

  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [adminSchoolCode, setAdminSchoolCode] = useState('');

  useEffect(() => {
    const savedCode = localStorage.getItem('rased_admin_school_code');
    if (savedCode) setAdminSchoolCode(savedCode);
  }, []);

  const showSuccess = (message: string) => {
    setSyncState('success');
    setSyncMessage(message);
    window.setTimeout(() => setSyncState('idle'), 3000);
  };

  const postJson = async (url: string, body: unknown) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  };

  const syncStudentApp = async () => {
    setSyncMessage(t('syncingStudentMsg'));
    const tasks = safeJsonParse<any[]>(
      localStorage.getItem('rased_teacher_tasks'),
      []
    );
    const libraryArchive = safeJsonParse<any[]>(
      localStorage.getItem('rased_library_archive'),
      []
    );
    const gameQuestions = safeJsonParse<any[]>(
      localStorage.getItem('rased_game_questions'),
      []
    );

    await postJson(STUDENT_APP_URL, {
      students,
      tasks,
      resources: libraryArchive,
      gameQuestions,
      className: 'الكل'
    });
  };

  const syncParentApp = async () => {
    setSyncMessage(t('syncingParentMsg'));
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const parentPayload = students
      .filter(student => student.rasedId?.trim())
      .map(student => {
        const monthlyPoints = (student.behaviors || [])
          .filter(behavior => {
            const date = new Date(behavior.date);
            return (
              date.getMonth() === currentMonth &&
              date.getFullYear() === currentYear
            );
          })
          .reduce((sum, behavior) => sum + Number(behavior.points || 0), 0);

        return {
          rasedId: student.rasedId,
          name: student.name,
          className: student.classes?.[0] || '',
          subject: teacherInfo?.subject || t('unspecified'),
          schoolName: teacherInfo?.school || t('unspecified'),
          totalPoints: monthlyPoints,
          behaviors: student.behaviors || [],
          grades: student.grades || [],
          attendance: student.attendance || []
        };
      });

    if (parentPayload.length === 0) {
      throw new Error('لا يوجد طالب يمتلك كود راصد RSD للمزامنة.');
    }

    await postJson(PARENT_APP_URL, parentPayload);
  };

  const syncAdminApp = async () => {
    setSyncMessage('جاري إرسال التقرير الشامل للإدارة...');
    const schoolCode = adminSchoolCode.trim();
    localStorage.setItem('rased_admin_school_code', schoolCode);
    const today = new Date();
    const todayText = today.toLocaleDateString('en-CA');
    const absentStudents: string[] = [];
    const lateStudents: string[] = [];
    const truantStudents: string[] = [];

    students.forEach(student => {
      const record = student.attendance?.find(attendance => {
        if (attendance.date === todayText) return true;
        const date = new Date(attendance.date);
        return !Number.isNaN(date.getTime()) &&
          date.toDateString() === today.toDateString();
      });
      if (!record) return;
      const status = String(record.status).toLowerCase().trim();
      if (status === 'absent' || status === 'غائب') {
        absentStudents.push(student.name);
      } else if (status === 'late' || status === 'متأخر') {
        lateStudents.push(student.name);
      } else if (
        status === 'truant' ||
        status === 'escaped' ||
        status === 'متسرب'
      ) {
        truantStudents.push(student.name);
      }
    });

    await fetch(ADMIN_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        schoolCode,
        teacherName: teacherInfo?.name || 'معلم غير محدد',
        className: classes[0] || 'كل الفصول',
        absentStudents,
        lateStudents,
        truantStudents,
        timestamp: new Date().toISOString()
      })
    });
  };

  const uploadCloudBackup = async () => {
    setSyncMessage(t('syncingBackupMsg'));
    const teacherUniqueId = `id_${teacherInfo.civilId!.trim()}`;
    const payload = createBackupPayload();
    const timestamp = Date.now();
    const records = buildFullBackupRecords(payload, timestamp);

    const response = await postJson(DEVICE_SYNC_URL, {
      action: 'sync',
      teacherPhone: teacherUniqueId,
      records
    });
    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'تعذر حفظ النسخة في السحابة.');
    }
  };

  const restoreLegacyCloudRecords = (records: any[]) => {
    const current = createBackupPayload();
    const studentChunks: Array<{ id: string; data: any[] }> = [];
    const legacy: any = { ...current };

    records.forEach(record => {
      if (!record?.data) return;
      try {
        const parsed = JSON.parse(record.data);
        switch (record.id) {
          case 'tools_data':
            legacy.assessmentTools = parsed;
            break;
          case 'groups_data':
            legacy.groups = parsed;
            break;
          case 'categorizations_data':
            legacy.categorizations = parsed;
            break;
          case 'gradeSettings_data':
            legacy.gradeSettings = parsed;
            break;
          case 'classes_data':
            legacy.classes = parsed;
            break;
          case 'teacher_info_data':
            legacy.teacherInfo = parsed;
            break;
          case 'schedule_data':
            legacy.schedule = parsed;
            break;
          case 'periodTimes_data':
            legacy.periodTimes = parsed;
            break;
          case 'certSettings_data':
            legacy.certificateSettings = parsed;
            break;
          case 'hiddenClasses_data':
            legacy.hiddenClasses = parsed;
            break;
          default:
            if (record.type === 'StudentsChunk') {
              studentChunks.push({ id: String(record.id), data: parsed });
            }
        }
      } catch (error) {
        console.warn('Unable to parse legacy cloud record:', record.id, error);
      }
    });

    if (studentChunks.length > 0) {
      studentChunks.sort(
        (left, right) =>
          parseChunkIndex(left.id, 'students_chunk_') -
          parseChunkIndex(right.id, 'students_chunk_')
      );
      legacy.students = studentChunks.flatMap(chunk =>
        Array.isArray(chunk.data) ? chunk.data : []
      );
    }

    return legacy;
  };

  const downloadCloudBackup = async () => {
    setSyncMessage(t('syncingRestoreMsg'));
    const teacherUniqueId = `id_${teacherInfo.civilId!.trim()}`;
    const response = await postJson(DEVICE_SYNC_URL, {
      action: 'sync',
      teacherPhone: teacherUniqueId,
      records: []
    });
    const result = await response.json();

    if (
      result.status !== 'success' ||
      !Array.isArray(result.records) ||
      result.records.length === 0
    ) {
      throw new Error(t('alertNoDataInCloud'));
    }

    const fullBackup = restoreFullBackupFromRecords(result.records);
    const backupToRestore =
      fullBackup || restoreLegacyCloudRecords(result.records);

    await restoreBackupPayload(backupToRestore, {
      saveToDeviceFile: true,
      reloadAfterRestore: false
    });

    setSyncState('success');
    setSyncMessage(t('syncRestoreSuccess'));
    window.setTimeout(() => window.location.reload(), 1200);
  };

  const handleSync = async (type: SyncType) => {
    if (
      (type === 'backup' || type === 'restore') &&
      !teacherInfo?.civilId?.trim()
    ) {
      alert('أدخل كود المعلم السري في الإعدادات لربط النسخة السحابية.');
      return;
    }
    if (type === 'admin' && adminSchoolCode.trim().length < 2) {
      alert('أدخل كود المدرسة أولًا للاتصال بنظام الإدارة.');
      return;
    }
    if (type === 'restore' && !window.confirm(t('alertConfirmPull'))) return;
    if (type === 'backup' && !window.confirm(t('alertConfirmPush'))) return;

    setSyncState('syncing');
    try {
      if (type === 'student') await syncStudentApp();
      if (type === 'parent') await syncParentApp();
      if (type === 'admin') await syncAdminApp();
      if (type === 'backup') await uploadCloudBackup();
      if (type === 'restore') {
        await downloadCloudBackup();
        return;
      }
      showSuccess(t('syncSuccess'));
    } catch (error: any) {
      console.error('Global sync failed:', error);
      setSyncState('error');
      setSyncMessage(error?.message || t('syncError'));
      window.setTimeout(() => setSyncState('idle'), 5000);
    }
  };

  return (
    <PageLayout
      title="مركز المزامنة"
      subtitle="إدارة المزامنة والنسخ الاحتياطي الشامل"
      icon={<CloudSync size={24} />}
      rightActions={
        <div className="flex items-center gap-3">
          <span className="text-[10px] md:text-xs font-bold flex items-center gap-1 text-success bg-success/10 px-2 py-1 rounded-md border border-success/20">
            <Server className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">متصل</span>
          </span>
          <button
            type="button"
            onClick={() => handleSync('student')}
            className="px-3 md:px-4 py-2 rounded-xl border border-primary bg-primary text-white font-bold flex items-center gap-2 hover:bg-primary/90 shadow-md active:scale-95"
          >
            <CloudSync className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">مزامنة سريعة</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 pt-4">
        {syncState !== 'idle' && (
          <div className="rounded-2xl border border-borderColor bg-bgCard p-6 flex flex-col items-center justify-center text-center min-h-[200px] shadow-sm">
            {syncState === 'syncing' && (
              <>
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="font-bold text-textPrimary text-lg">
                  {syncMessage}
                </p>
              </>
            )}
            {syncState === 'success' && (
              <>
                <CheckCircle2 className="w-12 h-12 mb-4 text-success" />
                <p className="font-bold text-textPrimary text-lg">
                  {syncMessage}
                </p>
              </>
            )}
            {syncState === 'error' && (
              <>
                <AlertCircle className="w-12 h-12 mb-4 text-danger" />
                <p className="font-bold mb-6 text-textPrimary text-lg">
                  {syncMessage}
                </p>
                <button
                  type="button"
                  onClick={() => setSyncState('idle')}
                  className="px-6 py-2.5 rounded-xl border border-borderColor bg-bgSoft text-textPrimary font-bold"
                >
                  رجوع
                </button>
              </>
            )}
          </div>
        )}

        {syncState === 'idle' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="عدد الطلاب" value={students.length} />
              <StatCard label="الفصول" value={classes.length} />
              <StatCard label="الأدوات" value={assessmentTools.length} />
              <StatCard label="الحالة" value="جاهز" success />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-3xl border border-borderColor bg-bgCard p-5 space-y-4 shadow-sm">
                <h2 className="font-bold text-lg border-b border-borderColor pb-3 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" /> التطبيقات
                </h2>
                <SyncRow
                  title="تطبيق الطلاب"
                  text="إرسال الطلاب والمهام والمكتبة وأسئلة الألعاب"
                  icon={<GraduationCap className="w-5 h-5" />}
                  buttonText="مزامنة"
                  buttonClass="border-primary/30 bg-primary/10 text-primary hover:bg-primary"
                  onClick={() => handleSync('student')}
                />
                <SyncRow
                  title="تطبيق أولياء الأمور"
                  text="مزامنة السلوك والدرجات والحضور"
                  icon={<Users className="w-5 h-5" />}
                  buttonText="مزامنة"
                  buttonClass="border-warning/30 bg-warning/10 text-warning hover:bg-warning"
                  onClick={() => handleSync('parent')}
                />
                <div className="flex flex-col gap-3 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                  <h4 className="font-bold flex items-center gap-2">
                    <Building className="w-5 h-5 text-emerald-600" /> راصد الإدارة
                  </h4>
                  <p className="text-xs font-bold text-textSecondary">
                    إرسال تقرير الغياب والتأخر والتسرب للإدارة
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={adminSchoolCode}
                      onChange={event =>
                        setAdminSchoolCode(event.target.value.replace(/\D/g, ''))
                      }
                      placeholder="أدخل كود المدرسة"
                      maxLength={6}
                      className="flex-1 px-4 py-3 rounded-xl border border-borderColor bg-bgCard outline-none focus:border-emerald-500 font-mono text-center"
                    />
                    <button
                      type="button"
                      onClick={() => handleSync('admin')}
                      className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
                    >
                      <CloudUpload className="w-5 h-5" /> إرسال للإدارة
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-borderColor bg-bgCard p-5 space-y-4 shadow-sm flex flex-col">
                <h2 className="font-bold text-lg border-b border-borderColor pb-3 flex items-center gap-2">
                  <CloudSync className="w-5 h-5 text-primary" /> السحابة المركزية
                </h2>
                <p className="text-[11px] font-bold text-textSecondary leading-6">
                  النسخة الشاملة تتضمن الخطط والمجموعات والمهام والمكتبة والمراسلات المحلية وإعدادات التقارير والشهادات وبنوك ونتائج الألعاب.
                </p>
                <div className="flex flex-col gap-3 flex-1 justify-center">
                  <button
                    type="button"
                    onClick={() => handleSync('backup')}
                    className="w-full p-4 rounded-2xl border-2 border-borderColor bg-bgSoft font-bold flex items-center justify-between hover:border-primary group active:scale-95"
                  >
                    <span className="text-sm">رفع نسخة احتياطية شاملة</span>
                    <CloudUpload className="w-5 h-5 text-primary" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSync('restore')}
                    className="w-full p-4 rounded-2xl border-2 border-borderColor bg-bgSoft font-bold flex items-center justify-between hover:border-success group active:scale-95"
                  >
                    <span className="text-sm">استرجاع البيانات</span>
                    <CloudDownload className="w-5 h-5 text-success" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  success?: boolean;
}> = ({ label, value, success }) => (
  <div
    className={`rounded-xl border bg-bgCard p-4 shadow-sm ${
      success ? 'border-success/30 bg-success/5' : 'border-borderColor'
    }`}
  >
    <p className="text-xs font-bold text-textSecondary mb-1">{label}</p>
    <h3
      className={`text-xl md:text-2xl font-black ${
        success ? 'text-success' : 'text-textPrimary'
      }`}
    >
      {value}
    </h3>
  </div>
);

const SyncRow: React.FC<{
  title: string;
  text: string;
  icon: React.ReactNode;
  buttonText: string;
  buttonClass: string;
  onClick: () => void;
}> = ({ title, text, icon, buttonText, buttonClass, onClick }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-borderColor bg-bgSoft hover:bg-bgCard">
    <div className="flex-1">
      <h4 className="font-bold text-base">{title}</h4>
      <p className="text-xs font-bold text-textSecondary mt-1">{text}</p>
    </div>
    <button
      type="button"
      onClick={onClick}
      className={`w-full sm:w-auto px-5 py-3 rounded-xl border font-bold flex items-center justify-center gap-2 hover:text-white active:scale-95 ${buttonClass}`}
    >
      {icon} {buttonText}
    </button>
  </div>
);

export default GlobalSyncManager;
