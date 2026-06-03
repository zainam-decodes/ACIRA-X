"use client";
import { useStore } from '@/store'
import { Card, CardContent } from "@/components/ui/card"
import { Shield, ShieldAlert, Activity, Monitor, Clock, Target } from "lucide-react"

export function TopMetrics() {
  const { metrics } = useStore()
  
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <MetricCard title="Active Incidents" value={metrics.active_incidents.toString()} icon={<AlertIcon />} color="text-red-400" />
      <MetricCard title="Critical Alerts" value={metrics.critical_alerts.toString()} icon={<ShieldAlert size={20} />} color="text-orange-400" />
      <MetricCard title="Devices Protected" value={metrics.devices_protected.toString()} icon={<Monitor size={20} />} color="text-cyan-400" />
      <MetricCard title="Threats Blocked" value={metrics.threats_blocked_today.toString()} icon={<Shield size={20} />} color="text-green-400" />
      <MetricCard title="Avg Response" value={metrics.mean_response_time} icon={<Clock size={20} />} color="text-blue-400" />
      <MetricCard title="Security Score" value={`${metrics.security_score}/100`} icon={<Target size={20} />} color={metrics.security_score > 90 ? "text-green-400" : "text-yellow-400"} />
    </div>
  )
}

function MetricCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-md">
      <CardContent className="p-4 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
          <div className={color}>{icon}</div>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </CardContent>
    </Card>
  )
}

function AlertIcon() {
  return (
    <div className="relative">
      <Activity size={20} />
      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
    </div>
  )
}
