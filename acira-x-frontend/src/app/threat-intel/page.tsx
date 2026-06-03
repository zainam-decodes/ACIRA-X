"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ExternalLink, Search, Shield } from "lucide-react";
import { API_BASE_URL } from "@/config";

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30" },
  High:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  Medium:   { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  Low:      { bg: "bg-slate-500/10",  text: "text-slate-400",  border: "border-slate-500/20" },
};

const TYPE_ICONS: Record<string, string> = {
  "IP Address": "🌐",
  "File Hash (MD5)": "#️⃣",
  "Domain": "🔗",
  "CVE": "🐛",
  "SQL Injection Pattern": "💉",
};

const KNOWN_CAMPAIGNS = [
  { name: "LockBit 3.0", type: "Ransomware", severity: "Critical", iocs: 42, last_active: "2026-06-03", target: "Healthcare, Finance" },
  { name: "DarkGate Loader", type: "Malware Loader", severity: "High", iocs: 18, last_active: "2026-06-02", target: "All Sectors" },
  { name: "SSH Dragon Campaign", type: "Brute Force", severity: "High", iocs: 67, last_active: "2026-06-03", target: "Linux Servers" },
  { name: "MalSpam Wave 2024-Q2", type: "Phishing", severity: "Medium", iocs: 130, last_active: "2026-06-01", target: "Corporate Email" },
];

export default function ThreatIntelPage() {
  const [intel, setIntel] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");

  useEffect(() => {
    const fetchIntel = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/threat-intel`);
        if (res.ok) setIntel(await res.json());
      } catch (e) { console.error(e); }
    };
    fetchIntel();
  }, []);

  const types = ["All", ...Array.from(new Set(intel.map(i => i.type)))];
  const filtered = intel.filter(i => {
    const matchType = filterType === "All" || i.type === filterType;
    const matchSearch = !search || i.indicator.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <DashboardLayout title="Threat Intelligence">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total IOCs", val: intel.length, color: "text-slate-300" },
          { label: "Critical", val: intel.filter(i => i.severity === "Critical").length, color: "text-red-400" },
          { label: "High", val: intel.filter(i => i.severity === "High").length, color: "text-orange-400" },
          { label: "Active Campaigns", val: KNOWN_CAMPAIGNS.length, color: "text-cyan-400" },
        ].map(s => (
          <Card key={s.label} className="bg-black/40 border-white/10 backdrop-blur-md">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</div>
              <div className={`text-3xl font-bold mt-1 ${s.color}`}>{s.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Threat Campaigns */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-md">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-red-400" />
            <span className="text-sm font-semibold text-slate-200">Active Threat Campaigns</span>
            <span className="ml-auto text-xs text-slate-500">Updated: {new Date().toLocaleDateString()}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {KNOWN_CAMPAIGNS.map((c) => {
              const sev = SEVERITY_CONFIG[c.severity] || SEVERITY_CONFIG.Low;
              return (
                <div key={c.name} className={`p-4 rounded-xl border ${sev.border} ${sev.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold ${sev.text}`}>{c.name}</span>
                    <Badge variant="outline" className={`text-xs ${sev.bg} ${sev.text} ${sev.border}`}>{c.severity}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Type:</span><span className="text-slate-300">{c.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IOCs:</span><span className="text-slate-300">{c.iocs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Targets:</span><span className="text-slate-300">{c.target}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Active:</span><span className="text-slate-300">{c.last_active}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* IOC Table */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-md">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Shield size={14} className="text-cyan-400" />
            <span className="text-sm font-semibold text-slate-200">Indicators of Compromise (IOCs)</span>
            <div className="ml-auto flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                <Search size={12} className="text-slate-500" />
                <input
                  className="bg-transparent text-sm text-slate-300 outline-none placeholder-slate-600 w-40"
                  placeholder="Search IOCs..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    filterType === t
                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                      : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-white/10">
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Indicator</th>
                  <th className="pb-3 pr-4">Severity</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.Low;
                  return (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span>{TYPE_ICONS[item.type] || "📋"}</span>
                          <span className="text-xs text-slate-400">{item.type}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-mono text-cyan-400 text-xs max-w-[200px] truncate">{item.indicator}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className={`text-xs ${sev.bg} ${sev.text} ${sev.border}`}>{item.severity}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-400 text-xs max-w-xs">{item.description}</td>
                      <td className="py-3 text-slate-500 text-xs">{item.source || "ACIRA-X"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-10 text-center text-slate-500 text-sm">No IOCs match your filter.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
