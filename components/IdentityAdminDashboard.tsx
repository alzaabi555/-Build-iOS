import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, Download, FileSpreadsheet, History, KeyRound, Loader2, LockKeyhole, LogOut, RefreshCw, Search, ShieldCheck, Upload, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  adminListAudit, adminListConflicts, adminListIdentities, adminListMigrations,
  adminLogin, adminSetIdentityStatus, adminSummary, migrateClassStudents, type AdminIdentityRow,
} from '../services/schoolIdentityService';

type Tab = 'overview'|'students'|'conflicts'|'migrations'|'audit';
const SESSION_KEY='rased_identity_admin_session_v1';


type ExcelStudentPreview = {
  localStudentId: string;
  name: string;
  className: string;
  rasedId?: string;
  parentPhone?: string;
  gender?: 'male' | 'female';
  rowNumber: number;
};

const normalizeHeader = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '')
  .replace(/[أإآ]/g, 'ا');

const getCell = (row: Record<string, unknown>, aliases: string[]) => {
  const entries = Object.entries(row);
  const aliasSet = new Set(aliases.map(normalizeHeader));
  const matching = entries.find(([key]) => aliasSet.has(normalizeHeader(key)));
  return matching ? String(matching[1] ?? '').trim() : '';
};

const IdentityAdminDashboard:React.FC<{onClose?:()=>void}> = ({onClose}) => {
  const { teacherInfo, students, setStudents, setClasses } = useApp();
  const schoolCode=String(localStorage.getItem('rased_admin_school_code')||(teacherInfo as any)?.schoolCode||'').trim();
  const actorId=String(teacherInfo?.civilId||localStorage.getItem('rased_teacher_civil_id')||'').trim();
  const [token,setToken]=useState(()=>sessionStorage.getItem(SESSION_KEY)||'');
  const [code,setCode]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState<Tab>('overview'); const [summary,setSummary]=useState<any>(null);
  const [rows,setRows]=useState<AdminIdentityRow[]>([]); const [conflicts,setConflicts]=useState<any[]>([]);
  const [migrations,setMigrations]=useState<any[]>([]); const [audit,setAudit]=useState<any[]>([]);
  const [selectedClass,setSelectedClass]=useState(''); const [query,setQuery]=useState('');
  const [excelPreview,setExcelPreview]=useState<ExcelStudentPreview[]>([]);
  const [excelFileName,setExcelFileName]=useState('');
  const [excelImporting,setExcelImporting]=useState(false);
  const [excelImportMessage,setExcelImportMessage]=useState('');

  const classes=useMemo(()=>Object.keys(summary?.classes||{}).sort((a,b)=>a.localeCompare(b,'ar')),[summary]);
  const shownRows=useMemo(()=>rows.filter(r=>(!selectedClass||r.className===selectedClass)&&(!query||[r.studentName,r.rasedId,r.centralStudentId].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())))),[rows,selectedClass,query]);

  const login=async()=>{setLoading(true);setError('');try{const r=await adminLogin(schoolCode,actorId,code);if(!r.ok)throw new Error(r.error||'تعذر الدخول');sessionStorage.setItem(SESSION_KEY,r.token);setToken(r.token);setCode('');}catch(e){setError(e instanceof Error?e.message:'تعذر الدخول');}finally{setLoading(false);}};
  const logout=()=>{sessionStorage.removeItem(SESSION_KEY);setToken('');setSummary(null);onClose?.();};
  const load=async()=>{if(!token)return;setLoading(true);setError('');try{const [s,i,c,m,a]=await Promise.all([adminSummary(schoolCode,token),adminListIdentities(schoolCode,token),adminListConflicts(schoolCode,token),adminListMigrations(schoolCode,token),adminListAudit(schoolCode,token)]);for(const x of [s,i,c,m,a])if(!x.ok)throw new Error(x.error||'ADMIN_LOAD_FAILED');setSummary(s);setRows(i.rows||[]);setConflicts(c.rows||[]);setMigrations(m.rows||[]);setAudit(a.rows||[]);}catch(e){const msg=e instanceof Error?e.message:'تعذر التحميل';setError(msg);if(msg.includes('EXPIRED')){sessionStorage.removeItem(SESSION_KEY);setToken('');}}finally{setLoading(false);}};
  useEffect(()=>{void load();},[token]);

  const exportClass=()=>{const data=shownRows.map((r,index)=>({'م':index+1,'اسم الطالب':r.studentName,'الفصل':r.className,'كود RSD المركزي':r.rasedId,'حالة الهوية':r.status}));const ws=XLSX.utils.json_to_sheet(data);ws['!cols']=[{wch:6},{wch:35},{wch:14},{wch:22},{wch:14}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,(selectedClass||'طلاب المدرسة').slice(0,31));XLSX.writeFile(wb,`راصد_الهوية_${selectedClass||'المدرسة'}_${new Date().toISOString().slice(0,10)}.xlsx`);};
  const importClassToTeacher=()=>{if(!selectedClass){setError('اختر فصلًا محددًا أولًا.');return;}const centralRows=rows.filter(r=>r.className===selectedClass&&r.status==='active');setStudents((current:any[])=>{const byCentral=new Map(current.filter(s=>s.centralStudentId).map(s=>[s.centralStudentId,s]));const next=[...current];centralRows.forEach(r=>{if(byCentral.has(r.centralStudentId))return;next.push({id:`local_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,localStudentId:`local_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,centralStudentId:r.centralStudentId,centralRasedId:r.rasedId,rasedId:r.rasedId,parentCode:r.rasedId,schoolCode,schoolId:summary?.schoolId,name:r.studentName,grade:'',classes:[r.className],attendance:[],behaviors:[],grades:[],identityStatus:'matched',identitySource:'central',identityUpdatedAt:new Date().toISOString()});});return next;});setClasses(c=>c.includes(selectedClass)?c:[...c,selectedClass]);};
  const downloadExcelTemplate=()=>{
    const template=[
      {'اسم الطالب':'مثال: أحمد محمد علي','الفصل':'8/1','كود RSD القديم (اختياري)':'','رقم هاتف ولي الأمر (اختياري)':'','النوع (اختياري)':'ذكر'},
      {'اسم الطالب':'','الفصل':'','كود RSD القديم (اختياري)':'','رقم هاتف ولي الأمر (اختياري)':'','النوع (اختياري)':''},
    ];
    const ws=XLSX.utils.json_to_sheet(template);
    ws['!cols']=[{wch:36},{wch:14},{wch:26},{wch:29},{wch:20}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'قالب الطلاب');
    XLSX.writeFile(wb,'قالب_استيراد_طلاب_الهوية_المركزية.xlsx');
  };

  const readExcelFile=async(file:File)=>{
    setError('');setExcelImportMessage('');setExcelPreview([]);setExcelFileName(file.name);
    try{
      const workbook=XLSX.read(await file.arrayBuffer(),{type:'array'});
      const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(workbook.Sheets[workbook.SheetNames[0]],{defval:''});
      const seen=new Set<string>();
      const parsed:ExcelStudentPreview[]=[];
      const issues:string[]=[];
      rows.forEach((row,index)=>{
        const name=getCell(row,['اسم الطالب','الاسم','student name','name']);
        const className=getCell(row,['الفصل','الشعبة','الصف والفصل','class','classname']);
        const rasedId=getCell(row,['كود rsd القديم (اختياري)','كود rsd','rasedid','rsd']);
        const parentPhone=getCell(row,['رقم هاتف ولي الامر (اختياري)','هاتف ولي الامر','رقم الهاتف','parentphone']);
        const genderRaw=getCell(row,['النوع (اختياري)','النوع','gender']);
        if(!name&&!className)return;
        if(!name||!className){issues.push(`الصف ${index+2}: الاسم أو الفصل مفقود.`);return;}
        const key=`${name.trim().toLowerCase()}|${className.trim().toLowerCase()}`;
        if(seen.has(key)){issues.push(`الصف ${index+2}: الطالب مكرر داخل الملف.`);return;}
        seen.add(key);
        parsed.push({
          localStudentId:`admin_excel_${Date.now()}_${index}_${Math.random().toString(36).slice(2,7)}`,
          name:name.trim(),className:className.trim(),rasedId:rasedId.trim().toUpperCase()||undefined,
          parentPhone:parentPhone||undefined,
          gender:genderRaw.includes('انث')||genderRaw.toLowerCase()==='female'?'female':genderRaw?'male':undefined,
          rowNumber:index+2,
        });
      });
      if(!parsed.length)throw new Error('لم يتم العثور على صفوف طلاب صالحة في الملف.');
      if(issues.length)setError(`تم تجاهل ${issues.length} صفوف غير صالحة. أول ملاحظة: ${issues[0]}`);
      setExcelPreview(parsed);
    }catch(e){setError(e instanceof Error?e.message:'تعذر قراءة ملف Excel.');}
  };

  const importExcelToCentral=async()=>{
    if(!excelPreview.length)return;
    setExcelImporting(true);setError('');setExcelImportMessage('');
    try{
      const grouped=new Map<string,ExcelStudentPreview[]>();
      excelPreview.forEach(student=>grouped.set(student.className,[...(grouped.get(student.className)||[]),student]));
      const summaries:string[]=[];
      for(const [className,classStudents] of grouped){
        if(classStudents.length>60)throw new Error(`الفصل ${className} يتجاوز الحد الآمن 60 طالبًا.`);
        const response=await migrateClassStudents({
          schoolCode,actorId,
          requestId:`admin-excel-${schoolCode}-${className}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          className,confirmationText:'ترحيل الفصل',
          students:classStudents.map(student=>({
            localStudentId:student.localStudentId,name:student.name,className:student.className,
            classes:[student.className],rasedId:student.rasedId,
          })),
        });
        if(!response.ok)throw new Error(`فشل الفصل ${className}: ${response.error||'UNKNOWN_ERROR'}`);
        summaries.push(`${className}: أُنشئ ${response.summary?.created||0}، مطابق ${response.summary?.matched||0}`);
      }
      setExcelImportMessage(`نجح استيراد ${excelPreview.length} طالبًا في ${grouped.size} فصل/فصول. ${summaries.join(' | ')}`);
      setExcelPreview([]);setExcelFileName('');await load();
    }catch(e){setError(e instanceof Error?e.message:'تعذر استيراد ملف Excel.');}
    finally{setExcelImporting(false);}
  };

  const toggleStatus=async(r:AdminIdentityRow)=>{const status=r.status==='active'?'inactive':'active';const x=await adminSetIdentityStatus(schoolCode,token,r.centralStudentId,status);if(!x.ok){setError(x.error||'STATUS_UPDATE_FAILED');return;}await load();};

  if(!token)return <div dir="rtl" className="mx-auto mt-10 max-w-md rounded-3xl border border-borderColor bg-bgCard p-6 shadow-card"><div className="flex items-center gap-3"><LockKeyhole className="h-8 w-8 text-primary"/><div><h2 className="text-xl font-black">دخول مشرف الهوية</h2><p className="text-sm font-bold text-textSecondary">هذه اللوحة مخفية ومحمية بجلسة مؤقتة.</p></div></div><input type="password" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="كود مشرف الهوية" className="mt-6 h-12 w-full rounded-2xl border border-borderColor bg-bgSoft px-4 font-black outline-none focus:border-primary"/>{error&&<p className="mt-3 text-sm font-bold text-danger">{error}</p>}<button onClick={login} disabled={loading||code.length<8} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-black text-white disabled:opacity-50">{loading?<Loader2 className="animate-spin"/>:<KeyRound/>}دخول</button></div>;

  return <section dir="rtl" className="h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar space-y-4 pb-24 pr-1">
    <div className="flex flex-col gap-4 rounded-3xl border border-borderColor bg-bgCard p-5 shadow-card lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><ShieldCheck className="h-9 w-9 text-primary"/><div><h2 className="text-2xl font-black">لوحة مشرف الهوية المركزية</h2><p className="text-sm font-bold text-textSecondary">إدارة الهويات والفصول والتقارير الاستثنائية فقط.</p></div></div><div className="flex gap-2"><button onClick={load} className="rounded-xl border border-borderColor p-3"><RefreshCw className={loading?'animate-spin':''}/></button><button onClick={logout} className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 font-black text-danger"><LogOut/>خروج</button></div></div>
    {error&&<div className="rounded-2xl border border-danger/20 bg-danger/10 p-4 font-bold text-danger">{error}</div>}
    <div className="flex flex-wrap gap-2">{(['overview','students','conflicts','migrations','audit'] as Tab[]).map(t=><button key={t} onClick={()=>setTab(t)} className={`rounded-xl px-4 py-2 font-black ${tab===t?'bg-primary text-white':'bg-bgCard text-textSecondary'}`}>{{overview:'الملخص',students:'الطلاب والفصول',conflicts:'التعارضات',migrations:'دفعات الترحيل',audit:'سجل التدقيق'}[t]}</button>)}</div>
    {tab==='overview'&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Card label="إجمالي الهويات" value={summary?.total||0}/><Card label="نشطة" value={summary?.active||0}/><Card label="غير نشطة" value={summary?.inactive||0}/><Card label="تعارضات مفتوحة" value={summary?.openConflicts||0}/><Card label="دفعات الترحيل" value={summary?.migrationJobs||0}/></div>}
    {tab==='students'&&<div className="space-y-4">
      <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div><h3 className="flex items-center gap-2 text-lg font-black"><FileSpreadsheet className="text-primary"/>استيراد قوائم الفصول من Excel</h3><p className="mt-1 text-sm font-bold leading-7 text-textSecondary">حمّل القالب، أدخل اسم الطالب والفصل، ثم ارفع الملف للمعاينة قبل الترحيل المركزي. يمكن أن يحتوي الملف على أكثر من فصل.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadExcelTemplate} className="flex h-11 items-center gap-2 rounded-xl border border-primary/30 bg-bgCard px-4 font-black text-primary"><Download className="h-5 w-5"/>تحميل القالب</button>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 font-black text-white"><Upload className="h-5 w-5"/>رفع ملف Excel<input type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)void readExcelFile(file);e.currentTarget.value='';}}/></label>
          </div>
        </div>
        {excelFileName&&<p className="mt-3 text-xs font-black text-textSecondary">الملف: {excelFileName}</p>}
        {excelPreview.length>0&&<div className="mt-4 space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="font-black">المعاينة: {excelPreview.length} طالبًا في {new Set(excelPreview.map(s=>s.className)).size} فصل/فصول</p><button type="button" onClick={importExcelToCentral} disabled={excelImporting} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-success px-5 font-black text-white disabled:opacity-50">{excelImporting?<Loader2 className="h-5 w-5 animate-spin"/>:<ShieldCheck className="h-5 w-5"/>}اعتماد واستيراد مركزي</button></div><div className="max-h-64 overflow-y-auto rounded-2xl border border-borderColor bg-bgCard"><table className="w-full min-w-[650px] text-right text-sm"><thead className="sticky top-0 bg-bgSoft"><tr><th className="px-3 py-2">الطالب</th><th className="px-3 py-2">الفصل</th><th className="px-3 py-2">الكود القديم</th><th className="px-3 py-2">صف Excel</th></tr></thead><tbody className="divide-y divide-borderColor">{excelPreview.map(s=><tr key={s.localStudentId}><td className="px-3 py-2 font-black">{s.name}</td><td className="px-3 py-2">{s.className}</td><td className="px-3 py-2 font-mono">{s.rasedId||'—'}</td><td className="px-3 py-2">{s.rowNumber}</td></tr>)}</tbody></table></div></div>}
        {excelImportMessage&&<div className="mt-4 rounded-2xl border border-success/20 bg-success/10 p-4 text-sm font-black text-success">{excelImportMessage}</div>}
      </div>
      <div className="grid gap-3 rounded-3xl border border-borderColor bg-bgCard p-4 md:grid-cols-4"><select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="h-11 rounded-xl border border-borderColor bg-bgSoft px-3 font-bold"><option value="">جميع الفصول</option>{classes.map(c=><option key={c}>{c}</option>)}</select><div className="relative"><Search className="absolute right-3 top-3 h-5 w-5 text-textSecondary"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث بالاسم أو الكود" className="h-11 w-full rounded-xl border border-borderColor bg-bgSoft pr-10 pl-3 font-bold"/></div><button onClick={exportClass} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-success px-4 font-black text-white"><Download/>تصدير Excel</button><button onClick={importClassToTeacher} disabled={!selectedClass} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-black text-white disabled:opacity-40"><Users/>إضافة الفصل لراصد المعلم</button></div><div className="overflow-x-auto rounded-3xl border border-borderColor bg-bgCard"><table className="min-w-[900px] w-full text-right text-sm"><thead className="bg-bgSoft"><tr>{['الطالب','الفصل','RSD المركزي','المعرف المركزي','الحالة','إجراء'].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-borderColor">{shownRows.map(r=><tr key={r.centralStudentId}><td className="px-4 py-3 font-black">{r.studentName}</td><td className="px-4 py-3">{r.className}</td><td className="px-4 py-3 font-mono">{r.rasedId}</td><td className="px-4 py-3 font-mono text-xs">{r.centralStudentId}</td><td className="px-4 py-3">{r.status}</td><td className="px-4 py-3"><button onClick={()=>toggleStatus(r)} className="rounded-lg border border-borderColor px-3 py-1 font-bold">{r.status==='active'?'تعطيل':'تفعيل'}</button></td></tr>)}</tbody></table></div></div>}
    {tab==='conflicts'&&<ListPanel icon={AlertTriangle} empty="لا توجد تعارضات مفتوحة" rows={conflicts} render={r=><><b>{r.conflictId}</b> · {r.status} · {r.createdAt}</>}/>} 
    {tab==='migrations'&&<ListPanel icon={Users} empty="لا توجد دفعات" rows={migrations} render={r=><><b>{r.className||'دفعة تجريبية'}</b> · {r.studentCount} طالبًا · {r.status} · {r.createdAt}</>}/>} 
    {tab==='audit'&&<ListPanel icon={History} empty="لا توجد سجلات" rows={audit} render={r=><><b>{r.action}</b> · {r.centralStudentId||'—'} · {r.actorId||'—'} · {r.createdAt}</>}/>} 
  </section>;
};
const Card=({label,value}:{label:string;value:number})=><div className="rounded-3xl border border-borderColor bg-bgCard p-5"><div className="text-sm font-black text-textSecondary">{label}</div><div className="mt-2 text-3xl font-black text-primary">{value}</div></div>;
const ListPanel=({icon:Icon,empty,rows,render}:{icon:any;empty:string;rows:any[];render:(r:any)=>React.ReactNode})=><div className="rounded-3xl border border-borderColor bg-bgCard p-4"><div className="mb-3 flex items-center gap-2"><Icon className="text-primary"/><b>السجلات</b></div>{rows.length?rows.map((r,i)=><div key={i} className="border-t border-borderColor px-2 py-3 text-sm font-bold">{render(r)}</div>):<p className="p-8 text-center font-bold text-textSecondary">{empty}</p>}</div>;
export default IdentityAdminDashboard;
