import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useActor } from '../hooks/useActor';
import { useAuth } from '../contexts/AuthContext';
import { Session } from '../contexts/AuthContext';
import { Role } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Eye, EyeOff, LogIn, CreditCard, Camera, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

function roleToSessionRole(role: Role): Session['role'] {
  switch (role) {
    case Role.hrAdmin: return 'hrAdmin';
    case Role.manager: return 'manager';
    case Role.employee: return 'employee';
    case Role.supervisor: return 'supervisor';
    default: return 'employee';
  }
}

function getRoleDashboard(role: Session['role']): string {
  switch (role) {
    case 'hrAdmin': return '/hr';
    case 'manager': return '/manager';
    case 'employee': return '/employee';
    case 'supervisor': return '/supervisor';
    default: return '/';
  }
}

export default function LoginPage() {
  const { actor } = useActor();
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Badge scanner state
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [badgeInput, setBadgeInput] = useState('');
  const [badgeError, setBadgeError] = useState('');
  const [badgeLoading, setBadgeLoading] = useState(false);
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<unknown>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const supported = 'BarcodeDetector' in window;
      setCameraSupported(supported);
    } catch {
      setCameraSupported(false);
    }
  }, []);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Start barcode scanning
      try {
        // @ts-ignore
        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39'] });
        detectorRef.current = detector;
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            // @ts-ignore
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              stopCamera();
              await handleBadgeLogin(code);
            }
          } catch {
            // ignore scan errors
          }
        }, 300);
      } catch {
        setCameraError('Barcode detection not available. Please enter badge ID manually.');
      }
    } catch (err) {
      setCameraError('Camera access denied. Please enter badge ID manually.');
    }
  };

  const handleBadgeModalOpen = () => {
    setBadgeInput('');
    setBadgeError('');
    setCameraError('');
    setBadgeModalOpen(true);
  };

  const handleBadgeModalClose = () => {
    stopCamera();
    setBadgeModalOpen(false);
  };

  const handleBadgeLogin = async (badgeId: string) => {
    if (!badgeId.trim()) {
      setBadgeError('Please enter a badge ID.');
      return;
    }
    if (!actor) {
      setBadgeError('System not ready. Please try again.');
      return;
    }
    setBadgeLoading(true);
    setBadgeError('');
    try {
      const result = await actor.loginWithBadgeId(badgeId.trim());
      if (result.__kind__ === 'err') {
        setBadgeError(result.err);
        return;
      }
      const profile = result.ok;
      const sessionRole = roleToSessionRole(profile.role);
      const session: Session = {
        username: profile.username,
        role: sessionRole,
        employeeId: profile.employeeId ?? undefined,
      };
      setSession(session);
      setBadgeModalOpen(false);
      navigate({ to: getRoleDashboard(sessionRole) });
    } catch (err) {
      setBadgeError(err instanceof Error ? err.message : 'Badge login failed');
    } finally {
      setBadgeLoading(false);
    }
  };

  const handleManualBadgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleBadgeLogin(badgeInput);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    if (!actor) {
      setError('System not ready. Please try again.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const profile = await actor.login(username.trim(), password);
      if (!profile) {
        setError('Invalid username or password.');
        return;
      }
      const sessionRole = roleToSessionRole(profile.role);
      const session: Session = {
        username: profile.username,
        role: sessionRole,
        employeeId: profile.employeeId ?? undefined,
      };
      setSession(session);
      navigate({ to: getRoleDashboard(sessionRole) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="/assets/generated/login-bg.dim_1920x1080.png"
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/80" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/assets/generated/aerotek-logo.dim_256x256.png"
            alt="Aerotek"
            className="h-16 w-16 mb-3"
          />
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Aerotek</h1>
          <p className="text-muted-foreground text-sm mt-1">HR Management System</p>
        </div>

        <Card className="shadow-xl border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                Sign In
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleBadgeModalOpen}
                className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Login with Staff ID Badge
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Aerotek HR. Built with{' '}
          <span className="text-red-500">♥</span> using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'aerotek-hr')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </div>

      {/* Badge Scanner Modal */}
      <Dialog open={badgeModalOpen} onOpenChange={(open) => { if (!open) handleBadgeModalClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Staff ID Badge Login
            </DialogTitle>
            <DialogDescription>
              Scan your badge or enter your badge ID manually.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {cameraSupported && (
              <div>
                {!cameraActive ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={startCamera}
                    disabled={badgeLoading}
                  >
                    <Camera className="h-4 w-4" />
                    Start Camera Scan
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-2 border-primary w-48 h-24 rounded-lg opacity-70" />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1"
                      onClick={stopCamera}
                    >
                      <X className="h-3.5 w-3.5" />
                      Stop Camera
                    </Button>
                  </div>
                )}
              </div>
            )}

            {cameraError && (
              <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {cameraError}
              </div>
            )}

            <div className="relative">
              {cameraSupported && <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center"><div className="flex-1 border-t border-border" /><span className="px-2 text-xs text-muted-foreground bg-background">or enter manually</span><div className="flex-1 border-t border-border" /></div>}
            </div>

            <form onSubmit={handleManualBadgeSubmit} className="space-y-3" style={{ marginTop: cameraSupported ? '1.5rem' : 0 }}>
              <div>
                <Label htmlFor="badge-id">Badge ID</Label>
                <Input
                  id="badge-id"
                  value={badgeInput}
                  onChange={(e) => setBadgeInput(e.target.value)}
                  placeholder="Enter badge ID..."
                  disabled={badgeLoading}
                  className="mt-1"
                />
              </div>

              {badgeError && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {badgeError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={badgeLoading || !badgeInput.trim()}>
                {badgeLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : null}
                Login with Badge
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
