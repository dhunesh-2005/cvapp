import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  AlertTriangle,
  Eye,
  Mic,
  MicOff,
  Play,
  Pause,
  Scan,
  Signal,
  FileText,
  MapPin,
  Globe
} from 'lucide-react';
import { analyzeRoadScene } from './services/geminiService';
import AnalysisPanel from './components/AnalysisPanel';
import { AnalysisResult } from './types';

const App: React.FC = () => {
  // Modes
  const [mode, setMode] = useState<'initial' | 'camera' | 'upload'>('initial');
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);

  // Data
  const [mediaSource, setMediaSource] = useState<string | null>(null); // For uploaded files (URL)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null); // For live camera
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // States
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isAutoScan, setIsAutoScan] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoScanInterval = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Voice / TTS Logic ---
  const speak = useCallback((text: string, priority: boolean = false) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;

    // Cancel current speech if priority (e.g. Danger)
    if (priority) window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Slightly faster for alerts
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, [isVoiceEnabled]);

  // React to new results with Voice
  useEffect(() => {
    if (result && isVoiceEnabled) {
      if (result.safetyLevel === 'DANGER') {
        speak(`Warning. ${result.recommendation}`, true);
      } else if (result.safetyLevel === 'CAUTION') {
        speak(`Caution. ${result.recommendation}`);
      } else {
        // Only speak safe messages if it's not spamming in auto-scan
        if (!isAutoScan) speak(result.recommendation);
      }
    }
  }, [result, isVoiceEnabled, speak, isAutoScan]);

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      setCameraStream(stream);
      setMode('camera');
      setFileType('video'); // Camera is treated as a video stream
      setError(null);
      setResult(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Check permissions or try a different browser.");
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  // Attach stream to video element when ready
  useEffect(() => {
    if (mode === 'camera' && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
  }, [mode, cameraStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (autoScanInterval.current) {
        clearInterval(autoScanInterval.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- File Upload Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMediaSource(url);
      setMode('upload');
      setResult(null);
      setError(null);

      if (file.type.startsWith('video/')) {
        setFileType('video');
      } else {
        setFileType('image');
      }
    }
  };

  // --- Analysis Logic ---
  const captureAndAnalyze = async () => {
    if (analyzing) return; // Prevent overlapping requests

    let imageDataUrl: string | null = null;

    // Capture from Video (Camera or File)
    if (fileType === 'video' && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      // Ensure we have dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        imageDataUrl = canvas.toDataURL('image/jpeg', 0.8); // 0.8 quality for speed
      }
    }
    // Capture from Image
    else if (fileType === 'image' && mediaSource) {
      try {
        const response = await fetch(mediaSource);
        const blob = await response.blob();
        imageDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Error converting image to base64:", error);
        return;
      }
    }

    if (imageDataUrl) {
      setAnalyzing(true);
      try {
        const analysis = await analyzeRoadScene(imageDataUrl);
        setResult(analysis);
        setError(null);
      } catch (err) {
        // Don't show full error in auto-scan mode to avoid flicker, just log
        console.error(err);
        if (!isAutoScan) setError("Analysis failed. Try again.");
      } finally {
        setAnalyzing(false);
      }
    }
  };

  // --- Auto Scan Effect ---
  useEffect(() => {
    if (isAutoScan) {
      const id = window.setInterval(() => {
        captureAndAnalyze();
      }, 4000); // Scan every 4 seconds
      autoScanInterval.current = id;
    } else {
      if (autoScanInterval.current) {
        clearInterval(autoScanInterval.current);
        autoScanInterval.current = null;
      }
    }
    return () => {
      if (autoScanInterval.current) clearInterval(autoScanInterval.current);
    };
  }, [isAutoScan, fileType, mediaSource, mode, cameraStream]); // Dependencies for auto-scan

  const reset = () => {
    stopCamera();
    setIsAutoScan(false);
    setMode('initial');
    setMediaSource(null);
    setResult(null);
    setFileType(null);
    setError(null);
  };

  // Render Helpers
  const renderVisualizer = () => {
    if (mode === 'initial') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group">
          {/* Subtle grid background */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-hud-primary/10 flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 rounded-full border border-hud-primary/30 animate-pulse-slow"></div>
              <div className="absolute inset-2 rounded-full border border-hud-primary/20 animate-ping opacity-20"></div>
              <Eye className="w-10 h-10 text-hud-primary" />
            </div>

            <h2 className="text-2xl font-mono font-bold text-white mb-3 tracking-widest uppercase">System Standby</h2>
            <p className="text-hud-text-dim text-sm font-mono tracking-wide">Ready: Select Input Source</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group">
        {/* Constrained Media Container */}
        <div className="relative max-w-[80%] max-h-[80%] w-full h-full flex items-center justify-center rounded-xl overflow-hidden border border-hud-border shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-hud-gray/50">
          {/* Media Player */}
          {fileType === 'video' ? (
            <video
              ref={videoRef}
              src={mode === 'upload' && mediaSource ? mediaSource : undefined}
              autoPlay
              playsInline
              controls={mode === 'upload'}
              loop={mode === 'upload'}
              muted
              className="w-full h-full object-contain"
            />
          ) : (
            <img ref={imageRef} src={mediaSource!} alt="Analysis Target" className="w-full h-full object-contain" />
          )}

          {/* HUD Overlay (Scanning Effect) - Scoped to Media */}
          {(analyzing || isAutoScan) && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-0 left-0 w-full h-1 bg-hud-primary/50 shadow-[0_0_15px_rgba(0,122,255,0.8)] animate-[scan_2s_linear_infinite]"></div>
              <div className="absolute inset-0 border-[2px] border-hud-primary/30 rounded-xl"></div>
              <div className="absolute top-4 right-4 text-hud-primary font-mono text-[10px] animate-pulse bg-black/50 px-2 py-1 rounded border border-hud-primary/30">ANALYZING FRAME DATA...</div>
            </div>
          )}
        </div>

        {/* HUD Grid (Background) */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,122,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,122,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] -z-10"></div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-hud-black text-hud-text font-sans flex flex-col overflow-hidden selection:bg-hud-primary/30">

      {/* 1. TOP BAR */}
      <header className="h-16 border-b border-hud-border bg-hud-black/95 backdrop-blur-md flex items-center justify-between px-6 z-50 relative shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-hud-primary drop-shadow-[0_0_8px_rgba(0,122,255,0.5)]" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-wider leading-none">
              <span className="text-white">Nex</span><span className="text-hud-primary">Vue</span>
            </h1>
            <span className="text-[9px] font-mono text-hud-text-dim tracking-[0.2em]">HAZARD DETECTION V3</span>
          </div>
        </div>

        {/* Center Action Buttons */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          {mode === 'initial' ? (
            <>
              <button
                onClick={startCamera}
                className="group flex items-center gap-2 px-5 py-2 bg-hud-gray rounded-full border border-hud-border transition-all hover:border-hud-primary hover:shadow-[0_0_15px_rgba(0,122,255,0.2)]"
              >
                <Camera className="w-4 h-4 text-hud-text-dim group-hover:text-hud-primary transition-colors" />
                <span className="text-xs font-medium tracking-wide">LIVE CAMERA</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group flex items-center gap-2 px-5 py-2 bg-hud-gray rounded-full border border-hud-border transition-all hover:border-hud-primary hover:shadow-[0_0_15px_rgba(0,122,255,0.2)]"
              >
                <Upload className="w-4 h-4 text-hud-text-dim group-hover:text-hud-primary transition-colors" />
                <span className="text-xs font-medium tracking-wide">UPLOAD MEDIA</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 bg-hud-gray/50 rounded-full p-1 border border-hud-border">
              {/* Mode Controls */}
              {!isAutoScan && (
                <button
                  onClick={captureAndAnalyze}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-4 py-1.5 bg-hud-primary text-black font-bold text-xs rounded-full hover:bg-white transition-all disabled:opacity-50"
                >
                  <Scan className={`w-3 h-3 ${analyzing ? 'animate-spin' : ''}`} />
                  SCAN
                </button>
              )}

              {fileType === 'video' && (
                <button
                  onClick={() => setIsAutoScan(!isAutoScan)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isAutoScan
                    ? 'bg-hud-danger text-white animate-pulse'
                    : 'bg-transparent text-hud-primary hover:bg-hud-primary/10'
                    }`}
                >
                  {isAutoScan ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isAutoScan ? 'STOP' : 'AUTO'}
                </button>
              )}

              <button
                onClick={reset}
                className="p-2 text-hud-text-dim hover:text-white transition-colors rounded-full hover:bg-white/5"
                title="Reset"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-6">
          {/* Voice Toggle */}
          <button
            onClick={() => {
              const newState = !isVoiceEnabled;
              setIsVoiceEnabled(newState);
              if (!newState && window.speechSynthesis) window.speechSynthesis.cancel();
            }}
            className="text-hud-text-dim hover:text-white transition-colors relative"
            title={isVoiceEnabled ? "Mute Voice" : "Enable Voice"}
          >
            {isVoiceEnabled ? <Mic className="w-5 h-5 text-hud-primary" /> : <MicOff className="w-5 h-5 opacity-50 relative" />}
            {!isVoiceEnabled && (
              <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-red-500 -rotate-45 transform -translate-y-1/2"></div>
            )}
          </button>

          {/* System Status */}
          <div className="flex items-center gap-3 pl-6 border-l border-hud-border h-8">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-mono tracking-wider text-hud-text-dim">Status</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-hud-success shadow-none">ONLINE</span>
            </div>
            <div className="w-1.5 h-6 bg-hud-success rounded-[1px] shadow-[0_0_8px_rgba(0,255,157,0.6)] animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Viewport */}
        <div className="flex-1 relative flex flex-col bg-black">
          {renderVisualizer()}

          {/* Debug/Canvas */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Right: Telemetry Panel */}
        <aside className="w-[400px] border-l border-hud-border bg-hud-dark flex flex-col relative z-20">
          <AnalysisPanel result={result} loading={analyzing} />

          {/* Error Toast */}
          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-950/90 border border-hud-danger/50 p-4 rounded backdrop-blur-sm flex items-start gap-3 shadow-lg z-50">
              <AlertTriangle className="text-hud-danger w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-hud-danger font-mono text-xs font-bold uppercase mb-1">System Alert</h4>
                <p className="text-xs text-red-200 leading-relaxed">{error}</p>
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* 3. BOTTOM INFO BAR */}
      <footer className="h-8 border-t border-hud-border bg-hud-black flex items-center justify-between px-4 text-[10px] font-mono text-hud-text-dim shrink-0 z-50 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3 text-hud-primary" />
            <span className="uppercase tracking-wider">System Logs: Nominal</span>
          </div>
          <span className="text-hud-border">|</span>
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3" />
            <span>LAT: 34.0522 N  LONG: 118.2437 W</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span>v3.0.1 Stable</span>
          <span className="text-hud-border">|</span>
          <div className="flex items-center gap-2 text-hud-success">
            <Signal className="w-3 h-3" />
            <span className="tracking-wider">5G CONNECTED</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;