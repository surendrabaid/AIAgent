import React, { useEffect, useRef, useState } from 'react';
import { AvatarPersona, AvatarMood } from '../types';

interface Props {
  persona: AvatarPersona;
  mood: AvatarMood;
  agentTalking: boolean;
  isConnected: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hasVideo: boolean;
  isPaused?: boolean;
}

export const LiveAvatarCanvas: React.FC<Props> = ({
  persona,
  mood,
  agentTalking,
  isConnected,
  videoRef,
  hasVideo,
  isPaused = false,
}) => {
  const [mouthOpen, setMouthOpen] = useState<number>(0);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [headTilt, setHeadTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const animFrameRef = useRef<number | null>(null);

  // Live video is shown ONLY when active video stream exists AND avatar is speaking AND session is not paused.
  // When agentTalking is false (or session is paused), we seamlessly show the neutral lifelike portrait
  // where the teacher has mouth closed, eyes blinking, and natural attentive listening head tilt!
  const showLiveVideo = hasVideo && agentTalking && !isPaused;

  // Procedural lip-sync and breathing simulation:
  // When live video is active (showLiveVideo), the video stream renders the avatar.
  // When in portrait/listening mode (!showLiveVideo), simulate natural breathing, blinking, and mood head tilt!
  useEffect(() => {
    if (showLiveVideo) {
      setHeadTilt({ x: 0, y: 0 });
      setMouthOpen(0);
      return;
    }

    let startTime = performance.now();

    const loop = (time: number) => {
      const elapsed = (time - startTime) / 1000;

      // Natural breathing & gentle idle head tilt
      const breathingTiltY = Math.sin(elapsed * 1.4) * 1.5;
      const breathingTiltX = Math.cos(elapsed * 0.8) * 1.2;

      // React to tutor emotional mood
      let targetX = breathingTiltX;
      let targetY = breathingTiltY;

      if (mood === 'celebrating') {
        targetY = Math.sin(elapsed * 4) * 3 - 2;
        targetX = Math.cos(elapsed * 3) * 2;
      } else if (mood === 'empathetic') {
        targetX = 3.5; // sympathetic head tilt
        targetY = 1.5;
      } else if (mood === 'thinking') {
        targetX = -2.5;
        targetY = -2;
      } else if (mood === 'listening') {
        targetX = 2.0; // attentive listening tilt towards the student
        targetY = 0.8;
      }

      setHeadTilt({ x: targetX, y: targetY });

      // Procedural mouth visemes: ONLY when NOT in video mode and agent is speaking (Option 2 TTS fallback)
      if (!hasVideo && agentTalking && !isPaused) {
        const speechWave =
          Math.sin(elapsed * 12) * 0.4 +
          Math.sin(elapsed * 19) * 0.3 +
          Math.sin(elapsed * 7) * 0.3;
        const normalized = Math.max(0.08, Math.min(1, (speechWave + 1) / 2));
        setMouthOpen(normalized);
      } else {
        setMouthOpen(0); // Mouth ALWAYS closed when listening, paused, or in Option 1 idle state!
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [showLiveVideo, agentTalking, mood, hasVideo, isPaused]);

  // Natural spontaneous blinking cycle (active during listening/portrait mode)
  useEffect(() => {
    if (showLiveVideo) return;
    let timeoutId: number;

    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 160);

      const nextInterval = 3200 + Math.random() * 3000;
      timeoutId = window.setTimeout(triggerBlink, nextInterval);
    };

    timeoutId = window.setTimeout(triggerBlink, 3500);
    return () => clearTimeout(timeoutId);
  }, [showLiveVideo]);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-3xl select-none"
      style={
        showLiveVideo
          ? {}
          : {
              transform: `perspective(1000px) rotateX(${headTilt.y * 0.5}deg) rotateY(${headTilt.x * 0.5}deg) translateY(${headTilt.y * 0.5}px)`,
              transition: 'transform 0.12s ease-out',
            }
      }
    >
      {/* Underlying Gemini Live Bidi Video Stream */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300 ${
          showLiveVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ objectPosition: 'center 35%' }}
        playsInline
        autoPlay
      />

      {/* Lifelike Real Avatar Portrait Layer (Smooth Crossfade with Closed-Mouth Attentive Listening) */}
      <div className={`relative w-full h-full flex items-center justify-center transition-opacity duration-300 ${showLiveVideo ? 'opacity-0' : 'opacity-100'}`}>
        <img
          src={persona.imageUrl}
          alt={persona.name}
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (naturalWidth && naturalHeight) {
              setAspectRatio(naturalWidth / naturalHeight);
            }
          }}
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 35%' }}
        />

        {/* Ambient Mood & Speech Lighting Glow */}
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
            mood === 'celebrating'
              ? 'bg-radial from-amber-400/20 via-transparent to-transparent animate-pulse'
              : mood === 'empathetic'
              ? 'bg-radial from-rose-400/15 via-transparent to-transparent'
              : agentTalking && !isPaused
              ? 'bg-radial from-indigo-500/20 via-transparent to-transparent'
              : 'bg-gradient-to-t from-slate-950/60 via-transparent to-transparent'
          }`}
        />

        {/* Natural Eye Overlay Rig (Realistic Blinking and Focus) */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{ transform: 'translateY(-12%)' }}
        >
          <div className="relative w-48 sm:w-56 h-12 flex justify-between px-10">
            {/* Left Eye Eyelid */}
            <div
              className="w-9 h-5 rounded-full overflow-hidden transition-all duration-150 flex items-center justify-center"
              style={{
                transform: isBlinking ? 'scaleY(0.08)' : 'scaleY(1)',
                backgroundColor: isBlinking ? 'rgba(120, 80, 60, 0.65)' : 'transparent',
              }}
            >
              {!isBlinking && (
                <div
                  className="w-2.5 h-2.5 rounded-full bg-white/70 shadow-xs"
                  style={{
                    transform: `translate(${headTilt.x * 0.4}px, ${headTilt.y * 0.3}px)`,
                  }}
                />
              )}
            </div>

            {/* Right Eye Eyelid */}
            <div
              className="w-9 h-5 rounded-full overflow-hidden transition-all duration-150 flex items-center justify-center"
              style={{
                transform: isBlinking ? 'scaleY(0.08)' : 'scaleY(1)',
                backgroundColor: isBlinking ? 'rgba(120, 80, 60, 0.65)' : 'transparent',
              }}
            >
              {!isBlinking && (
                <div
                  className="w-2.5 h-2.5 rounded-full bg-white/70 shadow-xs"
                  style={{
                    transform: `translate(${headTilt.x * 0.4}px, ${headTilt.y * 0.3}px)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Procedural Lip-Sync Mouth Rig (Option 2 speech fallback only) */}
        {!hasVideo && agentTalking && !isPaused && (
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{ transform: 'translateY(16%)' }}
          >
            <div
              className="rounded-full bg-gradient-to-b from-rose-950/90 to-red-950/90 border border-rose-900/40 shadow-inner transition-all duration-75 flex items-center justify-center overflow-hidden"
              style={{
                width: `${24 + mouthOpen * 16}px`,
                height: `${4 + mouthOpen * 18}px`,
                transform: `scale(${1 + mouthOpen * 0.25})`,
                opacity: 0.78,
              }}
            >
              {/* Subtle teeth highlight */}
              <div
                className="w-3/4 h-1.5 bg-white/80 rounded-t-sm"
                style={{ opacity: mouthOpen > 0.3 ? 0.9 : 0 }}
              />
            </div>
          </div>
        )}

        {/* Dynamic Emotion Sparkles / Reaction Effects */}
        {mood === 'celebrating' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="absolute top-10 left-12 text-2xl animate-bounce">🌟</span>
            <span className="absolute top-14 right-14 text-2xl animate-pulse">🎉</span>
            <span className="absolute bottom-16 left-16 text-xl animate-bounce delay-150">✨</span>
          </div>
        )}
      </div>
    </div>
  );
};
