import { Sidebar } from "@/components/dashboard/Sidebar"

export function DashboardLayout({ children, title }: { children: React.ReactNode, title: string }) {
  return (
    <div className="flex h-screen bg-[#030712] text-slate-200 overflow-hidden font-sans">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-y-auto relative">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm z-10 shrink-0">
          <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
        </header>

        <div className="p-8 z-10 flex-1 flex flex-col gap-6">
          {children}
        </div>
      </main>
    </div>
  )
}
