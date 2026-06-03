"use client";
import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileLock, UploadCloud, ShieldCheck, ShieldAlert, FileWarning, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config";

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
  Protected: { icon: <ShieldCheck size={14} />, bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" },
  Compromised: { icon: <ShieldAlert size={14} />, bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  Quarantined: { icon: <FileWarning size={14} />, bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
};

export default function ProtectedFilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/protected-files`);
      if (res.ok) setFiles(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFiles();
    const interval = setInterval(fetchFiles, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);

    try {
      await fetch(`${API_BASE_URL}/api/protected-files/upload`, {
        method: "POST",
        body: formData,
      });
      await fetchFiles();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filtered = files.filter(f => f.filename.toLowerCase().includes(search.toLowerCase()) || f.file_hash.includes(search));

  return (
    <DashboardLayout title="Protected Files & Assets">
      {/* Upload Zone */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-md mb-6 border-dashed hover:border-cyan-500/50 transition-colors">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4">
            <UploadCloud size={32} className="text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">Upload Sensitive Asset</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Upload critical configuration files, certificates, or proprietary data to place them under ACIRA-X active protection monitoring. 
            If a ransomware simulation hits, these files will be actively monitored for encryption attempts.
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            id="file-upload" 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
          >
            {uploading ? "Uploading & Analyzing..." : "Select File for Protection"}
          </Button>
        </CardContent>
      </Card>

      {/* File List */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-md flex-1">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <FileLock size={16} className="text-cyan-400" /> Monitored Assets Repository
            </CardTitle>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
              <Search size={12} className="text-slate-500" />
              <input
                className="bg-transparent text-sm text-slate-300 outline-none placeholder-slate-600 w-48"
                placeholder="Search filename or hash..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-500 uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Filename</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">SHA-256 Hash</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Protected Since</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((file) => {
                const status = STATUS_CONFIG[file.status] || STATUS_CONFIG.Protected;
                return (
                  <tr key={file.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <FileLock size={14} className="text-slate-500" />
                        {file.filename}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`text-xs gap-1.5 py-1 ${status.bg} ${status.text} ${status.border}`}>
                        {status.icon} {file.status}
                      </Badge>
                      {file.threat_detected && (
                        <div className="text-[10px] text-red-400 mt-1 max-w-[150px] truncate" title={file.threat_detected}>
                          {file.threat_detected}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500 max-w-[150px] truncate" title={file.file_hash}>
                      {file.file_hash}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatSize(file.file_size)}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(file.upload_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              No protected files found. Upload an asset to begin monitoring.
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
