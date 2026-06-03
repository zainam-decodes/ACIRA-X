"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useStore } from '@/store'
import { BrainCircuit, AlertTriangle, ShieldCheck } from "lucide-react"

export function AIAnalystPanel() {
  const { activeIncident } = useStore()

  if (!activeIncident) {
    return (
      <Card className="bg-black/40 border-white/10 backdrop-blur-md h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-slate-200">
            <BrainCircuit className="text-blue-400" />
            AI SOC Analyst
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48 text-slate-500">
          <BrainCircuit size={48} className="mb-4 opacity-20" />
          <p>Awaiting active incident data...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-black/60 to-slate-900/60 border-cyan-900/50 backdrop-blur-md h-full relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <BrainCircuit size={120} />
      </div>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-cyan-400">
          <BrainCircuit className="animate-pulse" />
          AI Analysis Active
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-medium text-slate-300">Risk Score</span>
            <span className={`text-3xl font-bold ${activeIncident.risk_score > 80 ? 'text-red-500' : 'text-yellow-500'}`}>
              {activeIncident.risk_score}/100
            </span>
          </div>
          <Progress 
            value={activeIncident.risk_score} 
            className={`h-2 bg-slate-800 ${activeIncident.risk_score > 80 ? '[&>div]:bg-red-500' : '[&>div]:bg-yellow-500'}`} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-3 rounded-lg border border-white/10">
            <span className="block text-xs text-slate-500 mb-1">Threat Type</span>
            <span className="font-semibold text-slate-200">{activeIncident.severity === 'Critical' ? 'Ransomware' : 'Malware / Phishing'}</span>
          </div>
          <div className="bg-white/5 p-3 rounded-lg border border-white/10">
            <span className="block text-xs text-slate-500 mb-1">Attack Stage</span>
            <span className="font-semibold text-slate-200">{activeIncident.status}</span>
          </div>
        </div>

        <div className="bg-blue-950/30 p-4 rounded-lg border border-blue-900/50">
          <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
             {activeIncident.status === 'Resolved' ? <ShieldCheck size={16}/> : <AlertTriangle size={16}/>}
             AI Recommendation & Reasoning
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {activeIncident.status === 'Investigating' && "Suspicious behavior detected originating from email link. Analyzing payload and process tree."}
            {activeIncident.status === 'Analyzing' && "High probability of ransomware execution based on encryption API calls. Immediate isolation required to prevent lateral movement."}
            {activeIncident.status === 'Contained' && "Endpoint isolated successfully. Malicious processes terminated. Proceed with recovery procedures."}
            {activeIncident.status === 'Resolved' && "Incident fully mitigated. System restored to clean state. Generating post-mortem report."}
            {activeIncident.status === 'Detected' && "Initial indicators of compromise detected. Gathering telemetry..."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
