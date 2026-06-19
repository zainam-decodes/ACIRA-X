"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/config";
import {
  AlertTriangle, Clock, Shield, ChevronDown, ChevronUp,
  Zap, Server, Filter, CheckCircle2, AlertOctagon, RefreshCw
} from "lucide-react";

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

export default function IncidentHistoryPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, any>>({});
  
  // Filters
  const [sevFilter, setSevFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");

  const [loading, setLoading] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async (id: string) => {
    if (analyses[id]) return; // Cache check
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${id}/analysis`);
      if (res.ok) {
        const data = await res.json();
        setAnalyses(prev => ({ ...prev, [id]: data }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleRowClick = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchAnalysis(id);
    }
  };

  // Filter application
  const filtered = incidents.filter(inc => {
    const matchesSev = sevFilter === "All" || inc.severity === sevFilter;
    const matchesStatus = statusFilter === "All" || inc.status === statusFilter;
    const matchesSource = sourceFilter === "All" || 
      (sourceFilter === "Real Telemetry" && inc.source === "telemetry") ||
      (sourceFilter === "Attack Sim" && inc.source === "simulation");
    
    return matchesSev && matchesStatus && matchesSource;
  });

  return (
    <DashboardLayout title="Incident History Center">
      {/* Metrics Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Aggregate Incidents", val: incidents.length, color: "text-slate-300", icon: <Shield size={16} /> },
          { label: "Active Escalations", val: incidents.filter(i => i.status !== "Resolved").length, color: "text-orange-400", icon: <AlertTriangle size={16} /> },
          { label: "Critical Priority", val: incidents.filter(i => i.severity === "Critical").length, color: "text-red-400", icon: <AlertOctagon size={16} /> },
          { label: "Containment Rate", val: incidents.length ? `${Math.round((incidents.filter(i => i.status === "Contained" || i.status === "Resolved").length / incidents.length) * 100)}%` : "100%", color: "text-green-400", icon: <CheckCircle2 size={16} /> },
        ].map(s => (
          <Card key={s.label} className="bg-black/40 border-white/10 backdrop-blur-md relative overflow-hidden">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex justify-between items-center text-slate-500">
                <span className="text-[10px] uppercase tracking-wider font-semibold">{s.label}</span>
                <span className="opacity-40">{s.icon}</span>
              </div>
              <span className={`text-2xl font-bold ${s.color} mt-1`}>{s.val}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Controls Panel */}
      <div className="bg-black/25 p-4 rounded-xl border border-white/5 backdrop-blur-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter size={12} />
            Filters
          </span>
          <button 
            onClick={fetchIncidents}
            disabled={loading}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/20 px-2.5 py-1 border border-cyan-500/30 rounded"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Severity */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Priority Severity</label>
            <div className="flex gap-1 flex-wrap">
              {["All", "Critical", "High", "Medium", "Low"].map(s => (
                <button
                  key={s}
                  onClick={() => setSevFilter(s)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                    sevFilter === s
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold"
                      : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Incident State</label>
            <div className="flex gap-1 flex-wrap">
              {["All", "Detected", "Analyzing", "Contained", "Resolved"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                    statusFilter === s
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold"
                      : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Origin Source</label>
            <div className="flex gap-1 flex-wrap">
              {["All", "Real Telemetry", "Attack Sim"].map(s => (
                <button
                  key={s}
                  onClick={() => setSourceFilter(s)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                    sourceFilter === s
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold"
                      : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Incident Log Table */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12"></th>
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Threat Name</th>
                <th className="py-3 px-4">Source Endpoint</th>
                <th className="py-3 px-4">Origin</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500 text-sm">
                    No matching incidents found. Run a simulation or fire the `demo_trigger.py` script.
                  </td>
                </tr>
              ) : (
                filtered.map((inc) => {
                  const isExpanded = expandedId === inc.id;
                  const sev = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.Low;
                  const sta = STATUS_CONFIG[inc.status] || STATUS_CONFIG.Detected;
                  const analysis = analyses[inc.id];

                  return (
                    <>
                      {/* Base Row */}
                      <tr 
                        key={inc.id}
                        onClick={() => handleRowClick(inc.id)}
                        className={`border-b border-white/5 hover:bg-cyan-950/5 transition-all cursor-pointer ${
                          isExpanded ? "bg-cyan-950/10 border-b-transparent" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          {isExpanded ? <ChevronUp size={14} className="text-cyan-400" /> : <ChevronDown size={14} className="text-slate-500" />}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{inc.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-100">{inc.title}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-300 flex items-center gap-1.5 mt-0.5">
                          <Server size={11} className="text-slate-500" />
                          {inc.affected_endpoint || "WIN-SOC-01"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {inc.source === "telemetry" ? (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/25">
                              Real Agent
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800 text-slate-300 border-slate-600/30">
                              Attack Sim
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className={`text-[10px] ${sev.bg} ${sev.text} ${sev.border}`}>
                            {inc.severity}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className={`text-[10px] ${sta.bg} ${sta.text} ${sta.border}`}>
                            {inc.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                          {new Date(inc.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`font-bold font-mono text-sm ${
                            inc.risk_score >= 90 ? "text-red-400" : inc.risk_score >= 70 ? "text-orange-400" : "text-yellow-400"
                          }`}>
                            {inc.risk_score}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Analysis Row */}
                      {isExpanded && (
                        <tr className="bg-cyan-950/10 border-b border-white/5">
                          <td colSpan={9} className="p-6 pt-2">
                            <div className="border border-white/10 rounded-xl bg-black/40 p-6 backdrop-blur-md flex flex-col gap-6">
                              {/* AI Analyst Title block */}
                              <div className="flex justify-between items-start border-b border-white/5 pb-4">
                                <div className="flex items-center gap-2.5">
                                  <Shield className="text-cyan-400 animate-pulse" size={20} />
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-100">AI SOC Analyst Report</h4>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Report Ref: INC-{inc.id.replace("INC-", "")} | Compiled autonomously</p>
                                  </div>
                                </div>
                                <div className="flex gap-4 items-center shrink-0">
                                  <div className="text-right">
                                    <span className="text-[9px] text-slate-500 uppercase font-semibold">Confidence Rating</span>
                                    <span className="block text-xs font-bold text-green-400">{analysis ? analysis.confidence : "High"}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] text-slate-500 uppercase font-semibold">MITRE Vector</span>
                                    <span className="block text-xs font-mono font-bold text-cyan-400">{analysis ? analysis.mitre_tactic : inc.mitre_tactic}</span>
                                  </div>
                                </div>
                              </div>

                              {!analysis ? (
                                <div className="flex items-center justify-center py-12 gap-2 text-slate-500">
                                  <RefreshCw className="animate-spin text-cyan-400" size={16} />
                                  <span>Assembling AI forensics and generating report...</span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {/* Left section: Analysis Writeup */}
                                  <div className="md:col-span-2 flex flex-col gap-4">
                                    <div>
                                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Threat Assessment Briefing</h5>
                                      <p className="text-slate-300 leading-relaxed text-xs bg-white/5 p-3 rounded border border-white/5">
                                        {analysis.threat_explanation}
                                      </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Potential Impact</h5>
                                        <p className="text-slate-300 text-xs bg-red-950/10 border border-red-500/10 p-3 rounded">
                                          {analysis.predicted_impact}
                                        </p>
                                      </div>
                                      <div>
                                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Root Cause</h5>
                                        <p className="text-slate-300 text-xs bg-white/5 p-3 rounded border border-white/5">
                                          {analysis.root_cause}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right section: Remediation Plan */}
                                  <div className="md:col-span-1 flex flex-col gap-3">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                                      <Zap size={12} />
                                      Remediation Checklist
                                    </h5>
                                    
                                    <div className="flex flex-col gap-2 bg-white/5 border border-white/10 rounded-lg p-4">
                                      {analysis.remediation_steps && analysis.remediation_steps.map((step: string, sIdx: number) => (
                                        <label key={sIdx} className="flex gap-2.5 items-start text-xs text-slate-300 cursor-pointer select-none">
                                          <input 
                                            type="checkbox" 
                                            defaultChecked={inc.status === "Resolved" || (inc.status === "Contained" && sIdx < 2)}
                                            className="mt-0.5 shrink-0 rounded border-white/10 bg-black/40 text-cyan-500 focus:ring-0 focus:ring-offset-0" 
                                          />
                                          <span>{step}</span>
                                        </label>
                                      ))}
                                    </div>
                                    <div className="bg-cyan-950/15 border border-cyan-500/20 rounded-lg p-3 text-[10px] text-cyan-400 font-mono">
                                      <strong>Autonomous Actions Executed:</strong> {analysis.response_action || "Standard response playbook activated."}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}
