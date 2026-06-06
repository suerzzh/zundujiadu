import { useState, useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { UploadPanel } from "./UploadPanel";
import { EventsBoard } from "./EventsBoard";
import { ScriptEditor } from "./ScriptEditor";
import { RightPanel } from "./RightPanel";
import { Play, RefreshCw, Sparkles, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";

export type PipelineState =
  | "idle"
  | "uploading"
  | "extractor"
  | "analyzer"
  | "planner"
  | "writer"
  | "reviewer"
  | "completed";

const PIPELINE_STAGES: Array<{ key: PipelineState; label: string }> = [
  { key: "uploading", label: "上传" },
  { key: "extractor", label: "提取" },
  { key: "analyzer", label: "分析" },
  { key: "planner", label: "规划" },
  { key: "writer", label: "撰写" },
  { key: "reviewer", label: "审核" },
];

const STAGE_SEQUENCE: PipelineState[] = [
  "uploading", "extractor", "analyzer", "planner", "writer", "reviewer", "completed",
];

export function Root() {
  const [pipelineState, setPipelineState] = useState<PipelineState>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (pipelineState === "idle" || pipelineState === "completed") return;
    const currentIndex = STAGE_SEQUENCE.indexOf(pipelineState);
    if (currentIndex < STAGE_SEQUENCE.length - 1) {
      const timer = setTimeout(() => {
        setPipelineState(STAGE_SEQUENCE[currentIndex + 1]);
        setProgress(((currentIndex + 1) / (STAGE_SEQUENCE.length - 1)) * 100);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pipelineState]);

  const handleStart = () => {
    if (pipelineState === "idle" || pipelineState === "completed") {
      setPipelineState("uploading");
      setProgress(10);
    }
  };

  const currentStageIndex = STAGE_SEQUENCE.indexOf(pipelineState);
  const isRunning = pipelineState !== "idle" && pipelineState !== "completed";

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden" style={{ background: "#09090b", color: "#f4f4f5" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 shrink-0 border-b"
        style={{
          height: 52,
          background: "linear-gradient(180deg, #111113 0%, #0f0f11 100%)",
          borderColor: "#27272a",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              boxShadow: "0 0 20px rgba(99,102,241,0.35)",
            }}
          >
            <Sparkles size={15} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: "#f4f4f5" }}>
                剧本转化工坊
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  color: "#818cf8",
                  border: "1px solid rgba(99,102,241,0.25)",
                }}
              >
                v2.1
              </span>
            </div>
            <p className="text-[10px] font-mono tracking-widest" style={{ color: "#52525b" }}>
              AI Script Factory
            </p>
          </div>
        </div>

        {/* Pipeline stages */}
        <div className="hidden lg:flex items-center gap-0.5">
          {PIPELINE_STAGES.map((stage, idx) => {
            const seqIdx = STAGE_SEQUENCE.indexOf(stage.key);
            const isCompleted =
              pipelineState === "completed" ||
              (currentStageIndex > seqIdx && currentStageIndex !== -1);
            const isActive = currentStageIndex === seqIdx;
            return (
              <div key={stage.key} className="flex items-center">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300"
                  style={
                    isActive
                      ? {
                          background: "rgba(99,102,241,0.18)",
                          color: "#a5b4fc",
                          border: "1px solid rgba(99,102,241,0.35)",
                        }
                      : isCompleted
                      ? { color: "#34d399" }
                      : { color: "#3f3f46" }
                  }
                >
                  {isActive ? (
                    <Loader2 size={10} className="animate-spin" style={{ color: "#818cf8" }} />
                  ) : isCompleted ? (
                    <CheckCircle2 size={10} style={{ color: "#34d399" }} />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#3f3f46" }} />
                  )}
                  {stage.label}
                </div>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <ChevronRight size={12} style={{ color: "#27272a", margin: "0 2px" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Action button */}
        <button
          onClick={handleStart}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0"
          style={
            isRunning
              ? { background: "#27272a", color: "#52525b", cursor: "not-allowed" }
              : pipelineState === "completed"
              ? {
                  background: "rgba(52,211,153,0.12)",
                  color: "#34d399",
                  border: "1px solid rgba(52,211,153,0.25)",
                }
              : {
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#fff",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
                }
          }
        >
          {isRunning ? (
            <>
              <Loader2 size={14} className="animate-spin" /> 处理中
            </>
          ) : pipelineState === "completed" ? (
            <>
              <RefreshCw size={14} /> 重新开始
            </>
          ) : (
            <>
              <Play size={14} /> 开始转换
            </>
          )}
        </button>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 shrink-0" style={{ background: "#18181b" }}>
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width:
              pipelineState === "completed"
                ? "100%"
                : pipelineState === "idle"
                ? "0%"
                : `${progress}%`,
            background: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
          }}
        />
      </div>

      {/* Main panels */}
      <main className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={25} minSize={20} maxSize={40} className="flex flex-col" style={{ background: "#111113" }}>
            {pipelineState === "idle" || pipelineState === "uploading" ? (
              <UploadPanel state={pipelineState} progress={progress} />
            ) : (
              <EventsBoard />
            )}
          </Panel>

          <PanelResizeHandle
            className="cursor-col-resize transition-colors"
            style={{ width: 1, background: "#27272a" }}
          />

          <Panel defaultSize={45} minSize={30} className="flex flex-col" style={{ background: "#09090b" }}>
            <ScriptEditor pipelineState={pipelineState} />
          </Panel>

          <PanelResizeHandle
            className="cursor-col-resize transition-colors"
            style={{ width: 1, background: "#27272a" }}
          />

          <Panel defaultSize={30} minSize={25} maxSize={50} className="flex flex-col" style={{ background: "#111113" }}>
            <RightPanel pipelineState={pipelineState} />
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
}
