"use client";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { logout } from "@/lib/auth";
import { LogOut, ShieldCheck } from "lucide-react";

export function DashboardLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
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

            {/* Top bar */}
            <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm z-10 shrink-0">
              <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>

              {/* User badge */}
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 border border-white/10 bg-white/5">
                  <ShieldCheck size={13} className="text-cyan-400" />
                  <div className="text-xs">
                    <span className="text-slate-200 font-semibold">{user.username}</span>
                    <span className="text-slate-500 ml-2">{user.role}</span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline tracking-wide">Logout</span>
                </button>
              </div>
            </header>

            <div className="p-8 z-10 flex-1 flex flex-col gap-6">
              {children}
            </div>
          </main>
        </div>
      )}
    </AuthGuard>
  );
}
