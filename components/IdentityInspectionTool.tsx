import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudCog,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundX,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  inspectStudentsIdentity,
  migratePilotStudents,
  migrateClassStudents,
  syncStudentIdentityProfiles,
  type IdentityResolutionResult,
  type IdentityResolutionStatus,
} from '../services/schoolIdentityService';

type StatusFilter = 'all' | IdentityResolutionStatus | 'not_checked';

type PreviewRow = {
  localStudentId: string;
  name: string;
  className: string;
  currentRasedId: string;
  result?: IdentityResolutionResult;
};

const STATUS_META: Record<IdentityResolutionStatus | 'not_checked', {
  label: string;
  badge: string;
  description: string;
}> = {
  matched: {
    label: 'مطابق',
    badge: 'bg-success/10 text-success border-success/20',
    description: 'تم العثور على هوية مركزية مطابقة.',
  },
  created: {
    label: 'مُنشأ',
    badge: 'bg-primary/10 text-primary border-primary/20',
    description: 'حالة غير متوقعة في وضع الفحص فقط.',
  },
  pending: {
    label: 'بانتظار الترحيل',
    badge: 'bg-warning/10 text-warning border-warning/20',
    description: 'لا توجد هوية مركزية، ولم يتم إنشاء أي سجل.',
  },
  conflict: {
    label: 'تعارض',
    badge: 'bg-danger/10 text-danger border-danger/20',
    description: 'وجدت الخدمة أكثر من مطابقة محتملة.',
  },
  invalid: {
    label: 'بيانات غير مكتملة',
    badge: 'bg-danger/10 text-danger border-danger/20',
    description: 'الاسم أو الفصل غير متوفر بالصورة المطلوبة.',
  },
  not_checked: {
    label: 'لم يُفحص',
    badge: 'bg-bgSoft text-textSecondary border-borderColor',
    description: 'لم تُرسل بيانات الطالب إلى خدمة الفحص بعد.',
  },
};

const getClassName = (student: any): string =>
  String(student?.classes?.[0] || student?.className || student?.class || '').trim();

