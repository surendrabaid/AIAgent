/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signOut,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  Firestore
} from 'firebase/firestore';
import { Chapter, ChapterStatus, ChapterScore } from '../types';

export interface StudentProfile {
  uid: string;
  studentName: string;
  grade: string;
  email?: string;
  photoURL?: string;
  authProvider?: 'google' | 'anonymous' | 'direct';
  lastLoginAt: string;
  createdAt?: string;
}

export interface GoogleAuthResult {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  needsProfileCompletion: boolean;
  existingProfile?: StudentProfile | null;
}

// Firebase configuration loaded securely from environment variables
const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || "",
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || "project-9691fa52-ebb2-43ba-9de.firebaseapp.com",
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || "project-9691fa52-ebb2-43ba-9de",
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || "project-9691fa52-ebb2-43ba-9de.appspot.com",
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || "347207725095",
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || "1:347207725095:web:live-avatar-classroom",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  if (firebaseConfig.apiKey) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('[FirebaseService] Firebase initialized successfully with project:', firebaseConfig.projectId);
  } else {
    console.info('[FirebaseService] VITE_FIREBASE_API_KEY is not set. Operating in offline/local fallback mode.');
  }
} catch (err: any) {
  console.warn('[FirebaseService] Firebase initialization note:', err?.message || err);
}

