import React, { useEffect, useMemo, useRef, useState } from 'react';
import TeacherStudentMessages from './TeacherStudentMessages';
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
  Sparkles,
  Clock,
  Archive,
  Trash2,
  ChevronLeft,
  CheckCheck,
  Filter
} from 'lucide-react';
import { Student } from '../types';
import { useApp } from '../context/AppContext';

const GOOGLE_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzKPPsQsM_dIttcYSxRLs6LQuvXhT6Qia5TwJ1Tw4ObQ-eZFZeJhV6epXXjxA9_SwWk/exec';

type MailboxTab = 'inbox' | 'sent' | 'compose';
type TeacherMessageType = 'general' | 'behavior_alert' | 'performance_report' | 'follow_up' | 'praise' | 'homework';

interface TeacherMailboxProps {
  students: Student[];
  teacherInfo: any;
  currentSemester: '1' | '2';
}

interface MailMessage {
  rowNumber?: number;
  row?: number;
  messageRow?: number;
  localId?: string;
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
  readByParent?: string;
  readByTeacher?: string;
  semester?: string;
  className?: string;
  grade?: string;
  replyToRow?: string | number;
  replyToMessage?: string;
}

const MESSAGE_TYPES: Array<{ id: TeacherMessageType; labelKey: string; icon: React.ElementType; tone: string }> = [
  { id: 'general', labelKey: 'mailboxTypeGeneral', icon: MessageCircle, tone: 'text-primary bg-primary/10 border-primary/20' },
  { id: 'behavior_alert', labelKey: 'mailboxTypeBehavior', icon: AlertTriangle, tone: 'text-danger bg-danger/10 border-danger/20' },
  { id: 'performance_report', labelKey: 'mailboxTypePerformance', icon: FileText, tone: 'text-info bg-info/10 border-info/20' },
  { id: 'follow_up', labelKey: 'mailboxTypeFollowUp', icon: RefreshCw, tone: 'text-warning bg-warning/10 border-warning/20' },
  { id: 'praise', labelKey: 'mailboxTypePraise', icon: Sparkles, tone: 'text-success bg-success/10 border-success/20' },
  { id: 'homework', labelKey: 'mailboxTypeHomework', icon: CheckCircle2, tone: 'text-primary bg-primary/10 border-primary/20' }
];

const normalizeCode = (value: unknown) => String(value || '').trim().toUpperCase();

const normalizeArabicDigits = (value: string) => {
  const arabicDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };
  return String(value || '').replace(/[٠-٩۰-۹]/g, digit => arabicDigits[digit] || digit);
};

const getGradeFromClassName = (className: string) => {
  const normalized = normalizeArabicDigits(className || '').trim();
  const digitMatch = normalized.match(/(12|11|10|[1-9])/);
  if (digitMatch) return digitMatch[1];
  if (/الخامس|خامس/.test(normalized)) return '5';
  if (/السادس|سادس/.test(normalized)) return '6';
  if (/السابع|سابع/.test(normalized)) return '7';
  if (/الثامن|ثامن/.test(normalized)) return '8';
  if (/التاسع|تاسع/.test(normalized)) return '9';
  if (/العاشر|عاشر/.test(normalized)) return '10';
  if (/الحادي عشر|حادي عشر|الحاديعشر|حاديعشر/.test(normalized)) return '11';
  if (/الثاني عشر|ثاني عشر|الثانيعشر|ثانيعشر/.test(normalized)) return '12';
  return 'غير محدد';
};

const getStudentCode = (student: Student) => normalizeCode(
  (student as any).rasedId ||
  (student as any).parentCode ||
  (student as any).secretCode ||
  (student as any).civilID ||
  (student as any).civilId ||
  student.id ||
  ''
);

const getStudentClassName = (student: Student) => String(student.classes?.[0] || (student as any).className || '').trim();
const formatClassLabel = (className: string) => {
  const raw = normalizeArabicDigits(String(className || '')).trim();
  if (!raw) return '';
  const grade = getGradeFromClassName(raw);
  const explicit = raw.match(/(?:^|\s)(12|11|10|[1-9])\s*[\/\-–—]\s*([1-9]\d?)(?:\s|$)/);
  if (explicit) return `${explicit[1]}/${explicit[2]}`;
  const numbers = raw.match(/12|11|10|[1-9]/g) || [];
  if (grade !== 'غير محدد' && numbers.length >= 2) {
    const section = numbers.find((value, index) => index > 0 && value !== grade) || numbers[1];
    if (section) return `${grade}/${section}`;
  }
  return raw;
};

