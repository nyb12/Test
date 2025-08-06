// components/Dashboard/Observation.tsx
import React from 'react';
import {
  audio,
  camera,
  mobileAudio,
  mobileCamera,
  mobileUpload,
  mobileVideo,
  upload,
  video,
} from '../../components/svg';
import { requestNative } from '@/utils/nativeBridge';
import { useToast } from '@/hooks/use-toast';
import { useRef, useEffect, useState } from 'react';

interface ObservationProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleUploadClick: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  desktopOnly?: boolean;
  openMultimediaInput: (mode: 'photo' | 'video' | 'audio') => void;
}

export default function Observation({
  fileInputRef,
  handleUploadClick,
  handleFileChange,
  desktopOnly = false,
  openMultimediaInput,
}: ObservationProps) {
  const { toast } = useToast();
  const internalRef = useRef<HTMLInputElement>(null);

  // Permission status state
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<
    'pending' | 'granted' | 'denied' | null
  >(null);
  const [microphonePermissionStatus, setMicrophonePermissionStatus] = useState<
    'pending' | 'granted' | 'denied' | null
  >(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === 'camera-status') {
        setCameraPermissionStatus(payload === 'granted' ? 'granted' : 'denied');
      }
      if (type === 'microphone-status') {
        setMicrophonePermissionStatus(
          payload === 'granted' ? 'granted' : 'denied',
        );
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Proxy the forwarded ref if not provided
  const actualRef = fileInputRef || internalRef;
  // Permission check helpers
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      // 1. Check permission synchronously
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        if (permission.state === 'granted') return true;
      }
      // 2. Try to get user media directly (may prompt or fail)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch (err) {
        // 3. If in ReactNativeWebView, request native permission and wait for result
        if (window.ReactNativeWebView) {
          return new Promise((resolve) => {
            const listener = (event: MessageEvent) => {
              const { type, payload } = event.data;
              if (type === 'camera-status') {
                window.removeEventListener('message', listener);
                resolve(payload === 'granted');
              }
            };
            window.addEventListener('message', listener);
            requestNative('request-camera');
            setTimeout(() => {
              window.removeEventListener('message', listener);
              resolve(false);
            }, 2000);
          });
        }
        return false;
      }
    } catch {
      return false;
    }
  };

  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        console.log('Permission state:', permission.state);
        // If 'prompt', still try to getUserMedia to trigger prompt
        if (permission.state === 'granted') return true;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch (err) {
        console.error('getUserMedia error:', err);
        if (window.ReactNativeWebView) {
          return new Promise((resolve) => {
            const listener = (event: MessageEvent) => {
              const { type, payload } = event.data;
              if (type === 'microphone-status') {
                window.removeEventListener('message', listener);
                resolve(payload === 'granted');
              }
            };
            window.addEventListener('message', listener);
            requestNative('request-microphone');
            setTimeout(() => {
              window.removeEventListener('message', listener);
              resolve(false);
            }, 2000);
          });
        }
        return false;
      }
    } catch (err) {
      console.error('Permission check error:', err);
      return false;
    }
  };

  // Handlers for each icon
  const handleTakePhoto = async () => {
    const granted = await checkCameraPermission();
    if (granted) {
      openMultimediaInput('photo');
    }
    // Removed toast: If not granted, do nothing, so user can try again
  };

  const handleRecordVideo = async () => {
    const granted = await checkCameraPermission();
    if (granted) {
      openMultimediaInput('video');
    }
    // Removed toast: If not granted, do nothing, so user can try again
  };

  const handleRecordAudio = async () => {
    const granted = await checkMicrophonePermission();
    if (granted) {
      openMultimediaInput('audio');
    }
    // Removed toast: If not granted, do nothing, so user can try again
  };

  const handleUploadFile = () => {
    actualRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // notify parent
    handleFileChange(e); // existing handler

    // clear input so the same file can be picked again
    e.target.value = '';
  };

  if (desktopOnly) {
    return (
      <div className="hidden sm:flex bg-white rounded-2xl shadow p-4 sm:p-6 flex-col items-center w-full">
        <div className="flex flex-col w-full">
          <h3 className="text-xs sm:text-sm font-semibold text-start">
            Make Observation
          </h3>
          <p className="text-[9px] sm:text-xs text-gray-500 text-start">
            Spotted something? Quickly flag it
          </p>
        </div>
        <div className="relative grid grid-cols-2 gap-3 sm:gap-8 w-full mt-8">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-gray-200"></div>
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-px bg-gray-200"></div>
          {[
            { label: 'Take Photo', icon: camera, onClick: handleTakePhoto },
            { label: 'Record Video', icon: video, onClick: handleRecordVideo },
            { label: 'Record Audio', icon: audio, onClick: handleRecordAudio },
            { label: 'Upload File', icon: upload, onClick: handleUploadFile },
          ].map(({ label, icon, onClick }, idx) => (
            <button
              key={idx}
              onClick={onClick}
              className="rounded-xl flex flex-col items-center py-3 sm:py-4 text-xs sm:text-sm font-semibold text-gray-700"
            >
              <img src={icon} alt={label} className="w-7 h-7 mb-1 mx-auto" />
              {label}
            </button>
          ))}
        </div>
        <input
          type="file"
          ref={actualRef}
          style={{ display: 'none' }}
          onChange={onFileChange}
          multiple
        />
      </div>
    );
  }

  return (
    <div className="flex sm:hidden w-full mb-4">
      <div className="flex flex-row justify-between w-full gap-x-3 ">
        {[
          { label: 'Take Photo', icon: mobileCamera, onClick: handleTakePhoto },
          {
            label: 'Record Video',
            icon: mobileVideo,
            onClick: handleRecordVideo,
          },
          {
            label: 'Record Audio',
            icon: mobileAudio,
            onClick: handleRecordAudio,
          },
          {
            label: 'Upload File',
            icon: mobileUpload,
            onClick: handleUploadFile,
          },
        ].map(({ label, icon, onClick }, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center flex-1 gap-y-2 hover-gray"
          >
            <button
              onClick={onClick}
              className="w-16 h-16 flex items-center justify-center"
            >
              <img src={icon} alt={label} className="w-20 h-20" />
            </button>
            <span className="text-xs text-gray-700 font-medium text-center">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
