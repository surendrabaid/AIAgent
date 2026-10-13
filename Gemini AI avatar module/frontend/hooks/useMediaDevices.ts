import { useState, useEffect } from 'react';

export const useMediaDevices = () => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState<string>('');

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');

  const [deviceError, setDeviceError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        const videoInputs = devices.filter(device => device.kind === 'videoinput');

        if (mounted) {
          setAudioDevices(audioInputs);
          setSelectedDeviceId(prev => {
            if (prev && audioInputs.find(d => d.deviceId === prev)) return prev;
            return (audioInputs.find(d => d.deviceId === 'default') || audioInputs[0])?.deviceId || '';
          });

          setAudioOutputDevices(audioOutputs);
          setSelectedAudioOutputId(prev => {
            if (prev && audioOutputs.find(d => d.deviceId === prev)) return prev;
            return (audioOutputs.find(d => d.deviceId === 'default') || audioOutputs[0])?.deviceId || '';
          });

          setVideoDevices(videoInputs);
          setSelectedVideoDeviceId(prev => {
            if (prev && videoInputs.find(d => d.deviceId === prev)) return prev;
            return (videoInputs.find(d => d.deviceId === 'default') || videoInputs[0])?.deviceId || '';
          });
        }
      } catch (e) {
        setDeviceError("Failed to fetch devices");
      }
    };

    const initDevices = async () => {
      try {
        // Request permission to get device labels for both audio and video
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach(t => t.stop());
      } catch (err) {
        // Fallback to just audio if video fails or is denied
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getTracks().forEach(t => t.stop());
        } catch (audioErr) {
          setDeviceError("Failed to get media device permissions");
        }
      }
      fetchDevices();
    };

    initDevices();

    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => {
      mounted = false;
      navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
    };
  }, []);

  return {
    audioDevices, selectedDeviceId, setSelectedDeviceId,
    audioOutputDevices, selectedAudioOutputId, setSelectedAudioOutputId,
    videoDevices, selectedVideoDeviceId, setSelectedVideoDeviceId,
    deviceError
  };
};
