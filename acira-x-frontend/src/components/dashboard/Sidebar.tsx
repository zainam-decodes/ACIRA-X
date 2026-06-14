"use client";
import { LayoutDashboard, AlertTriangle, ShieldAlert, Monitor, Activity, Shield, FileText, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-md h-full flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
          <Shield className="text-cyan-400" size={22} />
          ACIRA-X
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Autonomous SOC</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest px-3 mb-3">Navigation</p>
        <NavItem href="/dashboard"       icon={<LayoutDashboard size={16} />} label="Dashboard"       active={pathname === "/dashboard"} />
        <NavItem href="/incidents"       icon={<AlertTriangle   size={16} />} label="Incidents"       active={pathname === "/incidents"} />
        <NavItem href="/alerts"          icon={<ShieldAlert     size={16} />} label="Alerts"          active={pathname === "/alerts"} />
        <NavItem href="/endpoints"       icon={<Monitor         size={16} />} label="Endpoints"       active={pathname === "/endpoints"} />
        <NavItem href="/protected-files" icon={<FileText        size={16} />} label="Protected Files" active={pathname === "/protected-files"} />

        <p className="text-[10px] text-slate-600 uppercase tracking-widest px-3 mt-5 mb-3">Intelligence</p>
        <NavItem href="/threat-intel"    icon={<Activity size={16} />} label="Threat Intel"    active={pathname === "/threat-intel"} />
        <NavItem href="/response-center" icon={<Shield   size={16} />} label="Response Center" active={pathname === "/response-center"} />
        <NavItem href="/reports"         icon={<FileText size={16} />} label="Reports"         active={pathname === "/reports"} />
      </nav>

      {/* Bottom */}
      <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-1">
        <NavItem href="/settings" icon={<Settings size={16} />} label="Settings" active={pathname === "/settings"} />
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-colors group"
          >
            <LogOut size={16} className="group-hover:text-red-400" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        )}
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
        active
          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[inset_0_0_12px_rgba(34,211,238,0.05)]"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
      }`}
    >
      <span className={active ? "text-cyan-400" : "text-slate-500"}>{icon}</span>
      {label}
      {active && <span className="ml-auto w-1 h-1 rounded-full bg-cyan-400" />}
    </Link>
  );
}
