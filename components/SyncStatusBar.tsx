import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SyncStatusBar: React.FC = () => {
  const { syncMode } = useApp();

  const isCloud = syncMode === 'cloud';

  return (
    <div className="w-full px-4 md:px-8 pt-3">
      <div
        className={`max-w-5xl mx-auto w-full rounded-2xl border px-4 py-2 flex items-center justify-between shadow-sm
        ${isCloud ? 'bg-sky-50 border-sky-100 text-sky-700' : 'bg-amber-50 border-amber-100 text-amber-800'}`}
      >
        <div className="flex items-center gap-2 font-black text-xs">
          {isCloud ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
          <span>{isCloud ? 'المزامنة: مفعّلة' : 'غير متزامن (محلي فقط)'}</span>
        </div>

        <div className="text-10px font-bold opacity-80">
          {isCloud ? 'Cloud' : 'Local'}
        </div>
      </div>
    </div>
  );
};

export default SyncStatusBar;
