"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useStore } from '@/store'
import { BrainCircuit, AlertTriangle, ShieldCheck, HelpCircle, Activity, Info, ListTodo, ShieldAlert } from "lucide-react"

export function AIAnalystPanel() {
  const { activeIncident, activeIncidentAnalysis, fetchIncidentAnalysis } = useStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeIncident?.id) {
      setLoading(true)
      fetchIncidentAnalysis(activeIncident.id).finally(() => setLoading(false))
    }
  }, [activeIncident?.id, fetchIncidentAnalysis])

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
          <BrainCircuit size={48} className="mb-4 opacity-20 animate-pulse" />
          <p>Select an incident to view deep AI analysis</p>
        </CardContent>
      </Card>
    )
  }

  const analysis = activeIncidentAnalysis
  const risk = activeIncident.risk_score

  return (
    <Card className="bg-gradient-to-br from-black/60 to-slate-900/60 border-cyan-900/40 backdrop-blur-md h-full relative overflow-y-auto max-h-[700px] border">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <BrainCircuit size={120} />
      </div>
      
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-cyan-400">
            <BrainCircuit className="animate-pulse" />
            Autonomous AI Analyst
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/20 text-cyan-400 bg-cyan-950/20">
            {analysis?.analyst || "v2.0-Engine"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <BrainCircuit className="animate-spin text-cyan-400 mb-3" size={36} />
            <p className="text-sm font-mono tracking-wider">Processing Incident Telemetry...</p>
          </div>
        ) : (
          <>
            {/* Risk Score */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-slate-400">Confidence Analysis</span>
                <span className={`text-2xl font-bold font-mono ${risk > 80 ? 'text-red-400' : risk > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {risk}/100 ({analysis?.confidence || "High"})
                </span>
              </div>
              <Progress 
                value={risk} 
                className={`h-2 bg-slate-800/80 ${risk > 80 ? '[&>div]:bg-red-500' : risk > 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`} 
              />
            </div>

            {/* Attack Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="block text-xs text-slate-500 mb-1">MITRE ATT&CK Tactic</span>
                <span className="font-semibold text-slate-200 text-sm font-mono truncate block">
                  {analysis?.mitre_tactic || activeIncident.mitre_tactic || "N/A"}
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="block text-xs text-slate-500 mb-1">Response Action Status</span>
                <span className="font-semibold text-cyan-400 text-sm font-mono truncate block flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-cyan-400" />
                  {analysis?.response_action || activeIncident.response_action || "Monitored"}
                </span>
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Info size={16} className="text-cyan-400" />
                Threat Explanation
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed bg-black/40 border border-white/5 p-3.5 rounded-lg">
                {analysis?.threat_explanation || "No explanation details available."}
              </p>
            </div>

            {/* Root Cause */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Activity size={16} className="text-yellow-400" />
                Root Cause Determination
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed bg-black/40 border border-white/5 p-3.5 rounded-lg">
                {analysis?.root_cause || "Analyzing telemetry sequence to pinpoint entry point..."}
              </p>
            </div>

            {/* Predicted Impact */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-400" />
                Predicted Business Impact
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed bg-black/40 border border-red-500/10 p-3.5 rounded-lg border-l-2 border-l-red-500">
                {analysis?.predicted_impact || "Potential escalation of privileges or network scan activity."}
              </p>
            </div>

            {/* Remediation steps */}
            {analysis?.remediation_steps && analysis.remediation_steps.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <ListTodo size={16} className="text-green-400" />
                  Remediation Action Plan
                </h4>
                <div className="space-y-2">
                  {analysis.remediation_steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 bg-black/30 border border-white/5 p-2.5 rounded-lg">
                      <input 
                        type="checkbox" 
                        defaultChecked={idx === 0 && activeIncident.status === "Resolved"} 
                        className="mt-1 accent-cyan-500 cursor-pointer h-4 w-4 rounded bg-slate-900 border-white/20"
                      />
                      <span className="text-xs text-slate-300 leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

