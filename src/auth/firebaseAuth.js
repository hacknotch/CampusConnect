// Centralized auth helpers for CampusConnect (Firebase v9 modular)
import { auth, db } from "../firebase/config";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  signOut as fbSignOut,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function signIn(email, password) {
  // Wrap sign-in for UI code
  return signInWithEmailAndPassword(auth, email, password);
}

export async function fetchUserDoc(uid) {
  return getDoc(doc(db, "users", uid));
}

export async function markPasswordChanged(uid) {
  return updateDoc(doc(db, "users", uid), { passwordChanged: true });
}

export async function sendFirstTimeReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function sendVerificationIfNeeded(user) {
  try {
    if (user && !user.emailVerified) {
      await sendEmailVerification(user);
      return true;
    }
    return false;
  } catch (e) {
    console.error("sendVerificationIfNeeded error", e);
    return false;
  }
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function signOut() {
  return fbSignOut(auth);
}
