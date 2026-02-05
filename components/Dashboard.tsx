عودة للافتراضي">
                            <span className="font-bold px-1">×</span>
                        </button>
                    </div>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="الاسم" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800 focus:border-indigo-500 transition-colors" />
                            <input value={editSchool} onChange={e => setEditSchool(e.target.value)} placeholder="المدرسة" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800 focus:border-indigo-500 transition-colors" />
                        </div>
                        <input value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder="المادة" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800 focus:border-indigo-500 transition-colors" />
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editGovernorate} onChange={e => setEditGovernorate(e.target.value)} placeholder="المحافظة" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800 focus:border-indigo-500 transition-colors" />
                            <input value={editAcademicYear} onChange={e => setEditAcademicYear(e.target.value)} placeholder="العام الدراسي" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800 focus:border-indigo-500 transition-colors" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-1 rounded-xl border border-gray-200 flex">
                                <button onClick={() => setEditSemester('1')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${editSemester === '1' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>فصل 1</button>
                                <button onClick={() => setEditSemester('2')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${editSemester === '2' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>فصل 2</button>
                            </div>
                            <div className="bg-gray-50 p-1 rounded-xl border border-gray-200 flex">
                                <button onClick={() => { setEditGender('male'); }} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${editGender === 'male' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>معلم 👨‍🏫</button>
                                <button onClick={() => { setEditGender('female'); }} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${editGender === 'female' ? 'bg-white shadow text-pink-600' : 'text-gray-400'}`}>معلمة 👩‍🏫</button>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-100 mt-2">
                             <div className="flex gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 flex items-center justify-center gap-2 border border-indigo-100 transition-colors">
                                    <Camera className="w-4 h-4"/> صورتك
                                </button>
                                <button onClick={() => stampInputRef.current?.click()} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 flex items-center justify-center gap-2 border border-blue-100 transition-colors">
                                    <Check className="w-4 h-4"/> الختم
                                </button>
                                <button onClick={() => ministryLogoInputRef.current?.click()} className="flex-1 py-3 bg-amber-50 text-amber-600 rounded-xl font-bold text-xs hover:bg-amber-100 flex items-center justify-center gap-2 border border-amber-100 transition-colors">
                                    <School className="w-4 h-4"/> الشعار
                                </button>
                             </div>
                             <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*"/>
                             <input type="file" ref={stampInputRef} onChange={handleStampUpload} className="hidden" accept="image/*"/>
                             <input type="file" ref={ministryLogoInputRef} onChange={handleMinistryLogoUpload} className="hidden" accept="image/*"/>
                        </div>

                        <button onClick={handleSaveInfo} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm shadow-lg hover:bg-slate-800 transition-all active:scale-95">حفظ التغييرات</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} className="max-w-4xl rounded-[2rem]">
                <div className="flex flex-col h-[80vh]">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h3 className="font-black text-xl text-slate-800">إعدادات الجدول والتوقيت</h3>
                        
                        <div className="flex gap-2">
                            <button onClick={() => modalScheduleFileInputRef.current?.click()} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors border border-indigo-100">
                                <Download className="w-4 h-4" />
                                <span>{isImportingPeriods ? 'جاري...' : 'استيراد'}</span>
                            </button>
                            <input type="file" ref={modalScheduleFileInputRef} onChange={handleImportPeriodTimes} accept=".xlsx, .xls" className="hidden" />
                            
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button onClick={() => setScheduleTab('timing')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${scheduleTab === 'timing' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>التوقيت</button>
                                <button onClick={() => setScheduleTab('classes')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${scheduleTab === 'classes' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>الحصص</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {scheduleTab === 'timing' ? (
                            <div className="space-y-3">
                                {tempPeriodTimes.map((pt, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-black text-slate-500 border border-gray-200">{pt.periodNumber}</div>
                                        <div className="flex-1 flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-gray-400 block mb-1">بداية الحصة</label>
                                                <input type="time" value={pt.startTime} onChange={(e) => updateTempTime(idx, 'startTime', e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 text-slate-800" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-gray-400 block mb-1">نهاية الحصة</label>
                                                <input type="time" value={pt.endTime} onChange={(e) => updateTempTime(idx, 'endTime', e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 text-slate-800" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {tempSchedule.map((day, idx) => (
                                        <button key={idx} onClick={() => setEditingDayIndex(idx)} className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition-all ${editingDayIndex === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'}`}>
                                            {day.dayName}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {tempSchedule[editingDayIndex]?.periods.map((cls, pIdx) => (
                                        <div key={pIdx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                            <span className="text-xs font-black text-gray-400 w-16">حصة {pIdx + 1}</span>
                                            <input 
                                                value={cls} 
                                                onChange={(e) => updateTempClass(editingDayIndex, pIdx, e.target.value)} 
                                                placeholder="اسم الفصل / المادة" 
                                                className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-500 text-slate-800" 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-4 shrink-0">
                        <button onClick={handleSaveScheduleSettings} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm shadow-lg hover:bg-slate-800 transition-all">حفظ الجدول والتوقيت</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
