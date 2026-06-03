"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Wifi, WifiOff, AlertTriangle, RefreshCw, ShieldOff } from "lucide-react";
import { API_BASE_URL } from "@/config";

const OS_ICONS: Record<string, string> = {
  "Windows 11 Pro": "🪟",
  "Windows 10 Enterprise": "🪟",
  "macOS Sonoma 14.2": "🍎",
  "Ubuntu 22.04 LTS": "🐧",
};

const RISK_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  Low:      { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/30" },
  Medium:   { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  High:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  Critical: { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30" },
};

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchEndpoints = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/endpoints`);
      if (res.ok) setEndpoints(await res.json());
    } catch (e) { console.error(e); }
  };

  const isolate = async (id: string) => {
    setLoading(id);
    await fetch(`${API_BASE_URL}/api/endpoints/${id}/isolate`, { method: "POST" });
    await fetchEndpoints();
    setLoading(null);
  };

  const reconnect = async (id: string) => {
    setLoading(id);
    await fetch(`${API_BASE_URL}/api/endpoints/${id}/reconnect`, { method: "POST" });
    await fetchEndpoints();
    setLoading(null);
  };

  useEffect(() => {
    fetchEndpoints();
    const interval = setInterval(fetchEndpoints, 3000);
    return () => clearInterval(interval);
  }, []);

  const active = endpoints.filter(e => e.status === "Active").length;
  const isolated = endpoints.filter(e => e.status === "Isolated").length;

  return (
    <DashboardLayout title="Endpoint Management">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-black/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Total Endpoints</div>
            <div className="text-3xl font-bold text-slate-200 mt-1">{endpoints.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-black/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Active</div>
            <div className="text-3xl font-bold text-green-400 mt-1">{active}</div>
          </CardContent>
        </Card>
        <Card className="bg-black/40 border-white/10 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Isolated</div>
            <div className="text-3xl font-bold text-red-400 mt-1">{isolated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {endpoints.map((ep) => {
          const risk = RISK_CONFIG[ep.risk_level] || RISK_CONFIG.Low;
          const isIsolated = ep.status === "Isolated";
          const isLoading = loading === ep.id;

          return (
            <Card
              key={ep.id}
              className={`bg-black/40 backdrop-blur-md border transition-all ${
                isIsolated ? "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "border-white/10"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl text-xl ${isIsolated ? "bg-red-500/10" : "bg-cyan-500/10"}`}>
                      {OS_ICONS[ep.os] || "💻"}
                    </div>
                    <div>
                      <div className="font-bold text-slate-100">{ep.hostname}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">{ep.ip_address}</div>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 ${isIsolated ? "bg-red-400 animate-pulse" : "bg-green-400"}`} />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">OS</span>
                    <span className="text-slate-300">{ep.os}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">Status</span>
                    <Badge variant="outline" className={`text-xs ${isIsolated ? "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse" : "bg-green-500/10 text-green-400 border-green-500/30"}`}>
                      {isIsolated ? <><WifiOff size={10} className="inline mr-1" />Isolated</> : <><Wifi size={10} className="inline mr-1" />Active</>}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">Risk Level</span>
                    <Badge variant="outline" className={`text-xs ${risk.bg} ${risk.text} ${risk.border}`}>
                      {ep.risk_level || "Low"}
                    </Badge>
                  </div>
                </div>

                {isIsolated ? (
                  <button
                    onClick={() => reconnect(ep.id)}
                    disabled={isLoading}
                    className="w-full py-2 flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                    {isLoading ? "Reconnecting..." : "Reconnect to Network"}
                  </button>
                ) : (
                  <button
                    onClick={() => isolate(ep.id)}
                    disabled={isLoading}
                    className="w-full py-2 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  >
                    <ShieldOff size={13} className={isLoading ? "animate-pulse" : ""} />
                    {isLoading ? "Isolating..." : "Isolate Endpoint"}
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {endpoints.length === 0 && (
          <div className="col-span-full p-16 text-center border border-dashed border-white/10 rounded-xl bg-white/5 text-slate-500">
            <Monitor className="mx-auto mb-3 text-slate-600" size={32} />
            No endpoints registered.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
