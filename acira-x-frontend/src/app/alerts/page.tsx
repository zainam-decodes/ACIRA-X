"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Filter } from "lucide-react";
import { API_BASE_URL } from "@/config";

const SEVERITY_COLORS: Record<string, { left: string; bg: string; text: string; border: string }> = {
  Critical: { left: "border-l-red-500",   bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30" },
  High:     { left: "border-l-orange-500",bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  Medium:   { left: "border-l-yellow-500",bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  Low:      { left: "border-l-slate-500", bg: "bg-slate-500/10",  text: "text-slate-400",  border: "border-slate-500/20" },
};

const ATTACK_ICONS: Record<string, string> = {
  Phishing: "🎣",
  "Brute Force": "🔨",
  Ransomware: "🔐",
  "SQL Injection": "💉",
  Unknown: "⚠️",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts`);
      if (res.ok) setAlerts(await res.json());
    } catch (e) { console.error(e); }
  };

  const acknowledge = async (id: number) => {
    await fetch(`${API_BASE_URL}/api/alerts/${id}/acknowledge`, { method: "POST" });
    fetchAlerts();
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "All" ? alerts : alerts.filter(a => a.status === filter);

  return (
    <DashboardLayout title="Security Alerts">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Alerts", val: alerts.length, color: "text-slate-300" },
          { label: "New / Unread", val: alerts.filter(a => a.status === "New").length, color: "text-red-400" },
          { label: "Acknowledged", val: alerts.filter(a => a.status === "Acknowledged").length, color: "text-green-400" },
        ].map(s => (
          <Card key={s.label} className="bg-black/40 border-white/10 backdrop-blur-md">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</div>
              <div className={`text-3xl font-bold mt-1 ${s.color}`}>{s.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-slate-500" />
        {["All", "New", "Acknowledged", "Resolved"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filter === f
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alert Cards */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="p-16 text-center border border-dashed border-white/10 rounded-xl bg-white/5 text-slate-500">
            <AlertCircle className="mx-auto mb-3 text-slate-600" size={32} />
            No alerts in this category. Run a simulation to generate alerts.
          </div>
        )}
        {filtered.map((alert) => {
          const sev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.Low;
          const isNew = alert.status === "New";
          return (
            <Card
              key={alert.id}
              className={`bg-black/40 border-l-4 ${sev.left} border-y-white/10 border-r-white/10 backdrop-blur-md transition-all ${isNew ? "shadow-lg" : "opacity-75"}`}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`p-2.5 ${sev.bg} rounded-xl shrink-0 text-xl`}>
                  {ATTACK_ICONS[alert.attack_type] || "⚠️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-slate-100 font-semibold">{alert.title}</h4>
                    <Badge className={`text-xs ${sev.bg} ${sev.text} hover:${sev.bg} border ${sev.border}`}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${isNew ? "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse" : "bg-green-500/10 text-green-400 border-green-500/30"}`}>
                      {alert.status}
                    </Badge>
                  </div>
                  {alert.description && (
                    <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{alert.description}</p>
                  )}
                  <div className="text-xs text-slate-500 mt-2 flex items-center gap-4 flex-wrap">
                    <span>Source: <span className="text-slate-400 font-mono">{alert.source}</span></span>
                    {alert.attack_type && <span>Type: <span className="text-slate-400">{alert.attack_type}</span></span>}
                    <span className="flex items-center gap-1"><Clock size={11} />{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                {isNew && (
                  <button
                    onClick={() => acknowledge(alert.id)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-all"
                  >
                    <CheckCircle size={12} /> Acknowledge
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
