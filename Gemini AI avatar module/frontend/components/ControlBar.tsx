import React from 'react';
import { VideoMode } from '../types';

interface Props {
  isConnected: boolean;
  isConnecting: boolean;
  isLoading: boolean;
  connect: () => void;
  disconnect: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  audioDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  handleDeviceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  audioOutputDevices: MediaDeviceInfo[];
  selectedAudioOutputId: string;
  handleAudioOutputChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  videoMode: VideoMode;
  setVideoMode: (mode: VideoMode) => void;
  videoDevices: MediaDeviceInfo[];
  selectedVideoDeviceId: string;
  setSelectedVideoDeviceId: (id: string) => void;
  hasChapterSelected?: boolean;
  onOpenChapterModal?: () => void;
  tutorName?: string;
}

export const ControlBar: React.FC<Props> = ({
  isConnected, isConnecting, isLoading, connect, disconnect,
  isMuted, toggleMute,
  audioDevices, selectedDeviceId, handleDeviceChange,
  audioOutputDevices, selectedAudioOutputId, handleAudioOutputChange,
  videoMode, setVideoMode,
  videoDevices, selectedVideoDeviceId, setSelectedVideoDeviceId,
  hasChapterSelected = false,
  onOpenChapterModal,
  tutorName = 'Tutor Jay'
}) => {
  return (
    <div className="flex flex-col items-center gap-3 z-40 w-full max-w-2xl px-4 mt-1">
      {/* Primary Action Button: Requires at least one chapter selected to teach */}
      {isConnected ? (
        <button
          onClick={disconnect}
          className="flex items-center justify-center gap-2 px-7 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>End Lesson</span>
        </button>
      ) : !hasChapterSelected ? (
        <button
          onClick={onOpenChapterModal}
          className="flex items-center justify-center gap-2 px-7 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white shadow-indigo-500/30 ring-2 ring-purple-400/50 cursor-pointer animate-pulse"
          title="Upload or select a PDF chapter to start learning"
        >
          <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Chapter to Start</span>
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="flex items-center justify-center gap-2 px-7 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30 ring-2 ring-indigo-400/40 cursor-pointer"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Starting Lesson...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>Start Lesson with {tutorName}</span>
            </>
          )}
        </button>
      )}

      {/* Media Device Controls Row */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Mic Controls */}
        <div className="flex items-center bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-l-full transition-colors ${isMuted ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
                <path fillRule="evenodd" d="m11.023 8.613.007-4.417C11.03 2.974 10.12 2 8.98 2s-1.983.974-1.983 2.196v4.417c0 1.222.843 2.124 1.984 2.124 1.14 0 2.042-.902 2.042-2.124m-2.014 3.441c-1.896.095-3.641-1.725-3.641-3.934H4.2c0 2.51 1.868 4.883 4.153 5.244V16h1.311v-2.636c2.285-.354 4.153-2.726 4.153-5.244h-1.168c0 2.209-1.745 4.029-3.64 3.934"></path>
                <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
                <path fillRule="evenodd" d="m11.023 8.613.007-4.417C11.03 2.974 10.12 2 8.98 2s-1.983.974-1.983 2.196v4.417c0 1.222.843 2.124 1.984 2.124 1.14 0 2.042-.902 2.042-2.124m-2.014 3.441c-1.896.095-3.641-1.725-3.641-3.934H4.2c0 2.51 1.868 4.883 4.153 5.244V16h1.311v-2.636c2.285-.354 4.153-2.726 4.153-5.244h-1.168c0 2.209-1.745 4.029-3.64 3.934"></path>
              </svg>
            )}
          </button>
          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
          <div className="relative p-2 rounded-r-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center">
            <select
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Select Microphone"
            >
              {audioDevices.length === 0 && <option value="">Default Microphone</option>}
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
            <svg className="w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Speaker Controls */}
        <div className="flex items-center bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="p-2 rounded-l-full text-slate-600 dark:text-slate-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
            </svg>
          </div>
          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
          <div className="relative p-2 rounded-r-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center">
            <select
              value={selectedAudioOutputId}
              onChange={handleAudioOutputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Select Speaker"
            >
              {audioOutputDevices.length === 0 && <option value="">Default Speaker</option>}
              {audioOutputDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {device.label || `Speaker ${device.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
            <svg className="w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
