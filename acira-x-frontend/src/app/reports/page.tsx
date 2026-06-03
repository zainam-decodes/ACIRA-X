"use client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, ShieldAlert, Crosshair, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/config";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/reports`);
        if (res.ok) setReports(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout title="Incident Reports">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {reports.length === 0 && (
          <div className="col-span-full p-16 text-center border border-dashed border-white/10 rounded-xl bg-white/5 text-slate-500">
            <FileText className="mx-auto mb-4 text-slate-600" size={36} />
            No reports generated yet. Run a simulation to generate one.
          </div>
        )}
        
        {reports.map((report) => (
          <Card key={report.id} className="bg-black/60 border-white/10 backdrop-blur-md overflow-hidden flex flex-col relative">
            {/* Top Accent Line */}
            <div className={`h-1 w-full absolute top-0 left-0 ${report.attack_type === 'Phishing' ? 'bg-blue-500' : report.attack_type === 'Brute Force' ? 'bg-orange-500' : report.attack_type === 'Ransomware' ? 'bg-red-500' : 'bg-purple-500'}`} />
            
            <CardHeader className="pb-3 border-b border-white/5 pt-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <Badge variant="outline" className="mb-2 text-xs bg-white/5 text-slate-300 border-white/10">
                    {report.attack_type}
                  </Badge>
                  <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <FileText size={18} className="text-cyan-400" />
                    {report.title}
                  </CardTitle>
                </div>
                <button className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-cyan-400" title="Export PDF">
                  <Download size={18} />
                </button>
              </div>
              <div className="text-xs text-slate-500 mt-2 font-mono flex items-center justify-between">
                <span>ID: {report.id}</span>
                <span>{new Date(report.generated_at).toLocaleString()}</span>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 flex flex-col flex-1">
              <div className="p-5 flex-1">
                <div className="space-y-6">
                  {/* Executive Summary */}
                  <section>
                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
                      <ShieldAlert size={14} className="text-blue-400" /> Executive Summary
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                      {report.summary}
                    </p>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Timeline */}
                    <section>
                      <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
                        <AlertTriangle size={14} className="text-orange-400" /> Key Timeline
                      </h4>
                      <ul className="text-xs text-slate-400 space-y-2 border-l border-white/10 pl-3 ml-2">
                        {report.timeline?.split(" | ").map((event: string, i: number) => {
                          const [time, desc] = event.split(": ");
                          return (
                            <li key={i} className="relative">
                              <div className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-orange-400/50" />
                              <span className="font-mono text-orange-400/80 mr-2">{time}</span>
                              {desc}
                            </li>
                          );
                        })}
                      </ul>
                    </section>

                    {/* MITRE & Recommendations */}
                    <section className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
                          <Crosshair size={14} className="text-red-400" /> MITRE ATT&CK Map
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {report.mitre_tactics?.split(",").map((tactic: string, i: number) => (
                            <Badge key={i} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                              {tactic.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
                          Remediation Steps
                        </h4>
                        <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4 marker:text-cyan-500/50">
                          {report.recommendations?.split("\n").map((rec: string, i: number) => (
                            <li key={i}>{rec.replace(/^\d+\.\s*/, '')}</li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
