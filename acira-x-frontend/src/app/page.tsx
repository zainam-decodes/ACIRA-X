"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Splash Screen ────────────────────────────────────────────────────────────
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "reveal" | "done">("loading");

  useEffect(() => {
    let p = 0;
    const tick = setInterval(() => {
      p += Math.random() * 12 + 4;
      if (p >= 100) {
        p = 100;
        clearInterval(tick);
        setProgress(100);
        setTimeout(() => setPhase("reveal"), 300);
        setTimeout(() => setPhase("done"), 1100);
        setTimeout(() => onComplete(), 1500);
      } else {
        setProgress(Math.round(p));
      }
    }, 60);
    return () => clearInterval(tick);
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-700 ${phase === "reveal" ? "opacity-0" : "opacity-100"}`}
    >
      {/* Grid lines */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(#00ffff 1px, transparent 1px), linear-gradient(90deg, #00ffff 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      {/* Scan line */}
      <div className="absolute inset-x-0 h-px bg-cyan-500/40 animate-[scanline_2s_ease-in-out_infinite]"
        style={{ top: `${progress}%`, transition: "top 0.1s linear", boxShadow: "0 0 20px 2px rgba(6,182,212,0.6)" }} />

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Animated ACIRA-X wordmark */}
        <div className="overflow-hidden">
          <h1
            className="text-6xl md:text-8xl font-black tracking-[0.15em] text-white"
            style={{
              fontFamily: "'Geist', 'Inter', sans-serif",
              background: "linear-gradient(135deg, #ffffff 0%, #22d3ee 50%, #3b82f6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              transform: `translateY(${progress < 30 ? "40px" : "0px"})`,
              opacity: progress < 10 ? 0 : 1,
              transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease",
            }}
          >
            ACIRA-X
          </h1>
        </div>

        {/* Tagline */}
        <p
          className="text-xs tracking-[0.4em] uppercase text-cyan-400/70"
          style={{
            opacity: progress < 40 ? 0 : 1,
            transition: "opacity 0.6s ease 0.2s",
          }}
        >
          Autonomous Cyber Incident Response
        </p>

        {/* Progress bar */}
        <div className="w-64 h-px bg-white/10 relative overflow-hidden mt-4">
          <div
            className="absolute inset-y-0 left-0 bg-cyan-400"
            style={{
              width: `${progress}%`,
              transition: "width 0.1s linear",
              boxShadow: "4px 0 12px rgba(34,211,238,0.8)",
            }}
          />
        </div>

        {/* Counter */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
          <span className="text-cyan-500/60">[</span>
          <span>INITIALIZING SOC SYSTEMS</span>
          <span className="text-cyan-400 w-8 text-right">{progress}%</span>
          <span className="text-cyan-500/60">]</span>
        </div>
      </div>

      {/* Corner decorations */}
      {[
        "top-6 left-6 border-t border-l",
        "top-6 right-6 border-t border-r",
        "bottom-6 left-6 border-b border-l",
        "bottom-6 right-6 border-b border-r",
      ].map((c, i) => (
        <div key={i} className={`absolute w-8 h-8 border-cyan-500/30 ${c}`} />
      ))}
    </div>
  );
}

// ─── Glitch Text ──────────────────────────────────────────────────────────────
function GlitchText({ children, className = "" }: { children: string; className?: string }) {
  const [glitching, setGlitching] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`relative inline-block ${className}`}>
      <span className={glitching ? "opacity-0" : "opacity-100"}>{children}</span>
      {glitching && (
        <>
          <span className="absolute inset-0 text-cyan-400" style={{ clipPath: "polygon(0 30%, 100% 30%, 100% 50%, 0 50%)", transform: "translateX(-3px)" }}>{children}</span>
          <span className="absolute inset-0 text-red-400" style={{ clipPath: "polygon(0 55%, 100% 55%, 100% 70%, 0 70%)", transform: "translateX(3px)" }}>{children}</span>
        </>
      )}
    </span>
  );
}

// ─── Counter ─────────────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let c = 0;
        const step = target / 60;
        const t = setInterval(() => {
          c += step;
          if (c >= target) { setCount(target); clearInterval(t); }
          else setCount(Math.round(c));
        }, 25);
      }
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <div ref={ref}>{count.toLocaleString()}{suffix}</div>;
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [splashDone, setSplashDone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle grid canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let particles: { x: number; y: number; vx: number; vy: number; opacity: number }[] = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 80; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, opacity: Math.random() * 0.5 + 0.1 });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,211,238,${p.opacity})`;
        ctx.fill();
      });
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(34,211,238,${0.08 * (1 - d / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [splashDone]);

  return (
    <>
      <SplashScreen onComplete={() => setSplashDone(true)} />

      <div className={`bg-black text-white min-h-screen font-sans transition-opacity duration-700 ${splashDone ? "opacity-100" : "opacity-0"}`}>

        {/* ── NAV ─────────────────────────────────────────────────── */}
        <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5">
          <Link href="/" className="text-xl font-black tracking-[0.15em] text-white hover:text-cyan-400 transition-colors">
            ACIRA-X
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-xs tracking-widest uppercase text-slate-400">
            {["Features", "Mission", "Stats", "About", "Contact Dev"].map(n => (
              <a key={n} href={`#${n.toLowerCase().replace(" ", "-")}`} className="hover:text-white transition-colors">{n}</a>
            ))}
          </nav>
          <Link
            href="/dashboard"
            className="hidden md:flex items-center gap-2 px-5 py-2 border border-cyan-500/50 text-cyan-400 text-xs tracking-widest uppercase hover:bg-cyan-500/10 transition-all"
          >
            Enter SOC →
          </Link>
          <button className="md:hidden text-slate-400" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="space-y-1.5">
              <span className={`block w-6 h-px bg-current transition-transform ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-6 h-px bg-current transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-6 h-px bg-current transition-transform ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </div>
          </button>
        </header>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-black/95 flex flex-col items-center justify-center gap-8">
            {["Features", "Mission", "Stats", "About", "Contact Dev"].map(n => (
              <a key={n} href={`#${n.toLowerCase().replace(" ", "-")}`} onClick={() => setMenuOpen(false)} className="text-2xl tracking-widest uppercase text-slate-300 hover:text-white">{n}</a>
            ))}
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="mt-4 px-8 py-3 border border-cyan-500/50 text-cyan-400 tracking-widest uppercase">Enter SOC →</Link>
          </div>
        )}

        {/* ── HERO ────────────────────────────────────────────────── */}
        <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
          {/* Canvas particles */}
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)", backgroundSize: "80px 80px" }} />

          {/* Glow blobs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 text-center px-6 max-w-7xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 border border-cyan-500/30 px-4 py-1.5 text-xs tracking-widest uppercase text-cyan-400 mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              System Online — Monitoring Active
            </div>

            {/* Hero heading */}
            <h1 className="text-5xl sm:text-7xl md:text-[100px] font-black leading-[0.9] tracking-tight mb-8">
              <GlitchText className="block text-white">AUTONOMOUS</GlitchText>
              <span className="block" style={{ background: "linear-gradient(90deg, #22d3ee, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                CYBER DEFENSE
              </span>
              <span className="block text-white/20 text-4xl sm:text-5xl md:text-6xl font-light tracking-[0.3em] mt-2">RESPONSE ENGINE</span>
            </h1>

            <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto mb-14 leading-relaxed">
              ACIRA-X deploys autonomous AI agents that detect, investigate, contain, and eradicate threats in real time — before a human analyst even opens their laptop.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard"
                className="group px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm tracking-widest uppercase transition-all duration-300 shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:shadow-[0_0_60px_rgba(34,211,238,0.6)]"
              >
                Enter SOC Dashboard
                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <a href="#features"
                className="px-8 py-4 border border-white/10 text-slate-400 hover:text-white hover:border-white/30 text-sm tracking-widest uppercase transition-all duration-300"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600 text-[10px] tracking-widest uppercase">
            <span>Scroll to explore</span>
            <div className="w-px h-12 bg-gradient-to-b from-slate-600 to-transparent animate-pulse" />
          </div>
        </section>

        {/* ── STATS BAR ───────────────────────────────────────────── */}
        <section id="stats" className="border-y border-white/5 bg-white/[0.02] py-12">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-8">
            {[
              { label: "Threats Neutralized", target: 142837, suffix: "+" },
              { label: "Avg Response Time", target: 23, suffix: "ms" },
              { label: "Endpoints Monitored", target: 4200, suffix: "+" },
              { label: "Uptime", target: 99.97, suffix: "%" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-4xl md:text-5xl font-black text-white mb-2">
                  <Counter target={s.target} suffix={s.suffix} />
                </div>
                <div className="text-xs text-slate-500 tracking-widest uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────── */}
        <section id="features" className="py-32 px-8 max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="text-xs text-cyan-400 tracking-[0.4em] uppercase mb-4">// CAPABILITIES</p>
            <h2 className="text-5xl md:text-6xl font-black text-white leading-tight">
              Five AI agents.<br />
              <span className="text-slate-500">One unified SOC.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
            {[
              { num: "01", title: "Detection Agent", icon: "👁", desc: "Continuously monitors all network telemetry, logs, and endpoint behavior. Detects anomalies in real time using behavioral baselines.", tag: "Always On" },
              { num: "02", title: "Investigation Agent", icon: "🔬", desc: "Autonomously correlates alerts, traces attack chains, and maps attacker behavior to the MITRE ATT&CK framework.", tag: "Automated Triage" },
              { num: "03", title: "AI Analysis Agent", icon: "🧠", desc: "Deep-dives into IOCs, malware signatures, and lateral movement patterns. Generates risk scores and incident severity classifications.", tag: "Deep Intelligence" },
              { num: "04", title: "Response Agent", icon: "⚡", desc: "Executes containment playbooks: isolate endpoints, suspend accounts, block IPs, quarantine files — in milliseconds.", tag: "Sub-Second Action" },
              { num: "05", title: "Recovery Agent", icon: "🛡", desc: "Orchestrates system restoration, verifies integrity of recovered assets, and hardens configurations post-incident.", tag: "Full Lifecycle" },
              { num: "06", title: "Reporting Engine", icon: "📋", desc: "Generates MITRE-mapped post-mortem reports with executive summaries, timelines, and remediation playbooks.", tag: "Compliance Ready" },
            ].map(f => (
              <div key={f.num} className="bg-black p-8 group hover:bg-white/[0.03] transition-colors cursor-default">
                <div className="flex items-start justify-between mb-6">
                  <span className="text-3xl">{f.icon}</span>
                  <span className="text-xs text-slate-600 font-mono">{f.num}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">{f.desc}</p>
                <span className="text-[10px] border border-cyan-500/20 text-cyan-500/60 px-3 py-1 tracking-widest uppercase">{f.tag}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── MISSION ─────────────────────────────────────────────── */}
        <section id="mission" className="py-32 px-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs text-cyan-400 tracking-[0.4em] uppercase mb-12">// MISSION</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-4xl md:text-6xl font-black leading-tight text-white mb-6">
                  Protect every<br />
                  <span style={{ background: "linear-gradient(90deg,#22d3ee,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    endpoint.
                  </span><br />
                  Respond to every<br />
                  <span style={{ background: "linear-gradient(90deg,#22d3ee,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    threat.
                  </span><br />
                  <span className="text-slate-600">Before it matters.</span>
                </p>
              </div>
              <div className="space-y-6 text-slate-400 text-base leading-relaxed border-l border-white/5 pl-12">
                <p>The average attacker dwells inside a corporate network for <span className="text-white font-semibold">197 days</span> before being detected. ACIRA-X was built to collapse that window to <span className="text-cyan-400 font-semibold">seconds</span>.</p>
                <p>Our autonomous agent framework doesn't just alert your team — it acts. Containment, eradication, and recovery happen programmatically, at machine speed, without waiting for human intervention.</p>
                <p>Built for security teams who want to move from reactive to <span className="text-white font-semibold">predictive defense</span>.</p>
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-cyan-400 text-sm tracking-widest uppercase border-b border-cyan-400/30 pb-1 hover:border-cyan-400 transition-colors mt-4">
                  Open SOC Dashboard →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── ATTACK VECTORS ──────────────────────────────────────── */}
        <section id="about" className="py-32 px-8 border-t border-white/5 bg-white/[0.01]">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs text-cyan-400 tracking-[0.4em] uppercase mb-4">// SIMULATION ENGINE</p>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-16">Test your defenses.<br /><span className="text-slate-600">Safely.</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
              {[
                { icon: "🎣", name: "Phishing", mitre: "T1566.002", desc: "Credential harvesting via spear-phishing email campaign.", color: "cyan" },
                { icon: "🔨", name: "Brute Force SSH", mitre: "T1110.001", desc: "Hydra-style SSH dictionary attack from Tor exit nodes.", color: "orange" },
                { icon: "🔐", name: "Ransomware", mitre: "T1486", desc: "LockBit 3.0 macro-delivered mass file encryption.", color: "red" },
                { icon: "💉", name: "SQL Injection", mitre: "T1190", desc: "UNION-based SQLi exfiltration against a web application.", color: "purple" },
              ].map(a => (
                <div key={a.name} className="bg-black p-8 group hover:bg-white/[0.03] transition-colors">
                  <div className="text-4xl mb-4">{a.icon}</div>
                  <h3 className="font-bold text-white mb-1">{a.name}</h3>
                  <p className="text-xs font-mono text-slate-600 mb-3">{a.mitre}</p>
                  <p className="text-sm text-slate-500">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTACT DEV ─────────────────────────────────────────── */}
        <section id="contact-dev" className="py-32 px-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs text-cyan-400 tracking-[0.4em] uppercase mb-4">// CONTACT DEV</p>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-16">Built by a<br /><span className="text-slate-500">human.</span></h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/5">
              {/* Author card */}
              <div className="bg-black p-12 group hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-5 mb-8">
                  {/* Avatar */}
                  <div className="relative w-16 h-16 shrink-0">
                    <div className="w-full h-full border border-cyan-500/30 flex items-center justify-center text-2xl" style={{ background: "linear-gradient(135deg, #0e1a2e, #0c2340)" }}>
                      ZJ
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-black" title="Online" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-wide">Zainab Jahan Umaima</h3>
                    <p className="text-xs text-cyan-400/70 tracking-widest uppercase mt-1">Developer · Creator of ACIRA-X</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-8 border-l-2 border-cyan-500/20 pl-5">
                  Designed and engineered ACIRA-X as a proof-of-concept for the future of autonomous, AI-driven cybersecurity operations. The platform demonstrates how multi-agent AI systems can dramatically reduce incident response times.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 group/item">
                    <div className="w-8 h-8 border border-white/10 flex items-center justify-center text-xs text-slate-500">@</div>
                    <a
                      href="mailto:thezainabjahan14@gmail.com"
                      className="font-mono text-sm text-slate-300 hover:text-cyan-400 transition-colors underline-offset-4 hover:underline"
                    >
                      thezainabjahan14@gmail.com
                    </a>
                  </div>
                </div>
              </div>
              {/* Message card */}
              <div className="bg-black p-12">
                <p className="text-xs text-slate-600 tracking-widest uppercase mb-6">Send a message</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-2">Your Name</label>
                    <input type="text" placeholder="John Doe" className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-2">Your Email</label>
                    <input type="email" placeholder="you@company.com" className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 tracking-widest uppercase block mb-2">Message</label>
                    <textarea rows={4} placeholder="Tell me about your project or feedback..." className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all resize-none" />
                  </div>
                  <a
                    href="mailto:thezainabjahan14@gmail.com"
                    className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs tracking-widest uppercase transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.5)]"
                  >
                    Send via Email →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <section className="py-40 px-8 text-center border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-900/10 blur-[150px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-5xl md:text-7xl font-black text-white mb-6">
              Ready to defend<br />at machine speed?
            </h2>
            <p className="text-slate-500 mb-12 text-lg">Enter the SOC. Your autonomous agents are standing by.</p>
            <Link href="/dashboard"
              className="inline-flex items-center gap-3 px-10 py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm tracking-widest uppercase transition-all duration-300 shadow-[0_0_60px_rgba(34,211,238,0.5)] hover:shadow-[0_0_80px_rgba(34,211,238,0.7)]"
            >
              Launch ACIRA-X Dashboard
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <footer className="border-t border-white/5 px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-black tracking-[0.15em] text-white">ACIRA-X</div>
          <p className="text-xs text-slate-600 tracking-widest uppercase">Autonomous Cyber Incident Response for Attacks</p>
          <div className="flex gap-6 text-xs text-slate-600 tracking-widest uppercase">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/response-center" className="hover:text-white transition-colors">Simulations</Link>
            <Link href="/reports" className="hover:text-white transition-colors">Reports</Link>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes scanline {
          0%   { top: 0%; opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </>
  );
}
