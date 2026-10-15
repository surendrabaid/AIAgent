import React from 'react';
import { Chapter, AvatarPersona, ChapterStatus } from '../types';

interface Props {
  isTranscriptionPanelOpen: boolean;
  setIsTranscriptionPanelOpen: (open: boolean) => void;
  isStudyBoardOpen: boolean;
  setIsStudyBoardOpen: (open: boolean) => void;
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
  theme?: string;
  setTheme?: (theme: any) => void;
  isAvatarVisible: boolean;
  setIsAvatarVisible: (visible: boolean) => void;
  selectedChapter?: Chapter;
  onOpenChapterModal?: () => void;
  activePersona?: AvatarPersona;
  onSelectPersona?: (persona: AvatarPersona) => void;
  onBackToSelection?: () => void;
  chapterStatus?: ChapterStatus;
}

export const TopBar: React.FC<Props> = ({
  isTranscriptionPanelOpen,
  setIsTranscriptionPanelOpen,
  isStudyBoardOpen,
  setIsStudyBoardOpen,
  showDebug,
  setShowDebug,
  isAvatarVisible,
  setIsAvatarVisible,
}) => {
  return (
    <header className="w-full z-40 px-3 pt-3 pb-1 pointer-events-none select-none flex-shrink-0">
      <div className="flex items-center justify-between w-full gap-2">
        {/* Left Navigation: Panel & Avatar Toggles */}
        <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
          <button
            onClick={() => setIsTranscriptionPanelOpen(!isTranscriptionPanelOpen)}
            className={`px-2.5 py-1.5 backdrop-blur-md rounded-xl border shadow-xs transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
              isTranscriptionPanelOpen
                ? 'bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Live Transcript & Student Details"
          >
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="hidden sm:inline">Transcript</span>
          </button>

          <button
            onClick={() => setIsAvatarVisible(!isAvatarVisible)}
            className={`px-2.5 py-1.5 backdrop-blur-md rounded-xl border shadow-xs transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
              isAvatarVisible
                ? 'bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isAvatarVisible ? "Switch to Audio Only" : "Show Real AI Avatar"}
          >
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:inline">Avatar</span>
          </button>

          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-2 backdrop-blur-md rounded-xl border shadow-xs transition-colors shrink-0 ${
              showDebug
                ? 'bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Diagnostics / Playback Stats"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
        </div>

        {/* Right Navigation: Study Board Toggle */}
        <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
          <button
            onClick={() => setIsStudyBoardOpen(!isStudyBoardOpen)}
            className={`px-2.5 py-1.5 backdrop-blur-md rounded-xl border shadow-xs transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
              isStudyBoardOpen
                ? 'bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Study Board & Concepts"
          >
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="hidden sm:inline">Study Board</span>
          </button>
        </div>
      </div>
    </header>
  );
};
