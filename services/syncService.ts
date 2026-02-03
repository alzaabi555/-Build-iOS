
// تم تعطيل خدمة المزامنة السحابية بناءً على طلب المستخدم
// للعمل بالنظام المحلي فقط

export const saveTeacherData = async (uid: string, data: any) => {
  // دالة فارغة
  return Promise.resolve();
};

export const subscribeToTeacherData = (uid: string, onUpdate: (data: any) => void) => {
  // دالة فارغة
  return () => {};
};

export const migrateLocalToCloud = async (uid: string, localData: any) => {
  // دالة فارغة
  return Promise.resolve(false);
};
