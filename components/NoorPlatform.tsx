import React from 'react';
import { ExternalLink, Globe, Lock, ShieldCheck, ChevronRight, Smartphone } from 'lucide-react';

const NoorPlatform: React.FC = () => {
  const url = "https://lms.moe.gov.om/student/users/login";

  const handleOpenPlatform = () => {
    // @ts-ignore
    const cordova = window.cordova;

    if (!cordova || !cordova.InAppBrowser) {
        alert("يرجى فتح التطبيق من الهاتف (Android/iOS) ليعمل المتصفح الداخلي بشكل صحيح.");
        return;
    }

    // إعدادات المتصفح:
    const options = 'location=yes,toolbar=yes,closebuttoncaption=إغلاق,hidenavigationbuttons=no,toolbarposition=bottom,presentationstyle=fullscreen,hardwareback=yes';
    const target = '_blank';

    // فتح المتصفح باستخدام الواجهة الأصلية
    cordova.InAppBrowser.open(url, target, options);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 relative animate-in fade-in duration-500">
      
      {/* Decorative Header */}
      <div className="bg-gradient-to-b from-blue-50 to-white p-8 flex flex-col items-center justify-center text-center border-b border-gray-50">
         <div className="w-32 h-32 bg-white rounded-[2rem] flex items-center justify-center relative shadow-lg shadow-blue-100 mb-6 border border-blue-50 p-4">
            <img src="noor_logo.png" className="w-full h-full object-contain" alt="شعار نور" onError={(e) => {e.currentTarget.style.display='none'; e.currentTarget.parentElement?.classList.add('hidden')}} />
            <Globe className="w-10 h-10 text-blue-600 hidden" />
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-xl border-4 border-white">
                <Lock className="w-4 h-4 text-white" />
            </div>
         </div>
         
         <h2 className="text-xl font-black text-gray-900 mb-2">منصة نور التعليمية</h2>
         <p className="text-xs font-bold text-gray-400 max-w-[280px] leading-relaxed">
            الوصول المباشر للمنصة عبر المتصفح الآمن
         </p>
      </div>

      {/* Action Section */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6">
         
         <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 w-full">
            <div className="flex gap-3 items-start">
               <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
               <p className="text-[10px] font-bold text-amber-800 leading-relaxed text-right">
                  سيتم فتح المنصة في نافذة مخصصة. 
                  <br/>
                  للعودة للتطبيق، استخدم زر <strong>"إغلاق"</strong> أو <strong>"X"</strong> الموجود في شريط الأدوات (أعلى أو أسفل الشاشة).
               </p>
            </div>
         </div>

         <button 
            onClick={handleOpenPlatform}
            className="group w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-2 pl-3 flex items-center transition-all shadow-xl shadow-blue-200 active:scale-95"
         >
            <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <ExternalLink className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-right pr-4">
                <span className="block text-sm font-black">فتح موقع نور</span>
                <span className="block text-[9px] font-bold text-blue-200">فتح في متصفح التطبيق</span>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-200" />
         </button>

      </div>
      
      {/* Footer */}
      <div className="p-4 text-center">
         <p className="text-[9px] font-bold text-gray-300 flex items-center justify-center gap-1">
            <Smartphone className="w-3 h-3" />
            متوافق مع الوضع الأفقي والكمبيوتر اللوحي
         </p>
      </div>

    </div>
  );
};

export default NoorPlatform;