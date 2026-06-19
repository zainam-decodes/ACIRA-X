"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore, Endpoint, TelemetrySnapshot } from "@/store";
import {
  HeartPulse, Activity, Server, Cpu, Database, Network,
  Lock, Unlock, ShieldAlert, CheckCircle, RefreshCw,
  Search, Terminal, Shield, AlertTriangle
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const RISK_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  Low: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  Medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  High: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  Critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
};

const SUSPICIOUS_PROCESSES = new Set([
  "mimikatz", "mimikatz.exe", "mimikatz_test", "mimikatz_test.exe",
  "nmap", "nmap.exe", "masscan", "masscan.exe",
  "hydra", "hydra.exe", "medusa", "medusa.exe",
  "netcat", "nc", "nc.exe", "ncat", "ncat.exe",
  "meterpreter", "msf", "msfconsole"
]);

const SUSPICIOUS_PORTS = new Set([4444, 1337, 5555, 6666, 31337, 9001, 8888, 12345, 54321]);

export default function EndpointHealthPage() {
  const {
    endpoints,
    telemetryHistory,
    fetchEndpoints,
    fetchTelemetryHistory,
    isolateEndpoint,
    reconnectEndpoint
  } = useStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "processes" | "ports" | "connections">("history");
  const [procSearch, setProcSearch] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    setIsClient(true);
    fetchEndpoints();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchEndpoints();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    if (endpoints.length > 0 && !selectedId) {
      // Pre-select the first real or simulated endpoint
      const realEp = endpoints.find(e => e.is_real) || endpoints[0];
      setSelectedId(realEp.id);
    }
  }, [endpoints]);

  useEffect(() => {
    if (selectedId) {
      fetchTelemetryHistory(selectedId);
      if (autoRefresh) {
        const historyInterval = setInterval(() => {
          fetchTelemetryHistory(selectedId);
        }, 5000);
        return () => clearInterval(historyInterval);
      }
    }
  }, [selectedId, autoRefresh]);

  const selectedEndpoint = endpoints.find((e) => e.id === selectedId);
  const selectedHistory = selectedId ? telemetryHistory[selectedId] || [] : [];

  // Format history data for chart
  const chartData = selectedHistory.map((snap) => ({
    time: new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    CPU: snap.cpu_percent,
    RAM: snap.ram_percent,
    Disk: snap.disk_percent,
  }));

  // Parse processes, ports, connections from the latest endpoint metrics or snapshot
  const latestSnapshot = selectedHistory[selectedHistory.length - 1];
  
  let processes: any[] = [];
  let openPorts: number[] = [];
  let connections: any[] = [];
  let failedLoginCount = 0;

  if (latestSnapshot) {
    try {
      processes = JSON.parse(latestSnapshot.processes_json || "[]");
      openPorts = JSON.parse(latestSnapshot.ports_json || "[]");
      connections = JSON.parse(latestSnapshot.connections_json || "[]");
      failedLoginCount = latestSnapshot.failed_login_count;
    } catch (e) {
      console.error("Failed to parse snapshot JSON structures:", e);
    }
  } else if (selectedEndpoint) {
    // If no snapshot exists yet, fallback to dummy items
    processes = [
      { name: "system", pid: 4, cpu_percent: 0.1, memory_percent: 0.1 },
      { name: "svchost.exe", pid: 924, cpu_percent: 1.2, memory_percent: 2.1 }
    ];
    openPorts = [135, 445, 3389];
    connections = [];
  }

  // Filter processes
  const filteredProcesses = processes.filter((p) =>
    p.name.toLowerCase().includes(procSearch.toLowerCase()) ||
    p.pid.toString().includes(procSearch)
  );

  const isOnline = (ep: Endpoint) => {
    if (!ep.last_telemetry) return false;
    const diff = Date.now() - new Date(ep.last_telemetry).getTime();
    return diff < 25000; // Received telemetry in the last 25 seconds
  };

  const getCommonPortService = (port: number) => {
    switch (port) {
      case 22: return "SSH (Secure Shell)";
      case 80: return "HTTP (Web Server)";
      case 443: return "HTTPS (Secure Web)";
      case 445: return "Microsoft-DS (SMB)";
      case 3389: return "RDP (Remote Desktop)";
      case 4444: return "Metasploit Default / Reverse Shell Backdoor";
      case 1337: return "Backdoor Listener / C2 Beacon";
      case 5555: return "Android ADB Debugging / Backdoor";
      case 6666: return "IRC / Trojan Backdoor Channel";
      default: return "Active Network Service";
    }
  };

  return (
    <DashboardLayout title="Endpoint Health Monitor">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/25 p-4 rounded-xl border border-white/5 backdrop-blur-md">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <HeartPulse className="text-cyan-400 animate-pulse" size={18} />
            Live System Telemetry Feed
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Streaming real-time metrics, socket configurations, and active threads from enrolled host devices.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
              autoRefresh
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
            }`}
          >
            <RefreshCw size={13} className={autoRefresh ? "animate-spin" : ""} />
            {autoRefresh ? "Auto-Refresh Active" : "Auto-Refresh Paused"}
          </button>
          <button
            onClick={() => fetchEndpoints()}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-xs font-semibold transition-all"
          >
            Query Host
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column: Endpoints Grid */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Enrolled Devices</h4>
          
          <div className="flex flex-col gap-3 max-h-[700px] overflow-y-auto pr-1">
            {endpoints.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-white/5 text-slate-500 text-sm">
                No endpoints registered. Start the `endpoint_agent.py` script on your target laptop.
              </div>
            ) : (
              endpoints.map((ep) => {
                const online = isOnline(ep);
                const isSelected = ep.id === selectedId;
                const risk = RISK_BADGES[ep.risk_level] || RISK_BADGES.Low;
                
                return (
                  <button
                    key={ep.id}
                    onClick={() => setSelectedId(ep.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all duration-300 backdrop-blur-md hover:bg-white/5 ${
                      isSelected
                        ? "bg-cyan-500/5 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                        : "bg-black/40 border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Server size={14} className={online ? "text-cyan-400" : "text-slate-500"} />
                          <span className="font-bold text-sm text-slate-100 truncate">{ep.hostname}</span>
                          {ep.is_real && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                              REAL
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{ep.ip_address || "No Address"}</span>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
                          <span className="text-[10px] uppercase font-bold text-slate-400">{online ? "Online" : "Offline"}</span>
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${risk.bg} ${risk.text} ${risk.border}`}>
                          {ep.risk_level} Risk
                        </Badge>
                      </div>
                    </div>

                    {/* Gauges preview */}
                    <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] text-slate-400">
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span>CPU</span>
                          <span className="font-mono text-slate-200">{ep.cpu_percent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              ep.cpu_percent > 85 ? "bg-red-400" : ep.cpu_percent > 60 ? "bg-orange-400" : "bg-cyan-400"
                            }`}
                            style={{ width: `${Math.min(100, ep.cpu_percent)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span>RAM</span>
                          <span className="font-mono text-slate-200">{ep.ram_percent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              ep.ram_percent > 95 ? "bg-red-400" : ep.ram_percent > 80 ? "bg-orange-400" : "bg-blue-400"
                            }`}
                            style={{ width: `${Math.min(100, ep.ram_percent)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span>Disk</span>
                          <span className="font-mono text-slate-200">{ep.disk_percent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-400 transition-all duration-500"
                            style={{ width: `${Math.min(100, ep.disk_percent)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Selected Endpoint Details */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Telemetry Dashboard</h4>
          
          {!selectedEndpoint ? (
            <Card className="bg-black/40 border-white/10 backdrop-blur-md p-16 text-center text-slate-500">
              <Server className="mx-auto mb-4 opacity-10" size={48} />
              Select a device from the list to analyze live telemetry.
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Endpoint Summary Card */}
              <Card className="bg-black/40 border-white/10 backdrop-blur-md overflow-hidden relative">
                {/* Visual Accent grid */}
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                  <Terminal size={140} />
                </div>
                
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-white">{selectedEndpoint.hostname}</h2>
                        <Badge variant="outline" className={`text-xs ${RISK_BADGES[selectedEndpoint.risk_level]?.bg} ${RISK_BADGES[selectedEndpoint.risk_level]?.text} ${RISK_BADGES[selectedEndpoint.risk_level]?.border}`}>
                          {selectedEndpoint.risk_level} Risk Severity
                        </Badge>
                        {selectedEndpoint.status === "Isolated" && (
                          <Badge className="bg-red-500 text-white font-bold animate-pulse text-[10px]">
                            NETWORK ISOLATED
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-1">UUID: {selectedEndpoint.id}</p>
                    </div>

                    <div className="flex gap-2">
                      {selectedEndpoint.status === "Isolated" ? (
                        <button
                          onClick={() => reconnectEndpoint(selectedEndpoint.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                        >
                          <Unlock size={12} /> Reconnect Network
                        </button>
                      ) : (
                        <button
                          onClick={() => isolateEndpoint(selectedEndpoint.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        >
                          <Lock size={12} /> Isolate Endpoint
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="block text-slate-500 font-medium">IP Address</span>
                      <span className="font-mono text-slate-200 font-bold block mt-0.5">{selectedEndpoint.ip_address || "No Address"}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="block text-slate-500 font-medium">OS Platform</span>
                      <span className="text-slate-200 font-semibold block mt-0.5 truncate" title={selectedEndpoint.os}>{selectedEndpoint.os}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="block text-slate-500 font-medium">Telemetry Agent</span>
                      <span className="text-slate-200 font-semibold block mt-0.5">v{selectedEndpoint.agent_version || "1.0.0"}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="block text-slate-500 font-medium">Last Ping</span>
                      <span className="text-slate-200 font-semibold block mt-0.5">
                        {selectedEndpoint.last_telemetry 
                          ? new Date(selectedEndpoint.last_telemetry).toLocaleTimeString() 
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  {failedLoginCount > 0 && (
                    <div className="mt-4 bg-red-950/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-3 text-red-400">
                      <ShieldAlert size={18} className="animate-bounce" />
                      <div className="text-xs">
                        <span className="font-bold">Security Alert:</span> {failedLoginCount} failed authentication attempts detected recently. Attacker may be conducting SSH/RDP dictionary attacks.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabs for details */}
              <div className="flex border-b border-white/10 gap-2">
                {[
                  { id: "history", label: "Performance Logs", icon: <Activity size={12} /> },
                  { id: "processes", label: `Processes (${processes.length})`, icon: <Cpu size={12} /> },
                  { id: "ports", label: `Listening Ports (${openPorts.length})`, icon: <Database size={12} /> },
                  { id: "connections", label: `Active Connections (${connections.length})`, icon: <Network size={12} /> },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-[2px] ${
                      activeTab === t.id
                        ? "border-cyan-400 text-cyan-400 font-bold"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content 1: Telemetry Graph */}
              {activeTab === "history" && (
                <Card className="bg-black/40 border-white/10 backdrop-blur-md p-5">
                  <CardHeader className="px-0 pt-0 pb-4">
                    <CardTitle className="text-sm font-semibold text-slate-300">Live Resource Utilization History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isClient && chartData.length > 0 ? (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="time" stroke="#64748b" fontSize={9} />
                            <YAxis domain={[0, 100]} stroke="#64748b" fontSize={9} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: "rgba(3, 7, 18, 0.9)", 
                                borderColor: "rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: "#f8fafc"
                              }} 
                            />
                            <Area type="monotone" dataKey="CPU" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
                            <Area type="monotone" dataKey="RAM" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRam)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                        <Activity className="animate-pulse text-cyan-400/40 mb-3" size={32} />
                        Waiting for telemetry logs... (Ensure `endpoint_agent.py` is running)
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Tab Content 2: Processes */}
              {activeTab === "processes" && (
                <Card className="bg-black/40 border-white/10 backdrop-blur-md p-5 flex flex-col gap-4">
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <Search className="text-slate-500 mr-2 shrink-0" size={14} />
                    <input
                      type="text"
                      placeholder="Search processes by name or PID..."
                      value={procSearch}
                      onChange={(e) => setProcSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 w-full"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Process Name</th>
                          <th className="py-2.5 px-3 text-right">PID</th>
                          <th className="py-2.5 px-3 text-right">CPU</th>
                          <th className="py-2.5 px-3 text-right">Memory</th>
                          <th className="py-2.5 px-3 text-center">Threat Assessment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProcesses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">No matching processes.</td>
                          </tr>
                        ) : (
                          filteredProcesses.map((p, idx) => {
                            const pName = p.name.toLowerCase().replace(".exe", "");
                            const isSusp = SUSPICIOUS_PROCESSES.has(pName) || p.name.includes("mimikatz");
                            
                            return (
                              <tr 
                                key={idx} 
                                className={`border-b border-white/5 hover:bg-white/5 ${
                                  isSusp ? "bg-red-500/5 hover:bg-red-500/10" : ""
                                }`}
                              >
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-200 flex items-center gap-2">
                                  {isSusp ? (
                                    <ShieldAlert size={13} className="text-red-400 shrink-0 animate-pulse" />
                                  ) : (
                                    <Terminal size={12} className="text-slate-500 shrink-0" />
                                  )}
                                  {p.name}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-400">{p.pid}</td>
                                <td className={`py-2.5 px-3 text-right font-mono ${p.cpu_percent > 50 ? "text-orange-400 font-bold" : "text-slate-300"}`}>{p.cpu_percent.toFixed(1)}%</td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-300">{p.memory_percent.toFixed(1)}%</td>
                                <td className="py-2.5 px-3 text-center">
                                  {isSusp ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                      CRITICAL - MALWARE
                                    </span>
                                  ) : p.cpu_percent > 70 ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20 text-[9px] font-bold uppercase tracking-wider">
                                      SUSPICIOUS SPIKE
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/15 text-[9px] font-semibold uppercase">
                                      Clean / Verified
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Tab Content 3: Ports */}
              {activeTab === "ports" && (
                <Card className="bg-black/40 border-white/10 backdrop-blur-md p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Listening Port</th>
                          <th className="py-2.5 px-3">Protocol</th>
                          <th className="py-2.5 px-3">Mapped Service / Indicator</th>
                          <th className="py-2.5 px-3 text-center">Threat Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openPorts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500">No listening ports recorded.</td>
                          </tr>
                        ) : (
                          openPorts.map((port, idx) => {
                            const isSusp = SUSPICIOUS_PORTS.has(port);
                            
                            return (
                              <tr 
                                key={idx} 
                                className={`border-b border-white/5 hover:bg-white/5 ${
                                  isSusp ? "bg-orange-500/5 hover:bg-orange-500/10" : ""
                                }`}
                              >
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                                  {port}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-400">TCP</td>
                                <td className="py-2.5 px-3 text-slate-300 font-medium">
                                  {getCommonPortService(port)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {isSusp ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                      CRITICAL - RAT BACKDOOR
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/15 text-[9px] font-semibold uppercase">
                                      Standard Port
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Tab Content 4: Connections */}
              {activeTab === "connections" && (
                <Card className="bg-black/40 border-white/10 backdrop-blur-md p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Local Socket</th>
                          <th className="py-2.5 px-3"></th>
                          <th className="py-2.5 px-3">Remote Socket</th>
                          <th className="py-2.5 px-3 text-center">Connection State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {connections.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500">No active external network connections.</td>
                          </tr>
                        ) : (
                          connections.map((c, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-2.5 px-3 font-mono text-slate-200">
                                {c.local_ip}:{c.local_port}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-bold">➔</td>
                              <td className="py-2.5 px-3 font-mono text-slate-200">
                                {c.remote_ip}:{c.remote_port}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-semibold uppercase">
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
