"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Users, Database, Key, AlertTriangle, Server, FileText } from "lucide-react";

const AUTH_FEATURES = [
  { icon: <Lock size={16} className="text-slate-500" />,    label: "Password Storage",    current: "Hardcoded (MVP)",    production: "Argon2 / bcrypt hashed in DB" },
  { icon: <Key size={16} className="text-slate-500" />,     label: "Session Management",  current: "sessionStorage token", production: "HttpOnly JWT cookies / server sessions" },
  { icon: <Users size={16} className="text-slate-500" />,   label: "Access Control",      current: "Single admin user",   production: "RBAC with granular permissions" },
  { icon: <Shield size={16} className="text-slate-500" />,  label: "Multi-Factor Auth",   current: "Not implemented",     production: "TOTP / WebAuthn / SMS OTP" },
  { icon: <Database size={16} className="text-slate-500" />,label: "User Database",       current: "None (hardcoded)",    production: "Encrypted user store with audit log" },
  { icon: <AlertTriangle size={16} className="text-slate-500" />, label: "Rate Limiting",  current: "Not implemented",     production: "Account lockout + CAPTCHA after N fails" },
  { icon: <Server size={16} className="text-slate-500" />,  label: "Audit Logging",       current: "Not implemented",     production: "Full event log: login, logout, access" },
  { icon: <FileText size={16} className="text-slate-500" />,label: "Compliance",          current: "N/A (Academic POC)", production: "SOC 2 / ISO 27001 / NIST ready" },
];

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings">

      {/* Auth Mode Banner */}
      <div className="flex items-center gap-4 p-4 border border-yellow-500/30 bg-yellow-500/5 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-yellow-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-yellow-300">
            Current Authentication Mode:{" "}
            <span className="font-black tracking-wide">MVP Demo Authentication</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            This is an academic proof-of-concept. Credentials are hardcoded and sessions use sessionStorage. Not suitable for production use.
          </p>
        </div>
      </div>

      {/* Security Posture */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={15} className="text-cyan-400" />
            <span className="text-sm font-semibold text-slate-200">Authentication Security Posture</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 border border-yellow-500/30 text-yellow-400 bg-yellow-500/5 tracking-widest uppercase">MVP Mode</span>
          </div>
          <div className="space-y-px border border-white/5">
            <div className="grid grid-cols-3 gap-4 px-4 py-2 bg-white/5 text-[10px] text-slate-500 uppercase tracking-widest">
              <span>Feature</span>
              <span>Current (MVP)</span>
              <span>Production Requirement</span>
            </div>
            {AUTH_FEATURES.map((f) => (
              <div key={f.label} className="grid grid-cols-3 gap-4 px-4 py-3 bg-black hover:bg-white/[0.02] transition-colors border-t border-white/5">
                <div className="flex items-center gap-2">
                  {f.icon}
                  <span className="text-xs text-slate-300 font-medium">{f.label}</span>
                </div>
                <span className="text-xs text-yellow-400/80">{f.current}</span>
                <span className="text-xs text-green-400/70">{f.production}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Demo Credentials */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Key size={15} className="text-cyan-400" />
            <span className="text-sm font-semibold text-slate-200">Demo Credentials</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Username", value: "admin" },
              { label: "Password", value: "admin123" },
            ].map((c) => (
              <div key={c.label} className="p-4 border border-white/10 bg-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{c.label}</p>
                <p className="font-mono text-cyan-400 text-sm">{c.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-4">
            ⚠ These credentials are hardcoded in <code className="text-slate-400">src/lib/auth.ts</code>. Replace with a secure authentication backend before any public deployment.
          </p>
        </CardContent>
      </Card>

    </DashboardLayout>
  );
}
