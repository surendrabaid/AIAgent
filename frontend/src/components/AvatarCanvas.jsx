import React, { useEffect, useState, useRef } from 'react';
import { Volume2, Mic, Brain, Sparkles, UserCheck, Video, Radio, Signal, MicOff, Hand, Maximize2 } from 'lucide-react';

export default function AvatarCanvas({ avatarConfig, currentViseme, isSpeaking, isListening, isThinking }) {
  const [audioLevel, setAudioLevel] = useState(0);
  const gender = avatarConfig?.gender || 'female';
  const avatarName = avatarConfig?.name || (gender === 'male' ? 'Professor Sharma' : 'Miss Priya');
  const photoSrc = gender === 'male' ? '/indian_male_teacher.png' : '/indian_female_teacher.png';

  // Dynamic Audio Spectrum Waveform simulator
  useEffect(() => {
    let interval;
    if (isSpeaking) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 0.8 + 0.2);
      }, 120);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const mouthOpen = currentViseme?.mouth_open ?? (isSpeaking ? 0.5 : 0.05);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Live WebRTC Video Call Container */}
      <div 
        className="glass-panel"
        style={{
          position: 'relative',
          width: '100%',
          height: '360px',
          borderRadius: '24px',
          overflow: 'hidden',
          border: isSpeaking 
            ? '2px solid rgba(16, 185, 129, 0.8)' 
            : '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: isSpeaking 
            ? '0 0 30px rgba(16, 185, 129, 0.3), 0 20px 50px rgba(0,0,0,0.6)' 
            : '0 20px 50px rgba(0, 0, 0, 0.6)',
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
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          {/* Live Badge */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
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
              background: '#EF4444',
              boxShadow: '0 0 10px #EF4444'
            }} />
            <Radio size={12} color="#EF4444" /> LIVE • Remote Studio
          </div>

          {/* WebRTC HD & Signal Badge */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
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
            <Signal size={12} color="var(--accent-cyan)" /> 1080p HD • 24ms
          </div>
        </div>

        {/* Real HD Teacher Video Feed */}
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <img 
            src={photoSrc} 
            alt={avatarName} 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              transform: isSpeaking 
                ? `scale(1.02) translateY(${Math.sin(Date.now() / 200) * 1.5}px)` 
                : 'scale(1)',
              filter: isSpeaking ? 'brightness(1.05)' : 'brightness(0.98)',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />

          {/* Real-time Dynamic Lip-Sync Motion Overlay */}
          {isSpeaking && (
            <div style={{
              position: 'absolute',
              bottom: '26%',
              left: '49%',
              width: '24px',
              height: `${5 + mouthOpen * 14}px`,
              background: 'rgba(153, 27, 27, 0.75)',
              borderRadius: '50%',
              transform: 'translateX(-50%)',
              transition: 'height 0.1s linear',
              filter: 'blur(1px)',
              pointerEvents: 'none'
            }} />
          )}

          {/* Studio Video Scanlines & Ambient Grain */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.5) 100%)',
            pointerEvents: 'none'
          }} />

          {/* Bottom Video Name Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '14px',
            left: '14px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '6px 14px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isSpeaking ? '#10B981' : '#6B7280'
            }} />
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFF', lineHeight: '1.1' }}>
                {avatarName}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                🇮🇳 Live Remote Tutor
              </p>
            </div>
          </div>

          {/* Live Audio Spectrum Waveform Indicator (Bottom Right of Video) */}
          <div style={{
            position: 'absolute',
            bottom: '14px',
            right: '14px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '8px 12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '4px',
            height: '32px',
            zIndex: 10
          }}>
            {[0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.2].map((heightFactor, idx) => (
              <div 
                key={idx}
                style={{
                  width: '3px',
                  height: isSpeaking ? `${Math.max(4, audioLevel * 22 * heightFactor)}px` : '4px',
                  background: isSpeaking ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.3)',
                  borderRadius: '2px',
                  transition: 'height 0.1s ease'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Video Call Controls Toolbar (Zoom / Meet Style) */}
      <div className="glass-card" style={{
        marginTop: '12px',
        padding: '6px 14px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#F87171', 
          fontWeight: 800, 
          letterSpacing: '0.04em',
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px' 
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: '#EF4444', 
            boxShadow: '0 0 8px #EF4444',
            display: 'inline-block'
          }} /> 
          Live
        </div>
      </div>
    </div>
  );
}
