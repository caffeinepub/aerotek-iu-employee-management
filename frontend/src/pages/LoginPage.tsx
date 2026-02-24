import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, LogIn, Shield, CreditCard, X, Camera, Loader2, AlertCircle, KeyboardIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useActor } from '../hooks/useActor';
import { useLoginWithBadgeId } from '../hooks/useQueries';
import { useAuthContext } from '../contexts/AuthContext';
import { Role } from '../backend';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ---- Badge Scanner Modal ----
interface BadgeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (role: string) => void;
}

function BadgeScannerModal({ open, onClose, onSuccess }: BadgeScannerModalProps) {
  const loginWithBadgeId = useLoginWithBadgeId();
  const { setSession } = useAuthContext();

  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualId, setManualId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannedRef = useRef(false);

  // Check BarcodeDetector support
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    setBarcodeDetectorSupported(supported);
    if (!supported) setMode('manual');
  }, []);

  // Start camera when modal opens in camera mode
  useEffect(() => {
    if (open && mode === 'camera' && barcodeDetectorSupported) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, barcodeDetectorSupported]);

  const startCamera = async () => {
    setCameraError(null);
    scannedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startBarcodeScanning();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setCameraError('Camera permission denied. Please allow camera access or use manual entry.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setCameraError('No camera found. Please use manual entry.');
      } else {
        setCameraError('Could not start camera. Please use manual entry.');
      }
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startBarcodeScanning = () => {
    if (!('BarcodeDetector' in window)) return;
    // @ts-ignore - BarcodeDetector is not in TS lib yet
    const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'data_matrix', 'pdf417'] });

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || scannedRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) return;

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      try {
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0 && !scannedRef.current) {
          scannedRef.current = true;
          const badgeId = barcodes[0].rawValue as string;
          await handleBadgeLogin(badgeId);
        }
      } catch {
        // Ignore detection errors
      }
    }, 200);
  };

  const handleBadgeLogin = async (badgeId: string) => {
    if (!badgeId.trim()) {
      setError('Please enter a badge ID.');
      return;
    }
    setError(null);
    setIsScanning(true);
    try {
      const profile = await loginWithBadgeId.mutateAsync(badgeId.trim());
      const roleMap: Record<string, 'hrAdmin' | 'manager' | 'employee' | 'supervisor'> = {
        [Role.hrAdmin]: 'hrAdmin',
        [Role.manager]: 'manager',
        [Role.employee]: 'employee',
        [Role.supervisor]: 'supervisor',
      };
      const role = roleMap[profile.role as string] ?? 'employee';
      setSession({
        username: profile.username,
        displayName: profile.username,
        role,
        employeeId: profile.employeeId ?? undefined,
      });
      stopCamera();
      onSuccess(role);
    } catch (err) {
      scannedRef.current = false;
      const msg = err instanceof Error ? err.message : 'Badge ID not found';
      if (msg.includes('No employee found') || msg.includes('not found') || msg.includes('No linked')) {
        setError('Badge ID not found. Please try again.');
      } else {
        setError('Badge ID not found. Please try again.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleBadgeLogin(manualId);
  };

  const handleClose = () => {
    stopCamera();
    setError(null);
    setCameraError(null);
    setManualId('');
    scannedRef.current = false;
    onClose();
  };

  const switchToManual = () => {
    stopCamera();
    setMode('manual');
    setError(null);
    setCameraError(null);
  };

  const switchToCamera = () => {
    setMode('camera');
    setError(null);
    setManualId('');
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="bg-navy-900 border border-navy-700/50 text-white max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-navy-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-white text-base font-semibold">Staff ID Badge Login</DialogTitle>
              <DialogDescription className="text-navy-400 text-xs mt-0.5">
                {mode === 'camera' ? 'Hold your badge up to the camera' : 'Enter your badge ID number'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* Mode toggle */}
          {barcodeDetectorSupported && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={switchToCamera}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  mode === 'camera'
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                    : 'bg-navy-800/60 border border-navy-600/40 text-navy-400 hover:text-navy-200'
                }`}
              >
                <Camera className="w-4 h-4" />
                Camera Scan
              </button>
              <button
                type="button"
                onClick={switchToManual}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  mode === 'manual'
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                    : 'bg-navy-800/60 border border-navy-600/40 text-navy-400 hover:text-navy-200'
                }`}
              >
                <KeyboardIcon className="w-4 h-4" />
                Manual Entry
              </button>
            </div>
          )}

          {/* Camera mode */}
          {mode === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-red-400 text-sm">{cameraError}</p>
                  <button
                    type="button"
                    onClick={switchToManual}
                    className="mt-3 text-amber-400 hover:text-amber-300 text-sm underline"
                  >
                    Use manual entry instead
                  </button>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-navy-800 border border-navy-600/50" style={{ aspectRatio: '16/9' }}>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-32 border-2 border-amber-400/70 rounded-lg relative">
                      {/* Corner accents */}
                      <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 border-amber-400 rounded-tl" />
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 border-amber-400 rounded-tr" />
                      <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 border-amber-400 rounded-bl" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 border-amber-400 rounded-br" />
                      {/* Scan line animation */}
                      <div className="absolute inset-x-0 h-0.5 bg-amber-400/60 animate-[scan_2s_ease-in-out_infinite]" style={{ top: '50%' }} />
                    </div>
                  </div>
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-navy-900/80">
                      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                    </div>
                  )}
                  {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-navy-900/70">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        <p className="text-amber-400 text-sm font-medium">Verifying badge...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-center text-navy-400 text-xs">
                Position your ID badge barcode or QR code within the frame
              </p>
            </div>
          )}

          {/* Manual entry mode */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-navy-200 mb-1.5">Badge ID Number</label>
                <input
                  type="text"
                  value={manualId}
                  onChange={e => setManualId(e.target.value)}
                  placeholder="Enter your badge ID..."
                  className="w-full px-4 py-3 bg-navy-800/60 border border-navy-600/50 rounded-xl text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  autoFocus
                  disabled={isScanning}
                />
              </div>
              <button
                type="submit"
                disabled={isScanning || !manualId.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 font-semibold rounded-xl transition-all duration-200"
              >
                {isScanning ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</>
                ) : (
                  <><CreditCard className="w-4 h-4" />Login with Badge</>
                )}
              </button>
            </form>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main Login Page ----
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoggingIn, loginError } = useAuth();
  const { isFetching } = useActor();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [badgeScannerOpen, setBadgeScannerOpen] = useState(false);

  const navigateByRole = (role: string) => {
    if (role === 'hrAdmin') {
      navigate({ to: '/hr' });
    } else if (role === 'manager') {
      navigate({ to: '/manager' });
    } else if (role === 'supervisor') {
      navigate({ to: '/supervisor/dashboard' });
    } else {
      navigate({ to: '/employee' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    const result = await login(username.trim(), password);
    if (result.success) {
      navigateByRole(result.role ?? 'employee');
    } else {
      setError(result.error ?? 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-navy-950">
      {/* Background */}
      <div className="absolute inset-0">
        <img src="/assets/generated/login-bg.dim_1920x1080.png" alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900/90 to-navy-950" />
      </div>

      {/* Animated orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-400/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/30 mb-4 backdrop-blur-sm">
            <img src="/assets/generated/aerotek-logo.dim_256x256.png" alt="Aerotek" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Aerotek HR</h1>
          <p className="text-navy-300 mt-1 text-sm">Workforce Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-navy-900/80 backdrop-blur-xl border border-navy-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 bg-navy-800/60 border border-navy-600/50 rounded-xl text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                autoComplete="username"
                disabled={isLoggingIn || isFetching}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 bg-navy-800/60 border border-navy-600/50 rounded-xl text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  autoComplete="current-password"
                  disabled={isLoggingIn || isFetching}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {(error || loginError) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error || loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || isFetching}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                  Signing in...
                </>
              ) : isFetching ? (
                <>
                  <div className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Badge login link */}
          <div className="mt-5 pt-5 border-t border-navy-700/50 text-center">
            <button
              type="button"
              onClick={() => setBadgeScannerOpen(true)}
              disabled={isFetching}
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <CreditCard className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Login with Staff ID Badge
            </button>
          </div>
        </div>

        <p className="text-center text-navy-500 text-xs mt-6">
          Built with <span className="text-red-400">♥</span> using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500/70 hover:text-amber-400 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>

      {/* Badge Scanner Modal */}
      <BadgeScannerModal
        open={badgeScannerOpen}
        onClose={() => setBadgeScannerOpen(false)}
        onSuccess={role => {
          setBadgeScannerOpen(false);
          navigateByRole(role);
        }}
      />
    </div>
  );
}
