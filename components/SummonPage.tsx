import React from 'react';
import Reports from './Reports';

const SummonPage: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#f8fafc]">
        {/* نستخدم مكون التقارير لأنه يحتوي على منطق الطباعة المعقد والموحد.
            نمرر خاصية 'initialTab' لفتح تبويب الاستدعاء مباشرة.
        */}
        <Reports initialTab="summon" />
    </div>
  );
};

export default SummonPage;
