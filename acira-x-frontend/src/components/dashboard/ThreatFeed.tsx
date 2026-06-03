"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useStore } from '@/store'
import { Badge } from "@/components/ui/badge"

export function ThreatFeed() {
  const { logs, activeIncident } = useStore()

  // Mock past events + current active incident logs
  const baseEvents = [
    { id: 1, time: "10:45 AM", type: "Network", desc: "Suspicious port scan detected from 192.168.1.45", severity: "Low" },
    { id: 2, time: "10:30 AM", type: "Login", desc: "Failed login attempt (Admin) - Source: RU", severity: "Medium" },
    { id: 3, time: "09:15 AM", type: "Endpoint", desc: "Outdated definitions on WIN-DESK-42", severity: "Low" }
  ]

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-md col-span-1 h-[400px] flex flex-col overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-sm font-medium flex justify-between items-center text-slate-200">
          Live Threat Feed
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-xs text-cyan-400">Live</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto flex-1">
        <div className="divide-y divide-white/5">
          {logs.map((log) => (
            <div key={`log-${log.id}`} className="p-4 hover:bg-white/5 transition-colors animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-start mb-1">
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                  NEW ALERT
                </Badge>
                <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-slate-300 font-medium">{log.action}</p>
              <p className="text-xs text-slate-500 mt-1">{log.details}</p>
            </div>
          ))}
          {baseEvents.map((event) => (
            <div key={event.id} className="p-4 opacity-60">
               <div className="flex justify-between items-start mb-1">
                <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px]">
                  {event.type}
                </Badge>
                <span className="text-xs text-slate-500">{event.time}</span>
              </div>
              <p className="text-sm text-slate-300">{event.desc}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
