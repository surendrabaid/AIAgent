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
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback direct Gmail entry if browser popup was blocked
  const [showManualGmailPrompt, setShowManualGmailPrompt] = useState(false);
  const [manualEmail, setManualEmail] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('helpme_google_email') : '') || 'prabhukaran1993@gmail.com';
  });

  /**
   * Only Gmail Login:
   * 1. Signs in via Firebase Google Auth.
   * 2. Automatically updates Student Name in student profile using Google display name.
   * 3. Enters the classroom immediately with the updated profile.
   */
  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result: GoogleAuthResult = await firebaseService.loginWithGoogle();
      
      // Student name is the Gmail account name (e.g. prabhukaran1993)
      const gmailAccountName = result.displayName || result.email?.split('@')[0] || result.email || 'prabhukaran1993';
      const resolvedGrade = result.existingProfile?.grade || (typeof window !== 'undefined' ? (localStorage.getItem('helpme_grade') || localStorage.getItem('helpme_class_name')) : '') || 'Grade 5';

      console.log('[StudentLogin] Gmail Auth succeeded. Student name is Gmail account name:', gmailAccountName);
      
      // Update student name and grade, and enter classroom
      onEnterClassroom(gmailAccountName, resolvedGrade);
    } catch (err: any) {
      console.warn('[StudentLogin] Google sign-in note:', err);
      // If popup was blocked or failed, give seamless 1-click fallback
      setShowManualGmailPrompt(true);
      setError(err?.message || 'Popup closed or blocked. You can confirm your Gmail below.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fallback for manual Gmail confirmation if popup was blocked
   */
  const handleManualGmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualEmail.trim();
    if (!trimmed) {
      setError('Please provide a valid Gmail address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Student name is the Gmail account username (e.g. prabhukaran1993 from prabhukaran1993@gmail.com)
      const gmailAccountName = trimmed.split('@')[0] || trimmed;
      const uid = `google_${trimmed.replace(/[^a-z0-9]/gi, '_')}`;
      const grade = (typeof window !== 'undefined' ? (localStorage.getItem('helpme_grade') || localStorage.getItem('helpme_class_name')) : '') || 'Grade 5';

      await firebaseService.saveStudentProfile({
        uid,
        studentName: gmailAccountName,
        grade,
        email: trimmed,
        authProvider: 'google',
        lastLoginAt: new Date().toISOString()
      });

      console.log('[StudentLogin] Manual Gmail confirmed. Student name set to Gmail account name:', gmailAccountName);
      onEnterClassroom(gmailAccountName, grade);
    } catch (e: any) {
      const gmailAccountName = trimmed.split('@')[0] || trimmed;
      onEnterClassroom(gmailAccountName, 'Grade 5');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 dark:bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Single-Action Google Login Card */}
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10 relative z-10 transition-all">
        
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
            Sign in with your Google account. Your student profile name will automatically update upon authentication.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* PRIMARY ACTION: Sign in with Google / Gmail */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-4 px-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-100 font-extrabold text-sm sm:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-indigo-600 dark:text-indigo-400">Signing in with Google...</span>
              </>
            ) : (
              <>
                {/* Official Google Multicolor G Logo */}
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
                <span>Sign in with Google / Gmail</span>
              </>
            )}
          </button>

          {/* Quick confirmation form if popup blocked */}
          {showManualGmailPrompt && (
            <form onSubmit={handleManualGmailSubmit} className="pt-2 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Confirm Gmail Address</span>
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                Confirm Gmail & Enter Classroom ➔
              </button>
            </form>
          )}

          {/* Helper hint */}
          <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
            Clicking sign in will authenticate your Google account and immediately set up your student profile.
          </p>
        </div>

        {/* Footer Badges */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>Secured with Firebase Auth & Realtime Cloud Sync</span>
          </div>

          {/* Secondary Action: Back to Mode Selection */}
          {onBackToSelection && (
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
