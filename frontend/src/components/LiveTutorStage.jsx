import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import { useLiveSession } from '../live-avatar/hooks/useLiveSession';
import { LiveAvatarCanvas } from '../live-avatar/components/LiveAvatarCanvas';
import { Volume2, VolumeX, Mic, MicOff, RefreshCw, Signal, Radio, Sparkles, CheckCircle2, AlertCircle, User, Award } from 'lucide-react';

const AVATAR_BASE = 'https://www.gstatic.com/pantheon/images/aiplatform/vertex_ai_studio/avatars';

const LiveTutorStage = forwardRef(({
  avatarConfig,
  childName = 'Student',
  mood = 'idle',
  onAgentTalkingChange,
  onDoubtAnswered,
  isSpeakingFallback = false,
}, ref) => {
  const gender = avatarConfig?.gender || 'female';
  const tutorName = avatarConfig?.name || (gender === 'male' ? 'Mr. Rajesh' : 'Miss Priya');

  // Build persona for LiveAvatarCanvas
  const activePersona = {
    id: gender === 'male' ? 'jay_tutor' : 'carmen_tutor',
    name: tutorName,
    title: gender === 'male' ? 'Lead STEM & Concept Mentor' : 'Lead Educator & Mentor',
    specialty: 'Science & Mathematics',
    voiceName: (gender === 'male' ? 'fenrir' : 'kore'),
    avatarName: gender === 'male' ? 'Jay' : 'Carmen',
    imageUrl: gender === 'male' ? `${AVATAR_BASE}/jay.png` : `${AVATAR_BASE}/carmen_2.png`,
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
    micVolume
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
    isConnected,
    hasVideo,
    agentTalking,
    reconnect: () => connect(),
    disconnect: () => disconnect()
  }), [isConnected, hasVideo, agentTalking, sendTextMessage, connect, disconnect]);

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

  const effectiveTalking = agentTalking || isSpeakingFallback;

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Live Video Stage Container */}
      <div 
        className="glass-panel"
        onClick={unmuteAudio}
        style={{
          position: 'relative',
          width: '100%',
          height: '380px',
          borderRadius: '24px',
          overflow: 'hidden',
          cursor: isAudioBlocked ? 'pointer' : 'default',
          border: effectiveTalking 
            ? '2px solid rgba(16, 185, 129, 0.8)' 
            : isConnected
            ? '2px solid rgba(99, 102, 241, 0.4)'
            : '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: effectiveTalking 
            ? '0 0 35px rgba(16, 185, 129, 0.35), 0 20px 50px rgba(0,0,0,0.6)' 
            : '0 20px 50px rgba(0, 0, 0, 0.5)',
          background: '#090D16',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Top Video Overlay Bar: LIVE Status & WebRTC Signal */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          right: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
          pointerEvents: 'none'
        }}>
          {/* Live Badge */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
            border: isConnected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            color: '#FFF',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#10B981' : isConnecting ? '#F59E0B' : '#EF4444',
              boxShadow: isConnected ? '0 0 10px #10B981' : '0 0 10px #EF4444'
            }} />
            <Radio size={12} color={isConnected ? '#10B981' : '#EF4444'} /> 
            {isConnected ? 'LIVE • Gemini 3.8' : isConnecting ? 'Connecting Live Stream...' : 'Offline Fallback'}
          </div>

          {/* WebRTC HD & Signal Badge */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--accent-cyan)',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Signal size={12} color="var(--accent-cyan)" /> 
            {hasVideo ? '24 FPS Video • 28ms' : isConnected ? 'Audio Stream Ready' : 'AI Studio'}
          </div>
        </div>

        {/* Real Live Avatar Canvas (Gemini 3.8 Live Video + Smooth Rigging Fallback) */}
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <LiveAvatarCanvas
            persona={activePersona}
            mood={mood}
            agentTalking={effectiveTalking}
            isConnected={isConnected}
            videoRef={videoRef}
            hasVideo={hasVideo}
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
              onClick={(e) => {
                e.stopPropagation();
                unmuteAudio();
              }}
              style={{
                background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
                color: '#FFFFFF',
                border: '2px solid rgba(255, 255, 255, 0.6)',
                borderRadius: '30px',
                padding: '12px 24px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(79, 70, 229, 0.7), 0 0 20px rgba(6, 182, 212, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Volume2 size={20} />
              <span>Tap to Hear {tutorName} Speak 🔊</span>
            </button>
          </div>
        )}

        {/* Floating Student Voice Activity & Transcription Bubble */}
        {(liveInput || (!isMuted && micVolume > 15)) && (
          <div style={{
            position: 'absolute',
            top: '56px',
            left: '14px',
            right: '14px',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(16, 185, 129, 0.6)',
            borderRadius: '14px',
            padding: '8px 14px',
            zIndex: 25,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 10px #10B981',
              flexShrink: 0
            }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {liveInput ? 'You Spoke' : 'Listening... speak to interrupt or ask a doubt'}
              </span>
              <p style={{
                margin: 0,
                fontSize: '0.84rem',
                color: '#F8FAFC',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {liveInput || "Microphone active. Ask a question anytime!"}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Video Name Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '14px',
          left: '14px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '6px 14px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 20
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: effectiveTalking ? '#10B981' : isConnected ? '#3B82F6' : '#6B7280'
          }} />
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFF', lineHeight: '1.1' }}>
              {tutorName}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
              ✨ Gemini Live Tutor
            </p>
          </div>
        </div>

        {/* Live Audio Spectrum Waveform Indicator (Bottom Right of Video) */}
        <div style={{
          position: 'absolute',
          bottom: '14px',
          right: '14px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '8px 12px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '4px',
          height: '32px',
          zIndex: 20
        }}>
          <style>{`
            @keyframes eqBarPulseAnim {
              0% { transform: scaleY(0.25); }
              50% { transform: scaleY(1.0); }
              100% { transform: scaleY(0.35); }
            }
          `}</style>
          {[0.2, 0.45, 0.1, 0.6, 0.3, 0.5, 0.15].map((delay, idx) => (
            <div 
              key={idx}
              style={{
                width: '3px',
                height: '18px',
                background: effectiveTalking ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
                transformOrigin: 'bottom',
                transform: effectiveTalking ? undefined : 'scaleY(0.25)',
                animation: effectiveTalking ? `eqBarPulseAnim 0.6s ease-in-out infinite alternate ${delay}s` : 'none',
                transition: 'background 0.2s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Video Call Controls Toolbar (Mic Toggle & Reconnect) */}
      <div className="glass-card" style={{
        marginTop: '12px',
        padding: '8px 16px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box',
        background: '#FFFFFF',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Connection status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: isConnected ? '#10B981' : isConnecting ? '#F59E0B' : '#EF4444', 
            boxShadow: isConnected ? '0 0 8px #10B981' : '0 0 8px #EF4444',
            display: 'inline-block' 
          }} /> 
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {isConnected ? 'Live Avatar Ready' : isConnecting ? 'Establishing Stream...' : 'Offline Mode'}
          </span>
        </div>

        {/* Interactive Controls: Mic mute & Reconnect */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Speaker Unmute Button */}
          <button
            onClick={() => unmuteAudio()}
            style={{
              background: isAudioBlocked ? '#FEF3C7' : '#F1F5F9',
              border: isAudioBlocked ? '1px solid #F59E0B' : '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: isAudioBlocked ? '#B45309' : 'var(--text-main)',
              transition: 'all 0.2s ease'
            }}
            title={isAudioBlocked ? 'Browser muted audio. Click to enable sound' : 'Audio output is active'}
          >
            {isAudioBlocked ? <VolumeX size={14} color="#B45309" /> : <Volume2 size={14} color="#059669" />}
            <span>{isAudioBlocked ? 'Tap for Sound' : 'Sound On'}</span>
          </button>

          <button
            onClick={() => setIsMuted(prev => !prev)}
            style={{
              background: isMuted ? '#FEE2E2' : (micVolume > 10 ? 'rgba(16, 185, 129, 0.18)' : '#F1F5F9'),
              border: isMuted ? '1px solid #FCA5A5' : (micVolume > 10 ? '1px solid #10B981' : '1px solid #CBD5E1'),
              borderRadius: '10px',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: isMuted ? '#DC2626' : (micVolume > 10 ? '#059669' : 'var(--text-main)'),
              transition: 'all 0.15s ease',
              boxShadow: (!isMuted && micVolume > 10) ? '0 0 10px rgba(16, 185, 129, 0.35)' : 'none'
            }}
            title={isMuted ? 'Unmute Student Microphone' : 'Mute Student Microphone'}
          >
            {isMuted ? (
              <MicOff size={14} color="#DC2626" />
            ) : (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mic size={14} color={micVolume > 10 ? '#059669' : '#10B981'} />
                {micVolume > 10 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10B981'
                  }} />
                )}
              </div>
            )}
            <span>{isMuted ? 'Muted' : (micVolume > 10 ? 'Speaking...' : 'Mic On')}</span>
          </button>

          {!isConnected && !isConnecting && (
            <button
              onClick={() => connect()}
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '10px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--accent-purple)'
              }}
              title="Reconnect Gemini Live Stream"
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>

      {/* Connection & Stream Diagnostic Banner */}
      {error && !isConnected && (
        <div style={{
          width: '100%',
          marginTop: '8px',
          padding: '8px 14px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#DC2626',
          fontSize: '0.78rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => connect()}
            style={{
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Reconnect
          </button>
        </div>
      )}
    </div>
  );
});

export default LiveTutorStage;
