"use client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, PowerOff, UserMinus, Globe, Lock, Search, Eye, AlertTriangle, Clock } from "lucide-react";
import { useStore } from "@/store";
import { API_BASE_URL } from "@/config";

const PLAYBOOKS = [
  {
    key: "phishing",
    title: "Phishing Simulation",
    icon: "🎣",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
    desc: "Simulates a credential-harvesting spear-phishing email. Tests user awareness and email security controls.",
    mitre: "T1566.002 · T1078",
    duration: "~30 seconds",
  },
  {
    key: "hydra",
    title: "Hydra Brute Force (SSH)",
    icon: "🔨",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]",
    desc: "Simulates a Hydra-style SSH brute force attack from a Tor exit node. Tests lockout and detection policies.",
    mitre: "T1110.001 · T1021.004",
    duration: "~30 seconds",
  },
  {
    key: "ransomware",
    title: "Ransomware (LockBit 3.0)",
    icon: "🔐",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]",
    desc: "Simulates a LockBit 3.0 ransomware deployment via a malicious Office macro. Tests EDR and backup recovery.",
    mitre: "T1486 · T1490 · T1041",
    duration: "~30 seconds",
  },
  {
    key: "sqli",
    title: "SQL Injection (Web App)",
    icon: "💉",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]",
    desc: "Simulates a UNION-based SQL injection attack against a login endpoint. Tests WAF and DB hardening.",
    mitre: "T1190 · T1005",
    duration: "~30 seconds",
  },
];

const RESPONSE_ACTIONS = [
  { title: "Isolate Endpoint", icon: <PowerOff size={20} />, desc: "Cut off network access for a compromised device instantly.", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  { title: "Quarantine File", icon: <Shield size={20} />, desc: "Move identified malware into a secure encrypted vault.", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { title: "Suspend User Account", icon: <UserMinus size={20} />, desc: "Revoke active sessions and disable compromised accounts.", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  { title: "Block Domain / IP", icon: <Globe size={20} />, desc: "Add malicious URLs and IPs to the global firewall blocklist.", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { title: "Force Password Reset", icon: <Lock size={20} />, desc: "Trigger mandatory password reset and MFA re-enrollment.", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { title: "Deep Scan Endpoint", icon: <Search size={20} />, desc: "Initiate full behavioral and IOC scan on a suspicious device.", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  { title: "Enable Audit Logging", icon: <Eye size={20} />, desc: "Activate verbose audit logging on targeted systems.", color: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/20" },
  { title: "Trigger SIEM Alert", icon: <AlertTriangle size={20} />, desc: "Push high-priority alert to SIEM for escalation.", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
];

export default function ResponseCenterPage() {
  const { activeIncident, isSimulating, fetchMetrics, fetchIncidentStatus, setIsSimulating } = useStore();
  const [launching, setLaunching] = useState<string | null>(null);
  const [recentResponses, setRecentResponses] = useState<any[]>([]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeIncident && activeIncident.status !== "Resolved") {
      interval = setInterval(() => fetchIncidentStatus(activeIncident.id), 1500);
    }
    if (activeIncident?.status === "Resolved") {
      setIsSimulating(false);
    }
    return () => clearInterval(interval);
  }, [activeIncident?.id, activeIncident?.status]);

  const launchPlaybook = async (key: string) => {
    setLaunching(key);
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/simulation/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attack_type: key }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchIncidentStatus(data.incident_id);
        setRecentResponses(prev => [
          { type: key, time: new Date().toLocaleTimeString(), id: data.incident_id },
          ...prev.slice(0, 4)
        ]);
      }
    } catch (err) {
      console.error(err);
      setIsSimulating(false);
    } finally {
      setLaunching(null);
    }
  };

  return (
    <DashboardLayout title="Response Center">
      {/* Active Incident Banner */}
      {activeIncident && activeIncident.status !== "Resolved" && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-md animate-pulse">
          <AlertTriangle className="text-red-400 shrink-0" size={18} />
          <div>
            <span className="text-red-400 font-semibold">ACTIVE INCIDENT: </span>
            <span className="text-slate-300">{activeIncident.title}</span>
          </div>
          <Badge variant="outline" className="ml-auto bg-red-500/10 text-red-400 border-red-500/30">
            {activeIncident.status}
          </Badge>
        </div>
      )}

      {/* Attack Simulation Playbooks */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-md">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-slate-200 text-sm flex items-center gap-2">
            <span className="text-lg">🚀</span> Attack Simulation Playbooks
            <span className="ml-2 text-xs font-normal text-slate-500">— Safe controlled simulations for SOC training</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLAYBOOKS.map((pb) => {
              const isLaunching = launching === pb.key;
              const isActive = isSimulating && !isLaunching;
              return (
                <div
                  key={pb.key}
                  className={`p-5 rounded-xl border ${pb.border} ${pb.bg} ${pb.glow} transition-all backdrop-blur-sm`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl shrink-0">{pb.icon}</span>
                    <div>
                      <div className={`font-bold ${pb.color}`}>{pb.title}</div>
                      <div className="text-xs text-slate-400 mt-1 leading-relaxed">{pb.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={10} /> {pb.duration}</span>
                      <span className="font-mono">{pb.mitre}</span>
                    </div>
                    <button
                      onClick={() => launchPlaybook(pb.key)}
                      disabled={isSimulating}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${pb.bg} ${pb.color} ${pb.border} hover:brightness-125`}
                    >
                      {isLaunching ? "Launching..." : "▶ Launch"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Manual Response Actions */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-md">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-slate-200 text-sm flex items-center gap-2">
            <Shield size={14} className="text-cyan-400" /> Manual Response Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {RESPONSE_ACTIONS.map((action) => (
              <button
                key={action.title}
                className={`p-4 rounded-xl border ${action.border} ${action.bg} hover:brightness-110 transition-all text-center flex flex-col items-center gap-2.5 group`}
              >
                <div className={`${action.color} group-hover:scale-110 transition-transform`}>{action.icon}</div>
                <div className="text-xs font-semibold text-slate-200">{action.title}</div>
                <div className="text-xs text-slate-500 leading-tight">{action.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Simulations */}
      {recentResponses.length > 0 && (
        <Card className="bg-black/40 border-white/10 backdrop-blur-md">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-slate-200 text-sm flex items-center gap-2">
              <Clock size={13} className="text-cyan-400" /> Recent Simulation History (this session)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              {recentResponses.map((r, i) => {
                const pb = PLAYBOOKS.find(p => p.key === r.type);
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <span className="text-lg">{pb?.icon || "⚠️"}</span>
                    <span className={`text-sm font-medium ${pb?.color}`}>{pb?.title}</span>
                    <span className="text-xs font-mono text-slate-500">{r.id}</span>
                    <span className="ml-auto text-xs text-slate-500">{r.time}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
