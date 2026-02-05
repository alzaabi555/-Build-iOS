import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";

// ------------------------------------------------------------------
// إعدادات Firebase الخاصة بتطبيق راصد
// ------------------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyB93x2kKaFd7-Ni3O2zzkqfi4BveVrsQ1U",
  authDomain: "rasedapp-m555.firebaseapp.com",
  projectId: "rasedapp-m555",
  storageBucket: "rasedapp-m555.firebasestorage.app",
  messagingSenderId: "87037584903",
  appId: "1:87037584903:web:ea709deb8d2203fa41eca2",
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// تهيئة المصادقة
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// تهيئة قاعدة البيانات (الطريقة الكلاسيكية المضمونة للبناء)
export const db = getFirestore(app);

// تفعيل الكاش (داخل try/catch لمنع تحطم التطبيق في بيئات لا تدعمه)
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
       // تعدد التبويبات مفتوح
    } else if (err.code == 'unimplemented') {
       // المتصفح لا يدعم
    }
  });
} catch (e) {
  // تجاهل الأخطاء في بيئة Node/Electron إذا حدثت
  console.log("Persistence skipped");
}

// ------------------------------------------------------------------
// دوال المصادقة
// ------------------------------------------------------------------

// تسجيل الدخول (للويب فقط - الويندوز يتم معالجته في LoginScreen)
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Web Login Error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  await firebaseSignOut(auth);
};