const formatDateTime = (value: string | undefined, language: string, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-OM' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const getTypeInfo = (type?: string) => MESSAGE_TYPES.find(item => item.id === type) || MESSAGE_TYPES[0];
const SENT_STORAGE_KEY = 'rased_teacher_sent_messages_local';
const readStoredSentMessages = (): MailMessage[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SENT_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const persistSentMessages = (items: MailMessage[]) => {
  try {
    localStorage.setItem(SENT_STORAGE_KEY, JSON.stringify(items.slice(0, 200)));
  } catch (error) {
    console.error('Unable to persist sent messages:', error);
  }
};

const isTeacherSentMessage = (msg: MailMessage) => {
  return msg.sender === 'teacher' || msg.direction === 'teacher_to_parent' || msg.status === 'teacher_sent';
};
const normalizeMailboxText = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const isUnknownMailboxSubject = (value: unknown) => {
  const normalized = normalizeMailboxText(value);
  return !normalized || normalized === 'غير محدد' || normalized === 'undefined' || normalized === 'null';
};

const interpolate = (template: string, replacements: Record<string, string>) => {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  );
};

const buildTemplate = (
  type: TeacherMessageType,
  student: Student | undefined,
  subject: string | undefined,
  translate: (key: string) => string
) => {
  const name = student?.name || translate('mailboxDefaultStudent');
  const subjectText = subject || translate('mailboxDefaultSubject');
  const keyMap: Record<TeacherMessageType, string> = {
    general: 'mailboxTemplateGeneral',
    behavior_alert: 'mailboxTemplateBehavior',
    performance_report: 'mailboxTemplatePerformance',
    follow_up: 'mailboxTemplateFollowUp',
    praise: 'mailboxTemplatePraise',
    homework: 'mailboxTemplateHomework'
  };
  return interpolate(translate(keyMap[type]), { name, subject: subjectText });
};

const EmptyState: React.FC<{ icon?: React.ElementType; title: string; text: string }> = ({ icon: Icon = Mail, title, text }) => (
  <div className="bg-bgCard border border-borderColor rounded-3xl p-8 text-center shadow-sm">
    <Icon className="w-12 h-12 text-textMuted mx-auto mb-3" />
    <h3 className="text-base font-black text-textPrimary mb-1">{title}</h3>
    <p className="text-[11px] font-bold text-textSecondary leading-6">{text}</p>
  </div>
);

const ParentMailboxContent: React.FC<TeacherMailboxProps> = ({ students = [], teacherInfo, currentSemester }) => {
  const { t, dir, language } = useApp();
  const [activeTab, setActiveTab] = useState<MailboxTab>('inbox');
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [localSentMessages, setLocalSentMessages] = useState<MailMessage[]>(readStoredSentMessages);
  const [isFetching, setIsFetching] = useState(false);
  const [query, setQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedClassForSend, setSelectedClassForSend] = useState('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [messageType, setMessageType] = useState<TeacherMessageType>('general');
  const [teacherMessage, setTeacherMessage] = useState('');
  const [replyingToMsg, setReplyingToMsg] = useState<MailMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedParentKey, setSelectedParentKey] = useState('');
  const [parentFilter, setParentFilter] = useState<'all' | 'unread'>('all');
  const parentBottomRef = useRef<HTMLDivElement>(null);

  const hasTeacherContext = Boolean(teacherInfo?.school && teacherInfo?.subject);
  const hasStudents = Array.isArray(students) && students.length > 0;

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach(student => {
      const className = getStudentClassName(student);
      if (className) set.add(className);
    });
    return Array.from(set).sort();
  }, [students]);

  useEffect(() => {
    persistSentMessages(localSentMessages);
  }, [localSentMessages]);


  useEffect(() => {
    setSelectedStudentId('');
  }, [selectedClassForSend]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return undefined;
    return students.find(student => getStudentCode(student) === selectedStudentId || student.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const studentsForSend = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return students
      .filter(Boolean)
      .filter(student => {
        const className = getStudentClassName(student);
        const classOk = selectedClassForSend === 'all' || className === selectedClassForSend;
        const queryOk = !q ||
          String(student.name || '').toLowerCase().includes(q) ||
          getStudentCode(student).toLowerCase().includes(q) ||
          className.toLowerCase().includes(q);
        return classOk && queryOk;
      })
      .slice(0, 100);
  }, [students, studentQuery, selectedClassForSend]);

  const teacherStudentCodes = useMemo(() => new Set(students.map(getStudentCode).filter(Boolean)), [students]);
  const scopedMessages = useMemo(() => {
    const teacherSubject = normalizeMailboxText(teacherInfo?.subject || '');
    return messages.filter(msg => {
      const messageSubject = normalizeMailboxText(msg.subject || '');
      if (!teacherSubject || messageSubject === teacherSubject) return true;
      if (isUnknownMailboxSubject(messageSubject)) {
        return teacherStudentCodes.has(normalizeCode(msg.rasedId || msg.civilID || msg.parentCode || ''));
      }
      return false;
    });
  }, [messages, teacherInfo?.subject, teacherStudentCodes]);
  const inboxMessages = useMemo(() => scopedMessages.filter(msg => !isTeacherSentMessage(msg)), [scopedMessages]);
  const sentMessages = useMemo(() => {
    const cloudSent = scopedMessages.filter(msg => isTeacherSentMessage(msg));
    const cloudRows = new Set(cloudSent.map(msg => String(msg.rowNumber || '')).filter(Boolean));
    const cloudFallbackKeys = new Set(cloudSent.map(msg => `${String(msg.message || '').trim()}_${normalizeCode(msg.rasedId || msg.civilID || '')}`));
    const localOnly = localSentMessages.filter(msg => {
      const rowKey = String(msg.rowNumber || '');
      if (rowKey && cloudRows.has(rowKey)) return false;
      return !cloudFallbackKeys.has(`${String(msg.message || '').trim()}_${normalizeCode(msg.rasedId || msg.civilID || '')}`);
    });
    return [...localOnly, ...cloudSent].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [scopedMessages, localSentMessages]);

  const visibleMessages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = activeTab === 'sent' ? sentMessages : inboxMessages;
    return source.filter(msg => {
      if (!q) return true;
      return (
        String(msg.studentName || '').toLowerCase().includes(q) ||
        String(msg.message || '').toLowerCase().includes(q) ||
        String(msg.rasedId || msg.civilID || msg.parentCode || '').toLowerCase().includes(q) ||
        String(msg.subject || '').toLowerCase().includes(q)
      );
    });
  }, [activeTab, inboxMessages, sentMessages, query]);

  const fetchParentMessages = async () => {
    setIsFetching(true);
    try {
      const school = teacherInfo?.school || '';
      const subject = teacherInfo?.subject || '';
      const params = new URLSearchParams({ action: 'getMessages', t: String(Date.now()) });
      if (school) params.set('school', school);
      params.set('semester', currentSemester);
      const response = await fetch(`${GOOGLE_WEB_APP_URL}?${params.toString()}`, { cache: 'no-store', redirect: 'follow' });
      const result = await response.json();
      if (result.status === 'success') {
        const list = Array.isArray(result.messages) ? result.messages : [];
        setMessages(list.sort((a: MailMessage, b: MailMessage) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()));
      }
    } catch (error) {
      console.error('Error fetching parent messages:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchParentMessages();
  }, [teacherInfo?.school, teacherInfo?.subject, currentSemester]);

  useEffect(() => {
    const restoreAndRefresh = () => {
      setLocalSentMessages(readStoredSentMessages());
      fetchParentMessages();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') restoreAndRefresh();
    };
    window.addEventListener('focus', restoreAndRefresh);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', restoreAndRefresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [teacherInfo?.school, teacherInfo?.subject, currentSemester]);

  const sendCloudMessage = async (payload: Record<string, string>) => {
    const response = await fetch(GOOGLE_WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.status !== 'success' && result.success !== true) {
      throw new Error(result.message || 'Cloud message request failed');
    }
    return result;
  };

  const handleDeleteMessage = async (msg: MailMessage) => {
    const confirmed = window.confirm(t('mailboxConfirmDelete'));
    if (!confirmed) return;

    const rowNumber = String(msg.rowNumber || msg.messageRow || msg.row || '');
    if (!rowNumber) {
      setLocalSentMessages(prev => prev.filter(item => item !== msg));
      setMessages(prev => prev.filter(item => item !== msg));
      return;
    }

    try {
      await fetch(GOOGLE_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'deleteMessage',
          rowNumber,
          deletedBy: 'teacher',
          schoolName: msg.schoolName || teacherInfo?.school || '',
          subject: msg.subject || teacherInfo?.subject || ''
        })
      });
      setMessages(prev => prev.filter(item => item !== msg));
      setLocalSentMessages(prev => prev.filter(item => item !== msg));
    } catch (error) {
      console.error('Error deleting message:', error);
      alert(t('mailboxDeleteError'));
    }
  };

  const handleSendReply = async (msg: MailMessage) => {
    if (!replyText.trim()) return;
    setIsSending(true);
    try {
      const rasedId = normalizeCode(msg.rasedId || msg.civilID || msg.parentCode || '');
      await sendCloudMessage({
        action: 'sendTeacherReply',
        rowNumber: String(msg.rowNumber || msg.messageRow || msg.row || ''),
        rasedId,
        civilID: rasedId,
        parentCode: rasedId,
        schoolName: String(msg.schoolName || teacherInfo?.school || ''),
        subject: String(msg.subject || teacherInfo?.subject || ''),
        replyText: replyText.trim(),
        replyTextEncoded: encodeURIComponent(replyText.trim()),
        teacherName: teacherInfo?.name || t('mailboxDefaultTeacher'),
        semester: currentSemester
      });
      setMessages(prev => prev.map(item => item === msg ? { ...item, status: 'replied', teacherReply: replyText.trim(), replyDate: new Date().toISOString(), teacherName: teacherInfo?.name || t('mailboxDefaultTeacher') } : item));
      setReplyText('');
      setReplyingToMsg(null);
      alert(t('mailboxReplySuccess'));
      setTimeout(fetchParentMessages, 1200);
    } catch (error) {
      console.error('Error sending reply:', error);
      alert(t('mailboxReplyError'));
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectStudent = (student: Student) => {
    const code = getStudentCode(student);
    setSelectedStudentId(code || student.id);
    setTeacherMessage(buildTemplate(messageType, student, teacherInfo?.subject, t));
  };

  const handleChangeType = (type: TeacherMessageType) => {
    setMessageType(type);
    setTeacherMessage(buildTemplate(type, selectedStudent, teacherInfo?.subject, t));
  };

  const handleSendTeacherMessage = async () => {
    if (!selectedStudent) {
      alert(t('mailboxSelectStudentAlert'));
      return;
    }
    if (!teacherMessage.trim()) {
      alert(t('mailboxWriteMessageAlert'));
      return;
    }
    const rasedId = getStudentCode(selectedStudent);
    if (!rasedId) {
      alert(t('mailboxNoRasedCode'));
      return;
    }
    const className = getStudentClassName(selectedStudent);
    const grade = getGradeFromClassName(className);
    setIsSending(true);
    try {
      const cloudResult = await sendCloudMessage({
        action: 'sendTeacherMessage',
        rasedId,
        civilID: rasedId,
        parentCode: rasedId,
        studentName: selectedStudent.name || t('mailboxStudentFallback'),
        schoolName: teacherInfo?.school || t('mailboxUnknown'),
        subject: teacherInfo?.subject || t('mailboxUnknown'),
        teacherName: teacherInfo?.name || t('mailboxDefaultTeacher'),
        messageType,
        message: teacherMessage.trim(),
        messageEncoded: encodeURIComponent(teacherMessage.trim()),
        messageLength: String(teacherMessage.trim().length),
        sender: 'teacher',
        direction: 'teacher_to_parent',
        semester: currentSemester,
        className,
        grade
      });
      const cloudSavedMessage = String(cloudResult.messageData?.message || '');
      if (cloudSavedMessage && cloudSavedMessage !== teacherMessage.trim()) {
        throw new Error('Cloud message text verification failed');
      }
      const localRecord: MailMessage = {
        localId: `local_sent_${Date.now()}`,
        date: new Date().toISOString(),
        rasedId,
        civilID: rasedId,
        parentCode: rasedId,
        studentName: selectedStudent.name,
        schoolName: teacherInfo?.school || '',
        subject: teacherInfo?.subject || '',
        message: teacherMessage.trim(),
        status: 'teacher_sent',
        teacherName: teacherInfo?.name || t('mailboxDefaultTeacher'),
        sender: 'teacher',
        messageType,
        direction: 'teacher_to_parent',
        semester: currentSemester,
        className,
        grade
      };
      const savedRecord: MailMessage = cloudResult.messageData
        ? { ...localRecord, ...cloudResult.messageData, localId: localRecord.localId }
        : localRecord;
      const nextLocalSent = [savedRecord, ...readStoredSentMessages().filter(item => item.localId !== localRecord.localId)].slice(0, 200);
      persistSentMessages(nextLocalSent);
      setLocalSentMessages(nextLocalSent);
      setMessages(prev => {
        const rowNumber = savedRecord.rowNumber;
        const withoutDuplicate = rowNumber ? prev.filter(item => item.rowNumber !== rowNumber) : prev;
        return [savedRecord, ...withoutDuplicate];
      });
      setTeacherMessage('');
      setSelectedStudentId('');
      setMessageType('general');
      alert(t('mailboxSendSuccess'));
      setActiveTab('sent');
      setTimeout(fetchParentMessages, 1200);
    } catch (error) {
      console.error('Error sending teacher message:', error);
      alert(t('mailboxSendError'));
    } finally {
      setIsSending(false);
    }
  };

  const getParentMessageKey = (msg: MailMessage, index = 0) => String(msg.rowNumber || msg.localId || msg.date || `${msg.rasedId || msg.civilID || 'message'}_${index}`);
  const parentThreads = useMemo(() => {
    const groups: Record<string, MailMessage[]> = {};
    [...inboxMessages, ...sentMessages].forEach((msg, index) => {
      const code = normalizeCode(msg.rasedId || msg.civilID || msg.parentCode || '');
      const key = `${code}|${normalizeMailboxText(msg.subject || teacherInfo?.subject || '')}`;
      (groups[key] ||= []).push({ ...msg, localId: msg.localId || getParentMessageKey(msg, index) });
    });
    return Object.values(groups).map(group => group.sort((a,b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())).sort((a,b) => new Date(b.at(-1)?.date || 0).getTime() - new Date(a.at(-1)?.date || 0).getTime());
  }, [inboxMessages, sentMessages, teacherInfo?.subject]);
  const filteredParentThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parentThreads.filter(group => {
      const unread = group.some(msg => !isTeacherSentMessage(msg) && String(msg.readByTeacher || '').toUpperCase() !== 'TRUE' && msg.status !== 'replied');
      return (parentFilter === 'all' || unread) && (!q || group.some(msg => `${msg.studentName || ''} ${msg.rasedId || msg.civilID || ''} ${msg.subject || ''} ${msg.message || ''}`.toLowerCase().includes(q)));
    });
  }, [parentThreads, parentFilter, query]);
  const selectedParentThread = parentThreads.find(group => getParentMessageKey(group[0]) === selectedParentKey) || parentThreads[0] || null;
  useEffect(() => { if (selectedParentThread && !selectedParentKey) setSelectedParentKey(getParentMessageKey(selectedParentThread[0])); }, [parentThreads.length]);
  useEffect(() => { parentBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedParentThread?.length]);
  const parentUnreadCount = inboxMessages.filter(msg => String(msg.readByTeacher || '').toUpperCase() !== 'TRUE' && msg.status !== 'replied').length;

  const MailMessageCard = ({ msg, index }: { msg: MailMessage; index: number }) => {
    const teacherSent = isTeacherSentMessage(msg);
    const typeInfo = getTypeInfo(msg.messageType);
    const typeLabel = t(typeInfo.labelKey);
    const Icon = teacherSent ? typeInfo.icon : Inbox;
    return (
      <article key={`${msg.rowNumber || msg.localId || msg.date || index}_${index}`} className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${teacherSent ? typeInfo.tone : 'bg-primary/10 text-primary border-primary/20'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-textPrimary truncate">{msg.studentName || t('mailboxUnknownStudent')}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[9px] font-black bg-bgSoft border border-borderColor text-textSecondary px-2 py-0.5 rounded-full" dir="ltr">{msg.rasedId || msg.civilID || msg.parentCode || 'RSD'}</span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${teacherSent ? typeInfo.tone : 'bg-bgSoft border-borderColor text-textSecondary'}`}>{teacherSent ? typeLabel : t('mailboxIncomingFromParent')}</span>
                <span className="text-[9px] font-black bg-bgSoft border border-borderColor text-textSecondary px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(msg.date, language, t('mailboxUnknown'))}</span>
                {msg.className && <span className="text-[9px] font-black bg-bgSoft border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">{formatClassLabel(msg.className)}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            {msg.status === 'replied' && <span className="text-[9px] font-black bg-success/10 text-success border border-success/20 px-2 py-1 rounded-xl">{t('mailboxReplied')}</span>}
            <button type="button" onClick={() => handleDeleteMessage(msg)} className="h-8 px-2 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[10px] font-black flex items-center gap-1 active:scale-95">
              <Trash2 className="w-3.5 h-3.5" /> {t('mailboxDelete')}
            </button>
          </div>
        </div>
        {msg.replyToMessage && (
          <div className="mb-2 rounded-2xl bg-primary/5 border border-primary/15 p-3">
            <p className="text-[10px] font-black text-primary mb-1 flex items-center gap-1"><Reply className="w-3.5 h-3.5" />رد على رسالتك</p>
            <p className="text-[11px] font-bold text-textSecondary leading-5 line-clamp-3">{msg.replyToMessage}</p>
          </div>
        )}
        <div className="rounded-2xl bg-bgSoft border border-borderColor p-3 text-sm font-bold text-textPrimary leading-7">{msg.message || t('mailboxNoText')}</div>
        {msg.teacherReply && (
          <div className="mt-3 rounded-2xl bg-success/10 border border-success/20 p-3 text-sm font-bold text-success leading-7">
            <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-black">{t('mailboxTeacherReply')}</span><span className="text-[9px] font-bold opacity-70">{formatDateTime(msg.replyDate, language, t('mailboxUnknown'))}</span></div>
            {msg.teacherReply}
          </div>
        )}
        {!teacherSent && msg.status !== 'replied' && (
          <div className="mt-3 border-t border-borderColor pt-3">
            {replyingToMsg === msg ? (
              <div className="space-y-3">
                <textarea value={replyText} onChange={event => setReplyText(event.target.value)} rows={3} placeholder={t('mailboxReplyPlaceholder')} className="w-full rounded-2xl bg-bgSoft border border-borderColor p-3 text-sm font-bold text-textPrimary focus:outline-none focus:border-primary/40" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setReplyingToMsg(null); setReplyText(''); }} className="h-10 px-4 rounded-xl bg-bgSoft border border-borderColor text-textSecondary font-black text-xs flex items-center gap-2"><X className="w-4 h-4" />{t('mailboxCancel')}</button>
                  <button type="button" onClick={() => handleSendReply(msg)} disabled={isSending || !replyText.trim()} className="h-10 px-4 rounded-xl bg-success text-white font-black text-xs flex items-center gap-2 disabled:opacity-50">{isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Reply className="w-4 h-4" />}{t('mailboxSendReply')}</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setReplyingToMsg(msg)} className="h-10 px-4 rounded-xl bg-success/10 border border-success/20 text-success font-black text-xs flex items-center gap-2 active:scale-95"><Reply className="w-4 h-4" />{t('mailboxReplyToParent')}</button>
            )}
          </div>
        )}
      </article>
    );
  };

  if (activeTab === 'compose') {
    return (
      <div className="min-h-[620px] rounded-[2rem] border border-slate-200 bg-white text-slate-900 shadow-sm" dir={dir}>
        <header className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 className="font-black text-emerald-700">رسالة جديدة لولي الأمر</h2><p className="text-xs text-slate-500">اختر الطالب ثم حرر الرسالة</p></div><button onClick={()=>setActiveTab('inbox')} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black"><ChevronLeft className="ml-1 inline h-4 w-4"/>المحادثات</button></header>
        <div className="grid gap-4 p-4 lg:grid-cols-[340px_1fr]"><aside className="rounded-3xl bg-slate-50 p-3"><div className="mb-3 grid grid-cols-2 gap-2"><select value={selectedClassForSend} onChange={e=>setSelectedClassForSend(e.target.value)} className="rounded-2xl border bg-white p-3 text-sm font-black"><option value="all">جميع الفصول</option>{classOptions.map(c=><option key={c} value={c}>{formatClassLabel(c)}</option>)}</select><input value={studentQuery} onChange={e=>setStudentQuery(e.target.value)} className="rounded-2xl border px-3 text-sm font-bold" placeholder="بحث"/></div><div className="max-h-[500px] space-y-1 overflow-y-auto">{studentsForSend.map(student=>{const code=getStudentCode(student);const active=selectedStudentId===code||selectedStudentId===student.id;return <button key={student.id} onClick={()=>handleSelectStudent(student)} className={`w-full rounded-2xl p-3 text-right ${active?'bg-emerald-500 text-white':'bg-white hover:bg-emerald-50'}`}><p className="font-black">{student.name}</p><p className="text-[10px] opacity-70">{formatClassLabel(getStudentClassName(student))} · {code}</p></button>})}</div></aside><main className="rounded-3xl border border-slate-200 p-4"><h3 className="mb-1 text-xs font-black text-slate-500">المستلم</h3><p className="mb-4 text-lg font-black">{selectedStudent?.name||'اختر طالبًا'}</p><div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{MESSAGE_TYPES.map(type=>{const Icon=type.icon;return <button key={type.id} onClick={()=>handleChangeType(type.id)} className={`rounded-2xl border p-3 text-xs font-black ${messageType===type.id?'border-emerald-300 bg-emerald-50 text-emerald-700':'border-slate-200 bg-slate-50 text-slate-500'}`}><Icon className="mx-auto mb-1 h-4 w-4"/>{t(type.labelKey)}</button>})}</div><textarea value={teacherMessage} onChange={e=>setTeacherMessage(e.target.value)} rows={11} maxLength={2000} className="w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-7 outline-none focus:border-emerald-400"/><div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-slate-400">{teacherMessage.length}/2000</span><button onClick={handleSendTeacherMessage} disabled={isSending||!selectedStudent||!teacherMessage.trim()} className="rounded-2xl bg-emerald-500 px-6 py-3 font-black text-white disabled:bg-slate-200">{isSending?'جارٍ الإرسال...':'إرسال لولي الأمر'}</button></div></main></div>
      </div>
    );
  }
  return (
    <div className="flex min-h-[620px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-900 shadow-sm" dir={dir}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div><div className="flex items-center gap-2 font-black text-emerald-700"><Mail className="h-5 w-5"/>رسائل أولياء الأمور{parentUnreadCount>0&&<span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">{parentUnreadCount}</span>}</div><p className="mt-1 text-xs font-bold text-slate-500">محادثات المتابعة المنزلية والتواصل التربوي</p></div><div className="flex gap-2"><button onClick={fetchParentMessages} className="rounded-2xl bg-slate-100 p-3"><RefreshCw className={`h-5 w-5 ${isFetching?'animate-spin':''}`}/></button><button onClick={()=>setActiveTab('compose')} className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white">رسالة جديدة</button></div></header>
      <div className="grid min-h-0 flex-1 md:grid-cols-[330px_1fr]"><aside className={`${selectedParentKey?'hidden md:flex':'flex'} min-h-0 flex-col border-l border-slate-200`}><div className="space-y-2 p-3"><div className="flex items-center rounded-2xl bg-slate-100 px-3"><Search className="h-4 w-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent py-3 text-sm font-bold outline-none" placeholder="اسم الطالب أو الرسالة"/></div><div className="grid grid-cols-2 gap-2"><button onClick={()=>setParentFilter('all')} className={`rounded-xl py-2 text-xs font-black ${parentFilter==='all'?'bg-emerald-500 text-white':'bg-slate-100 text-slate-500'}`}>الكل</button><button onClick={()=>setParentFilter('unread')} className={`rounded-xl py-2 text-xs font-black ${parentFilter==='unread'?'bg-emerald-500 text-white':'bg-slate-100 text-slate-500'}`}>غير المقروء</button></div></div><div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">{filteredParentThreads.length===0?<div className="p-8 text-center text-sm font-bold text-slate-400"><Inbox className="mx-auto mb-2 h-8 w-8"/>لا توجد محادثات</div>:filteredParentThreads.map(group=>{const first=group[0],last=group.at(-1)!;const unread=group.some(m=>!isTeacherSentMessage(m)&&String(m.readByTeacher||'').toUpperCase()!=='TRUE'&&m.status!=='replied');return <button key={getParentMessageKey(first)} onClick={()=>setSelectedParentKey(getParentMessageKey(first))} className={`w-full rounded-2xl p-3 text-right ${selectedParentThread&&getParentMessageKey(selectedParentThread[0])===getParentMessageKey(first)?'bg-emerald-50 ring-1 ring-emerald-200':'hover:bg-slate-50'}`}><div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><User className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="truncate text-sm font-black">{first.studentName||'الطالب'}</p><span className="text-[9px] text-slate-400">{formatDateTime(last.date,language,'')}</span></div><p className="truncate text-[11px] font-bold text-emerald-700">{first.subject||teacherInfo?.subject}</p><p className="mt-1 truncate text-xs text-slate-500">{isTeacherSentMessage(last)?'أنت: ':''}{last.message}</p></div>{unread&&<span className="h-fit rounded-full bg-red-500 px-2 py-0.5 text-[9px] text-white">جديد</span>}</div></button>})}</div></aside>
      <main className={`${selectedParentKey?'flex':'hidden md:flex'} min-h-0 flex-col bg-slate-50`}>{selectedParentThread?<><div className="flex items-center justify-between border-b border-slate-200 bg-white p-4"><div className="flex items-center gap-3"><button className="md:hidden" onClick={()=>setSelectedParentKey('')}><ChevronLeft className="h-5 w-5"/></button><div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><User className="h-5 w-5"/></div><div><h2 className="font-black">{selectedParentThread[0].studentName}</h2><p className="text-xs font-bold text-emerald-700">ولي الأمر · {selectedParentThread[0].subject||teacherInfo?.subject}</p></div></div><button onClick={()=>handleDeleteMessage(selectedParentThread[0])} className="rounded-xl bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4"/></button></div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{selectedParentThread.map((msg,index)=><React.Fragment key={getParentMessageKey(msg,index)}><div className={`flex ${isTeacherSentMessage(msg)?'justify-start':'justify-end'}`}><div className={`max-w-[82%] rounded-3xl px-4 py-3 shadow-sm ${isTeacherSentMessage(msg)?'rounded-tr-md bg-emerald-500 text-white':'rounded-tl-md border border-slate-200 bg-white'}`}><p className="whitespace-pre-wrap text-sm font-bold leading-7">{msg.message}</p><p className={`mt-1 text-[9px] ${isTeacherSentMessage(msg)?'text-emerald-100':'text-slate-400'}`}>{formatDateTime(msg.date,language,'')}</p></div></div>{msg.teacherReply&&<div className="flex justify-start"><div className="max-w-[82%] rounded-3xl rounded-tr-md bg-emerald-500 px-4 py-3 text-white"><p className="text-sm font-bold leading-7">{msg.teacherReply}</p><p className="mt-1 text-[9px] text-emerald-100">{formatDateTime(msg.replyDate,language,'')}</p></div></div>}</React.Fragment>)}<div ref={parentBottomRef}/></div><div className="border-t border-slate-200 bg-white p-3"><div className="flex items-end gap-2"><textarea value={replyText} onChange={e=>setReplyText(e.target.value)} maxLength={1000} rows={2} className="min-h-14 flex-1 resize-none rounded-2xl border border-slate-200 p-3 text-sm font-bold outline-none focus:border-emerald-400" placeholder="اكتب ردًا لولي الأمر..."/><button onClick={()=>{const msg=[...selectedParentThread].reverse().find(m=>!isTeacherSentMessage(m));if(msg)void handleSendReply(msg);}} disabled={isSending||!replyText.trim()} className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500 text-white disabled:bg-slate-200"><Send className="h-5 w-5"/></button></div><p className="mt-1 text-left text-[9px] text-slate-400">{replyText.length}/1000</p></div></>:<div className="m-auto text-center text-slate-400"><MessageCircle className="mx-auto mb-3 h-12 w-12"/><p className="font-black">اختر محادثة من القائمة</p></div>}</main></div>
    </div>
  );
};

const TeacherMailbox: React.FC<TeacherMailboxProps> = (props) => {
  const { dir } = useApp();
  const [mailboxAudience, setMailboxAudience] = useState<'parents' | 'students'>('parents');

  return (
    <div className="rased-teacher-light bg-bgMain text-textPrimary rounded-3xl" dir={dir}>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-3xl border border-borderColor bg-bgCard p-2 shadow-sm">
        <button type="button" onClick={() => setMailboxAudience('parents')} className={`h-12 rounded-2xl text-sm font-black transition-all ${mailboxAudience === 'parents' ? 'bg-primary text-white shadow-sm' : 'bg-bgSoft text-textSecondary hover:text-primary'}`}>
          رسائل أولياء الأمور
        </button>
        <button type="button" onClick={() => setMailboxAudience('students')} className={`h-12 rounded-2xl text-sm font-black transition-all ${mailboxAudience === 'students' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-bgSoft text-textSecondary hover:text-emerald-700'}`}>
          رسائل الطلاب
        </button>
      </div>
      {mailboxAudience === 'parents' ? <ParentMailboxContent {...props} /> : <TeacherStudentMessages />}
    </div>
  );
};

export default TeacherMailbox;
