import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail,
  Inbox,
  Send,
  RefreshCw,
  Search,
  User,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Reply,
  X,
  FileText,
  Sparkles
} from 'lucide-react';
import { Student } from '../types';
import { useApp } from '../context/AppContext';

const GOOGLE_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzKPPsQsM_dIttcYSxRLs6LQuvXhT6Qia5TwJ1Tw4ObQ-eZFZeJhV6epXXjxA9_SwWk/exec';

type TeacherMailboxView = 'inbox' | 'compose';
type TeacherMessageType = 'general' | 'behavior_alert' | 'performance_report' | 'follow_up' | 'praise' | 'homework';

interface TeacherMailboxProps {
  students: Student[];
  teacherInfo: any;
  currentSemester: '1' | '2';
}

interface ParentMessageRecord {
  rowNumber?: number;
  row?: number;
  messageRow?: number;
  date?: string;
  rasedId?: string;
  civilID?: string;
  parentCode?: string;
  studentName?: string;
  schoolName?: string;
  subject?: string;
  message?: string;
  status?: string;
  teacherReply?: string;
  replyDate?: string;
  teacherName?: string;
  sender?: string;
  messageType?: string;
  direction?: string;
}

const MESSAGE_TYPES: Array<{ id: TeacherMessageType; label: string; icon: React.ElementType; tone: string }> = [
  { id: 'general', label: 'ملاحظة عامة', icon: MessageCircle, tone: 'text-primary bg-primary/10 border-primary/20' },
  { id: 'behavior_alert', label: 'تنبيه سلوكي', icon: AlertTriangle, tone: 'text-danger bg-danger/10 border-danger/20' },
  { id: 'performance_report', label: 'تقرير أداء', icon: FileText, tone: 'text-info bg-info/10 border-info/20' },
  { id: 'follow_up', label: 'طلب متابعة', icon: RefreshCw, tone: 'text-warning bg-warning/10 border-warning/20' },
  { id: 'praise', label: 'إشادة', icon: Sparkles, tone: 'text-success bg-success/10 border-success/20' },
  { id: 'homework', label: 'تذكير بواجب', icon: CheckCircle2, tone: 'text-primary bg-primary/10 border-primary/20' }
];

const normalizeCode = (value: unknown) => String(value || '').trim().toUpperCase();

const getStudentCode = (student: Student) => normalizeCode(
  (student as any).rasedId ||
  (student as any).parentCode ||
  (student as any).secretCode ||
  (student as any).civilID ||
  (student as any).civilId ||
  student.id ||
  ''
);

const getStudentClassName = (student: Student) => String(student.classes?.[0] || (student as any).className || 'غير محدد').trim();

