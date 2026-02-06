// services/firebase.ts
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

// إعدادات Firebase الخاصة بتطبيق راصد
// عَبِّئ القيم من Firebase Console (Web app) لمشروع rasedapp-m555
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "rasedapp-m555.firebaseapp.com",
  projectId: "rasedapp-m555",
  storageBucket: "rasedapp-m555.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// المصادقة
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore
export const db = getFirestore(app);

// تفعيل الكاش (للوِب)
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      // تعدد التبويبات
    } else if (err.code === "unimplemented") {
      // المتصفح لا يدعم
    }
  });
} catch {
  console.log("Persistence skipped");
}

// تسجيل الدخول بالويب (Popup)
export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const logoutUser = async () => {
  await firebaseSignOut(auth);
};
