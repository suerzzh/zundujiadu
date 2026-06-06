import { mockContinuity } from "../mockData";
import { PipelineState } from "./Root";
import { History, Target, Tag, Package, User, Loader2, Layers, AlignLeft } from "lucide-react";
import { useState, type ReactNode } from "react";

interface TypeStyle {
  label: string;
  icon: ReactNode;
  dot: string;
  badge: string;
  badgeBg: string;
  badgeBorder: string;
}

const TYPE_STYLE: Record<string, TypeStyle> = {
  人物: {
    label: "人物",
    icon: <User size={11} />,
    dot: "#a78bfa",
    badge: "#c4b5fd",
    badgeBg: "rgba(167,139,250,0.1)",
    badgeBorder: "rgba(167,139,250,0.25)",
  },
  伏笔: {
    label: "伏笔",
    icon: <Target size={11} />,
    dot: "#f87171",
    badge: "#fca5a5",
    badgeBg: "rgba(239,68,68,0.1)",
    badgeBorder: "rgba(239,68,68,0.25)",
  },
  道具: {
    label: "道具",
    icon: <Package size={11} />,
    dot: "#fbbf24",
    badge: "#fde68a",
    badgeBg: "rgba(245,158,11,0.1)",
    badgeBorder: "rgba(245,158,11,0.25)",
  },
  称呼: {
    label: "称呼",
    icon: <Tag size={11} />,
    dot: "#34d399",
    badge: "#6ee7b7",
    badgeBg: "rgba(52,211,153,0.1)",
    badgeBorder: "rgba(52,211,153,0.25)",
  },
};

const ALL_TYPES = ["全部", "人物", "伏笔", "道具", "称呼"];

export function ContinuityTimeline({
  pipelineState,
}: {
  pipelineState: PipelineState;
}) {
  const [layer, setLayer] = useState<"raw" | "summary">("raw");
  const [filterType, setFilterType] = useState("全部");

  if (
    pipelineState === "idle" ||
    pipelineState === "uploading" ||
    pipelineState === "extractor" ||
    pipelineState === "analyzer" ||
    pipelineState === "planner"
  ) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 p-8"
        style={{ color: "#3f3f46" }}
      >
        <Loader2 size={20} className="animate-spin" style={{ color: "#27272a" }} />
        <p className="text-xs text-center">等待 Writer 生成连续性记录...</p>
      </div>
    );
  }

  const filtered =
    filterType === "全部"
      ? mockContinuity
      : mockContinuity.filter((item) => item.type === filterType);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Controls */}
      <div
        className="px-4 py-3 space-y-2.5 border-b shrink-0"
        style={{ borderColor: "#1c1c1f" }}
      >
        {/* Layer toggle */}
        <div className="flex items-center gap-2">
          <History size={13} style={{ color: "#52525b" }} />
          <span className="text-xs font-semibold flex-1" style={{ color: "#a1a1aa" }}>
            连续性时间线
          </span>
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: "1px solid #27272a" }}
          >
            {[
              { key: "raw" as const, label: "明细层", icon: <AlignLeft size={10} /> },
              { key: "summary" as const, label: "摘要层", icon: <Layers size={10} /> },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setLayer(item.key)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-all"
                style={{
                  background:
                    layer === item.key
                      ? "rgba(99,102,241,0.2)"
                      : "transparent",
                  color:
                    layer === item.key ? "#a5b4fc" : "#52525b",
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_TYPES.map((type) => {
            const style = TYPE_STYLE[type];
            const isActive = filterType === type;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all"
                style={
                  isActive
                    ? {
                        background: style?.badgeBg ?? "rgba(99,102,241,0.15)",
                        color: style?.badge ?? "#a5b4fc",
                        border: `1px solid ${style?.badgeBorder ?? "rgba(99,102,241,0.3)"}`,
                      }
                    : {
                        background: "transparent",
                        color: "#3f3f46",
                        border: "1px solid #27272a",
                      }
                }
              >
                {style?.icon}
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {layer === "summary" ? (
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed #27272a",
            }}
          >
            <Layers size={20} className="mx-auto mb-2" style={{ color: "#27272a" }} />
            <p className="text-xs" style={{ color: "#52525b" }}>
              当前剧本场景数未达摘要层生成阈值
            </p>
            <p className="text-[10px] mt-1" style={{ color: "#3f3f46" }}>
              (需 5–10 场景触发自动摘要压缩)
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center" style={{ color: "#3f3f46" }}>
            <p className="text-xs">当前筛选无数据</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline vertical line */}
            <div
              className="absolute left-2.5 top-2 bottom-2 w-px"
              style={{ background: "linear-gradient(180deg, #27272a, #27272a 80%, transparent)" }}
            />

            <div className="space-y-4">
              {filtered.map((item, idx) => {
                const style = TYPE_STYLE[item.type];
                return (
                  <div key={idx} className="flex items-start gap-4 relative">
                    {/* Timeline dot */}
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10"
                      style={{
                        background: style?.dot
                          ? `${style.dot}22`
                          : "rgba(99,102,241,0.15)",
                        border: `2px solid ${style?.dot ?? "#6366f1"}`,
                        boxShadow: `0 0 8px ${style?.dot ?? "#6366f1"}44`,
                        marginTop: 2,
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: style?.dot ?? "#6366f1" }}
                      />
                    </div>

                    {/* Card */}
                    <div
                      className="flex-1 rounded-xl p-3"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid #1c1c1f",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {/* Type badge */}
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{
                              color: style?.badge ?? "#a5b4fc",
                              background: style?.badgeBg ?? "rgba(99,102,241,0.1)",
                              border: `1px solid ${style?.badgeBorder ?? "rgba(99,102,241,0.2)"}`,
                            }}
                          >
                            {style?.icon}
                            {item.type}
                          </span>
                          {/* Target name */}
                          <span
                            className="text-xs font-semibold"
                            style={{ color: "#d4d4d8" }}
                          >
                            {item.target}
                          </span>
                        </div>
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: "#1c1c1f", color: "#52525b" }}
                        >
                          Ch.{item.chapter}
                        </span>
                      </div>
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: "#71717a" }}
                      >
                        {item.state}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
