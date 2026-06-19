"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/config";
import { useStore, AutonomousActionLog, ActionLogStats } from "@/store";
import {
  Zap, ShieldAlert, Cpu, ArrowDown, Activity, Clock, CheckCircle,
  AlertTriangle, Play, RefreshCw, ShieldCheck, Eye, Terminal
} from "lucide-react";
import Link from "next/link";

const SEVERITY_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Critical: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  High:     { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  Medium:   { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  Low:      { text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
};

export default function ActionLogPage() {
  const { actionLogs, actionLogStats, fetchActionLogs } = useStore();
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    await fetchActionLogs();
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
    // Refresh action log every 4 seconds to capture new events instantly
    const interval = setInterval(fetchActionLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout title="Autonomous Response Actions">
      {/* Overview Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/25 p-4 rounded-xl border border-white/5 backdrop-blur-md">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Zap className="text-cyan-400 animate-pulse" size={18} />
            ACIRA Decision Reasoning Registry
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log recording every telemetry-triggered anomaly event, autonomous reasoning chain, and containment action.
          </p>
        </div>
        <div>
          <button 
            onClick={loadLogs}
            disabled={loading}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 bg-cyan-950/20 px-3 py-1.5 border border-cyan-500/30 rounded-lg font-bold transition-all"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Reload Actions
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {actionLogStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Decisions", val: actionLogStats.total_actions, color: "text-slate-300" },
            { label: "Success Rate", val: `${actionLogStats.success_rate}%`, color: "text-cyan-400" },
            { label: "Critical Actions", val: actionLogStats.critical, color: "text-red-400" },
            { label: "High Priority", val: actionLogStats.high, color: "text-orange-400" },
            { label: "Completed Steps", val: actionLogStats.completed, color: "text-green-400" },
          ].map(s => (
            <Card key={s.label} className="bg-black/40 border-white/10 backdrop-blur-md">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{s.label}</span>
                <span className={`text-2xl font-bold ${s.color} mt-1`}>{s.val}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Timeline Section */}
      <div className="flex flex-col gap-6 relative">
        {/* Vertical timeline line */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-white/5 pointer-events-none hidden md:block" />

        {actionLogs.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-white/10 rounded-xl bg-white/5 text-slate-500 text-sm">
            No autonomous actions logged yet. Run an attack simulator or trigger a real threat on the endpoint using `demo_trigger.py`.
          </div>
        ) : (
          actionLogs.map((log) => {
            const sc = SEVERITY_COLOR[log.severity] || SEVERITY_COLOR.Medium;
            
            return (
              <div key={log.id} className="relative flex flex-col md:flex-row gap-6 md:pl-12">
                {/* Timeline circle icon */}
                <div className="absolute left-3 w-6 h-6 rounded-full bg-[#030712] border-2 border-cyan-500/50 flex items-center justify-center shrink-0 -translate-x-[2px] shadow-[0_0_10px_rgba(6,182,212,0.3)] hidden md:flex">
                  <Zap size={10} className="text-cyan-400 animate-pulse" />
                </div>

                <div className="flex-1">
                  <Card className="bg-black/40 border-white/10 backdrop-blur-md overflow-hidden hover:border-cyan-500/30 transition-all duration-300 relative">
                    {/* Time Header */}
                    <div className="flex justify-between items-center bg-white/5 px-5 py-3 border-b border-white/5 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock size={11} />
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        {log.incident_id && (
                          <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-500/20">
                            {log.incident_id}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          Endpoint: {log.endpoint_id}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${sc.bg} ${sc.text} ${sc.border}`}>
                          {log.severity} Threat
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] font-bold">
                          {log.action_status}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                        
                        {/* 1. Detection Stage */}
                        <div className="flex flex-col gap-2 p-4 rounded-lg bg-white/5 border border-white/5">
                          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            Step 1: Detection Input
                          </span>
                          <h4 className="text-xs font-bold text-slate-200 mt-1">
                            {log.detection_trigger}
                          </h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-mono mt-1 whitespace-pre-line bg-black/30 p-2.5 rounded border border-white/5">
                            {log.detection_detail}
                          </p>
                        </div>

                        {/* 2. Decision Stage */}
                        <div className="flex flex-col gap-2 p-4 rounded-lg bg-blue-950/10 border border-blue-900/30 relative">
                          {/* Flow indicator */}
                          <div className="absolute right-[-16px] top-[45%] text-cyan-500/20 hidden lg:block font-bold">▶</div>
                          <div className="absolute left-[-16px] top-[45%] text-cyan-500/20 hidden lg:block font-bold">▶</div>
                          
                          <span className="text-[9px] uppercase tracking-widest text-blue-400 font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            Step 2: AI Agent Decision
                          </span>
                          <h4 className="text-xs font-bold text-blue-300 mt-1">
                            Autonomic Policy Reasoning
                          </h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                            {log.decision_reasoning}
                          </p>
                        </div>

                        {/* 3. Action Stage */}
                        <div className="flex flex-col gap-2 p-4 rounded-lg bg-green-950/10 border border-green-900/30">
                          <span className="text-[9px] uppercase tracking-widest text-green-400 font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            Step 3: Response Actions
                          </span>
                          <h4 className="text-xs font-bold text-green-300 mt-1 flex items-center gap-1">
                            <ShieldCheck size={13} />
                            {log.action_taken}
                          </h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                            {log.action_detail}
                          </p>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
