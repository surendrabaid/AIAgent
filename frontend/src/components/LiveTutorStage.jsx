import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import { useLiveSession } from '../live-avatar/hooks/useLiveSession';
import { LiveAvatarCanvas } from '../live-avatar/components/LiveAvatarCanvas';
import { Volume2, VolumeX, Mic, MicOff, Radio, Pause, Play } from 'lucide-react';

const AVATAR_BASE = 'https://www.gstatic.com/pantheon/images/aiplatform/vertex_ai_studio/avatars';

const LiveTutorStage = forwardRef(({
  avatarConfig,
  childName = 'Tisha',
  mood = 'idle',
  onAgentTalkingChange,
  onDoubtAnswered,
  isTeachingPaused = false,
  onTogglePause,
  speechText = '',
}, ref) => {
  const gender = avatarConfig?.gender || 'female';
  const tutorName = avatarConfig?.name || (gender === 'male' ? 'Mr. Rajesh' : 'Joya');

  // Build persona for LiveAvatarCanvas
  const activePersona = {
    id: gender === 'male' ? 'jay_tutor' : 'carmen_tutor',
    name: tutorName,
    title: gender === 'male' ? 'Lead STEM & Concept Mentor' : 'Lead Educator & Mentor',
    specialty: 'Science & Mathematics',
    voiceName: (gender === 'male' ? 'fenrir' : 'kore'),
    avatarName: gender === 'male' ? 'Jay' : 'Carmen',
    imageUrl: gender === 'male' ? '/male_teacher_avatar.jpg' : '/female_teacher_avatar.jpg',
    themeColor: gender === 'male' ? 'from-blue-600 to-indigo-600' : 'from-pink-600 to-indigo-600',
    description: 'Patient, warm, and explains complex concepts with intuitive real-world analogies.',
    accentQuote: "Let's explore and discover together!"
  };

  const systemInstruction = `You are "${tutorName}", an enthusiastic, warm, world-class 1-on-1 AI Home Tutor teaching ${childName}.
Your primary goal is to guide ${childName} through their lesson with deep comprehension, interactive encouragement, and joy.

LESSON TEACHING PROTOCOL:
- When asked to explain a topic, deliver a clear, concise, conversational explanation in 3 to 4 spoken sentences.
- Speak directly to ${childName} warmly and with natural inflection.
- Use intuitive, vivid real-world analogies suitable for the student's level.

CHECKPOINT QUIZ PROTOCOL:
- When given a question, read it aloud clearly and enthusiastically.
- When an answer result is received:
  1. If correct: Cheer warmly and celebrate! ("Awesome job, ${childName}!", "Bingo! That is spot on!").
  2. If incorrect: Be gentle, empathetic, and encouraging ("Close guess, ${childName}! Here is the key trick...").
  3. Keep the feedback punchy and conversational (2-3 sentences).

DOUBT CLARIFICATION PROTOCOL:
- When ${childName} asks a doubt or question, explain it warmly and clearly.`;

  const configOverrides = useMemo(() => ({
    avatarConfig: {
      avatarName: activePersona.avatarName
    },
    speechConfig: {
      languageCode: 'en-US',
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: activePersona.voiceName
        }
      }
    },
    systemInstruction
  }), [activePersona.avatarName, activePersona.voiceName, systemInstruction]);

  const [isMuted, setIsMuted] = useState(false);
  const webcamVideoRef = useRef(null);

  const {
    isConnected,
    isConnecting,
    isWaitingForVideo,
    hasVideo,
    error,
    liveInput,
    liveOutput,
    agentTalking,
    videoRef,
    isAudioBlocked,
    unmuteAudio,
    connect,
    disconnect,
    sendTextMessage,
    micVolume,
    pauseSession,
    resumeSession,
    isPaused
  } = useLiveSession('', isMuted, false, webcamVideoRef, configOverrides);

  // Auto-connect to live session on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  // Forward imperative handle to parent
  useImperativeHandle(ref, () => ({
    sendPrompt: (text) => {
      sendTextMessage(text);
      return true;
    },
    pauseAudio: () => {
      pauseSession();
    },
    resumeAudio: () => {
      resumeSession();
    },
    isConnected,
    hasVideo,
    agentTalking,
    reconnect: () => connect(),
    disconnect: () => disconnect()
  }), [isConnected, hasVideo, agentTalking, sendTextMessage, connect, disconnect, pauseSession, resumeSession]);

  // Sync teaching pause state with live session (video playback + audio + canvas)
  useEffect(() => {
    if (isTeachingPaused) {
      pauseSession();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      resumeSession();
    }
  }, [isTeachingPaused, pauseSession, resumeSession]);

  // Notify parent of agentTalking state changes
  useEffect(() => {
    if (onAgentTalkingChange) {
      onAgentTalkingChange(agentTalking);
    }
  }, [agentTalking, onAgentTalkingChange]);

  // Detect spoken doubts from student and teacher responses
  const lastCapturedUserTextRef = useRef('');
  useEffect(() => {
    if (!agentTalking && liveInput && liveOutput && liveInput !== lastCapturedUserTextRef.current) {
      lastCapturedUserTextRef.current = liveInput;
      if (onDoubtAnswered) {
        onDoubtAnswered(liveInput, liveOutput);
      }
    }
  }, [agentTalking, liveInput, liveOutput, onDoubtAnswered]);

  const effectiveTalking = agentTalking;

  return (
    <div className="avatar-panel">
      {/* Avatar Stage Container */}
      <div 
        className="avatar-stage"
        onClick={unmuteAudio}
        style={{ cursor: isAudioBlocked ? 'pointer' : 'default' }}
      >
        <div className="avatar-stage-bg" />

        {/* Live Badge */}
        <div className="live-badge">
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isConnected ? '#10B981' : isConnecting ? '#F59E0B' : '#EF4444',
            boxShadow: isConnected ? '0 0 6px #10B981' : 'none',
            display: 'inline-block'
          }} />
          {isConnected ? '● LIVE' : isConnecting ? 'CONNECTING...' : 'OFFLINE'}
        </div>

        {/* Real Live Avatar Canvas */}
        <div className="avatar-canvas-wrapper">
          <LiveAvatarCanvas
            persona={activePersona}
            mood={mood}
            agentTalking={effectiveTalking}
            isConnected={isConnected}
            videoRef={videoRef}
            hasVideo={hasVideo}
            isPaused={isTeachingPaused || isPaused}
          />
        </div>

        {/* Prominent Tap to Hear Audio Overlay Button */}
        {isAudioBlocked && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 35,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)'
          }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                unmuteAudio();
              }}
              style={{
                background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                color: '#FFFFFF',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '30px',
                padding: '10px 20px',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(98, 85, 246, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Volume2 size={18} />
              <span>Tap to Hear {tutorName} Speak 🔊</span>
            </button>
          </div>
        )}

        {/* Teaching Paused Overlay Banner */}
        {isTeachingPaused && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 36,
            background: 'rgba(30, 42, 74, 0.82)',
            backdropFilter: 'blur(5px)',
            color: '#FFFFFF',
            textAlign: 'center',
            padding: '16px',
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(255, 203, 85, 0.2)',
              border: '2px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <Pause size={22} color="var(--accent)" />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--accent)' }}>
              Teaching Paused
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#CBD5E1', maxWidth: '220px', margin: '0 0 12px 0', lineHeight: 1.3 }}>
              Take your time to read the slide, ask a doubt, or take study notes.
            </p>
            {onTogglePause && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePause();
                }}
                className="btn-start"
                style={{ padding: '7px 18px', fontSize: '0.82rem', borderRadius: '20px' }}
              >
                <Play size={13} fill="#FFFFFF" /> Resume Teaching
              </button>
            )}
          </div>
        )}

        {/* Floating Student Voice Activity */}
        {liveInput && (
          <div style={{
            position: 'absolute',
            bottom: '48px',
            left: '10px',
            right: '10px',
            background: 'rgba(30, 42, 74, 0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(16, 185, 129, 0.6)',
            borderRadius: '10px',
            padding: '6px 10px',
            zIndex: 15,
            color: '#FFFFFF',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>🎤</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong>{childName}:</strong> "{liveInput}"
            </span>
          </div>
        )}

        {/* Bottom Stage Overlay Label Bar */}
        <div className="avatar-label-bar">
          <div>
            <div className="avatar-name">{tutorName}</div>
            <div className="avatar-sub">{childName}'s AI Tutor</div>
          </div>
          <div className="audio-bars">
            <span style={effectiveTalking ? {} : { animation: 'none', height: '4px' }} />
            <span style={effectiveTalking ? {} : { animation: 'none', height: '4px' }} />
            <span style={effectiveTalking ? {} : { animation: 'none', height: '4px' }} />
            <span style={effectiveTalking ? {} : { animation: 'none', height: '4px' }} />
            <span style={effectiveTalking ? {} : { animation: 'none', height: '4px' }} />
          </div>
        </div>
      </div>

      {/* Avatar Controls Below Stage */}
      <div className="avatar-controls">
        <div className="status-chips">
          <div className="chip active chip-green">
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isConnected ? '#10B981' : isConnecting ? '#F59E0B' : '#EF4444',
              display: 'inline-block'
            }} />
            <span>{isConnected ? 'Avatar Ready' : isConnecting ? 'Connecting...' : 'Offline'}</span>
          </div>

          {/* Microphone Mute/Unmute Toggle */}
          <button
            type="button"
            className={`chip ${isMuted ? '' : 'active chip-green'}`}
            onClick={() => setIsMuted(prev => !prev)}
            title={isMuted ? 'Microphone is muted — click to unmute and speak' : 'Microphone is active — click to mute'}
          >
            {isMuted ? (
              <><MicOff size={12} color="#dc2626" /> <span>Mic Muted</span></>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mic size={12} color={micVolume > 10 ? '#059669' : '#10b981'} />
                <span>{micVolume > 10 ? 'Speaking...' : 'Mic Active'}</span>
              </div>
            )}
          </button>
        </div>

        {/* Dynamic Student Voice Guidance Banner */}
        <div style={{
          padding: '7px 10px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 600,
          background: isMuted ? '#fee2e2' : '#ecfdf5',
          border: isMuted ? '1px solid #fca5a5' : '1px solid #a7f3d0',
          color: isMuted ? '#991b1b' : '#065f46',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {isMuted ? (
            <>
              <MicOff size={13} color="#dc2626" />
              <span>Microphone is muted. Click <strong>Mic Muted</strong> to speak to {tutorName}!</span>
            </>
          ) : (
            <>
              <Mic size={13} color="#059669" />
              <span>Microphone is active! Speak anytime to ask {tutorName} questions or doubts.</span>
            </>
          )}
        </div>

        {onTogglePause && (
          <button 
            type="button" 
            className="pause-btn"
            onClick={onTogglePause}
          >
            {isTeachingPaused ? (
              <><Play size={14} fill="currentColor" /> Resume Teaching</>
            ) : (
              <><Pause size={14} /> Pause Teaching</>
            )}
          </button>
        )}
      </div>
    </div>
  );
});

export default LiveTutorStage;
