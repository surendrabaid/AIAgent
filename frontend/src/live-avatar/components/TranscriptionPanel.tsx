import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, AvatarPersona } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history?: ChatMessage[];
  chatHistory?: ChatMessage[];
  liveInput?: string;
  liveOutput?: string;
  onSendMessage?: (text: string) => void;
  isConnected?: boolean;
  isAvatarVisible?: boolean;
  activePersona?: AvatarPersona;
  studentName?: string;
  className?: string;
  onLogout?: () => void;
}

export const TranscriptionPanel: React.FC<Props> = ({ 
  isOpen,
  onClose,
  history,
  chatHistory,
  liveInput = '',
  liveOutput = '',
  onSendMessage,
  isConnected = false,
  isAvatarVisible = true,
  activePersona,
  studentName,
  className: customClassName,
  onLogout,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  const messageList = history || chatHistory || [];
  const tutorName = activePersona?.name || 'Tutor Jay';

  // Resolve Student Name & Class Name from props or localStorage fallback
  const resolvedStudentName = (() => {
    if (studentName && studentName !== 'Prabha' && studentName !== 'Vihana') return studentName;
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('helpme_google_email');
      const savedName = localStorage.getItem('helpme_child_name');
      if (email && (!savedName || savedName === 'Prabha' || savedName === 'Vihana')) {
        return email.split('@')[0];
      }
      if (savedName && savedName !== 'Prabha' && savedName !== 'Vihana') return savedName;
      if (email) return email.split('@')[0];
    }
    return studentName || 'prabhukaran1993';
  })();
  const resolvedClassName = customClassName || (typeof window !== 'undefined' ? (localStorage.getItem('helpme_grade') || localStorage.getItem('helpme_class_name')) : null) || 'Grade 5';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messageList, liveInput, liveOutput, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && isConnected && onSendMessage) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const widthClass = isOpen
    ? (isAvatarVisible ? 'w-80 md:w-96 opacity-100' : 'w-full md:flex-1 opacity-100')
    : 'w-0 opacity-0 border-transparent pointer-events-none';

  return (
    <div
      className={`h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden shadow-sm ${widthClass}`}
    >
      <div className={`h-full flex flex-col min-w-[300px] ${isAvatarVisible ? 'w-80 md:w-96' : 'w-full'}`}>
        {/* Top 20%: Student Details & Log Out Button */}
        <div className="h-[20%] min-h-[96px] max-h-[130px] p-3 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-col justify-center gap-2 shrink-0 select-none">
          {/* Top Row: Log Out Button */}
          <div className="flex items-center justify-end w-full">
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/90 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 text-xs font-bold transition flex items-center gap-1 shadow-xs group pointer-events-auto cursor-pointer"
                title="Log out and return to selection"
              >
                <svg className="w-3.5 h-3.5 transition group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Log Out</span>
              </button>
            )}
          </div>

          {/* Student Profile Card: Name */}
          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm shrink-0">
              {resolvedStudentName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                Student Profile
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
                {resolvedStudentName}
              </h3>
            </div>
          </div>
        </div>

        {/* Bottom 80%: Live Transcribe Window */}
        <div className="h-[80%] flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </span>
              <div>
                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Lesson Dialogue
                </h2>
                <p className="text-[10px] text-slate-500">Live Voice Transcription</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Hide Transcript Panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3" ref={scrollRef}>
            {messageList.length === 0 && !liveInput && !liveOutput && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs text-center px-4 gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Ready to speak with {tutorName}</p>
                  <p className="text-slate-400 mt-0.5 text-[11px]">Start the lesson or ask any question. Spoken words will transcribe in real time.</p>
                </div>
              </div>
            )}

            {messageList.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-semibold text-slate-400 mb-0.5 px-1">
                  {msg.role === 'user' ? (resolvedStudentName || 'You') : tutorName}
                </span>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-xs shadow-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200 dark:border-slate-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {liveInput && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-semibold text-indigo-500 mb-0.5 px-1">{resolvedStudentName || 'You'} (Speaking...)</span>
                <div className="max-w-[88%] rounded-2xl px-3.5 py-2 text-xs shadow-xs leading-relaxed bg-indigo-600/80 text-white rounded-br-xs animate-pulse">
                  {liveInput}
                </div>
              </div>
            )}

            {liveOutput && (
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-semibold text-indigo-500 mb-0.5 px-1">{tutorName} (Explaining...)</span>
                <div className="max-w-[88%] rounded-2xl px-3.5 py-2 text-xs shadow-xs leading-relaxed bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-indigo-300 dark:border-indigo-700 animate-pulse">
                  {liveOutput}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isConnected ? `Type a question for ${tutorName}...` : "Connect to start conversation..."}
                disabled={!isConnected}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              />
              <button
                type="submit"
                disabled={!isConnected || !inputText.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl transition shadow-xs flex items-center justify-center shrink-0"
                title="Send to Tutor"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
                  <path fill="none" d="M0 0h24v24H0z"></path>
                  <path d="M2 3v18l20-9zm2 11 9-2-9-2V6.09L17.13 12 4 17.91z"></path>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
