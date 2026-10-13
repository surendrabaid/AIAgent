import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: ChatMessage[];
  liveInput: string;
  liveOutput: string;
  onSendMessage: (text: string) => void;
  isConnected: boolean;
  isAvatarVisible: boolean;
}

export const TranscriptionPanel: React.FC<Props> = ({ 
  isOpen,
  onClose,
  history,
  liveInput,
  liveOutput,
  onSendMessage,
  isConnected,
  isAvatarVisible
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, liveInput, liveOutput, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && isConnected) {
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
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Lesson Dialogue
              </h2>
              <p className="text-[11px] text-slate-500">Live Voice Transcription</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Hide Transcript"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5" ref={scrollRef}>
          {history.length === 0 && !liveInput && !liveOutput && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs text-center px-4 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Ready to speak with Tutor Jay</p>
                <p className="text-slate-400 mt-1">Start the lesson or ask any question. Spoken words will transcribe in real time.</p>
              </div>
            </div>
          )}

          {history.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] font-semibold text-slate-400 mb-1 px-1">
                {msg.role === 'user' ? 'You' : 'Tutor Jay'}
              </span>
              <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
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
              <span className="text-[10px] font-semibold text-indigo-500 mb-1 px-1">You (Speaking...)</span>
              <div className="max-w-[88%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed bg-indigo-600/80 text-white rounded-br-xs animate-pulse">
                {liveInput}
              </div>
            </div>
          )}

          {liveOutput && (
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-semibold text-indigo-500 mb-1 px-1">Tutor Jay (Explaining...)</span>
              <div className="max-w-[88%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-indigo-300 dark:border-indigo-700 animate-pulse">
                {liveOutput}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isConnected ? "Type a question for Tutor Jay..." : "Connect to start conversation..."}
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
  );
};
