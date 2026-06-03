import { LayoutDashboard, AlertTriangle, ShieldAlert, Monitor, Activity, Shield, FileText, Settings } from 'lucide-react'
import Link from 'next/link'

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-md h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
          <Shield className="text-cyan-400" />
          ACIRA-X
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Autonomous SOC</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        <NavItem href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
        <NavItem href="/incidents" icon={<AlertTriangle size={18} />} label="Incidents" />
        <NavItem href="/alerts" icon={<ShieldAlert size={18} />} label="Alerts" />
        <NavItem href="/endpoints" icon={<Monitor size={18} />} label="Endpoints" />
        <NavItem href="/protected-files" icon={<FileText size={18} />} label="Protected Files" />
        <NavItem href="/threat-intel" icon={<Activity size={18} />} label="Threat Intel" />
        <NavItem href="/response-center" icon={<Shield size={18} />} label="Response Center" />
        <NavItem href="/reports" icon={<FileText size={18} />} label="Reports" />
      </nav>
      
      <div className="p-4 mt-auto">
        <NavItem href="#" icon={<Settings size={18} />} label="Settings" />
      </div>
    </aside>
  )
}

function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </Link>
  )
}
