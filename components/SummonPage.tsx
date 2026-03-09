import React from 'react';
import Reports from './Reports';

const SummonPage: React.FC = () => {
  return (
    // تطبيق خصائص الهوية البصرية الجديدة: الخطوط، الألوان، وحركة الدخول الناعمة
    <div className="fixed md:sticky top-0 z-40 md:z-30 bg-[#1e3a8a] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300 rounded-b-[2.5rem] md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto">
        
        {/* نستدعي مكون التقارير المتكامل (Reports)
            ونطلب منه فتح تبويب "الاستدعاء" (summon) فوراً
        */}
        <Reports initialTab="summon" />
        
    </div>
  );
};

export default SummonPage;
