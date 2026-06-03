"use client";
import { useStore } from '@/store'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"

export function IncidentTimeline() {
  const { activeIncident } = useStore()
  
  const stages = [
    { id: 'Detected', label: 'Detection' },
    { id: 'Investigating', label: 'Investigation' },
    { id: 'Analyzing', label: 'AI Analysis' },
    { id: 'Contained', label: 'Containment' },
    { id: 'Resolved', label: 'Recovery' }
  ]

  const getStageStatus = (stageId: string) => {
    if (!activeIncident) return 'pending'
    const currentIndex = stages.findIndex(s => s.id === activeIncident.status)
    const stageIndex = stages.findIndex(s => s.id === stageId)
    
    if (stageIndex < currentIndex || activeIncident.status === 'Resolved') return 'completed'
    if (stageIndex === currentIndex) return 'active'
    return 'pending'
  }

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-200">Automated Response Lifecycle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center relative py-4">
          <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-slate-800 -z-10 -translate-y-1/2"></div>
          
          {stages.map((stage) => {
            const status = getStageStatus(stage.id)
            return (
              <div key={stage.id} className="flex flex-col items-center gap-3 bg-transparent z-10 px-2 w-1/5 text-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                  ${status === 'completed' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 
                    status === 'active' ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-900 border border-slate-700 text-slate-600'}
                `}>
                  {status === 'completed' ? <CheckCircle2 size={20} /> : 
                   status === 'active' ? <Loader2 size={20} className="animate-spin" /> : 
                   <Circle size={20} />}
                </div>
                <span className={`text-xs font-medium transition-colors duration-500 ${status === 'active' ? 'text-blue-400' : status === 'completed' ? 'text-slate-300' : 'text-slate-600'}`}>
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
