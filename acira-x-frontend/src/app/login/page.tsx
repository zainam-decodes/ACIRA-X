"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { Eye, EyeOff, ShieldCheck, AlertCircle, Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate a slight network delay for realism
    await new Promise((r) => setTimeout(r, 800));

    const user = login(username, password);

    if (user) {
      router.replace("/dashboard");
    } else {
      setLoading(false);
      setError("Invalid credentials. Access denied.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/15 blur-[150px] rounded-full pointer-events-none" />

      {/* Corner brackets */}
      {["top-6 left-6 border-t border-l","top-6 right-6 border-t border-r","bottom-6 left-6 border-b border-l","bottom-6 right-6 border-b border-r"].map((c, i) => (
        <div key={i} className={`absolute w-8 h-8 border-cyan-500/20 ${c}`} />
      ))}

      {/* Status bar — top */}
      <div className="absolute top-0 inset-x-0 border-b border-white/5 px-8 py-3 flex items-center justify-between">
        <span className="text-xs font-black tracking-[0.2em] text-white">ACIRA-X</span>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          System Online
        </div>
      </div>

      {/* Login Card */}
      <div
        className={`relative z-10 w-full max-w-md mx-4 transition-transform ${shake ? "animate-[shake_0.4s_ease]" : ""}`}
      >
        {/* Card glow border */}
        <div className="absolute -inset-px bg-gradient-to-b from-cyan-500/20 to-blue-500/10 rounded-none pointer-events-none" />

        <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 border border-cyan-500/30 mb-5"
              style={{ background: "linear-gradient(135deg, #0a1628, #0c2040)" }}>
              <ShieldCheck className="text-cyan-400" size={26} />
            </div>
            <h1 className="text-2xl font-black tracking-[0.1em] text-white uppercase">SOC Access Portal</h1>
            <p className="text-xs text-slate-500 tracking-widest uppercase mt-2">ACIRA-X · Secure Authentication</p>
          </div>

          {/* Demo credentials hint */}
          <div className="flex items-start gap-3 p-3 bg-cyan-500/5 border border-cyan-500/15 mb-7">
            <AlertCircle size={14} className="text-cyan-400/70 mt-0.5 shrink-0" />
            <div className="text-[11px] text-slate-400 leading-relaxed">
              <span className="text-cyan-400/80 font-semibold">Demo credentials:</span>{" "}
              Username <code className="text-white bg-white/5 px-1">admin</code> · Password{" "}
              <code className="text-white bg-white/5 px-1">admin123</code>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-2">
                Username
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && passRef.current?.focus()}
                  required
                  placeholder="Enter username"
                  className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/60 focus:bg-white/[0.08] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  id="password"
                  ref={passRef}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="w-full bg-white/5 border border-white/10 pl-10 pr-12 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/60 focus:bg-white/[0.08] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2.5 p-3 bg-red-500/10 border border-red-500/30">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-btn"
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs tracking-widest uppercase transition-all duration-300 shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border border-black/30 border-t-black rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  Authorize Access
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-[10px] text-slate-600 mt-8 leading-relaxed">
            MVP Demo Authentication · Not for production use.<br />
            Production requires MFA, RBAC &amp; hashed credentials.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
