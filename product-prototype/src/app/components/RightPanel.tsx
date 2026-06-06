import { useState, type ReactNode } from "react";
import { PipelineState } from "./Root";
import { AnalysisBoard } from "./AnalysisBoard";
import { ReviewPanel } from "./ReviewPanel";
import { ContinuityTimeline } from "./ContinuityTimeline";
import { BarChart3, ShieldCheck, GitBranch } from "lucide-react";

interface RightPanelProps {
  pipelineState: PipelineState;
}

type Tab = "analysis" | "review" | "continuity";

const TABS: Array<{ key: Tab; label: string; icon: ReactNode }> = [
  { key: "analysis", label: "改编分析", icon: <BarChart3 size={13} /> },
  { key: "review", label: "审核结果", icon: <ShieldCheck size={13} /> },
  { key: "continuity", label: "连续性", icon: <GitBranch size={13} /> },
];

export function RightPanel({ pipelineState }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("analysis");

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ background: "#111113" }}
    >
      {/* Tab bar */}
      <div
        className="flex shrink-0 border-b"
        style={{ background: "#0f0f11", borderColor: "#27272a" }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-all relative"
              style={{
                color: isActive ? "#a5b4fc" : "#52525b",
                background: isActive ? "rgba(99,102,241,0.05)" : "transparent",
              }}
            >
              {tab.icon}
              {tab.label}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #6366f1, transparent)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: "#111113" }}
      >
        {activeTab === "analysis" && <AnalysisBoard pipelineState={pipelineState} />}
        {activeTab === "review" && <ReviewPanel pipelineState={pipelineState} />}
        {activeTab === "continuity" && (
          <ContinuityTimeline pipelineState={pipelineState} />
        )}
      </div>
    </div>
  );
}
