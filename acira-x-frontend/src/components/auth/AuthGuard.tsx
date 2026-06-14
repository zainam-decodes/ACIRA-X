"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, AuthUser } from "@/lib/auth";

/**
 * AuthGuard — wraps any dashboard page.
 * If no valid session exists, redirects to /login immediately.
 * Also exposes the current user to children via render prop pattern.
 */
export function AuthGuard({
  children,
}: {
  children: (user: AuthUser) => React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
    } else {
      setUser(u);
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Scanning animation */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full" />
            <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" />
            <div className="absolute inset-[6px] border-t border-cyan-400/40 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-xs text-slate-500 tracking-widest uppercase animate-pulse">Verifying Session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children(user)}</>;
}