const formatDateTime = (value?: string) => {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return new Intl.DateTimeFormat('ar-OM', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const buildTemplate = (type: TeacherMessageType, student?: Student, subject?: string) => {
  const name = student?.name || 'الطالب';
  const subjectText = subject || 'المادة';

  switch (type) {
    case 'behavior_alert':
      return `ولي الأمر الكريم، نرجو متابعة سلوك الطالب/ة ${name} في مادة ${subjectText}، فقد تم تسجيل ملاحظة تحتاج إلى متابعة وتوجيه. شاكرين تعاونكم.`;
    case 'performance_report':
      return `ولي الأمر الكريم، نود إفادتكم بمتابعة أداء الطالب/ة ${name} في مادة ${subjectText}. نرجو الاطلاع والمتابعة المنزلية، وسنوافيكم بأي مستجدات.`;
    case 'follow_up':
      return `ولي الأمر الكريم، نرجو متابعة الطالب/ة ${name} في مادة ${subjectText} خلال الفترة القادمة، والتأكد من إنجاز المطلوب والمراجعة المستمرة.`;
    case 'praise':
      return `ولي الأمر الكريم، نود إشادتكم بتميز الطالب/ة ${name} ومشاركته/ها الإيجابية في مادة ${subjectText}. نشكركم على دعمكم المستمر.`;
    case 'homework':
      return `ولي الأمر الكريم، نرجو تذكير الطالب/ة ${name} بمتابعة الواجب أو المهمة المطلوبة في مادة ${subjectText}. شاكرين تعاونكم.`;
    default:
      return `ولي الأمر الكريم، نود إرسال ملاحظة بخصوص الطالب/ة ${name} في مادة ${subjectText}.`;
  }
};

const TeacherMailbox: React.FC<TeacherMailboxProps> = ({ students = [], teacherInfo, currentSemester }) => {
  const { t, dir, language } = useApp();
  const [view, setView] = useState<TeacherMailboxView>('inbox');
  const [messages, setMessages] = useState<ParentMessageRecord[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [query, setQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [messageType, setMessageType] = useState<TeacherMessageType>('general');
  const [teacherMessage, setTeacherMessage] = useState('');
  const [replyingToMsg, setReplyingToMsg] = useState<ParentMessageRecord | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [localSentMessages, setLocalSentMessages] = useState<ParentMessageRecord[]>(() => {
    try {
      const saved = localStorage.getItem('rased_teacher_sent_messages_local');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return undefined;
    return students.find(student => getStudentCode(student) === selectedStudentId || student.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return students
      .filter(Boolean)
      .filter(student => {
        if (!q) return true;
        return (
          String(student.name || '').toLowerCase().includes(q) ||
          getStudentCode(student).toLowerCase().includes(q) ||
          getStudentClassName(student).toLowerCase().includes(q)
        );
      })
      .slice(0, 80);
  }, [students, studentQuery]);

  const filteredMessages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...localSentMessages, ...messages];
    return all.filter(msg => {
      if (!q) return true;
      return (
        String(msg.studentName || '').toLowerCase().includes(q) ||
        String(msg.message || '').toLowerCase().includes(q) ||
        String(msg.rasedId || msg.civilID || msg.parentCode || '').toLowerCase().includes(q) ||
        String(msg.subject || '').toLowerCase().includes(q)
      );
    });
  }, [messages, localSentMessages, query]);

  useEffect(() => {
    if (!teacherMessage.trim()) {
      setTeacherMessage(buildTemplate(messageType, selectedStudent, teacherInfo?.subject));
    }
  }, [messageType, selectedStudent, teacherInfo?.subject]);

  useEffect(() => {
    localStorage.setItem('rased_teacher_sent_messages_local', JSON.stringify(localSentMessages.slice(0, 100)));
  }, [localSentMessages]);

  const fetchParentMessages = async () => {
    if (!teacherInfo?.school || !teacherInfo?.subject) return;
    setIsFetching(true);
    try {
      const url = `${GOOGLE_WEB_APP_URL}?action=getMessages&school=${encodeURIComponent(teacherInfo.school)}&subject=${encodeURIComponent(teacherInfo.subject)}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.status === 'success') {
        setMessages(Array.isArray(result.messages) ? result.messages : []);
      }
    } catch (error) {
      console.error('Error fetching parent messages:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchParentMessages();
  }, [teacherInfo?.school, teacherInfo?.subject]);

  const sendUrlEncoded = async (payload: Record<string, string>) => {
    const body = new URLSearchParams(payload);
    await fetch(GOOGLE_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body
    });
  };

  const handleSendReply = async (msg: ParentMessageRecord) => {
    if (!replyText.trim()) return;
    setIsSending(true);
    try {
      const rasedId = normalizeCode(msg.rasedId || msg.civilID || msg.parentCode || '');
      await sendUrlEncoded({
        action: 'sendTeacherReply',
        rowNumber: String(msg.rowNumber || msg.messageRow || msg.row || ''),
        rasedId,
        civilID: rasedId,
        parentCode: rasedId,
        schoolName: String(msg.schoolName || teacherInfo?.school || ''),
        subject: String(msg.subject || teacherInfo?.subject || ''),
        replyText: replyText.trim(),
        teacherName: teacherInfo?.name || 'المعلم'
      });

      setMessages(prev => prev.map(item => item === msg ? {
        ...item,
        status: 'replied',
        teacherReply: replyText.trim(),
        replyDate: new Date().toISOString(),
        teacherName: teacherInfo?.name || 'المعلم'
      } : item));
      setReplyText('');
      setReplyingToMsg(null);
      alert(t('replySentSuccessfully') || 'تم إرسال الرد بنجاح عبر السحابة لولي الأمر!');
      setTimeout(fetchParentMessages, 1200);
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('تعذر إرسال الرد. حاول مرة أخرى.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTeacherMessage = async () => {
    if (!selectedStudent) {
      alert('يرجى اختيار الطالب أولًا.');
      return;
    }
    if (!teacherMessage.trim()) {
      alert('يرجى كتابة نص الرسالة.');
      return;
    }

    const rasedId = getStudentCode(selectedStudent);
    if (!rasedId) {
      alert('لا يوجد كود راصد لهذا الطالب.');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        action: 'sendTeacherMessage',
        rasedId,
        civilID: rasedId,
        parentCode: rasedId,
        studentName: selectedStudent.name || 'طالب',
        schoolName: teacherInfo?.school || 'غير محدد',
        subject: teacherInfo?.subject || 'غير محدد',
        teacherName: teacherInfo?.name || 'المعلم',
        messageType,
        message: teacherMessage.trim(),
        sender: 'teacher',
        direction: 'teacher_to_parent',
        semester: currentSemester
      };

      await sendUrlEncoded(payload);

      const localRecord: ParentMessageRecord = {
        date: new Date().toISOString(),
        rasedId,
        civilID: rasedId,
        parentCode: rasedId,
        studentName: selectedStudent.name,
        schoolName: teacherInfo?.school || '',
        subject: teacherInfo?.subject || '',
        message: teacherMessage.trim(),
        status: 'teacher_sent',
        teacherName: teacherInfo?.name || 'المعلم',
        sender: 'teacher',
        messageType,
        direction: 'teacher_to_parent'
      };

      setLocalSentMessages(prev => [localRecord, ...prev].slice(0, 100));
      setTeacherMessage('');
      setSelectedStudentId('');
      setMessageType('general');
      alert('تم إرسال رسالة المعلم لولي الأمر بنجاح.');
      setView('inbox');
      setTimeout(fetchParentMessages, 1200);
    } catch (error) {
      console.error('Error sending teacher message:', error);
      alert('تعذر إرسال الرسالة. تأكد من تحديث سحابة ولي الأمر لدعم sendTeacherMessage.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rased-teacher-light bg-bgMain text-textPrimary rounded-3xl" dir={dir}>
      <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm relative overflow-hidden mb-4">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-textPrimary mb-1">مركز المراسلات</h2>
              <p className="text-[11px] font-bold text-textSecondary leading-6">
                استقبال رسائل أولياء الأمور، الرد عليها، وإرسال رسائل مباشرة لولي الأمر حول السلوك أو الأداء أو المتابعة.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchParentMessages} className="h-10 px-3 rounded-2xl bg-bgSoft border border-borderColor text-textSecondary hover:text-primary font-black text-xs flex items-center gap-2 active:scale-95">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button type="button" onClick={() => setView('compose')} className="h-10 px-3 rounded-2xl bg-primary text-white font-black text-xs flex items-center gap-2 active:scale-95">
              <Send className="w-4 h-4" />
              رسالة جديدة
            </button>
          </div>
        </div>
      </section>

      <section className="bg-bgCard border border-borderColor rounded-3xl p-2 shadow-sm flex gap-2 mb-4">
        <button type="button" onClick={() => setView('inbox')} className={`flex-1 h-11 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${view === 'inbox' ? 'bg-primary text-white' : 'bg-bgSoft text-textSecondary hover:text-primary'}`}>
          <Inbox className="w-4 h-4" />
          الوارد والسجل
        </button>
        <button type="button" onClick={() => setView('compose')} className={`flex-1 h-11 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${view === 'compose' ? 'bg-primary text-white' : 'bg-bgSoft text-textSecondary hover:text-primary'}`}>
          <Send className="w-4 h-4" />
          إرسال رسالة
        </button>
      </section>

      {view === 'inbox' ? (
        <section className="space-y-3">
          <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
            <label className="relative block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث باسم الطالب أو الكود أو نص الرسالة..." className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor pr-10 pl-3 text-sm font-bold text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-primary/40" />
            </label>
          </div>

          {isFetching && messages.length === 0 ? (
            <div className="bg-bgCard border border-borderColor rounded-3xl p-8 text-center shadow-sm">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm font-black text-textSecondary">جاري جلب الرسائل...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="bg-bgCard border border-borderColor rounded-3xl p-8 text-center shadow-sm">
              <Mail className="w-12 h-12 text-textMuted mx-auto mb-3" />
              <h3 className="text-base font-black text-textPrimary mb-1">لا توجد رسائل</h3>
              <p className="text-[11px] font-bold text-textSecondary">ستظهر هنا رسائل أولياء الأمور والرسائل التي يرسلها المعلم.</p>
            </div>
          ) : (
            filteredMessages.map((msg, index) => {
              const isTeacherSent = msg.sender === 'teacher' || msg.direction === 'teacher_to_parent' || msg.status === 'teacher_sent';
              const messageTypeInfo = MESSAGE_TYPES.find(type => type.id === msg.messageType) || MESSAGE_TYPES[0];
              const Icon = isTeacherSent ? messageTypeInfo.icon : Inbox;

              return (
                <article key={`${msg.rowNumber || msg.date || index}_${index}`} className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${isTeacherSent ? messageTypeInfo.tone : 'bg-primary/10 text-primary border-primary/20'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-textPrimary truncate">{msg.studentName || 'طالب غير محدد'}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[9px] font-black bg-bgSoft border border-borderColor text-textSecondary px-2 py-0.5 rounded-full" dir="ltr">{msg.rasedId || msg.civilID || msg.parentCode || 'RSD'}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${isTeacherSent ? messageTypeInfo.tone : 'bg-bgSoft border-borderColor text-textSecondary'}`}>{isTeacherSent ? messageTypeInfo.label : 'رسالة من ولي الأمر'}</span>
                          <span className="text-[9px] font-black bg-bgSoft border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">{formatDateTime(msg.date)}</span>
                        </div>
                      </div>
                    </div>
                    {msg.status === 'replied' && <span className="text-[9px] font-black bg-success/10 text-success border border-success/20 px-2 py-1 rounded-xl">تم الرد</span>}
                  </div>

                  <div className="rounded-2xl bg-bgSoft border border-borderColor p-3 text-sm font-bold text-textPrimary leading-7">
                    {msg.message || 'لا يوجد نص'}
                  </div>

                  {msg.teacherReply && (
                    <div className="mt-3 rounded-2xl bg-success/10 border border-success/20 p-3 text-sm font-bold text-success leading-7">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black">رد المعلم</span>
                        <span className="text-[9px] font-bold opacity-70">{formatDateTime(msg.replyDate)}</span>
                      </div>
                      {msg.teacherReply}
                    </div>
                  )}

                  {!isTeacherSent && msg.status !== 'replied' && (
                    <div className="mt-3 border-t border-borderColor pt-3">
                      {replyingToMsg === msg ? (
                        <div className="space-y-3">
                          <textarea value={replyText} onChange={event => setReplyText(event.target.value)} rows={3} placeholder="اكتب ردك لولي الأمر هنا..." className="w-full rounded-2xl bg-bgSoft border border-borderColor p-3 text-sm font-bold text-textPrimary focus:outline-none focus:border-primary/40" />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => { setReplyingToMsg(null); setReplyText(''); }} className="h-10 px-4 rounded-xl bg-bgSoft border border-borderColor text-textSecondary font-black text-xs flex items-center gap-2"><X className="w-4 h-4" />إلغاء</button>
                            <button type="button" onClick={() => handleSendReply(msg)} disabled={isSending || !replyText.trim()} className="h-10 px-4 rounded-xl bg-success text-white font-black text-xs flex items-center gap-2 disabled:opacity-50">{isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Reply className="w-4 h-4" />}إرسال الرد</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setReplyingToMsg(msg)} className="h-10 px-4 rounded-xl bg-success/10 border border-success/20 text-success font-black text-xs flex items-center gap-2 active:scale-95">
                          <Reply className="w-4 h-4" />
                          الرد على ولي الأمر
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      ) : (
        <section className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
          <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
            <h3 className="text-sm font-black text-textPrimary mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary" />اختيار الطالب</h3>
            <label className="relative block mb-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
              <input value={studentQuery} onChange={event => setStudentQuery(event.target.value)} placeholder="ابحث بالاسم أو الكود أو الفصل..." className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor pr-10 pl-3 text-sm font-bold text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-primary/40" />
            </label>
            <div className="space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
              {filteredStudents.map(student => {
                const code = getStudentCode(student);
                const active = selectedStudentId === code || selectedStudentId === student.id;
                return (
                  <button key={student.id} type="button" onClick={() => { setSelectedStudentId(code || student.id); setTeacherMessage(buildTemplate(messageType, student, teacherInfo?.subject)); }} className={`w-full rounded-2xl border p-3 text-start transition-all active:scale-[0.99] ${active ? 'bg-primary/10 border-primary/30' : 'bg-bgSoft border-borderColor hover:border-primary/20'}`}>
                    <p className="text-xs font-black text-textPrimary truncate">{student.name}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <span className="text-[9px] font-black bg-bgCard border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">{getStudentClassName(student)}</span>
                      <span className="text-[9px] font-mono font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full" dir="ltr">{code || 'RSD'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
            <h3 className="text-sm font-black text-textPrimary mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-primary" />إرسال رسالة لولي الأمر</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {MESSAGE_TYPES.map(type => {
                const active = messageType === type.id;
                const Icon = type.icon;
                return (
                  <button key={type.id} type="button" onClick={() => { setMessageType(type.id); setTeacherMessage(buildTemplate(type.id, selectedStudent, teacherInfo?.subject)); }} className={`rounded-2xl border p-3 text-xs font-black flex flex-col items-center gap-1 transition-all active:scale-95 ${active ? type.tone : 'bg-bgSoft border-borderColor text-textSecondary hover:text-primary'}`}>
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl bg-bgSoft border border-borderColor p-3 mb-4">
              <p className="text-[10px] font-black text-textSecondary mb-1">الطالب المحدد</p>
              {selectedStudent ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-textPrimary">{selectedStudent.name}</span>
                  <span className="text-[9px] font-black bg-bgCard border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">{getStudentClassName(selectedStudent)}</span>
                  <span className="text-[9px] font-mono font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full" dir="ltr">{getStudentCode(selectedStudent)}</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-danger">لم يتم اختيار طالب بعد.</span>
              )}
            </div>

            <textarea value={teacherMessage} onChange={event => setTeacherMessage(event.target.value)} rows={9} placeholder="اكتب نص الرسالة التي ستصل إلى ولي الأمر..." className="w-full rounded-3xl bg-bgSoft border border-borderColor p-4 text-sm font-bold text-textPrimary leading-7 focus:outline-none focus:border-primary/40" />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
              <p className="text-[10px] font-bold text-textSecondary leading-5">
                ملاحظة: يجب تحديث سحابة ولي الأمر لدعم action=sendTeacherMessage حتى تصل الرسالة للولي بصورة مستقلة.
              </p>
              <button type="button" onClick={handleSendTeacherMessage} disabled={isSending || !selectedStudent || !teacherMessage.trim()} className="h-12 px-5 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                إرسال لولي الأمر
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default TeacherMailbox;
