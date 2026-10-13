import React from 'react';

interface Props {
  showDebug: boolean;
  debugStats: {
    buffered: number;
    droppedFrames: number;
    duration: number;
    latency: number;
  };
}

export const DebugPanel: React.FC<Props> = ({ showDebug, debugStats }) => {
  if (!showDebug) return null;

  return (
    <div className="absolute top-20 left-6 z-50 bg-black/80 text-green-400 font-mono text-xs p-4 rounded-lg shadow-lg backdrop-blur-sm border border-green-500/30 flex flex-col gap-2 min-w-[220px] pointer-events-none">
      <div className="font-bold text-white mb-1 border-b border-green-500/30 pb-1">Playback Stats</div>
      <div className="flex justify-between"><span>Video Duration:</span> <span>{debugStats.duration.toFixed(2)}s</span></div>
      <div className="flex justify-between"><span>Buffer Ahead:</span> <span>{debugStats.buffered.toFixed(2)}s</span></div>
      <div className="flex justify-between"><span>Dropped Frames:</span> <span>{debugStats.droppedFrames}</span></div>
      <div className="flex justify-between"><span>Response Latency:</span> <span>{debugStats.latency > 0 ? `${debugStats.latency.toFixed(0)}ms` : '-'}</span></div>
    </div>
  );
};
