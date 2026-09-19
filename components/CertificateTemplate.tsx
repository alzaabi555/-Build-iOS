import React from 'react';
import { Award, Crown, Sparkles } from 'lucide-react';
import { CertificateSettings, CertificateFieldKey, DEFAULT_CERTIFICATE_SETTINGS } from '../services/certificateSettings';

interface Props {
  studentName: string; grade?: string; teacherName?: string; schoolName?: string;
  subject?: string; monthName?: string; points?: number; ministryLogo?: string;
  schoolLogo?: string; stamp?: string; issueDate?: string; settings?: CertificateSettings;
}

const CertificateTemplate: React.FC<Props> = ({ studentName, grade='', teacherName='معلم المادة', schoolName='مدرسة الإبداع للبنين', subject='الدراسات الاجتماعية', monthName=new Intl.DateTimeFormat('ar-OM',{month:'long'}).format(new Date()), points=0, ministryLogo, schoolLogo, stamp, issueDate=new Intl.DateTimeFormat('ar-OM').format(new Date()), settings=DEFAULT_CERTIFICATE_SETTINGS }) => {
  const value: Record<CertificateFieldKey,string> = {
    title: settings.title, awardTitle: settings.awardTitle, studentName, bodyText: settings.bodyText.replace('{month}', monthName),
    grade: grade || 'غير محدد', points: `${points} نقطة`, subject: subject || 'غير محددة', monthName: `فارس شهر ${monthName}`,
    teacherName, schoolName, issueDate,
  };
  const field = (key: CertificateFieldKey, label?: string) => {
    const s=settings.fields[key]; if(!s?.visible) return null;
    return <div style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,width:`${s.width}%`,transform:'translate(-50%,-50%)',fontSize:s.fontSize,color:s.color,textAlign:s.align,fontWeight:s.fontWeight,lineHeight:1.55,whiteSpace:key==='bodyText'?'normal':'nowrap'}}>{label && <div style={{fontSize:12,color:'#6c778a',marginBottom:3}}>{label}</div>}{value[key]}</div>;
  };
  const custom=settings.mode==='image' && settings.templateDataUrl;
  return <div dir="rtl" style={{width:1123,height:794,position:'relative',overflow:'hidden',boxSizing:'border-box',background:'#fcfaf4',fontFamily:'Tajawal, Cairo, Arial, sans-serif'}}>
    {custom ? <img src={settings.templateDataUrl} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'fill'}}/> : <>
      <div style={{position:'absolute',inset:30,border:'4px solid #0f2f59',borderRadius:18}}/><div style={{position:'absolute',inset:42,border:'2px solid #d6a640',borderRadius:14}}/><div style={{position:'absolute',inset:56,border:'1px solid rgba(15,47,89,.55)',borderRadius:10}}/>
      <div style={{position:'absolute',top:118,left:'50%',transform:'translateX(-50%)',width:92,height:92,borderRadius:'50%',background:'#0f2f59',border:'10px solid #d6a640',display:'grid',placeItems:'center'}}><Crown size={43} color="#f7e8b1" fill="#f7e8b1"/></div>
      <div style={{position:'absolute',top:70,right:82,display:'flex',gap:12,alignItems:'center'}}>{ministryLogo?<img src={ministryLogo} alt="" style={{width:64,height:64,objectFit:'contain'}}/>:<Award size={58} color="#0f2f59"/>}<div><b>سلطنة عُمان</b><div>وزارة التربية والتعليم</div></div></div>
    </>}
    {field('title')}{field('awardTitle')}{field('monthName')}{field('studentName')}{field('bodyText')}
    {field('grade','الفصل')}{field('points','الرصيد الشهري')}{field('subject','المادة')}{field('teacherName','معلم المادة')}{field('schoolName')}{field('issueDate')}
    {settings.showStamp && <div style={{position:'absolute',left:'50%',bottom:32,transform:'translateX(-50%)',width:94,height:94,borderRadius:'50%',background:'#0f2f59',border:'6px solid #d6a640',display:'grid',placeItems:'center',color:'white',fontWeight:1000,textAlign:'center'}}>{stamp?<img src={stamp} alt="" style={{width:78,height:78,objectFit:'contain'}}/>:<span>راصد<br/><small style={{fontSize:10,color:'#f7e8b1'}}>تميز • عطاء • إنجاز</small></span>}</div>}
    {schoolLogo && <img src={schoolLogo} alt="" style={{position:'absolute',top:64,left:82,width:58,height:58,objectFit:'contain'}}/>}
  </div>;
};
export default CertificateTemplate;
