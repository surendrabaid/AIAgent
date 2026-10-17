import React, { useState } from 'react';
import { firebaseService, GoogleAuthResult } from '../services/firebase';

interface Props {
  onEnterClassroom: (studentName: string, className: string) => void;
  onBackToSelection?: () => void;
  initialStudentName?: string;
  initialClassName?: string;
}

export const StudentLoginView: React.FC<Props> = ({
  onEnterClassroom,
  onBackToSelection,
  initialStudentName = '',
  initialClassName = '',
}) => {
  // View mode: 'initial' for standard login / Google sign-in, 'profile_completion' if Google authenticated but name/grade needed
  const [viewMode, setViewMode] = useState<'initial' | 'profile_completion'>('initial');

  // Google user context when signed in via Gmail
  const [googleUser, setGoogleUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  } | null>(null);

  const [studentName, setStudentName] = useState(() => {
    return (
      initialStudentName ||
      (typeof window !== 'undefined' ? localStorage.getItem('helpme_child_name') : '') ||
      'Prabha'
    );
  });

  const [studentClass, setStudentClass] = useState(() => {
    return (
      initialClassName ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('helpme_grade') || localStorage.getItem('helpme_class_name')
        : '') ||
      'Grade 8'
    );
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleClasses = ['Grade 3', 'Grade 5', 'Grade 8', 'Grade 10', 'Class 8 • Science'];

  /**
   * Handle Google / Gmail Authentication:
   * 1. Signs in via Firebase Google Auth (with timeout protection).
   * 2. If student name or grade is not given, switches to Profile Completion view.
   * 3. If student name and grade already exist, enters classroom immediately.
   */
  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      const result: GoogleAuthResult = await firebaseService.loginWithGoogle();
      setGoogleUser({
        uid: result.uid,
        email: result.email,
        displayName: result.displayName,
        photoURL: result.photoURL
      });

      // If displayName is available from Google, pre-fill student name
      if (result.displayName && (!studentName || studentName === 'Vihana')) {
        setStudentName(result.displayName);
      }

      // Check if student already has name and grade in Firestore/cache
      if (!result.needsProfileCompletion && result.existingProfile) {
        // Name & grade already given -> Enter classroom directly!
        const resolvedName = result.existingProfile.studentName || result.displayName;
        const resolvedGrade = result.existingProfile.grade;
        onEnterClassroom(resolvedName, resolvedGrade);
      } else {
        // Student needs to add or confirm name & grade
        if (result.displayName) {
          setStudentName(result.displayName);
        }
        if (result.existingProfile?.grade) {
          setStudentClass(result.existingProfile.grade);
        }
        setViewMode('profile_completion');
      }
    } catch (err: any) {
      console.warn('Google login note:', err);
      setError(err?.message || 'Could not complete Google sign-in. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  /**
   * Handle saving the completed profile (Name and Grade) after Google Sign-In
   */
  const handleProfileCompletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = studentName.trim();
    const trimmedClass = studentClass.trim();

    if (!trimmedName) {
      setError('Please provide your student name.');
      return;
    }
    if (!trimmedClass) {
      setError('Please select or enter your grade / class.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const uid = googleUser?.uid || localStorage.getItem('helpme_student_uid') || `google_${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await firebaseService.saveStudentProfile({
        uid,
        studentName: trimmedName,
        grade: trimmedClass,
        email: googleUser?.email,
        photoURL: googleUser?.photoURL,
        authProvider: 'google',
        lastLoginAt: new Date().toISOString()
      });

      onEnterClassroom(trimmedName, trimmedClass);
    } catch (err: any) {
      console.warn('Profile save note:', err);
      // Proceed even on network hiccup
      onEnterClassroom(trimmedName, trimmedClass);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle direct login with Name and Grade
   */
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = studentName.trim();
    const trimmedClass = studentClass.trim();

    if (!trimmedName) {
      setError('Please provide your student name.');
      return;
    }
    if (!trimmedClass) {
      setError('Please provide your grade / class.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await firebaseService.loginStudent(trimmedName, trimmedClass);
      onEnterClassroom(trimmedName, trimmedClass);
    } catch (err: any) {
      console.warn('Firebase login attempt note:', err);
      // Safe fallback: proceed to classroom with entered name & grade
      onEnterClassroom(trimmedName, trimmedClass);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 dark:bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login / Profile Card */}
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10 relative z-10 transition-all">
        
        {/* =================================================================== */}
        {/* VIEW 1: INITIAL LOGIN VIEW (GMAIL / GOOGLE OR DIRECT CREDENTIALS) */}
        {/* =================================================================== */}
        {viewMode === 'initial' && (
          <>
            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 mb-2">
                AI Live Avatar Classroom
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Student Login
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                Sign in with your Google account or enter your name and grade to enter your 1-on-1 classroom.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* 1. Gmail / Google Authentication Button */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-100 font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isGoogleLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-indigo-600 dark:text-indigo-400">Authenticating with Google...</span>
                  </>
                ) : (
                  <>
                    {/* Google Multicolor SVG Icon */}
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google / Gmail</span>
                  </>
                )}
              </button>

              {/* Or Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  or enter directly
                </span>
                <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
              </div>

              {/* Direct Name & Grade Form */}
              <form onSubmit={handleDirectSubmit} className="space-y-4">
                {/* Student Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Student Name</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Prabha"
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                  />
                </div>

                {/* Grade / Class */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Grade / Class</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="e.g. Grade 8"
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                  />
                  {/* Quick grade pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sampleClasses.map((cls) => (
                      <button
                        type="button"
                        key={cls}
                        onClick={() => setStudentClass(cls)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-medium cursor-pointer ${
                          studentClass === cls
                            ? 'bg-indigo-100 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Action: Enter Classroom */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || isGoogleLoading}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Entering Classroom...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter Classroom</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* =================================================================== */}
        {/* VIEW 2: PROFILE COMPLETION (AFTER GOOGLE AUTH IF NAME/GRADE NEEDED)*/}
        {/* =================================================================== */}
        {viewMode === 'profile_completion' && (
          <form onSubmit={handleProfileCompletionSubmit} className="space-y-4">
            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 mb-2">
                Step 2 • Classroom Profile
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Complete Your Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                Please confirm your name and grade/class to enter the classroom.
              </p>
            </div>

            {/* Authenticated Google Account Badge */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {studentName?.charAt(0).toUpperCase() || 'G'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {googleUser?.displayName || studentName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {googleUser?.email || 'Google Account'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                Verified
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Student Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Student Name</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Prabha"
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
              />
            </div>

            {/* Grade / Class */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Grade / Class</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                placeholder="e.g. Grade 8"
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
              />
              {/* Quick grade pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sampleClasses.map((cls) => (
                  <button
                    type="button"
                    key={cls}
                    onClick={() => setStudentClass(cls)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-medium cursor-pointer ${
                      studentClass === cls
                        ? 'bg-indigo-100 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm & Enter Classroom */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-indigo-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Enter Classroom</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Switch Account */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setViewMode('initial')}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline font-semibold transition cursor-pointer"
              >
                ← Use a different Google account
              </button>
            </div>
          </form>
        )}

        {/* Footer Badges */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>Secured with Firebase Auth & Realtime Cloud Sync</span>
          </div>

          {/* Secondary Action: Back to Mode Selection */}
          {onBackToSelection && viewMode === 'initial' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onBackToSelection}
                className="w-full py-2 px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Avatar Selection</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StudentLoginView;
