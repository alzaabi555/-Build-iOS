import React from 'react';
import { ExternalLink, Globe, Lock, ShieldCheck, ChevronRight } from 'lucide-react';

const NoorPlatform: React.FC = () => {
  const url = "https://lms.moe.gov.om/student/users/login";

  const handleOpenPlatform = () => {
    // استخدام window.cordova بشكل مباشر لتجنب مشاكل المكتبات الوسيطة (Wrappers)
    // التي قد تسبب أخطاء مثل undefined subscribe
    // @ts-ignore
    const cordova = window.cordova;

    if (!cordova || !cordova.InAppBrowser) {
        alert("يرجى فتح التطبيق من الهاتف (Android/iOS) ليعمل المتصفح الداخلي بشكل صحيح.");
        return;
    }

    // إعدادات المتصفح بدقة
    // location=no: إخفاء شريط العنوان
    // toolbar=no: إخفاء شريط الأدوات
    // presentationstyle=fullscreen: لضمان ملء الشاشة
    const options = 'location=no,toolbar=no,zoom=no,hidden=no,presentationstyle=fullscreen,hardwareback=yes';
    const target = '_blank';

    // إنشاء كائن المتصفح باستخدام الواجهة الأصلية
    const browser = cordova.InAppBrowser.open(url, target, options);

    if (!browser) return;

    // كود الجافاسكريبت للزر العائم
    const injectScriptCode = `
        (function() {
            if(document.getElementById('madrasati-back-btn')) return;
            var btn = document.createElement('div');
            btn.id = 'madrasati-back-btn';
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';
            btn.style.cssText = 'position:fixed;bottom:40px;left:25px;width:60px;height:60px;background:#2563eb;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.4);z-index:999999;cursor:pointer;border:2px solid white;transition:transform 0.2s;';
            btn.onclick = function() {
                btn.style.transform = 'scale(0.8)';
                setTimeout(function(){ window.location.href = 'https://close-madrasati-browser'; }, 100);
            };
            document.body.appendChild(btn);
        })();
    `;

    // استخدام addEventListener بدلاً من subscribe لأننا نستخدم الكائن الأصلي
    browser.addEventListener('loadstop', () => {
        browser.executeScript({ code: injectScriptCode });
        browser.insertCSS({ code: "body { padding-bottom: 80px !important; }" });
    });

    browser.addEventListener('loadstart', (event: any) => {
        if (event.url && event.url.includes('close-madrasati-browser')) {
            browser.close();
        }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 relative animate-in fade-in duration-500">
      
      {/* Decorative Header */}
      <div className="bg-gradient-to-b from-blue-50 to-white p-8 flex flex-col items-center justify-center text-center border-b border-gray-50">
         <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center relative shadow-lg shadow-blue-100 mb-6 border border-blue-50">
            <Globe className="w-10 h-10 text-blue-600" />
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-xl border-4 border-white">
                <Lock className="w-4 h-4 text-white" />
            </div>
         </div>
         
         <h2 className="text-xl font-black text-gray-900 mb-2">منصة نور التعليمية</h2>
         <p className="text-xs font-bold text-gray-400 max-w-[280px] leading-relaxed">
            النسخة المدمجة: تصفح المنصة دون أشرطة عناوين وبمظهر كامل الشاشة
         </p>
      </div>

      {/* Action Section */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6">
         
         <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 w-full">
            <div className="flex gap-3">
               <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
               <p className="text-[10px] font-bold text-amber-800 leading-relaxed text-right">
                  تم دمج المتصفح مع التطبيق. استخدم الزر العائم الأزرق (السهم) الذي سيظهر أسفل يسار الشاشة للعودة للتطبيق.
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
                <span className="block text-[9px] font-bold text-blue-200">وضع ملء الشاشة (In-App)</span>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-200" />
         </button>

      </div>
      
      {/* Footer */}
      <div className="p-4 text-center">
         <p className="text-[9px] font-bold text-gray-300">يتم تحميل الرابط: lms.moe.gov.om</p>
      </div>

    </div>
  );
};

export default NoorPlatform;