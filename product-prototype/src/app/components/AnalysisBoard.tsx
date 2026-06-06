import { mockAnalysis } from "../mockData";
import { PipelineState } from "./Root";
import {
  Loader2,
  TrendingUp,
  List,
  Anchor,
  Sparkles,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

const EMOTION_COLOR: Record<string, string> = {
  高: "#f87171",
  极高: "#ef4444",
  "中上": "#fb923c",
  中: "#fbbf24",
  低: "#94a3b8",
};

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-3 p-8"
      style={{ color: "#3f3f46" }}
    >
      <Loader2 size={20} className="animate-spin" style={{ color: "#27272a" }} />
      <p className="text-xs text-center">{message}</p>
    </div>
  );
}

export function AnalysisBoard({ pipelineState }: { pipelineState: PipelineState }) {
  if (
    pipelineState === "idle" ||
    pipelineState === "uploading" ||
    pipelineState === "extractor"
  ) {
    return <EmptyState message="等待 Analyzer 完成分析..." />;
  }

  const { overview, episodes, hooks, satisfaction } = mockAnalysis;

  return (
    <div className="p-4 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "总集数", value: episodes.length, color: "#818cf8" },
          { label: "钩子数", value: hooks.length, color: "#34d399" },
          { label: "爽点", value: satisfaction.length, color: "#fb923c" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg px-3 py-2.5 text-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #1c1c1f",
            }}
          >
            <div
              className="text-lg font-bold font-mono"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "#52525b" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Overview */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #27272a" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid #1c1c1f" }}
        >
          <TrendingUp size={13} style={{ color: "#818cf8" }} />
          <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>
            总览
          </span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] mb-1" style={{ color: "#52525b" }}>题材 / 倾向</p>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: "#d4d4d8" }}
                >
                  {overview.genre}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    color: "#818cf8",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  {overview.orientation}
                </span>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg px-3 py-2.5 flex items-start gap-2"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.15)",
            }}
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
            <div>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: "#fbbf24" }}>
                改编风险
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "#a16207" }}>
                {overview.risks}
              </p>
            </div>
          </div>

          <div
            className="rounded-lg px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1c1c1f" }}
          >
            <p className="text-[10px] mb-1" style={{ color: "#52525b" }}>改编策略</p>
            <p className="text-[11px] leading-relaxed" style={{ color: "#a1a1aa" }}>
              {overview.adaptationStrategy}
            </p>
          </div>
        </div>
      </section>

      {/* Episode Directory */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #27272a" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid #1c1c1f" }}
        >
          <List size={13} style={{ color: "#818cf8" }} />
          <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>
            分集目录
          </span>
        </div>
        <div className="p-3 space-y-2">
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className="rounded-lg p-3"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1c1c1f" }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(99,102,241,0.15)",
                      color: "#a5b4fc",
                    }}
                  >
                    {ep.id}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "#d4d4d8" }}>
                    {ep.title}
                  </span>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    color: "#6ee7b7",
                    border: "1px solid rgba(52,211,153,0.2)",
                  }}
                >
                  {ep.type}
                </span>
              </div>
              <p className="text-[11px] mb-2 flex items-center gap-1.5" style={{ color: "#71717a" }}>
                <ArrowRight size={10} style={{ color: "#3f3f46" }} />
                {ep.events}
              </p>
              <div className="flex items-center justify-between text-[10px]">
                <span style={{ color: "#52525b" }}>
                  情绪强度:{" "}
                  <span
                    className="font-medium"
                    style={{ color: EMOTION_COLOR[ep.emotion] ?? "#a1a1aa" }}
                  >
                    {ep.emotion}
                  </span>
                </span>
                <span
                  className="max-w-[160px] truncate"
                  title={ep.hook}
                  style={{ color: "#3f3f46" }}
                >
                  ↩ {ep.hook}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hooks & Satisfaction — 2-column grid */}
      <div className="grid grid-cols-1 gap-3">
        {/* Hooks */}
        <section
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #27272a" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid #1c1c1f" }}
          >
            <Anchor size={13} style={{ color: "#818cf8" }} />
            <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>
              钩子库
            </span>
          </div>
          <ul className="p-3 space-y-2">
            {hooks.map((hook, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-[11px] p-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <span
                  className="w-4 h-4 rounded shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
                  style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}
                >
                  {idx + 1}
                </span>
                <span style={{ color: "#a1a1aa" }}>{hook}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Satisfaction table */}
        <section
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #27272a" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid #1c1c1f" }}
          >
            <Sparkles size={13} style={{ color: "#818cf8" }} />
            <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>
              爽点兑现表
            </span>
          </div>
          <div className="p-3 space-y-2">
            {satisfaction.map((sat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <span className="text-[11px] flex-1" style={{ color: "#a1a1aa" }}>
                  {sat.point}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: "rgba(251,146,60,0.1)",
                    color: "#fb923c",
                    border: "1px solid rgba(251,146,60,0.2)",
                  }}
                >
                  {sat.phase}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
