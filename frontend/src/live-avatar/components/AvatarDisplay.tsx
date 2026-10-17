import React, { useState } from 'react';
import { liveServiceConfiguration } from '../resources/live_service_configuration';
import { Chapter, AvatarPersona, AvatarMood } from '../types';
import { TUTOR_PERSONAS } from '../data/avatars';
import { LiveAvatarCanvas } from './LiveAvatarCanvas';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hasVideo: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  isAvatarVisible: boolean;
  agentTalking: boolean;
  selectedChapter: Chapter;
  activePersona: AvatarPersona;
  onSelectPersona: (persona: AvatarPersona) => void;
  avatarMood: AvatarMood;
  onSendPrompt: (promptText: string) => void;
  hasChapterSelected?: boolean;
}

export const AvatarDisplay: React.FC<Props> = ({
  videoRef,
  hasVideo,
  isConnected,
  isLoading,
  error,
  isAvatarVisible,
  agentTalking,
  selectedChapter,
  activePersona,
  onSelectPersona,
  avatarMood,
  onSendPrompt,
  hasChapterSelected = true,
}) => {
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  return (
    <div
      className={`relative transition-all duration-500 flex-shrink-0 flex items-center justify-center ${
        isAvatarVisible
          ? `rounded-3xl overflow-hidden bg-slate-900 ${
              isConnected && agentTalking
                ? 'shadow-[0_0_55px_rgba(99,102,241,0.4)] ring-2 ring-indigo-500/60'
                : isConnected
                ? 'shadow-[0_0_40px_rgba(34,197,94,0.25)]'
                : 'shadow-2xl border border-slate-800'
            }`
          : 'flex flex-col items-center justify-center w-full max-w-md aspect-square'
      }`}
      style={
        isAvatarVisible
          ? {
              width: '100%',
              maxWidth: `min(90vw, 580px, 64vh * ${aspectRatio})`,
              aspectRatio: aspectRatio,
            }
          : {}
      }
    >
      {isAvatarVisible ? (
        <>
          {/* Real AI Avatar Dynamic Canvas */}
          <LiveAvatarCanvas
            persona={activePersona}
            mood={avatarMood}
            agentTalking={agentTalking}
            isConnected={isConnected}
            videoRef={videoRef}
            hasVideo={hasVideo}
          />

          {/* Top Left: Tutor Jay Identity Badge (Fixed Default) */}
          <div className="absolute top-4 left-4 z-30">
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-white shadow-lg pointer-events-none select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold tracking-wide">
                {activePersona.name}
              </span>
            </div>
          </div>

          {/* Top Right: Speaking / Emotional State Indicator */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {avatarMood === 'empathetic' && (
              <div className="flex items-center gap-1.5 bg-rose-500/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                <span>💡 Helpful Insight</span>
              </div>
            )}
            {agentTalking && (
              <div className="flex items-center gap-2 bg-indigo-600/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold shadow-md animate-pulse">
                <span className="flex space-x-1">
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce delay-75" />
                  <span className="w-1 h-4 bg-white rounded-full animate-bounce delay-150" />
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce delay-300" />
                </span>
                <span>Speaking...</span>
              </div>
            )}
          </div>

          {/* Bottom Left: Voice Accent & Quote Badge */}
          <div className="absolute bottom-5 left-4 hidden sm:flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-slate-300 border border-white/10 z-20">
            <span className="text-indigo-400 font-semibold">Voice:</span>
            <span className="capitalize">{activePersona.voiceName}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 italic max-w-[200px] truncate">"{activePersona.accentQuote}"</span>
          </div>
        </>
      ) : (
        <div className="relative flex items-center justify-center w-36 h-36 rounded-full bg-white dark:bg-slate-800 shadow-xl">
          <svg className={`w-14 h-14 transition-colors duration-300 ${isConnected ? 'text-indigo-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      )}

      {/* Center Bottom Status Pill */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-slate-900/85 backdrop-blur-md px-4 py-1.5 rounded-full shadow-xl border border-white/15 z-30 pointer-events-none">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            error
              ? 'bg-red-500'
              : isLoading
              ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]'
              : isConnected
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              : 'bg-slate-400'
          }`}
        />
        <span className="text-xs font-semibold text-white whitespace-nowrap">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : isLoading ? (
            `Connecting to ${activePersona.name}...`
          ) : isConnected ? (
            agentTalking ? `${activePersona.name} is speaking` : 'Listening to you...'
          ) : !hasChapterSelected ? (
            `Add a chapter to start learning with ${activePersona.name}`
          ) : (
            `Ready to learn with ${activePersona.name}`
          )}
        </span>
      </div>
    </div>
  );
};
