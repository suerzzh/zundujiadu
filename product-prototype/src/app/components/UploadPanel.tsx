import { useState, type DragEvent } from "react";
import { UploadCloud, FileText, X, AlertCircle } from "lucide-react";
import { PipelineState } from "./Root";

interface UploadPanelProps {
  state: PipelineState;
  progress: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadPanel({ state, progress }: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile({ name: file.name, size: formatSize(file.size) });
  };

  const isUploading = state === "uploading";

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#111113" }}>
      {/* Panel header */}
      <div
        className="px-4 py-3 border-b shrink-0"
        style={{ borderColor: "#27272a" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "#e4e4e7" }}>
          上传原著小说
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: "#52525b" }}>
          TXT 格式 · 多章节小说文本
        </p>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative flex-1 min-h-[180px] rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200"
          style={{
            border: isDragging
              ? "2px dashed #6366f1"
              : "2px dashed #27272a",
            background: isDragging
              ? "rgba(99,102,241,0.05)"
              : "rgba(255,255,255,0.01)",
          }}
        >
          {/* Glow ring on drag */}
          {isDragging && (
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ boxShadow: "inset 0 0 30px rgba(99,102,241,0.08)" }}
            />
          )}

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200"
            style={{
              background: isDragging
                ? "rgba(99,102,241,0.2)"
                : "rgba(255,255,255,0.04)",
              border: isDragging
                ? "1px solid rgba(99,102,241,0.4)"
                : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <UploadCloud
              size={24}
              style={{ color: isDragging ? "#818cf8" : "#52525b" }}
            />
          </div>

          <div className="text-center px-4">
            <p className="text-sm font-medium" style={{ color: isDragging ? "#a5b4fc" : "#a1a1aa" }}>
              {isDragging ? "松开以上传文件" : "点击或拖拽文件至此"}
            </p>
            <p className="text-xs mt-1" style={{ color: "#3f3f46" }}>
              TXT 格式 · ≥3 章节 · ≤5MB
            </p>
          </div>

          <input
            type="file"
            accept=".txt"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setSelectedFile({ name: file.name, size: formatSize(file.size) });
            }}
          />
        </div>

        {/* Selected / uploading file card */}
        {(selectedFile || isUploading) && (
          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #27272a",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.2)",
                }}
              >
                <FileText size={16} style={{ color: "#818cf8" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#e4e4e7" }}>
                  {selectedFile?.name ?? "novel_chapter_1_to_3.txt"}
                </p>
                <p className="text-xs" style={{ color: "#52525b" }}>
                  {selectedFile?.size ?? "2.3 MB"}
                </p>
              </div>
              {!isUploading && (
                <button
                  onClick={() => setSelectedFile(null)}
                  className="transition-colors"
                  style={{ color: "#52525b" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {isUploading && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: "#71717a" }}>正在解析章节结构...</span>
                  <span className="font-mono" style={{ color: "#818cf8" }}>
                    {Math.round(progress)}%
                  </span>
                </div>
                <div
                  className="w-full h-1 rounded-full overflow-hidden"
                  style={{ background: "#27272a" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background:
                        "linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Requirements */}
        <div
          className="rounded-xl p-3"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid #1c1c1f",
          }}
        >
          <div className="flex items-center gap-1.5 mb-2.5">
            <AlertCircle size={11} style={{ color: "#3f3f46" }} />
            <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>
              输入要求
            </p>
          </div>
          <ul className="space-y-2">
            {[
              ["3 – 50", "章节（推荐范围）"],
              ["≤ 10,000", "字符 / 每章"],
              ["≤ 5 MB", "文件大小"],
              ["UTF-8 / GBK", "编码格式"],
            ].map(([val, desc], i) => (
              <li key={i} className="flex items-center gap-2 text-[11px]">
                <span
                  className="font-mono font-semibold"
                  style={{ color: "#6366f1", minWidth: 60 }}
                >
                  {val}
                </span>
                <span style={{ color: "#52525b" }}>{desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
