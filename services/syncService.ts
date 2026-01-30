
import { db } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

const COLLECTION_NAME = "teachers";

/**
 * حفظ بيانات المعلم في السحابة
 */
export const saveTeacherData = async (uid: string, data: any) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, uid);
    // نستخدم merge: true لضمان عدم مسح حقول لم نرسلها (إن وجدت)
    await setDoc(docRef, data, { merge: true });
    console.log("✅ Cloud save successful");
  } catch (error) {
    console.error("❌ Cloud save failed:", error);
    throw error;
  }
};

/**
 * الاشتراك في التحديثات الحية (Real-time Listener)
 * هذه الدالة ستعيد دالة إلغاء الاشتراك (unsubscribe function)
 */
export const subscribeToTeacherData = (uid: string, onUpdate: (data: any) => void) => {
  const docRef = doc(db, COLLECTION_NAME, uid);
  return onSnapshot(docRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      onUpdate(docSnapshot.data());
    } else {
      console.log("ℹ️ No cloud data found for this user yet.");
    }
  }, (error) => {
    console.error("❌ Real-time sync error:", error);
  });
};

/**
 * ترحيل البيانات المحلية إلى السحابة (عند تسجيل الدخول لأول مرة)
 */
export const migrateLocalToCloud = async (uid: string, localData: any) => {
  const docRef = doc(db, COLLECTION_NAME, uid);
  const docSnap = await getDoc(docRef);

  // إذا لم يكن هناك بيانات في السحابة، نرفع البيانات المحلية
  if (!docSnap.exists() && localData) {
    console.log("🚀 Migrating local data to cloud...");
    await setDoc(docRef, localData);
    return true;
  }
  return false;
};
