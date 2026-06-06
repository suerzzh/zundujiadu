## Why

赛题三要求开发一款 AI 辅助剧本创作工具,将 3 个章节以上的小说文本自动转换为结构化剧本(YAML 格式),让作者获得可编辑、可进一步打磨的剧本初稿。现有方案(v1 增强)仅 2 阶段(写作+审核),长篇小说上下文复杂时易出现集与集漂移、题材判定错误、付费卡点乱放等问题,且缺乏工程级可恢复性和连续性保障。

本 change 将 v2.1 方案收敛为可驱动开发的 MVP 规约:5 阶段 Agent 化职责分离 Pipeline(Extractor/Analyzer/Planner/Writer/Reviewer)+ 4 项工程机制(事件提取先行/工作区共享/上下文控制/连续性摘要压缩)+ 4 项编辑能力 + 1 项 AI 透明性展示。系统对外呈现为 Web 应用,作者一键提交小说即可获得完整剧本初稿和 5 个辅助 JSON 产物,并可在前端直接编辑、重生成、审核和查看连续性。

## What Changes

- 增加 5 阶段 Pipeline:Extractor(事件提取)→ Analyzer(改编分析)→ Planner(分集规划)→ Writer(逐章写作)→ Reviewer(审核+拼装)。
- 增加 Agent 化职责分离架构:每个阶段封装为独立 Python Class,有明确输入/输出接口,Orchestrator 用代码调度(非 LLM 决策)。
- 增加 Workspace 工作区机制:阶段间唯一传递介质是工作区文件(00_raw/10_events/20_analysis/30_plan/40_scripts/50_review/60_continuity/90_output),Pipeline 中断可从任意阶段恢复。
- 增加上下文控制策略:Writer 每章只注入上一章 100 字梗概 + 全局角色表 + 当前章节原文,防止 N 章小说上下文线性膨胀。
- 增加连续性摘要压缩机制:原始层(每场变化明细)+ 摘要层(每 5-10 场压缩状态),Writer 注入摘要层 + 本场相关原始层。
- 增加 4 项编辑能力:单集重生成、拆剧可视化(AnalysisBoard)、审核结果展示(ReviewPanel)、连续性记录展示(ContinuityTimeline)。
- 增加 1 项 AI 透明性展示:AI 理解核对板(EventsBoard),展示 Extractor 提取的事件摘要供作者核对。
- 增加 SSE 事件协议:5 类事件(stage_started/stage_progress/stage_completed/stage_failed/pipeline_completed),前端实时展示进度。
- 增加 Pipeline 错误处理与重试策略:分类重试(指数退避)+ 阶段门禁 + 原子写 + LLM 日志。
- 增加 Schema v1.1 扩展:beat_phase/emotion_marker/conflict_type/is_paywall/meta.analysis 可选字段,向后兼容 v1.0。
- 增加独立 YAML Schema 文档:docs/yaml-schema-design.md,包含完整字段定义、9 条设计理由、JSON Schema 约束(题目硬要求)。
- 增加 Docker Compose 本地部署、LLM 日志、错误注入测试和非功能基线。

## V1 User Flow

1. 作者打开应用,上传小说文本(≥3 章)。
2. 系统自动切章,创建 Workspace 工作区,启动 Pipeline。
3. 前端通过 SSE 实时展示 5 阶段进度:"正在提取第 3 章事件...正在分析冲突池..."。
4. Extractor 完成后,作者可在 EventsBoard 核对 AI 对小说的理解是否准确。
5. Analyzer 完成后,作者可在 AnalysisBoard 查看题材判定、冲突池、角色档案。
6. Planner 完成后,作者可查看分集目录、钩子、情绪曲线。
7. Writer 逐章生成剧本,作者可实时查看 YAML 编辑器中的剧本内容。
8. Reviewer 完成后,作者可在 ReviewPanel 查看 5 维评分、Top-3 问题和修改建议。
9. 作者可使用单集重生成、编辑 YAML、查看连续性时间线等 4 项编辑能力打磨剧本。
10. 作者导出最终剧本 script.yaml 和 5 个辅助 JSON 产物。

## Capabilities

### New Capabilities

- `novel2script-pipeline`: 定义完整 MVP 行为,包括 5 阶段 Agent 化 Pipeline、Workspace 工作区、上下文控制、连续性摘要压缩、4 项编辑能力、1 项 AI 透明性展示、SSE 事件协议、错误处理与重试、Schema v1.1、独立 Schema 文档和 Docker Compose 部署。

### Modified Capabilities

None.

## Impact

- 新增后端:FastAPI + SQLAlchemy + Pydantic + DeepSeek V4-Pro LLM 客户端。
- 新增 Pipeline 核心:5 个 Agent 化 Python Class + Orchestrator 代码调度器。
- 新增 Workspace 文件系统:8 个目录层级(00_raw~90_output),原子写 + 阶段门禁。
- 新增前端:Vite + React + Monaco YAML 编辑器 + 5 个展示组件。
- 新增 SSE 事件协议:5 类事件,前端实时进度条。
- 新增错误处理:分类重试 + LLM 日志 + 错误注入测试。
- 新增部署:docker-compose.yml + .env.example + README。
- 新增文档:独立 YAML Schema 文档(题目硬要求)。
