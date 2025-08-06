import {
  useState,
  useRef,
  useEffect,
  useCallback,
  Dispatch,
  SetStateAction,
} from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Camera,
  Video,
  Mic,
  Upload,
  X,
  Loader2,
  Play,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { requestNative } from '@/utils/nativeBridge';

interface MultimediaInputProps {
  onContentGenerated: (content: string) => void;
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'photo' | 'video' | 'audio';
}

export default function MultimediaInput({
  onContentGenerated,
  isOpen,
  onClose,
  initialMode,
}: MultimediaInputProps) {
  /* ---------- STATE ---------- */
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<
    'photo' | 'video' | 'audio' | null
  >(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showPlayback, setShowPlayback] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<
    'pending' | 'granted' | 'denied' | null
  >(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  /* ---------- REFS ---------- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const cameraTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  /* ---------- LIFECYCLE / CLEANUP ---------- */
  const cleanup = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
      cameraTimeoutRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [audioUrl]);

  useEffect(() => cleanup, [cleanup]);

  /* ---------- CAMERA ---------- */
  const accessCamera = useCallback(
    async (type: 'photo' | 'video') => {
      try {
        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment',
          },
          audio: type === 'video',
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current?.play();
        }
      } catch (error) {
        console.error('Camera access error:', error);
        toast({
          title: 'Camera access failed',
          description: 'Unable to access camera. Please check permissions.',
          variant: 'destructive',
        });
        setMediaType(null);
      }
    },
    [toast],
  );

  /* ---------- PERMISSION / AUTO-TRIGGER ---------- */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let data = event.data;
      try {
        data = typeof data === 'string' ? JSON.parse(data) : data;
      } catch {}
      if (data.type === 'camera-status') {
        const granted = data.payload === 'granted';
        setCameraPermissionStatus(granted ? 'granted' : 'denied');
        if (cameraTimeoutRef.current) {
          clearTimeout(cameraTimeoutRef.current);
          cameraTimeoutRef.current = null;
        }
        if (granted && (mediaType === 'photo' || mediaType === 'video')) {
          accessCamera(mediaType);
        } else if (!granted) {
          toast({
            title: 'Camera access denied',
            description: 'Please allow camera access to capture media',
            variant: 'destructive',
          });
          setMediaType(null);
        }
      }
      if (data.type === 'microphone-status') {
        // You can add similar logic for microphone if needed
      }
    };
    window.addEventListener('message', handleMessage);
    (document as any).addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      (document as any).removeEventListener('message', handleMessage);
    };
  }, [mediaType, toast, accessCamera]);

  useEffect(() => {
    if (isOpen && initialMode && !autoTriggered) {
      setAutoTriggered(true);
      if (initialMode === 'photo') startCamera('photo');
      else if (initialMode === 'video') startCamera('video');
      else if (initialMode === 'audio') startAudioRecording();
    }
    if (!isOpen) {
      setAutoTriggered(false);
      cleanup();
    }
  }, [isOpen, initialMode, cleanup, autoTriggered]);

  // Robust camera permission check
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        if (permission.state === 'granted') return true;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch (err) {
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

  // Robust microphone permission check
  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        if (permission.state === 'granted') return true;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch (err) {
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
    } catch {
      return false;
    }
  };

  // Update startCamera to use robust permission check
  const startCamera = useCallback(
    async (type: 'photo' | 'video') => {
      setShowPlayback(false);
      setMediaType(type);
      setCameraPermissionStatus('pending');

      const hasPermission = await checkCameraPermission();
      if (hasPermission) {
        setCameraPermissionStatus('granted');
        await accessCamera(type);
        return;
      } else {
        // Try requesting permission again on next click, don't set mediaType to null
        toast({
          title: 'Camera permission required',
          description:
            'Please allow camera access to use this feature. Click again to retry.',
          variant: 'destructive',
        });
        // Do not set mediaType to null or denied, so user can retry
      }
    },
    [accessCamera, toast],
  );

  /* ---------- PHOTO ---------- */
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedMedia(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
        cleanup();
      },
      'image/jpeg',
      0.9,
    );
  };

  /* ---------- VIDEO ---------- */
  const startVideoRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current.ondataavailable = (e) =>
      e.data.size && chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setCapturedMedia(new File([blob], 'video.webm', { type: 'video/webm' }));
      cleanup();
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopVideoRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  /* ---------- AUDIO ---------- */
  // Update startAudioRecording to use robust permission check
  const startAudioRecording = useCallback(async () => {
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) {
      toast({
        title: 'Microphone permission required',
        description:
          'Please allow microphone access to record audio. Click again to retry.',
        variant: 'destructive',
      });
      // Do not set mediaType to null, so user can retry
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMediaType('audio');
      setRecordingTime(0);
      setAudioLevels([]);

      // Audio context + visualizer
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      // Media recorder
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      recorder.ondataavailable = (e) =>
        e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: 'audio/webm;codecs=opus',
        });
        const url = URL.createObjectURL(blob);
        setCapturedMedia(new File([blob], 'audio.webm'));
        setAudioUrl(url);
        setShowPlayback(true);
        cleanup();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Timer
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000,
      );

      updateAudioLevels();
    } catch (error) {
      console.error('Audio recording error:', error);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to record audio',
        variant: 'destructive',
      });
    }
  }, [toast, cleanup]);

  const updateAudioLevels = () => {
    if (!analyserRef.current || !isRecording) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const bars = Array.from({ length: 20 }, (_, i) =>
      Math.floor((data[Math.floor((i / 20) * data.length)] / 255) * 100),
    );
    setAudioLevels(bars);
    animationRef.current = requestAnimationFrame(updateAudioLevels);
  };

  const stopAudioRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const discardRecording = () => {
    cleanup();
    setCapturedMedia(null);
    setShowPlayback(false);
    setRecordingTime(0);
    setAudioLevels([]);
    startAudioRecording();
  };

  const retakeMedia = () => {
    const type = mediaType;
    reset();
    if (type === 'photo' || type === 'video') startCamera(type);
  };

  const reset = useCallback(() => {
    cleanup();
    setCapturedMedia(null);
    setMediaType(null);
    setIsRecording(false);
    setCameraPermissionStatus(null);
    setShowPlayback(false);
  }, [cleanup]);

  /* ---------- HANDLERS ---------- */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedMedia(file);
    if (file.type.startsWith('image/')) setMediaType('photo');
    else if (file.type.startsWith('video/')) setMediaType('video');
    else if (file.type.startsWith('audio/')) setMediaType('audio');
    setShowPlayback(false);
  };

  const processMediaWithAI = async () => {
    if (!capturedMedia) return;
    setIsProcessing(true);
    controllerRef.current = new AbortController();

    try {
      const form = new FormData();
      form.append('file', capturedMedia);

      let endpoint = '/chat-api';
      if (capturedMedia.type.startsWith('audio/'))
        endpoint = '/api/transcribe-audio';

      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        signal: controllerRef.current.signal,
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      if (isOpen) onContentGenerated(data.response || data.text || '');
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Processing error:', error);
      toast({
        title: 'Processing failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      reset();
      onClose();
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ---------- RENDER ---------- */
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Make Observation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!mediaType && !capturedMedia && !initialMode && (
            <div className="grid grid-cols-2 gap-4">
              <Card
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => startCamera('photo')}
              >
                <CardContent className="flex flex-col items-center p-6">
                  <Camera className="h-8 w-8 mb-2 text-blue-600" />
                  <span className="text-sm font-medium">Take Photo</span>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => startCamera('video')}
              >
                <CardContent className="flex flex-col items-center p-6">
                  <Video className="h-8 w-8 mb-2 text-blue-600" />
                  <span className="text-sm font-medium">Record Video</span>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:bg-gray-50"
                onClick={startAudioRecording}
              >
                <CardContent className="flex flex-col items-center p-6">
                  <Mic className="h-8 w-8 mb-2 text-blue-600" />
                  <span className="text-sm font-medium">Record Audio</span>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="flex flex-col items-center p-6">
                  <Upload className="h-8 w-8 mb-2 text-blue-600" />
                  <span className="text-sm font-medium">Upload File</span>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Camera / Video Preview */}
          {(mediaType === 'photo' || mediaType === 'video') &&
            !capturedMedia && (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg bg-gray-100 min-h-[300px] max-h-[400px] object-cover"
                  />
                  {cameraPermissionStatus === 'pending' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  {mediaType === 'photo' && (
                    <Button onClick={capturePhoto}>
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                  )}
                  {mediaType === 'video' && (
                    <>
                      {!isRecording ? (
                        <Button onClick={startVideoRecording}>
                          <Video className="h-4 w-4 mr-2" />
                          Start Recording
                        </Button>
                      ) : (
                        <Button
                          onClick={stopVideoRecording}
                          variant="destructive"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Stop Recording
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

          {/* Audio Recording */}
          {mediaType === 'audio' && isRecording && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Mic className="h-6 w-6 text-red-500 animate-pulse" />
                  <span className="text-lg font-semibold text-red-500">
                    Recording...
                  </span>
                  <span className="text-lg font-mono">
                    {formatTime(recordingTime)}
                  </span>
                </div>

                {/* Audio Level Visualization */}
                <div className="flex items-end justify-center gap-1 h-16 mb-4">
                  {audioLevels.map((level, i) => (
                    <div
                      key={i}
                      className="bg-blue-500 rounded-t transition-all"
                      style={{
                        height: `${Math.max(4, level)}%`,
                        width: 4,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <Button onClick={stopAudioRecording} variant="destructive">
                  <X className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              </div>
            </div>
          )}

          {/* Audio Playback */}
          {showPlayback && audioUrl && capturedMedia && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Audio Recorded</h3>
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <audio ref={audioRef} controls className="w-full">
                    <source src={audioUrl} type="audio/webm" />
                    Your browser does not support the audio element.
                  </audio>
                  <p className="text-sm text-gray-600 mt-2">
                    Duration: {formatTime(recordingTime)} | Size:{' '}
                    {(capturedMedia.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={processMediaWithAI}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Analyze & Generate Description
                    </>
                  )}
                </Button>
                <Button onClick={discardRecording} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Record Again
                </Button>
              </div>
            </div>
          )}

          {/* Captured Photo / Video */}
          {capturedMedia && mediaType !== 'audio' && !showPlayback && (
            <div className="space-y-4">
              <div className="text-center">
                {mediaType === 'photo' && (
                  <img
                    src={URL.createObjectURL(capturedMedia)}
                    alt="Captured"
                    className="max-w-full max-h-64 mx-auto rounded-lg border"
                  />
                )}
                {mediaType === 'video' && (
                  <video
                    src={URL.createObjectURL(capturedMedia)}
                    controls
                    className="max-w-full max-h-64 mx-auto rounded-lg border"
                  />
                )}
                <p className="text-sm text-gray-500 mt-2">
                  {capturedMedia.name} (
                  {(capturedMedia.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                <Button onClick={processMediaWithAI} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Analyze & Generate Description'
                  )}
                </Button>
                <Button variant="outline" onClick={retakeMedia}>
                  Retake
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
