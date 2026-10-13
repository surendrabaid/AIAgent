import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VideoMode } from '../types';

interface Props {
  videoMode: VideoMode;
  deviceId: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onVideoStop: () => void;
}

export const UserWebCamDisplay: React.FC<Props> = ({ videoMode, deviceId, videoRef, onVideoStop }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const activeVideoRef = videoRef || localVideoRef;
  const streamRef = useRef<MediaStream | null>(null);

  // Keep a mutable ref to the latest onVideoStop callback to avoid adding it to the dependency array
  const onVideoStopRef = useRef(onVideoStop);
  useEffect(() => {
    onVideoStopRef.current = onVideoStop;
  }, [onVideoStop]);

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });

  // Only depend on deviceId if we are actually using the webcam.
  // This prevents screen share from restarting if a background device change updates deviceId.
  const activeDeviceId = videoMode === 'webcam' ? deviceId : null;

  useEffect(() => {
    let mounted = true;

    const startVideo = async () => {
      if (videoMode === 'none') {
        stopVideo();
        return;
      }

      try {
        let stream: MediaStream;

        if (videoMode === 'webcam') {
          const constraints: MediaStreamConstraints = {
            video: activeDeviceId ? { deviceId: { exact: activeDeviceId } } : true
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } else {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          // Listen for the user clicking "Stop sharing" in the browser UI
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              if (mounted) onVideoStopRef.current();
            };
          }
        }

        if (mounted && activeVideoRef.current) {
          activeVideoRef.current.srcObject = stream;
          streamRef.current = stream;
        } else {
          // If unmounted while waiting for stream
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Error accessing media:", err);
        if (mounted) onVideoStopRef.current(); // Revert state if user denies permission
      }
    };

    const stopVideo = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (activeVideoRef.current) {
        activeVideoRef.current.srcObject = null;
      }
    };

    startVideo();

    return () => {
      mounted = false;
      stopVideo();
    };
  }, [videoMode, activeDeviceId, activeVideoRef]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow left click for mouse events
    if ('button' in e && e.button !== 0) return;

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startPosX: position.x,
      startPosY: position.y
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    // Prevent default to avoid scrolling on touch devices while dragging
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    setPosition({
      x: dragStartRef.current.startPosX + dx,
      y: dragStartRef.current.startPosY + dy
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (videoMode === 'none') return null;

  return (
    <div
      className={`absolute bottom-6 right-6 z-50 w-[30vw] md:w-[25vw] lg:w-[20vw] min-w-[150px] max-w-[600px] aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 ${isDragging ? 'cursor-grabbing' : 'cursor-grab transition-shadow duration-300'}`}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <video
        ref={activeVideoRef as React.RefObject<HTMLVideoElement>}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover pointer-events-none ${videoMode === 'webcam' ? 'transform scale-x-[-1]' : ''}`}
      />
      {/* Subtle drag indicator */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-white/30 rounded-full pointer-events-none backdrop-blur-sm" />
    </div>
  );
};
