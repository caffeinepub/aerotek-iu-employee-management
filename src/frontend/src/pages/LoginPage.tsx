import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Camera,
  CreditCard,
  Eye,
  EyeOff,
  LogIn,
  Shield,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Role } from "../backend";
import { useAuth } from "../contexts/AuthContext";
import type { Session } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";

function roleToSessionRole(role: Role): Session["role"] {
  switch (role) {
    case Role.hrAdmin:
      return "hrAdmin";
    case Role.manager:
      return "manager";
    case Role.employee:
      return "employee";
    case Role.supervisor:
      return "supervisor";
    default:
      return "employee";
  }
}

function getRoleDashboard(role: Session["role"]): string {
  switch (role) {
    case "hrAdmin":
      return "/hr";
    case "manager":
      return "/manager";
    case "employee":
      return "/employee";
    case "supervisor":
      return "/supervisor";
    default:
      return "/";
  }
}

export default function LoginPage() {
  const { actor } = useActor();
  const { setSession } = useAuth();
  const navigate = useNavigate();

  // Canister readiness state
  const [canisterReady, setCanisterReady] = useState(false);
  const warmupAttempts = useRef(0);
  const warmupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Badge scanner state
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [badgeInput, setBadgeInput] = useState("");
  const [badgeError, setBadgeError] = useState("");
  const [badgeLoading, setBadgeLoading] = useState(false);
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<unknown>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Silently warm up the canister by pinging it with a cheap call.
  // Keeps retrying with backoff until the canister responds — user only sees
  // a loading spinner, never an error message.
  const warmCanister = useCallback(async () => {
    if (!actor) return;
    try {
      // validateSession is a lightweight read — perfect for waking the canister
      await actor.validateSession("__ping__");
      setCanisterReady(true);
    } catch {
      // Canister still starting — retry after backoff (max ~30s total)
      warmupAttempts.current += 1;
      const delay = Math.min(2000 * warmupAttempts.current, 8000);
      warmupTimer.current = setTimeout(warmCanister, delay);
    }
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    warmCanister();
    return () => {
      if (warmupTimer.current) clearTimeout(warmupTimer.current);
    };
  }, [actor, warmCanister]);

  useEffect(() => {
    try {
      setCameraSupported("BarcodeDetector" in window);
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
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      try {
        // @ts-ignore
        const detector = new window.BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39"],
        });
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
            /* ignore */
          }
        }, 300);
      } catch {
        setCameraError(
          "Barcode detection not available. Please enter badge ID manually.",
        );
      }
    } catch {
      setCameraError("Camera access denied. Please enter badge ID manually.");
    }
  };

  const handleBadgeModalOpen = () => {
    setBadgeInput("");
    setBadgeError("");
    setCameraError("");
    setBadgeModalOpen(true);
  };

  const handleBadgeModalClose = () => {
    stopCamera();
    setBadgeModalOpen(false);
  };

  const handleBadgeLogin = async (badgeId: string) => {
    if (!badgeId.trim()) {
      setBadgeError("Please enter a badge ID.");
      return;
    }
    if (!actor) {
      setBadgeError("Cannot connect to server. Please refresh and try again.");
      return;
    }
    setBadgeLoading(true);
    setBadgeError("");
    try {
      const result = await actor.loginWithBadgeId(badgeId.trim());
      if (result.__kind__ === "err") {
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
    } catch (_err) {
      setBadgeError(
        _err instanceof Error ? _err.message : "Badge login failed",
      );
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
      setError("Please enter your username and password.");
      return;
    }
    if (!actor) {
      setError("Cannot connect. Please refresh the page and try again.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const profile = await actor.login(username.trim(), password);
      if (!profile) {
        setError("Invalid username or password.");
        setIsLoading(false);
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
    } catch (_err) {
      // On any canister error after we've already warmed it, just show a
      // generic message — never expose raw IC error codes to staff.
      setError("Unable to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  // ─── Loading screen while canister wakes up ─────────────────────────────────
  if (!canisterReady) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #0a1628 0%, #0d2244 40%, #0f2d5e 70%, #1a3a6e 100%)",
        }}
      >
        <div
          className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
          style={{
            background: "rgba(59,130,246,0.2)",
            border: "1px solid rgba(96,165,250,0.3)",
          }}
        >
          <Shield className="h-8 w-8 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Aerotek (IU)</h1>
        <p className="text-blue-300 text-sm mb-8">HR Management System</p>
        <div className="flex items-center gap-3 text-blue-300 text-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
          <span>Connecting...</span>
        </div>
      </div>
    );
  }

  // ─── Main login form ─────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-stretch"
      style={{
        background:
          "linear-gradient(135deg, #0a1628 0%, #0d2244 40%, #0f2d5e 70%, #1a3a6e 100%)",
      }}
    >
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute rounded-full opacity-10"
            style={{
              width: 500,
              height: 500,
              background: "radial-gradient(circle, #3b82f6, transparent)",
              top: -100,
              left: -100,
            }}
          />
          <div
            className="absolute rounded-full opacity-5"
            style={{
              width: 400,
              height: 400,
              background: "radial-gradient(circle, #60a5fa, transparent)",
              bottom: 0,
              right: -50,
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg"
              style={{
                background: "rgba(59,130,246,0.2)",
                border: "1px solid rgba(96,165,250,0.3)",
              }}
            >
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-blue-200 font-semibold text-lg tracking-wide">
              Aerotek (IU)
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Workforce Management
            </h2>
            <p className="text-blue-200 mt-3 text-lg leading-relaxed">
              A secure, role-based HR platform for scheduling, timesheets, and
              team management.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Role-based access control",
              "Advanced shift scheduling",
              "Timesheet & PTO management",
              "Real-time team notifications",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-blue-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-400 text-xs">
            &copy; {new Date().getFullYear()} Aerotek HR. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div
        className="flex flex-1 items-center justify-center p-6 lg:p-12"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{
                background: "rgba(59,130,246,0.2)",
                border: "1px solid rgba(96,165,250,0.3)",
              }}
            >
              <Shield className="h-7 w-7 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Aerotek (IU)</h1>
            <p className="text-blue-300 text-sm mt-1">HR Management System</p>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-blue-300 text-sm mt-1">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-blue-100 text-sm font-medium"
              >
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
                disabled={isLoading}
                data-ocid="login.username.input"
                className="h-11 text-white placeholder:text-blue-400/60"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(96,165,250,0.25)",
                  borderRadius: 8,
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-blue-100 text-sm font-medium"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  data-ocid="login.password.input"
                  className="h-11 pr-10 text-white placeholder:text-blue-400/60"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(96,165,250,0.25)",
                    borderRadius: 8,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2.5 text-sm p-3 rounded-lg"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
                data-ocid="login.error_state"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
                <span className="text-red-300">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold gap-2 text-white transition-all"
              style={{
                background: isLoading
                  ? "rgba(59,130,246,0.5)"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                border: "1px solid rgba(96,165,250,0.3)",
                borderRadius: 8,
              }}
              disabled={isLoading}
              data-ocid="login.submit_button"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center">
            <div
              className="inline-block w-full h-px mb-5"
              style={{ background: "rgba(96,165,250,0.15)" }}
            />
            <button
              type="button"
              onClick={handleBadgeModalOpen}
              className="flex items-center justify-center gap-2 w-full h-10 rounded-lg text-sm font-medium text-blue-300 hover:text-white transition-colors"
              style={{
                border: "1px solid rgba(96,165,250,0.2)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <CreditCard className="h-4 w-4" />
              Login with Staff ID Badge
            </button>
          </div>

          <p className="text-center text-xs text-blue-500">
            &copy; {new Date().getFullYear()} Aerotek HR &mdash; Powered by{" "}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || "aerotek-hr")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-300 underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>

      {/* Badge Scanner Modal */}
      <Dialog
        open={badgeModalOpen}
        onOpenChange={(open) => {
          if (!open) handleBadgeModalClose();
        }}
      >
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
                      <X className="h-3.5 w-3.5" /> Stop Camera
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
            {cameraSupported && (
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">
                  or enter manually
                </span>
                <div className="flex-1 border-t border-border" />
              </div>
            )}
            <form onSubmit={handleManualBadgeSubmit} className="space-y-3">
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
                <div className="flex items-center gap-2 text-sm p-2 rounded text-destructive bg-destructive/10">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {badgeError}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={badgeLoading || !badgeInput.trim()}
              >
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
