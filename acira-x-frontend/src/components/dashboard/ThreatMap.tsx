import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Globe } from "lucide-react"

export function ThreatMap() {
  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-md h-[400px] flex flex-col">
      <CardHeader className="pb-2 border-b border-white/5">
        <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <Globe size={16} className="text-slate-400"/>
          Global Threat Map
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 relative overflow-hidden flex items-center justify-center p-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-black/0 to-black/0"></div>
        
        {/* Placeholder SVG Map for MVP */}
        <svg viewBox="0 0 1000 500" className="w-full h-full opacity-20 fill-slate-400 p-4">
           <path d="M150 150 Q 200 100 250 150 T 350 150" stroke="currentColor" fill="none" strokeWidth="2" strokeDasharray="5,5" />
           <circle cx="200" cy="150" r="40" className="fill-current" />
           <circle cx="400" cy="200" r="80" className="fill-current" />
           <circle cx="600" cy="150" r="100" className="fill-current" />
           <circle cx="800" cy="300" r="60" className="fill-current" />
           <circle cx="300" cy="350" r="90" className="fill-current" />
        </svg>
        
        {/* Blinking threat nodes */}
        <div className="absolute top-[30%] left-[20%] w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
        <div className="absolute top-[40%] right-[30%] w-2 h-2 bg-orange-500 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-[60%] left-[40%] w-2 h-2 bg-yellow-500 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
        
        <div className="absolute bottom-4 left-4 bg-black/60 p-2 rounded border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Critical</div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><div className="w-2 h-2 bg-orange-500 rounded-full"></div> High</div>
        </div>
      </CardContent>
    </Card>
  )
}