const getCurrentRasedId = (student: any): string =>
  String(
    student?.rasedId ||
      student?.rasedID ||
      student?.parentCode ||
      student?.secretCode ||
      '',
  ).trim().toUpperCase();

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const IdentityInspectionTool: React.FC = () => {
  const { students, setStudents, classes, teacherInfo } = useApp();
  const schoolCode = String(
    localStorage.getItem('rased_admin_school_code') ||
      (teacherInfo as any)?.schoolCode ||
      '',
  ).trim();
  const actorId = String(
    teacherInfo?.civilId ||
      localStorage.getItem('rased_teacher_civil_id') ||
      '',
  ).trim();

  const [results, setResults] = useState<Record<string, IdentityResolutionResult>>({});
  const [isInspecting, setIsInspecting] = useState(false);
  const [error, setError] = useState('');
  const [lastCheckedAt, setLastCheckedAt] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [batchSize, setBatchSize] = useState<25 | 50 | 100 | 'all'>(25);
  const [selectedPilotIds, setSelectedPilotIds] = useState<string[]>([]);
  const [confirmationText, setConfirmationText] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState('');
  const [classConfirmationText, setClassConfirmationText] = useState('');
  const [isMigratingClass, setIsMigratingClass] = useState(false);
  const [classMigrationMessage, setClassMigrationMessage] = useState('');

  const rows = useMemo<PreviewRow[]>(
    () =>
      students.map((student: any) => {
        const localStudentId = String(student.localStudentId || student.id || '').trim();
        return {
          localStudentId,
          name: String(student.name || '').trim(),
          className: getClassName(student),
          currentRasedId: getCurrentRasedId(student),
          result: results[localStudentId],
        };
      }),
    [students, results],
  );

  const counts = useMemo(() => {
    const base: Record<IdentityResolutionStatus | 'not_checked', number> = {
      matched: 0,
      created: 0,
      pending: 0,
      conflict: 0,
      invalid: 0,
      not_checked: 0,
    };
    rows.forEach((row) => {
      const status = row.result?.status || 'not_checked';
      base[status] += 1;
    });
    return base;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const status = row.result?.status || 'not_checked';
      const classMatches = selectedClass === 'all' || row.className === selectedClass;
      const statusMatches = statusFilter === 'all' || status === statusFilter;
      const queryMatches =
        !normalizedQuery ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.currentRasedId.toLowerCase().includes(normalizedQuery) ||
        row.localStudentId.toLowerCase().includes(normalizedQuery);
      return classMatches && statusMatches && queryMatches;
    });
  }, [rows, query, selectedClass, statusFilter]);

  const persistIdentityResults = async (items: IdentityResolutionResult[]) => {
    const usable = items.filter((item) =>
      Boolean(item.localStudentId && item.centralStudentId && item.schoolId && item.rasedId),
    );
    if (!usable.length) return;
    const byLocalId = new Map(usable.map((item) => [item.localStudentId, item]));
    const now = new Date().toISOString();

    setStudents((currentStudents: any[]) => currentStudents.map((student: any) => {
      const localId = String(student.localStudentId || student.id || '').trim();
      const item = byLocalId.get(localId);
      if (!item) return student;
      const currentCode = getCurrentRasedId(student);
      return {
        ...student,
        localStudentId: localId,
        centralStudentId: item.centralStudentId,
        schoolId: item.schoolId,
        schoolCode,
        centralRasedId: item.rasedId,
        legacyRasedIds: Array.from(new Set([
          ...(Array.isArray(student.legacyRasedIds) ? student.legacyRasedIds : []),
          ...(item.legacyRasedIds || []),
          ...(currentCode ? [currentCode] : []),
        ])),
        identityStatus: item.status === 'created' ? 'created' : 'matched',
        identityUpdatedAt: now,
        identityConflictId: undefined,
        identitySource: item.status === 'created' ? 'migration' : 'central',
        // لا نغيّر rasedId أو parentCode الحاليين في المرحلة الانتقالية.
      };
    }));

    const sourceById = new Map(students.map((student: any) => [
      String(student.localStudentId || student.id || '').trim(), student,
    ]));
    const profiles = usable.map((item) => {
      const student: any = sourceById.get(item.localStudentId);
      return {
        centralStudentId: item.centralStudentId!,
        name: String(student?.name || '').trim(),
        classes: Array.isArray(student?.classes) ? student.classes : undefined,
        className: getClassName(student),
      };
    });
    const profileResponse = await syncStudentIdentityProfiles({ schoolCode, actorId, profiles });
    if (!profileResponse.ok) throw new Error(profileResponse.error || 'PROFILE_SYNC_FAILED');
  };

  const inspect = async () => {
    setError('');
    if (!schoolCode) {
      setError('كود المدرسة غير متوفر في هذا الجهاز.');
      return;
    }
    if (!actorId) {
      setError('معرف المعلم غير متوفر. سجّل الرقم الخاص للمعلم أولًا.');
      return;
    }

    const source = selectedClass === 'all'
      ? students
      : students.filter((student: any) => getClassName(student) === selectedClass);
    const limited = batchSize === 'all' ? source : source.slice(0, batchSize);

    if (!limited.length) {
      setError('لا يوجد طلاب ضمن النطاق المحدد للفحص.');
      return;
    }

    setIsInspecting(true);
    try {
      const response = await inspectStudentsIdentity({
        schoolCode,
        actorId,
        students: limited as any[],
      });
      if (!response.ok) throw new Error(response.error || 'IDENTITY_INSPECTION_FAILED');

      const next = { ...results };
      (response.results || []).forEach((item) => {
        if (item.localStudentId) next[item.localStudentId] = item;
      });
      setResults(next);
      await persistIdentityResults(response.results || []);
      setLastCheckedAt(new Date().toISOString());
    } catch (inspectionError) {
      console.error('Identity inspection failed', inspectionError);
      setError(
        inspectionError instanceof Error
          ? inspectionError.message
          : 'تعذر الاتصال بخدمة الهوية المركزية.',
      );
    } finally {
      setIsInspecting(false);
    }
  };


  const selectedClassStudents = useMemo(
    () => selectedClass === 'all'
      ? []
      : students.filter((student: any) => getClassName(student) === selectedClass),
    [students, selectedClass],
  );

  const selectedClassReadiness = useMemo(() => {
    const statuses = selectedClassStudents.map((student: any) => {
      const localId = String(student.localStudentId || student.id || '').trim();
      return results[localId]?.status || 'not_checked';
    });
    return {
      total: statuses.length,
      notChecked: statuses.filter((status) => status === 'not_checked').length,
      pending: statuses.filter((status) => status === 'pending').length,
      matched: statuses.filter((status) => status === 'matched' || status === 'created').length,
      blockers: statuses.filter((status) => status === 'conflict' || status === 'invalid').length,
    };
  }, [selectedClassStudents, results]);

  const migrateFullClass = async () => {
    setError('');
    setClassMigrationMessage('');
    if (selectedClass === 'all') {
      setError('اختر فصلًا محددًا قبل تنفيذ ترحيل الفصل الكامل.');
      return;
    }
    if (!selectedClassStudents.length) {
      setError('لا يوجد طلاب في الفصل المحدد.');
      return;
    }
    if (selectedClassStudents.length > 60) {
      setError('عدد طلاب الفصل أكبر من الحد الآمن 60 طالبًا.');
      return;
    }
    if (selectedClassReadiness.notChecked > 0) {
      setError('افحص جميع طلاب الفصل أولًا باختيار «جميع الطلاب المحددين».');
      return;
    }
    if (selectedClassReadiness.blockers > 0) {
      setError('توجد حالات تعارض أو بيانات غير مكتملة. عالجها قبل ترحيل الفصل.');
      return;
    }
    if (classConfirmationText.trim() !== 'ترحيل الفصل') {
      setError('اكتب عبارة «ترحيل الفصل» كما هي لتأكيد العملية.');
      return;
    }
    setIsMigratingClass(true);
    try {
      const requestId = `class-${schoolCode}-${selectedClass}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const response = await migrateClassStudents({
        schoolCode,
        actorId,
        requestId,
        className: selectedClass,
        confirmationText: classConfirmationText.trim(),
        students: selectedClassStudents as any[],
      });
      if (!response.ok) {
        const friendly = response.error === 'CLASS_PREFLIGHT_BLOCKED'
          ? 'أوقفت الخدمة الدفعة لأن الفحص السحابي وجد تعارضًا أو بيانات ناقصة.'
          : response.error === 'CLASS_DUPLICATE_CANDIDATES'
            ? 'أوقفت الخدمة الدفعة لوجود اسم وفصل متطابقين داخل الفصل.'
            : response.error || 'CLASS_MIGRATION_FAILED';
        throw new Error(friendly);
      }
      const next = { ...results };
      (response.results || []).forEach((item) => {
        if (item.localStudentId) next[item.localStudentId] = item;
      });
      setResults(next);
      await persistIdentityResults(response.results || []);
      setClassConfirmationText('');
      setClassMigrationMessage(
        `نجح ترحيل الفصل ${selectedClass}. إجمالي ${selectedClassStudents.length} طالبًا، أُنشئ ${response.summary?.created || 0} وطابق ${response.summary?.matched || 0}. رقم العملية: ${response.migrationJobId || 'غير متوفر'}.`,
      );
    } catch (classMigrationError) {
      console.error('Class identity migration failed', classMigrationError);
      setError(classMigrationError instanceof Error ? classMigrationError.message : 'تعذر ترحيل الفصل.');
    } finally {
      setIsMigratingClass(false);
    }
  };

  const togglePilotStudent = (localStudentId: string) => {
    setMigrationMessage('');
    setSelectedPilotIds((current) => {
      if (current.includes(localStudentId)) return current.filter((id) => id !== localStudentId);
      if (current.length >= 5) {
        setError('الترحيل التجريبي محدود بخمسة طلاب فقط.');
        return current;
      }
      setError('');
      return [...current, localStudentId];
    });
  };

  const migratePilot = async () => {
    setError('');
    setMigrationMessage('');
    if (selectedPilotIds.length < 1 || selectedPilotIds.length > 5) {
      setError('اختر من طالب واحد إلى خمسة طلاب بحالة «بانتظار الترحيل».');
      return;
    }
    if (confirmationText.trim() !== 'ترحيل تجريبي') {
      setError('اكتب عبارة «ترحيل تجريبي» كما هي لتأكيد العملية.');
      return;
    }
    const selectedStudents = students.filter((student: any) =>
      selectedPilotIds.includes(String(student.localStudentId || student.id || '').trim()),
    );
    if (selectedStudents.some((student: any) => results[String(student.localStudentId || student.id || '').trim()]?.status !== 'pending')) {
      setError('يمكن اختيار الطلاب الذين ظهرت حالتهم «بانتظار الترحيل» فقط.');
      return;
    }
    setIsMigrating(true);
    try {
      const requestId = `pilot-${schoolCode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const response = await migratePilotStudents({
        schoolCode,
        actorId,
        requestId,
        confirmationText: confirmationText.trim(),
        students: selectedStudents as any[],
      });
      if (!response.ok) throw new Error(response.error || 'PILOT_MIGRATION_FAILED');
      const next = { ...results };
      (response.results || []).forEach((item) => {
        if (item.localStudentId) next[item.localStudentId] = item;
      });
      setResults(next);
      await persistIdentityResults(response.results || []);
      setSelectedPilotIds([]);
      setConfirmationText('');
      setMigrationMessage(`نجح الترحيل التجريبي. رقم العملية: ${response.migrationJobId || 'غير متوفر'}. لم تتغير الأكواد المحلية الحالية.`);
    } catch (migrationError) {
      console.error('Pilot identity migration failed', migrationError);
      setError(migrationError instanceof Error ? migrationError.message : 'تعذر تنفيذ الترحيل التجريبي.');
    } finally {
      setIsMigrating(false);
    }
  };

  const clearPreview = () => {
    setResults({});
    setError('');
    setLastCheckedAt('');
    setSelectedPilotIds([]);
    setConfirmationText('');
    setMigrationMessage('');
    setClassConfirmationText('');
    setClassMigrationMessage('');
  };

  const exportReport = () => {
    const header = [
      'localStudentId',
      'studentName',
      'className',
      'currentRasedId',
      'status',
      'matchMethod',
      'centralStudentId',
      'schoolId',
      'centralRasedId',
      'conflictId',
      'error',
    ];
    const lines = rows.map((row) => [
      row.localStudentId,
      row.name,
      row.className,
      row.currentRasedId,
      row.result?.status || 'not_checked',
      row.result?.matchMethod || '',
      row.result?.centralStudentId || '',
      row.result?.schoolId || '',
      row.result?.rasedId || '',
      row.result?.conflictId || '',
      row.result?.error || '',
    ].map(csvCell).join(','));

    const csv = `\uFEFF${header.map(csvCell).join(',')}\n${lines.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rased-identity-inspection-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const inspectedCount = rows.length - counts.not_checked;

  return (
    <section className="space-y-5" dir="rtl">
      <div className="rounded-3xl border border-borderColor bg-bgCard p-5 md:p-7 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-textPrimary">فحص الهوية المدرسية</h2>
              <p className="mt-1 max-w-3xl text-sm font-bold leading-7 text-textSecondary">
                معاينة آمنة لحالة الطلاب في السجل المركزي. الأداة تعمل بوضع الفحص فقط ولا تنشئ
                هوية جديدة ولا تغيّر أي كود RSD حالي.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-black text-success">
            وضع آمن: allowCreate = false
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoBox label="المدرسة" value={teacherInfo?.school || 'غير محددة'} />
          <InfoBox label="كود المدرسة" value={schoolCode || 'غير متوفر'} mono />
          <InfoBox label="إجمالي الطلاب" value={String(students.length)} />
          <InfoBox
            label="آخر فحص"
            value={lastCheckedAt ? new Date(lastCheckedAt).toLocaleString('ar-OM') : 'لم يُنفذ'}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatusCard icon={UserCheck} label="مطابق" count={counts.matched} tone="success" />
        <StatusCard icon={Users} label="بانتظار الترحيل" count={counts.pending} tone="warning" />
        <StatusCard icon={AlertTriangle} label="تعارض" count={counts.conflict} tone="danger" />
        <StatusCard icon={UserRoundX} label="غير مكتمل" count={counts.invalid} tone="danger" />
        <StatusCard icon={CloudCog} label="لم يُفحص" count={counts.not_checked} tone="muted" />
      </div>

      <div className="rounded-3xl border border-borderColor bg-bgCard p-4 md:p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2 xl:col-span-2">
            <span className="text-xs font-black text-textSecondary">بحث</span>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="اسم الطالب أو كود RSD"
                className="h-11 w-full rounded-2xl border border-borderColor bg-bgSoft pr-10 pl-3 font-bold text-textPrimary outline-none focus:border-primary"
              />
            </div>
          </label>

          <SelectField label="الفصل" value={selectedClass} onChange={setSelectedClass}>
            <option value="all">كل الفصول</option>
            {classes.map((className) => <option key={className} value={className}>{className}</option>)}
          </SelectField>

          <SelectField label="الحالة" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)}>
            <option value="all">كل الحالات</option>
            <option value="not_checked">لم يُفحص</option>
            <option value="pending">بانتظار الترحيل</option>
            <option value="matched">مطابق</option>
            <option value="conflict">تعارض</option>
            <option value="invalid">غير مكتمل</option>
          </SelectField>

          <SelectField label="حجم دفعة الفحص" value={String(batchSize)} onChange={(value) => setBatchSize(value === 'all' ? 'all' : Number(value) as 25 | 50 | 100)}>
            <option value="25">25 طالبًا</option>
            <option value="50">50 طالبًا</option>
            <option value="100">100 طالب</option>
            <option value="all">جميع الطلاب المحددين</option>
          </SelectField>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={inspect}
            disabled={isInspecting || students.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-black text-white shadow-sm transition active:scale-95 disabled:opacity-60"
          >
            {isInspecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
            {isInspecting ? 'جاري الفحص...' : 'بدء الفحص الآمن'}
          </button>
          <button
            type="button"
            onClick={exportReport}
            disabled={!inspectedCount}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-borderColor bg-bgSoft px-5 font-black text-textPrimary transition active:scale-95 disabled:opacity-50"
          >
            <Download className="h-5 w-5" />
            تصدير تقرير CSV
          </button>
          <button
            type="button"
            onClick={clearPreview}
            disabled={!inspectedCount}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 font-black text-textSecondary transition hover:bg-bgSoft disabled:opacity-50"
          >
            مسح المعاينة
          </button>
        </div>
      </div>



      <div className="rounded-3xl border border-primary/25 bg-primary/5 p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="font-black text-textPrimary">ترحيل فصل كامل</h3>
              <p className="mt-1 text-sm font-bold leading-7 text-textSecondary">
                اختر فصلًا من مرشح الفصل، ثم افحص جميع طلابه. تتوقف الدفعة كاملة قبل الإنشاء إذا ظهر تعارض أو نقص في البيانات.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-black sm:grid-cols-5">
              <span className="rounded-xl bg-bgCard px-3 py-2">الإجمالي: {selectedClassReadiness.total}</span>
              <span className="rounded-xl bg-bgCard px-3 py-2">لم يُفحص: {selectedClassReadiness.notChecked}</span>
              <span className="rounded-xl bg-warning/10 px-3 py-2 text-warning">معلق: {selectedClassReadiness.pending}</span>
              <span className="rounded-xl bg-success/10 px-3 py-2 text-success">مطابق: {selectedClassReadiness.matched}</span>
              <span className="rounded-xl bg-danger/10 px-3 py-2 text-danger">مانع: {selectedClassReadiness.blockers}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={classConfirmationText}
              onChange={(event) => setClassConfirmationText(event.target.value)}
              placeholder="اكتب: ترحيل الفصل"
              disabled={selectedClass === 'all'}
              className="h-11 flex-1 rounded-2xl border border-primary/25 bg-bgCard px-4 font-bold text-textPrimary outline-none focus:border-primary disabled:opacity-50"
            />
            <button
              type="button"
              onClick={migrateFullClass}
              disabled={
                isMigratingClass ||
                selectedClass === 'all' ||
                selectedClassReadiness.total < 1 ||
                selectedClassReadiness.notChecked > 0 ||
                selectedClassReadiness.blockers > 0 ||
                classConfirmationText.trim() !== 'ترحيل الفصل'
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-black text-white disabled:opacity-50"
            >
              {isMigratingClass ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
              تنفيذ ترحيل الفصل
            </button>
          </div>
          {selectedClass === 'all' && (
            <p className="text-xs font-black text-textSecondary">اختر فصلًا محددًا من قائمة الفصل لتفعيل هذه العملية.</p>
          )}
          {classMigrationMessage && (
            <div className="rounded-2xl border border-success/20 bg-success/10 p-4 text-sm font-black text-success">
              {classMigrationMessage}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-warning/30 bg-warning/10 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-black text-textPrimary">الترحيل التجريبي المحكوم</h3>
            <p className="mt-1 text-sm font-bold leading-7 text-textSecondary">
              اختر من طالب واحد إلى خمسة طلاب بحالة «بانتظار الترحيل». ستنشأ الهوية المركزية ويحفظ الكود القديم كاسم بديل، ولن يتغير كود الطالب داخل التطبيق.
            </p>
            <p className="mt-2 text-xs font-black text-warning">المحدد حاليًا: {selectedPilotIds.length} من 5</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
            <input
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              placeholder="اكتب: ترحيل تجريبي"
              className="h-11 flex-1 rounded-2xl border border-warning/30 bg-bgCard px-4 font-bold text-textPrimary outline-none focus:border-warning"
            />
            <button
              type="button"
              onClick={migratePilot}
              disabled={isMigrating || selectedPilotIds.length < 1 || confirmationText.trim() !== 'ترحيل تجريبي'}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-warning px-5 font-black text-white disabled:opacity-50"
            >
              {isMigrating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
              تنفيذ الترحيل التجريبي
            </button>
          </div>
        </div>
        {migrationMessage && <div className="mt-4 rounded-2xl border border-success/20 bg-success/10 p-4 text-sm font-black text-success">{migrationMessage}</div>}
      </div>

      <div className="overflow-hidden rounded-3xl border border-borderColor bg-bgCard shadow-sm">
        <div className="flex flex-col gap-2 border-b border-borderColor px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-black text-textPrimary">نتائج المعاينة</h3>
            <p className="mt-1 text-xs font-bold text-textSecondary">
              معروض {filteredRows.length} من أصل {rows.length} طالبًا، وتم فحص {inspectedCount}.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-black text-textSecondary">
            <Filter className="h-4 w-4" />
            لا يتم حفظ النتائج داخل سجل الطالب
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-right text-sm">
            <thead className="bg-bgSoft text-xs font-black text-textSecondary">
              <tr>
                <th className="px-4 py-3">اختيار</th>
                <th className="px-4 py-3">الطالب</th>
                <th className="px-4 py-3">الفصل</th>
                <th className="px-4 py-3">الكود الحالي</th>
                <th className="px-4 py-3">حالة الفحص</th>
                <th className="px-4 py-3">طريقة المطابقة</th>
                <th className="px-4 py-3">المعرف المركزي</th>
                <th className="px-4 py-3">الكود المركزي</th>
                <th className="px-4 py-3">ملاحظة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderColor">
              {filteredRows.map((row) => {
                const status = row.result?.status || 'not_checked';
                const meta = STATUS_META[status];
                return (
                  <tr key={row.localStudentId} className="hover:bg-bgSoft/70">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`اختيار ${row.name} للترحيل التجريبي`}
                        checked={selectedPilotIds.includes(row.localStudentId)}
                        disabled={status !== 'pending' || (!selectedPilotIds.includes(row.localStudentId) && selectedPilotIds.length >= 5)}
                        onChange={() => togglePilotStudent(row.localStudentId)}
                        className="h-5 w-5 accent-primary disabled:opacity-40"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-black text-textPrimary">{row.name || 'بلا اسم'}</div>
                      <div className="mt-1 font-mono text-[11px] text-textSecondary">{row.localStudentId || 'بلا معرف محلي'}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-textPrimary">{row.className || 'غير محدد'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-textPrimary">{row.currentRasedId || 'لا يوجد'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-textSecondary">
                      {row.result?.matchMethod === 'trusted_identifier'
                        ? 'معرف موثوق'
                        : row.result?.matchMethod === 'transitional_name_class'
                          ? 'الاسم والفصل مؤقتًا'
                          : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-textPrimary">{row.result?.centralStudentId || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-textPrimary">{row.result?.rasedId || '—'}</td>
                    <td className="px-4 py-3 text-xs font-bold leading-6 text-textSecondary">
                      {row.result?.conflictId
                        ? `رقم التعارض: ${row.result.conflictId}`
                        : row.result?.error || meta.description}
                    </td>
                  </tr>
                );
              })}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center font-bold text-textSecondary">
                    لا توجد نتائج مطابقة للفلاتر الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-3xl border border-warning/20 bg-warning/10 p-5 text-sm font-bold leading-7 text-textPrimary">
        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-warning" />
        <p>
          هذه الأداة لا تحتوي زر ترحيل أو إنشاء. ظهور حالة «بانتظار الترحيل» طبيعي ما دام جدول
          StudentIdentities فارغًا. لن يتم اعتماد الإنشاء إلا بعد مراجعة تقرير المدرسة وحالات
          التشابه والتعارض.
        </p>
      </div>
    </section>
  );
};

const InfoBox: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="rounded-2xl border border-borderColor bg-bgSoft p-4">
    <div className="text-xs font-black text-textSecondary">{label}</div>
    <div className={`mt-2 truncate font-black text-textPrimary ${mono ? 'font-mono' : ''}`} title={value}>
      {value}
    </div>
  </div>
);

const StatusCard: React.FC<{
  icon: React.ElementType;
  label: string;
  count: number;
  tone: 'success' | 'warning' | 'danger' | 'muted';
}> = ({ icon: Icon, label, count, tone }) => {
  const tones = {
    success: 'border-success/20 bg-success/10 text-success',
    warning: 'border-warning/20 bg-warning/10 text-warning',
    danger: 'border-danger/20 bg-danger/10 text-danger',
    muted: 'border-borderColor bg-bgCard text-textSecondary',
  };
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-6 w-6" />
        <span className="text-3xl font-black">{count}</span>
      </div>
      <div className="mt-3 text-sm font-black">{label}</div>
    </div>
  );
};

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ label, value, onChange, children }) => (
  <label className="space-y-2">
    <span className="text-xs font-black text-textSecondary">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-2xl border border-borderColor bg-bgSoft px-3 font-bold text-textPrimary outline-none focus:border-primary"
    >
      {children}
    </select>
  </label>
);

export default IdentityInspectionTool;
