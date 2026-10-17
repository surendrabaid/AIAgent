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
  lastLoginAt: string;
  createdAt?: string;
}

// Firebase configuration using project environment or Google Cloud project defaults
const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || "AIzaSyDevLiveAvatarKey9691fa52",
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || "project-9691fa52-ebb2-43ba-9de.firebaseapp.com",
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || "project-9691fa52-ebb2-43ba-9de",
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || "project-9691fa52-ebb2-43ba-9de.appspot.com",
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || "32555940559",
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || "1:32555940559:web:live-avatar-classroom",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('[FirebaseService] Firebase initialized successfully with project:', firebaseConfig.projectId);
} catch (err: any) {
  console.warn('[FirebaseService] Firebase initialization warning:', err?.message || err);
}

class FirebaseService {
  public auth = auth;
  public db = db;

  /**
   * Logs in a student with required Name and Grade via Firebase Auth.
   * Creates or updates the student's profile document in Firestore database.
   */
  async loginStudent(studentName: string, grade: string): Promise<StudentProfile> {
    const trimmedName = studentName.trim();
    const trimmedGrade = grade.trim();

    if (!trimmedName) {
      throw new Error('Student Name is required for login.');
    }
    if (!trimmedGrade) {
      throw new Error('Grade / Class is required for login.');
    }

    let uid = `student_${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    if (auth) {
      try {
        let currentUser = auth.currentUser;
        if (!currentUser) {
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
        }

        if (currentUser) {
          uid = currentUser.uid;
          await updateProfile(currentUser, { displayName: trimmedName });
        }
      } catch (authErr: any) {
        console.warn('[FirebaseService] Firebase Anonymous Auth fallback:', authErr.message);
      }
    }

    const profile: StudentProfile = {
      uid,
      studentName: trimmedName,
      grade: trimmedGrade,
      lastLoginAt: new Date().toISOString(),
    };

    // Save student profile to Firebase Firestore database
    if (db) {
      try {
        const studentRef = doc(db, 'students', uid);
        await setDoc(studentRef, profile, { merge: true });
        console.log('[FirebaseService] Saved student profile to Firestore:', profile);
      } catch (dbErr: any) {
        console.warn('[FirebaseService] Firestore save student warning:', dbErr.message);
      }
    }

    // LocalStorage caching for instant offline response & backup
    try {
      localStorage.setItem('helpme_student_uid', uid);
      localStorage.setItem('helpme_child_name', trimmedName);
      localStorage.setItem('helpme_grade', trimmedGrade);
      localStorage.setItem('helpme_class_name', trimmedGrade);
      localStorage.setItem('helpme_firebase_logged_in', 'true');
    } catch (e) {}

    return profile;
  }

  /**
   * Logs out the current student using Firebase Auth.
   */
  async logoutStudent(): Promise<void> {
    if (auth) {
      try {
        await signOut(auth);
        console.log('[FirebaseService] Successfully signed out of Firebase Auth.');
      } catch (err: any) {
        console.warn('[FirebaseService] Sign out warning:', err.message);
      }
    }

    try {
      localStorage.removeItem('helpme_firebase_logged_in');
      localStorage.removeItem('helpme_student_uid');
    } catch (e) {}
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
            const snap = await getDoc(studentRef);
            if (snap.exists()) {
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
          lastLoginAt: new Date().toISOString()
        });
      } else {
        callback(null);
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

    // Firestore update
    if (db) {
      try {
        const statusRef = doc(db, 'students', studentUid, 'chapterStatuses', chapterId);
        await setDoc(statusRef, {
          chapterId,
          status,
          updatedAt: new Date().toISOString(),
          completedAt: status === 'completed' ? new Date().toLocaleDateString() : null
        }, { merge: true });
        console.log(`[FirebaseService] Chapter '${chapterId}' status saved to Firestore:`, status);
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore saveChapterStatus warning:', err.message);
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

    // Merge latest from Firebase Firestore
    if (db) {
      try {
        const colRef = collection(db, 'students', studentUid, 'chapterStatuses');
        const snap = await getDocs(colRef);
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.chapterId && data.status) {
            result[data.chapterId] = data.status as ChapterStatus;
          }
        });
        localStorage.setItem('live_avatar_chapter_statuses', JSON.stringify(result));
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore getChapterStatuses warning:', err.message);
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
        await setDoc(chapRef, {
          ...chapter,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`[FirebaseService] Saved chapter '${chapter.id}' to Firestore.`);
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore saveChapter warning:', err.message);
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
        const snap = await getDocs(colRef);
        snap.forEach(docSnap => {
          chapters.push(docSnap.data() as Chapter);
        });
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore getChapters warning:', err.message);
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

    // 1. Delete chapter document from Firestore
    if (db) {
      try {
        const chapRef = doc(db, 'students', studentUid, 'chapters', chapterId);
        await deleteDoc(chapRef);
      } catch (e) {}

      // 2. Delete chapter status from Firestore
      try {
        const statusRef = doc(db, 'students', studentUid, 'chapterStatuses', chapterId);
        await deleteDoc(statusRef);
      } catch (e) {}

      // 3. SYNCHRONIZE SCORE CARD: Delete chapter score from Firebase Database
      try {
        const scoreRef = doc(db, 'students', studentUid, 'scores', chapterId);
        await deleteDoc(scoreRef);
        console.log(`[FirebaseService] Synchronized deletion: Removed score for chapter '${chapterId}' from Firestore.`);
      } catch (e) {}
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
        await setDoc(scoreRef, {
          ...scoreData,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`[FirebaseService] Saved score for chapter '${chapterId}' to Firestore:`, scoreData);
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore saveChapterScore warning:', err.message);
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
        const snap = await getDocs(colRef);
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.score !== undefined && data.total !== undefined) {
            result[docSnap.id] = data as ChapterScore;
          }
        });
        localStorage.setItem('live_avatar_chapter_scores', JSON.stringify(result));
      } catch (err: any) {
        console.warn('[FirebaseService] Firestore getChapterScores warning:', err.message);
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
        await deleteDoc(scoreRef);
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
