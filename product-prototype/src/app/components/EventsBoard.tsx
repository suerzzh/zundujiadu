import type { ReactNode } from "react";
import { mockEvents } from "../mockData";
import { User, MapPin, Zap, Heart, FileText, BrainCircuit } from "lucide-react";

interface TypeConfig {
  label: string;
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  character: {
    label: "人物",
    icon: <User size={10} />,
    color: "#c4b5fd",
    bg: "rgba(167,139,250,0.1)",
    border: "rgba(167,139,250,0.25)",
  },
  location: {
    label: "地点",
    icon: <MapPin size={10} />,
    color: "#6ee7b7",
    bg: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.25)",
  },
  conflict: {
    label: "冲突",
    icon: <Zap size={10} />,
    color: "#fcd34d",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
  },
  emotion: {
    label: "情感",
    icon: <Heart size={10} />,
    color: "#fda4af",
    bg: "rgba(244,63,94,0.1)",
    border: "rgba(244,63,94,0.25)",
  },
  event: {
    label: "事件",
    icon: <FileText size={10} />,
    color: "#7dd3fc",
    bg: "rgba(14,165,233,0.1)",
    border: "rgba(14,165,233,0.25)",
  },
};

export function EventsBoard() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#111113" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "#27272a" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <BrainCircuit size={13} style={{ color: "#818cf8" }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: "#e4e4e7" }}>
            AI 理解核对板
          </h2>
        </div>
        <p className="text-[11px] mt-0.5 ml-8" style={{ color: "#52525b" }}>
          Extractor 提取结果 · 请核对后继续
        </p>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mockEvents.map((chapter) => (
          <div
            key={chapter.chapter}
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid #27272a" }}
          >
            {/* Chapter title bar */}
            <div
              className="flex items-center gap-2.5 px-4 py-2.5"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{
                  background: "rgba(99,102,241,0.2)",
                  color: "#a5b4fc",
                  border: "1px solid rgba(99,102,241,0.3)",
                }}
              >
                {chapter.chapter}
              </div>
              <span className="text-xs font-semibold flex-1" style={{ color: "#d4d4d8" }}>
                {chapter.title}
              </span>
              <span
                className="text-[10px] font-mono"
                style={{ color: "#3f3f46" }}
              >
                {chapter.events.length} 条
              </span>
            </div>

            {/* Events */}
            <div style={{ borderTop: "1px solid #1c1c1f" }}>
              {chapter.events.map((event, idx) => {
                const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.event;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{
                      borderBottom:
                        idx < chapter.events.length - 1
                          ? "1px solid #1c1c1f"
                          : "none",
                    }}
                  >
                    {/* Type badge */}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 mt-0.5"
                      style={{
                        color: cfg.color,
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    {/* Content */}
                    <p className="text-[12px] leading-relaxed flex-1" style={{ color: "#a1a1aa" }}>
                      {event.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
