"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Shield, ChevronDown, ChevronUp, Zap, Server } from "lucide-react";
import { API_BASE_URL } from "@/config";

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
  High:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-400" },
  Medium:   { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-400" },
  Low:      { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", dot: "bg-slate-400" },
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  Detected:     { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  Investigating:{ bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  Analyzing:    { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  Contained:    { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  Resolved:     { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
};

const ATTACK_ICONS: Record<string, string> = {
  Phishing: "🎣",
  "Brute Force": "🔨",
  Ransomware: "🔐",
  "SQL Injection": "💉",
  Unknown: "⚠️",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, any[]>>({});
  const [filter, setFilter] = useState("All");

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents`);
      if (res.ok) setIncidents(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchLogs = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/simulation/${id}/status`);
      if (res.ok) {
        const data = await res.json();
        setLogs(prev => ({ ...prev, [id]: data.logs }));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (expanded) fetchLogs(expanded);
  }, [expanded, incidents]);

  const filtered = filter === "All" ? incidents : incidents.filter(i => i.status === filter);
  const statuses = ["All", "Detected", "Investigating", "Analyzing", "Contained", "Resolved"];

  return (
    <DashboardLayout title="Incidents">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", val: incidents.length, color: "text-slate-300" },
          { label: "Active", val: incidents.filter(i => i.status !== "Resolved").length, color: "text-orange-400" },
          { label: "Critical", val: incidents.filter(i => i.severity === "Critical").length, color: "text-red-400" },
          { label: "Resolved", val: incidents.filter(i => i.status === "Resolved").length, color: "text-green-400" },
        ].map(s => (
          <Card key={s.label} className="bg-black/40 border-white/10 backdrop-blur-md">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</span>
              <span className={`text-3xl font-bold ${s.color}`}>{s.val}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filter === s
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Incidents List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="p-16 text-center border border-dashed border-white/10 rounded-xl bg-white/5 text-slate-500">
            <AlertTriangle className="mx-auto mb-3 text-slate-600" size={32} />
            No incidents found. Run a simulation from the Dashboard.
          </div>
        )}
        {filtered.map((inc) => {
          const sev = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.Low;
          const sta = STATUS_CONFIG[inc.status] || STATUS_CONFIG.Detected;
          const isExpanded = expanded === inc.id;
          const incLogs = logs[inc.id] || [];

          return (
            <div key={inc.id} className={`rounded-xl border backdrop-blur-md overflow-hidden transition-all ${sev.border} bg-black/40`}>
              {/* Header row */}
              <button
                className="w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                onClick={() => setExpanded(isExpanded ? null : inc.id)}
              >
                <div className="text-2xl shrink-0">{ATTACK_ICONS[inc.attack_type] || "⚠️"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-xs text-cyan-400">{inc.id}</span>
                    <Badge variant="outline" className={`text-xs ${sev.bg} ${sev.text} ${sev.border}`}>{inc.severity}</Badge>
                    <Badge variant="outline" className={`text-xs ${sta.bg} ${sta.text} ${sta.border}`}>{inc.status}</Badge>
                    {inc.attack_type && (
                      <Badge variant="outline" className="text-xs bg-slate-800/60 text-slate-300 border-slate-600/40">{inc.attack_type}</Badge>
                    )}
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">{inc.title}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1"><Server size={11} />{inc.affected_endpoint || "Unknown"}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{new Date(inc.created_at).toLocaleString()}</span>
                    {inc.mitre_tactic && <span className="flex items-center gap-1"><Zap size={11} />{inc.mitre_tactic}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className={`text-2xl font-bold ${inc.risk_score >= 90 ? "text-red-400" : inc.risk_score >= 70 ? "text-orange-400" : "text-yellow-400"}`}>
                    {inc.risk_score}
                  </div>
                  <div className="text-xs text-slate-500">Risk Score</div>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </div>
              </button>

              {/* Expanded Agent Log */}
              {isExpanded && (
                <div className="border-t border-white/5 p-5 bg-black/30">
                  <div className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wider flex items-center gap-2">
                    <Shield size={12} /> AI Agent Activity Log
                  </div>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2">
                    {incLogs.length === 0 ? (
                      <div className="text-sm text-slate-500">No agent logs yet...</div>
                    ) : incLogs.map((log: any, idx: number) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <div className="shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1" />
                        </div>
                        <div>
                          <span className="text-cyan-300 font-medium text-xs">[{log.agent_name}] </span>
                          <span className="text-slate-300">{log.action}</span>
                          <div className="text-xs text-slate-600 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
