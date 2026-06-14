"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopMetrics } from "@/components/dashboard/TopMetrics";
import { ThreatFeed } from "@/components/dashboard/ThreatFeed";
import { ThreatMap } from "@/components/dashboard/ThreatMap";
import { AIAnalystPanel } from "@/components/dashboard/AIAnalystPanel";
import { IncidentTimeline } from "@/components/dashboard/IncidentTimeline";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Play, RefreshCcw, ShieldCheck, LogOut } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { logout } from "@/lib/auth";

export default function Dashboard() {
  const router = useRouter();
  const { fetchMetrics, fetchIncidentStatus, activeIncident, isSimulating, setIsSimulating } = useStore();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeIncident && activeIncident.status !== "Resolved") {
      interval = setInterval(() => {
        fetchIncidentStatus(activeIncident.id);
      }, 1500);
    }
    if (activeIncident?.status === "Resolved") {
      setIsSimulating(false);
    }
    return () => clearInterval(interval);
  }, [activeIncident?.id, activeIncident?.status]);

  const launchSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/simulation/launch`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await fetchIncidentStatus(data.incident_id);
      }
    } catch (error) {
      console.error("Failed to launch simulation", error);
      setIsSimulating(false);
    }
  };

  return (
    <AuthGuard>
      {(user) => (
        <div className="flex h-screen bg-[#030712] text-slate-200 overflow-hidden font-sans">
          <Sidebar onLogout={handleLogout} />

          <main className="flex-1 flex flex-col overflow-y-auto relative">
            {/* Background glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm z-10 shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold tracking-tight text-white">SOC Dashboard</h2>
                {activeIncident && activeIncident.status !== "Resolved" && (
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-pulse">
                    <ShieldAlert size={13} /> ACTIVE INCIDENT
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* User badge */}
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 border border-white/10 bg-white/5 text-xs">
                  <ShieldCheck size={13} className="text-cyan-400" />
                  <span className="text-slate-200 font-semibold">{user.username}</span>
                  <span className="text-slate-500">{user.role}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />
                </div>

                <Button
                  onClick={launchSimulation}
                  disabled={isSimulating}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300 text-xs"
                >
                  {isSimulating ? (
                    <><RefreshCcw size={13} className="mr-1.5 animate-spin" /> Simulating...</>
                  ) : (
                    <><Play size={13} className="mr-1.5" /> Launch Phishing Sim</>
                  )}
                </Button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </header>

            <div className="p-8 z-10 flex-1 flex flex-col gap-6">
              <TopMetrics />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <ThreatMap />
                  <IncidentTimeline />
                </div>
                <div className="flex flex-col gap-6 h-full">
                  <div className="flex-1 min-h-[300px]">
                    <AIAnalystPanel />
                  </div>
                  <ThreatFeed />
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </AuthGuard>
  );
}
