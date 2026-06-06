import { useState, useEffect, useRef } from "react";
import { mockScript } from "../mockData";
import { PipelineState } from "./Root";
import {
  RefreshCw,
  FileCode,
  CheckCircle2,
  Loader2,
  Copy,
  Download,
  Check,
} from "lucide-react";

interface ScriptEditorProps {
  pipelineState: PipelineState;
}

const STAGE_HINTS: Record<string, string> = {
  idle: "等待 Pipeline 启动...",
  uploading: "正在上传并解析文件...",
  extractor: "Extractor · 正在提取故事事件...",
  analyzer: "Analyzer · 正在分析改编策略...",
  planner: "Planner · 正在规划分集结构...",
};

export function ScriptEditor({ pipelineState }: ScriptEditorProps) {
  const [content, setContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (
      pipelineState === "writer" ||
      pipelineState === "reviewer" ||
      pipelineState === "completed"
    ) {
      setIsTyping(pipelineState === "writer");

      if (pipelineState === "writer") {
        let currentText = "";
        const lines = mockScript.split("\n");
        let lineIdx = 0;

        const interval = setInterval(() => {
          if (lineIdx < lines.length) {
            currentText += lines[lineIdx] + "\n";
            setContent(currentText);
            lineIdx++;
            if (textareaRef.current) {
              textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
            }
          } else {
            clearInterval(interval);
            setIsTyping(false);
          }
        }, 80);

        return () => clearInterval(interval);
      } else {
        setContent(mockScript);
      }
    } else {
      setContent("");
      setScrollTop(0);
    }
  }, [pipelineState]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = content ? content.split("\n").length : 0;
  const charCount = content.length;

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden"
      style={{ background: "#09090b" }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0 border-b"
        style={{ background: "#111113", borderColor: "#27272a" }}
      >
        {/* File tab */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-md"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid #27272a",
          }}
        >
          <FileCode size={12} style={{ color: "#818cf8" }} />
          <span
            className="text-[12px] font-mono"
            style={{ color: "#d4d4d8" }}
          >
            script.yaml
          </span>
          <div
            className="w-1.5 h-1.5 rounded-full ml-1"
            style={{
              background: isTyping
                ? "#fbbf24"
                : pipelineState === "completed"
                ? "#34d399"
                : "#3f3f46",
              boxShadow: isTyping
                ? "0 0 6px rgba(251,191,36,0.6)"
                : pipelineState === "completed"
                ? "0 0 6px rgba(52,211,153,0.5)"
                : "none",
              animation: isTyping ? "pulse 1s infinite" : "none",
            }}
          />
        </div>

        <div className="flex-1" />

        {/* Status */}
        {isTyping && (
          <div
            className="flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: "#fbbf24" }}
          >
            <Loader2 size={11} className="animate-spin" />
            Writer · 撰写中
          </div>
        )}
        {pipelineState === "completed" && (
          <div
            className="flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: "#34d399" }}
          >
            <CheckCircle2 size={11} />
            撰写完成
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="复制全文"
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors"
            style={{
              background: copied ? "rgba(52,211,153,0.1)" : "transparent",
              color: copied ? "#34d399" : "#52525b",
              border: copied ? "1px solid rgba(52,211,153,0.2)" : "1px solid transparent",
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "已复制" : "复制"}
          </button>
          <button
            title="单集重生成"
            className="px-2 py-1 rounded text-[11px] transition-colors"
            style={{ color: "#52525b" }}
          >
            <RefreshCw size={12} />
          </button>
          <button
            title="导出 YAML"
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
            style={{
              background: "rgba(99,102,241,0.15)",
              color: "#818cf8",
              border: "1px solid rgba(99,102,241,0.25)",
            }}
          >
            <Download size={11} />
            导出
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-hidden relative">
        {content ? (
          <div className="flex h-full overflow-hidden">
            {/* Line numbers */}
            <div
              className="shrink-0 overflow-hidden select-none"
              style={{
                width: 44,
                background: "#09090b",
                borderRight: "1px solid #18181b",
              }}
            >
              <div
                style={{
                  transform: `translateY(-${scrollTop}px)`,
                  paddingTop: 16,
                  paddingBottom: 16,
                }}
              >
                {content.split("\n").map((_, i) => (
                  <div
                    key={i}
                    className="text-right pr-3 font-mono"
                    style={{
                      fontSize: 11,
                      lineHeight: "20px",
                      color: "#3f3f46",
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              className="flex-1 outline-none resize-none"
              style={{
                background: "#09090b",
                color: "#d4d4d8",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                fontSize: 13,
                lineHeight: "20px",
                padding: "16px 16px 16px 12px",
                caretColor: "#818cf8",
                tabSize: 2,
              }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onScroll={(e) => setScrollTop((e.target as HTMLTextAreaElement).scrollTop)}
              spellCheck={false}
            />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full gap-5"
            style={{ color: "#3f3f46" }}
          >
            {/* Decorative grid */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, #27272a 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                opacity: 0.4,
              }}
            />
            <div className="relative text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.12)",
                }}
              >
                <FileCode size={24} style={{ color: "#3f3f46" }} />
              </div>
              <p
                className="font-mono text-sm mb-1"
                style={{ color: "#52525b" }}
              >
                {STAGE_HINTS[pipelineState] ?? "等待 Pipeline..."}
              </p>
              {pipelineState !== "idle" && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "#6366f1",
                        opacity: 0.6,
                        animation: `bounce 1.2s ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-4 py-1 shrink-0 border-t"
        style={{ background: "#0c0c0e", borderColor: "#1c1c1f" }}
      >
        <div
          className="flex items-center gap-3 font-mono"
          style={{ fontSize: 10, color: "#3f3f46" }}
        >
          <span
            className="px-1.5 py-0.5 rounded"
            style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
          >
            YAML
          </span>
          <span>UTF-8</span>
          {lineCount > 0 && <span>{lineCount} 行</span>}
        </div>
        <div className="font-mono" style={{ fontSize: 10, color: "#3f3f46" }}>
          {charCount > 0 ? `${charCount} 字符` : "空文件"}
        </div>
      </div>
    </div>
  );
}