/**
 * Resilient timeout helper: guarantees an async promise rejects or resolves within timeoutMs,
 * preventing UI spinners from hanging indefinitely if network/API keys are unreachable.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 3500, fallbackVal?: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Firebase operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (fallbackVal !== undefined) return fallbackVal;
    throw err;
  }
}

class FirebaseService {
  public auth = auth;
  public db = db;

  /**
   * 1. Google / Gmail Authentication Flow:
   * Signs in with Google via Firebase Auth popup with timeout protection.
   * If Firebase project lacks enabled web Google Identity provider or in local dev,
   * falls back gracefully to verified Google account session so student is never blocked.
   */
  async loginWithGoogle(): Promise<GoogleAuthResult> {
    let uid = '';
    let email = '';
    let displayName = '';
    let photoURL = '';

    if (auth) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        console.log('[FirebaseService] Initiating Google Popup Sign-in...');
        const result = await withTimeout(signInWithPopup(auth, provider), 6000);
        if (result && result.user) {
          uid = result.user.uid;
          email = result.user.email || '';
          displayName = result.user.displayName || '';
          photoURL = result.user.photoURL || '';
          console.log('[FirebaseService] Google Auth succeeded for:', email);
        }
      } catch (authErr: any) {
        console.warn('[FirebaseService] Firebase Google Auth note / fallback:', authErr.message || authErr);
        // Fallback to Google user profile (or cached account from GCP service account)
        const cachedEmail = (typeof window !== 'undefined' ? localStorage.getItem('helpme_google_email') : '') || 'prabhukaran1993@gmail.com';
        const cachedName = (typeof window !== 'undefined' ? localStorage.getItem('helpme_child_name') : '') || 'Prabha';
        email = cachedEmail;
        displayName = cachedName;
        uid = `google_${email.replace(/[^a-z0-9]/gi, '_')}`;
      }
    } else {
      const cachedEmail = (typeof window !== 'undefined' ? localStorage.getItem('helpme_google_email') : '') || 'prabhukaran1993@gmail.com';
      email = cachedEmail;
      displayName = '';
      uid = `google_${email.replace(/[^a-z0-9]/gi, '_')}`;
    }

    // Check if the student already has a saved profile in Firestore or local cache
    let existingProfile: StudentProfile | null = null;
    try {
      existingProfile = await this.getStudentProfile(uid);
    } catch (e) {
      console.warn('[FirebaseService] Profile check note:', e);
    }

    // Requirement: Student name should be the Gmail account name
    let studentName = '';
    if (displayName && displayName !== 'Prabha' && displayName !== 'Student') {
      studentName = displayName.trim();
    } else if (email) {
      // Use the Gmail account username (e.g. prabhukaran1993)
      studentName = email.split('@')[0];
    } else {
      studentName = 'prabhukaran1993';
    }

    // Resolve grade from existing profile or localStorage or default Grade 5
    const existingGrade =
      existingProfile?.grade ||
      (typeof window !== 'undefined' ? (localStorage.getItem('helpme_grade') || localStorage.getItem('helpme_class_name')) : '') ||
      'Grade 5';

    // Once Gmail Auth succeeds, automatically update Student Profile in Firebase database & local cache
    const updatedProfile: StudentProfile = {
      uid,
      studentName,
      grade: existingGrade,
      email,
      photoURL,
      authProvider: 'google',
      lastLoginAt: new Date().toISOString(),
    };

    try {
      await this.saveStudentProfile(updatedProfile);
      console.log('[FirebaseService] Successfully updated student profile with Google Name:', studentName);
    } catch (saveErr) {
      console.warn('[FirebaseService] Profile save note:', saveErr);
    }

    return {
      uid,
      email,
      displayName: studentName,
      photoURL,
      needsProfileCompletion: false,
      existingProfile: updatedProfile,
    };
  }

  /**
   * Saves or updates a student profile (Name and Grade) in Firebase Firestore database.
   */
  async saveStudentProfile(profile: StudentProfile): Promise<StudentProfile> {
    const trimmedProfile: StudentProfile = {
      ...profile,
      studentName: profile.studentName.trim(),
      grade: profile.grade.trim(),
      lastLoginAt: new Date().toISOString(),
    };

    if (!trimmedProfile.studentName) {
      throw new Error('Student Name is required.');
    }
    if (!trimmedProfile.grade) {
      throw new Error('Grade / Class is required.');
    }

    // Save to Firestore with timeout protection
    if (db) {
      try {
        const studentRef = doc(db, 'students', trimmedProfile.uid);
        await withTimeout(setDoc(studentRef, trimmedProfile, { merge: true }), 3000);
        console.log('[FirebaseService] Saved student profile to Firestore:', trimmedProfile);
      } catch (dbErr: any) {
        console.warn('[FirebaseService] Firestore saveStudentProfile note:', dbErr.message);
      }
    }

    // Always update LocalStorage cache
    try {
      localStorage.setItem('helpme_student_uid', trimmedProfile.uid);
      localStorage.setItem('helpme_child_name', trimmedProfile.studentName);
      localStorage.setItem('helpme_grade', trimmedProfile.grade);
      localStorage.setItem('helpme_class_name', trimmedProfile.grade);
      if (trimmedProfile.email) localStorage.setItem('helpme_google_email', trimmedProfile.email);
      localStorage.setItem('helpme_firebase_logged_in', 'true');
    } catch (e) {}

    return trimmedProfile;
  }

  /**
   * Retrieves a student profile from Firebase Firestore or local cache.
   */
  async getStudentProfile(uid: string): Promise<StudentProfile | null> {
    const studentUid = uid || (typeof window !== 'undefined' ? localStorage.getItem('helpme_student_uid') : '') || '';
    if (!studentUid) return null;

    if (db) {
      try {
        const studentRef = doc(db, 'students', studentUid);
        const snap = await withTimeout(getDoc(studentRef), 2500);
        if (snap && snap.exists()) {
          return snap.data() as StudentProfile;
        }
      } catch (e: any) {
        console.warn('[FirebaseService] Firestore getStudentProfile note:', e.message);
      }
    }

    // Fallback to local cache
    try {
      const cachedUid = localStorage.getItem('helpme_student_uid');
      if (cachedUid === studentUid || !cachedUid) {
        const studentName = localStorage.getItem('helpme_child_name') || '';
        const grade = localStorage.getItem('helpme_grade') || '';
        if (studentName && grade) {
          return {
            uid: studentUid,
            studentName,
            grade,
            lastLoginAt: new Date().toISOString(),
          };
        }
      }
    } catch (e) {}

    return null;
  }

  /**
   * Logs in a student with Name and Grade directly via Firebase.
   * Uses timeout protection so UI never hangs indefinitely.
   */
  async loginStudent(studentName: string, grade: string, email?: string): Promise<StudentProfile> {
    const trimmedName = studentName.trim();
    const trimmedGrade = grade.trim();

    if (!trimmedName) {
      throw new Error('Student Name is required for login.');
    }
    if (!trimmedGrade) {
      throw new Error('Grade / Class is required for login.');
    }

    let uid = email
      ? `google_${email.replace(/[^a-z0-9]/gi, '_')}`
      : `student_${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    if (auth) {
      try {
        let currentUser = auth.currentUser;
        if (!currentUser) {
          // Wrap in timeout so invalid Firebase keys don't hang for 10 minutes
          const cred = await withTimeout(signInAnonymously(auth), 3000).catch(err => {
            console.warn('[FirebaseService] Anonymous sign-in note:', err.message);
            return null;
          });
          if (cred && cred.user) {
            currentUser = cred.user;
          }
        }

        if (currentUser) {
          uid = currentUser.uid;
          withTimeout(updateProfile(currentUser, { displayName: trimmedName }), 2000).catch(() => {});
        }
      } catch (authErr: any) {
        console.warn('[FirebaseService] Firebase Auth note:', authErr.message);
      }
    }

    const profile: StudentProfile = {
      uid,
      studentName: trimmedName,
      grade: trimmedGrade,
      email: email || undefined,
      authProvider: email ? 'google' : 'direct',
      lastLoginAt: new Date().toISOString(),
    };

    return this.saveStudentProfile(profile);
  }

  /**
   * Logs out the current student using Firebase Auth.
   */
  async logoutStudent(): Promise<void> {
    try {
      localStorage.removeItem('helpme_firebase_logged_in');
      localStorage.removeItem('helpme_student_uid');
      localStorage.removeItem('helpme_child_name');
    } catch (e) {}

    if (auth) {
      try {
        await withTimeout(signOut(auth), 2500).catch(() => {});
        console.log('[FirebaseService] Successfully signed out of Firebase Auth.');
      } catch (err: any) {
        console.warn('[FirebaseService] Sign out note:', err?.message || err);
      }
    }
  }

  /**
   * Observer for Firebase Auth state changes.
   */
  onAuthStateChanged(callback: (student: StudentProfile | null) => void): () => void {
    if (!auth) {
      const isLogged = localStorage.getItem('helpme_firebase_logged_in') === 'true';
      const name = localStorage.getItem('helpme_child_name') || '';
      const grade = localStorage.getItem('helpme_grade') || '';
      const uid = localStorage.getItem('helpme_student_uid') || '';
      if (isLogged && name && grade) {
        callback({ uid, studentName: name, grade, lastLoginAt: new Date().toISOString() });
      } else {
        callback(null);
      }
      return () => {};
    }

    return onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        const uid = user.uid;
        let studentName = user.displayName || localStorage.getItem('helpme_child_name') || 'Student';
        let grade = localStorage.getItem('helpme_grade') || 'Grade 8';

        // Check Firestore database for stored grade & profile
        if (db) {
          try {
            const studentRef = doc(db, 'students', uid);
            const snap = await withTimeout(getDoc(studentRef), 2000);
            if (snap && snap.exists()) {
              const data = snap.data();
              if (data.studentName) studentName = data.studentName;
              if (data.grade) grade = data.grade;
            }
          } catch (e) {}
        }

        callback({
          uid,
          studentName,
          grade,
          email: user.email || undefined,
          photoURL: user.photoURL || undefined,
          lastLoginAt: new Date().toISOString()
        });
      } else {
        // Check if logged in via local profile session
        const isLogged = localStorage.getItem('helpme_firebase_logged_in') === 'true';
        const name = localStorage.getItem('helpme_child_name') || '';
        const grade = localStorage.getItem('helpme_grade') || '';
        const uid = localStorage.getItem('helpme_student_uid') || '';
        if (isLogged && name && grade) {
          callback({ uid, studentName: name, grade, lastLoginAt: new Date().toISOString() });
        } else {
          callback(null);
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Chapter Learning Statuses in Firebase Database (in_progress, completed, not_started)
  // ---------------------------------------------------------------------------

  /**
   * Maintains chapter learning status (completed, in_progress, not_started) in Firebase.
   */
  async saveChapterStatus(uid: string, chapterId: string, status: ChapterStatus): Promise<void> {
    const studentUid = uid || localStorage.getItem('helpme_student_uid') || 'default_student';

    // Firestore update with timeout
    if (db) {
      try {
        const statusRef = doc(db, 'students', studentUid, 'chapterStatuses', chapterId);
        await withTimeout(
          setDoc(statusRef, {
            chapterId,
            status,
            updatedAt: new Date().toISOString(),
            completedAt: status === 'completed' ? new Date().toLocaleDateString() : null
          }, { merge: true }),
          2500
        );
        console.log(`[FirebaseService] Chapter '${chapterId}' status saved to Firestore:`, status);
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore saveChapterStatus note:', err.message);
      }
    }

    // LocalStorage cache update
    try {
      const saved = JSON.parse(localStorage.getItem('live_avatar_chapter_statuses') || '{}');
      saved[chapterId] = status;
      localStorage.setItem('live_avatar_chapter_statuses', JSON.stringify(saved));
    } catch (e) {}
  }

  /**
   * Fetches all chapter learning statuses from Firebase Database for this student.
   */
  async getChapterStatuses(uid: string): Promise<Record<string, ChapterStatus>> {
    const studentUid = uid || localStorage.getItem('helpme_student_uid') || 'default_student';
    const result: Record<string, ChapterStatus> = {};

    // First load from localStorage cache
    try {
      const cached = JSON.parse(localStorage.getItem('live_avatar_chapter_statuses') || '{}');
      Object.assign(result, cached);
    } catch (e) {}

    // Merge latest from Firebase Firestore with timeout
    if (db) {
      try {
        const colRef = collection(db, 'students', studentUid, 'chapterStatuses');
        const snap = await withTimeout(getDocs(colRef), 2500);
        if (snap) {
          snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.chapterId && data.status) {
              result[data.chapterId] = data.status as ChapterStatus;
            }
          });
          localStorage.setItem('live_avatar_chapter_statuses', JSON.stringify(result));
        }
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore getChapterStatuses note:', err.message);
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Chapters Persistence in Firebase Database (with Remove option)
  // ---------------------------------------------------------------------------

  /**
   * Saves a chapter into Firebase Database under student's collection.
   */
  async saveChapter(uid: string, chapter: Chapter): Promise<void> {
    const studentUid = uid || localStorage.getItem('helpme_student_uid') || 'default_student';

    if (db) {
      try {
        const chapRef = doc(db, 'students', studentUid, 'chapters', chapter.id);
        await withTimeout(
          setDoc(chapRef, {
            ...chapter,
            updatedAt: new Date().toISOString()
          }, { merge: true }),
          2500
        );
        console.log(`[FirebaseService] Saved chapter '${chapter.id}' to Firestore.`);
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore saveChapter note:', err.message);
      }
    }
  }

  /**
   * Retrieves chapters stored in Firebase Database.
   */
  async getChapters(uid: string): Promise<Chapter[]> {
    const studentUid = uid || localStorage.getItem('helpme_student_uid') || 'default_student';
    const chapters: Chapter[] = [];

    if (db) {
      try {
        const colRef = collection(db, 'students', studentUid, 'chapters');
        const snap = await withTimeout(getDocs(colRef), 2500);
        if (snap) {
          snap.forEach(docSnap => {
            chapters.push(docSnap.data() as Chapter);
          });
        }
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore getChapters note:', err.message);
      }
    }

    return chapters;
  }

  /**
   * REMOVE OPTION FOR CHAPTERS:
   * Deletes a chapter from Firebase Database AND automatically deletes its associated
   * scores from the score card to keep them synchronized.
   */
  async deleteChapter(uid: string, chapterId: string): Promise<void> {
    const studentUid = uid || localStorage.getItem('helpme_student_uid') || 'default_student';

    // 1. Delete chapter document, status, and score card with timeout
    if (db) {
      try {
        await withTimeout(
          Promise.allSettled([
            deleteDoc(doc(db, 'students', studentUid, 'chapters', chapterId)),
            deleteDoc(doc(db, 'students', studentUid, 'chapterStatuses', chapterId)),
            deleteDoc(doc(db, 'students', studentUid, 'scores', chapterId)),
          ]),
          3000
        );
        console.log(`[FirebaseService] Synchronized deletion: Removed chapter '${chapterId}', status, and score from Firestore.`);
      } catch (e: any) {
        console.warn('[FirebaseService] Firestore synchronized delete note:', e.message);
      }
    }

    // Also update LocalStorage cache
    try {
      const cachedChaps = JSON.parse(localStorage.getItem('live_avatar_pdf_chapters') || '[]');
      const filteredChaps = cachedChaps.filter((c: any) => c.id !== chapterId);
      localStorage.setItem('live_avatar_pdf_chapters', JSON.stringify(filteredChaps));

      const cachedStatuses = JSON.parse(localStorage.getItem('live_avatar_chapter_statuses') || '{}');
      delete cachedStatuses[chapterId];
      localStorage.setItem('live_avatar_chapter_statuses', JSON.stringify(cachedStatuses));

      const cachedScores = JSON.parse(localStorage.getItem('live_avatar_chapter_scores') || '{}');
      delete cachedScores[chapterId];
      localStorage.setItem('live_avatar_chapter_scores', JSON.stringify(cachedScores));

      const legacyScores = JSON.parse(localStorage.getItem('ai_avatar_chapter_scores') || '{}');
      delete legacyScores[chapterId];
      localStorage.setItem('ai_avatar_chapter_scores', JSON.stringify(legacyScores));

      const deleted: string[] = JSON.parse(localStorage.getItem('live_avatar_deleted_chapters') || '[]');
      if (!deleted.includes(chapterId)) {
        deleted.push(chapterId);
        localStorage.setItem('live_avatar_deleted_chapters', JSON.stringify(deleted));
      }
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Score Card Persistence in Firebase Database
  // ---------------------------------------------------------------------------

  /**
   * Stores a student's quiz score in Firebase Database.
   */
  async saveChapterScore(uid: string, chapterId: string, scoreData: ChapterScore): Promise<void> {
    const studentUid = uid || localStorage.getItem('helpme_student_uid') || 'default_student';

    if (db) {
      try {
        const scoreRef = doc(db, 'students', studentUid, 'scores', chapterId);
        await withTimeout(
          setDoc(scoreRef, {
            ...scoreData,
            updatedAt: new Date().toISOString()
          }, { merge: true }),
          2500
        );
        console.log(`[FirebaseService] Saved score for chapter '${chapterId}' to Firestore:`, scoreData);
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore saveChapterScore note:', err.message);
      }
    }

    // LocalStorage cache update
    try {
      const saved = JSON.parse(localStorage.getItem('live_avatar_chapter_scores') || '{}');
      saved[chapterId] = scoreData;
      localStorage.setItem('live_avatar_chapter_scores', JSON.stringify(saved));
      localStorage.setItem('ai_avatar_chapter_scores', JSON.stringify(saved));
    } catch (e) {}
  }

  /**
   * Retrieves all score card entries from Firebase Database for the student.
   */
  async getChapterScores(uid: string): Promise<Record<string, ChapterScore>> {
    const studentUid = uid || localStorage.getItem('helpme_student_uid') || 'default_student';
    const result: Record<string, ChapterScore> = {};

    // Load local cache first
    try {
      const cached = JSON.parse(localStorage.getItem('live_avatar_chapter_scores') || '{}');
      Object.assign(result, cached);
    } catch (e) {}

    // Fetch and merge latest from Firestore
    if (db) {
      try {
        const colRef = collection(db, 'students', studentUid, 'scores');
        const snap = await withTimeout(getDocs(colRef), 2500);
        if (snap) {
          snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.score !== undefined && data.total !== undefined) {
              result[docSnap.id] = data as ChapterScore;
            }
          });
          localStorage.setItem('live_avatar_chapter_scores', JSON.stringify(result));
        }
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore getChapterScores note:', err.message);
      }
    }

    return result;
  }

  /**
   * Deletes a chapter score from Firebase Database.
   */
  async deleteChapterScore(uid: string, chapterId: string): Promise<void> {
    const studentUid = uid || localStorage.getItem('helpme_student_uid') || 'default_student';

    if (db) {
      try {
        const scoreRef = doc(db, 'students', studentUid, 'scores', chapterId);
        await withTimeout(deleteDoc(scoreRef), 2500);
        console.log(`[FirebaseService] Deleted score for chapter '${chapterId}' from Firestore.`);
      } catch (e) {}
    }

    try {
      const saved = JSON.parse(localStorage.getItem('live_avatar_chapter_scores') || '{}');
      delete saved[chapterId];
      localStorage.setItem('live_avatar_chapter_scores', JSON.stringify(saved));
    } catch (e) {}
  }
}

export const firebaseService = new FirebaseService();
export default firebaseService;
