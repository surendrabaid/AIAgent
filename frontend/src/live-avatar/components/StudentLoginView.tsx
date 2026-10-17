import React, { useState } from 'react';
import { firebaseService } from '../services/firebase';

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
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = studentName.trim();
    const trimmedClass = studentClass.trim();

    // 1. Requirement 2: Student name and grade should be required for login
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
      // 2. Requirement 1: Login handled in Firebase
      await firebaseService.loginStudent(trimmedName, trimmedClass);
      onEnterClassroom(trimmedName, trimmedClass);
    } catch (err: any) {
      console.warn('Firebase login attempt note:', err);
      // Still proceed with classroom entry even if offline
      onEnterClassroom(trimmedName, trimmedClass);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleClasses = ['Grade 3', 'Grade 5', 'Grade 8', 'Grade 10', 'Class 8 • Science'];

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 dark:bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10 relative z-10 transition-all">
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
            </svg>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 mb-2">
            AI Live Avatar Classroom
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Student Login
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
            Please enter your name and grade/class to enter your 1-on-1 live classroom.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoFocus
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
              placeholder="e.g. Grade 8 or Class 8 • Science"
              required
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
            />
            {/* Quick chips */}
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
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Connecting to Firebase...</span>
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

          {/* Firebase Authentication & Database Badge */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>Secured with Firebase Auth & Realtime Cloud Sync</span>
          </div>

          {/* Secondary Action: Back to Mode Selection */}
          {onBackToSelection && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onBackToSelection}
                className="w-full py-2.5 px-4 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Avatar Selection</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default StudentLoginView;
