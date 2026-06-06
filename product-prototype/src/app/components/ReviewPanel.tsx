import { mockReview } from "../mockData";
import { PipelineState } from "./Root";
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  XCircle,
  Loader2,
  Zap,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

function getScoreColor(score: number): string {
  if (score >= 90) return "#34d399";
  if (score >= 75) return "#818cf8";
  if (score >= 60) return "#fbbf24";
  return "#f87171";
}

function ScoreBar({ score }: { score: number }) {
  const color = getScoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-[11px] font-mono w-6 text-right" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export function ReviewPanel({ pipelineState }: { pipelineState: PipelineState }) {
  if (pipelineState !== "completed" && pipelineState !== "reviewer") {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 p-8"
        style={{ color: "#3f3f46" }}
      >
        <Loader2 size={20} className="animate-spin" style={{ color: "#27272a" }} />
        <p className="text-xs text-center">等待 Reviewer 完成审核...</p>
      </div>
    );
  }

  const overallScore = Math.round(
    mockReview.radarData.reduce((sum, d) => sum + d.A, 0) /
      mockReview.radarData.length
  );

  return (
    <div className="p-4 space-y-4">
      {/* Overall score badge */}
      <div
        className="rounded-xl p-4 flex items-center gap-4"
        style={{
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.15)",
        }}
      >
        <div
          className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.25) 100%)",
            border: "1px solid rgba(99,102,241,0.3)",
          }}
        >
          <span
            className="text-xl font-bold font-mono"
            style={{ color: getScoreColor(overallScore) }}
          >
            {overallScore}
          </span>
          <span className="text-[9px]" style={{ color: "#52525b" }}>综合</span>
        </div>
        <div className="flex-1 space-y-1.5">
          {mockReview.radarData.map((d) => (
            <div key={d.subject} className="flex items-center gap-2">
              <span
                className="text-[10px] w-16 shrink-0"
                style={{ color: "#71717a" }}
              >
                {d.subject}
              </span>
              <ScoreBar score={d.A} />
            </div>
          ))}
        </div>
      </div>

      {/* Radar Chart */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #27272a" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid #1c1c1f" }}
        >
          <Zap size={13} style={{ color: "#818cf8" }} />
          <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>
            5 维雷达图
          </span>
        </div>
        <div
          className="flex items-center justify-center"
          style={{ height: 200, background: "#0d0d10" }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={mockReview.radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#52525b", fontSize: 10 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="得分"
                dataKey="A"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.25}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top 3 Issues */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #27272a" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid #1c1c1f" }}
        >
          <AlertTriangle size={13} style={{ color: "#fbbf24" }} />
          <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>
            Top-3 问题
          </span>
        </div>
        <div className="p-3 space-y-2">
          {mockReview.issues.map((issue, idx) => (
            <div
              key={idx}
              className="rounded-lg p-3"
              style={{
                background: "rgba(245,158,11,0.05)",
                border: "1px solid rgba(245,158,11,0.12)",
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24" }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-xs font-medium" style={{ color: "#d4d4d8" }}>
                    {issue.title}
                  </span>
                </div>
                <button
                  className="text-[10px] px-2 py-0.5 rounded shrink-0 transition-colors"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    color: "#818cf8",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  第 {issue.episode} 集
                </button>
              </div>
              <p className="text-[11px] ml-6" style={{ color: "#71717a" }}>
                {issue.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Suggestions */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #27272a" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid #1c1c1f" }}
        >
          <Lightbulb size={13} style={{ color: "#fbbf24" }} />
          <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>
            修改建议
          </span>
        </div>
        <ul className="p-3 space-y-2">
          {mockReview.suggestions.map((sug, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 rounded-lg p-2.5"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div
                className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                style={{ background: "#818cf8" }}
              />
              <span className="text-[11px] flex-1" style={{ color: "#a1a1aa" }}>
                {sug}
              </span>
              <button
                className="text-[10px] px-2 py-0.5 rounded shrink-0 transition-colors"
                style={{
                  background: "rgba(52,211,153,0.1)",
                  color: "#34d399",
                  border: "1px solid rgba(52,211,153,0.2)",
                }}
              >
                一键采纳
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Quality Gates */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #27272a" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid #1c1c1f" }}
        >
          <CheckCircle2 size={13} style={{ color: "#34d399" }} />
          <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>
            硬性检查项
          </span>
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(52,211,153,0.1)",
              color: "#34d399",
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            {mockReview.qualityGate.filter((q) => q.pass).length}/
            {mockReview.qualityGate.length} 通过
          </span>
        </div>
        <div className="p-3 space-y-2">
          {mockReview.qualityGate.map((qg, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2"
              style={{
                background: qg.pass
                  ? "rgba(52,211,153,0.04)"
                  : "rgba(239,68,68,0.04)",
                border: qg.pass
                  ? "1px solid rgba(52,211,153,0.1)"
                  : "1px solid rgba(239,68,68,0.1)",
              }}
            >
              {qg.pass ? (
                <CheckCircle2 size={13} className="shrink-0" style={{ color: "#34d399" }} />
              ) : (
                <XCircle size={13} className="shrink-0" style={{ color: "#f87171" }} />
              )}
              <span
                className="text-[11px]"
                style={{ color: qg.pass ? "#a1a1aa" : "#f87171" }}
              >
                {qg.check}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
