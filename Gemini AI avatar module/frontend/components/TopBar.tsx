import { Chapter, AvatarPersona, ChapterStatus } from '../types';
import { TUTOR_PERSONAS } from '../data/avatars';

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
  selectedChapter: Chapter;
  onOpenChapterModal: () => void;
  activePersona: AvatarPersona;
  onSelectPersona: (persona: AvatarPersona) => void;
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
  selectedChapter,
  onOpenChapterModal,
  activePersona,
  onSelectPersona,
  chapterStatus = 'in_progress',
}) => {
  return (
    <header className="absolute top-3 inset-x-3 z-40 flex items-center justify-between gap-2 pointer-events-none select-none">
      {/* Left Navigation: Panel & Avatar Toggles */}
      <div className="flex items-center gap-1.5 pointer-events-auto flex-shrink-0">
        <button
          onClick={() => setIsTranscriptionPanelOpen(!isTranscriptionPanelOpen)}
          className={`px-2.5 py-1.5 backdrop-blur-md rounded-xl border shadow-xs transition-all flex items-center gap-1.5 text-xs font-semibold ${
            isTranscriptionPanelOpen
              ? 'bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
              : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle Live Transcript & Dialogue"
        >
          <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="hidden sm:inline">Transcript</span>
        </button>

        <button
          onClick={() => setIsAvatarVisible(!isAvatarVisible)}
          className={`px-2.5 py-1.5 backdrop-blur-md rounded-xl border shadow-xs transition-all flex items-center gap-1.5 text-xs font-semibold ${
            isAvatarVisible
              ? 'bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
              : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={isAvatarVisible ? "Switch to Audio Only" : "Show Real AI Avatar"}
        >
          <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="hidden sm:inline">Avatar</span>
        </button>

        <button
          onClick={() => setShowDebug(!showDebug)}
          className={`p-2 backdrop-blur-md rounded-xl border shadow-xs transition-colors ${
            showDebug
              ? 'bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
              : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle Diagnostics / Playback Stats"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      </div>

      {/* Center Navigation: Active Chapter & Persona Quick Switcher */}
      <div className="flex items-center gap-2 pointer-events-auto min-w-0 justify-center">
        <button
          onClick={onOpenChapterModal}
          className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-md border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs px-3 py-1.5 rounded-full text-xs font-medium text-slate-800 dark:text-slate-200 transition group min-w-0 max-w-[200px] sm:max-w-[260px] md:max-w-[320px] lg:max-w-[380px]"
          title={`Active Chapter: ${selectedChapter.title} (Click to change)`}
        >
          {chapterStatus === 'completed' ? (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <svg className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              <span>Done</span>
            </span>
          ) : (
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/80 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span>In Progress</span>
            </span>
          )}
          <span className="truncate font-semibold">{selectedChapter.title}</span>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600 transition flex-shrink-0">
            Change
          </span>
        </button>

        {/* Quick Avatar Persona Selector (shown on wide viewports where space allows) */}
        <div className="hidden 2xl:flex items-center gap-1 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-1.5 py-1 rounded-full shadow-xs flex-shrink-0">
          {TUTOR_PERSONAS.map((p) => {
            const isSelected = p.id === activePersona.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPersona(p)}
                className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all transform hover:scale-110 ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-400/40 scale-105'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                title={`Switch tutor to ${p.name} (${p.title})`}
              >
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Navigation: Study Board Toggle */}
      <div className="flex items-center gap-1.5 pointer-events-auto flex-shrink-0">
        <button
          onClick={() => setIsStudyBoardOpen(!isStudyBoardOpen)}
          className={`px-2.5 py-1.5 backdrop-blur-md rounded-xl border shadow-xs transition-all flex items-center gap-1.5 text-xs font-semibold ${
            isStudyBoardOpen
              ? 'bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
              : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle Study Board & Concepts"
        >
          <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="hidden sm:inline">Study Board</span>
        </button>
      </div>
    </header>
  );
};
