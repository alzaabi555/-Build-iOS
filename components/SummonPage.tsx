import React from 'react';
import Reports from './Reports';

const SummonPage: React.FC = () => {
  return (
    // تطبيق خصائص الهوية البصرية الجديدة: الخطوط، الألوان، وحركة الدخول الناعمة
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* نستدعي مكون التقارير المتكامل (Reports)
            ونطلب منه فتح تبويب "الاستدعاء" (summon) فوراً
        */}
        <Reports initialTab="summon" />
        
    </div>
  );
};

export default SummonPage;
