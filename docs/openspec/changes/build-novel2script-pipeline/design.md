## Context

本 change 基于三个来源收束:

- 赛题三:AI 辅助剧本创作工具,要求将 3 章以上小说自动转换为结构化 YAML 剧本,可编辑、可打磨,并额外写 YAML Schema 设计文档。
- 行业最佳实践(小说→剧本方法论工具链):7 阶段流水线,18 Agent × 22 Reference,核心方法论包括改编分析(男女频/冲突池/爽点池)、分集规划(三幕式/钩子/节奏)、剧本写作(对话比/句长/金句公式)、审核(四遍修改法/跨集重复检查)。
- 工业级短剧工厂经验:4 项工程机制(事件提取先行/工作区共享状态/上下文控制/连续性摘要压缩),三层 Agent 架构(决策层/执行层/监督层)。

当前工作区无已有应用代码,本 OpenSpec change 是后续开发的源头。实现优先保证赛题演示稳定:一个清晰、可恢复、可编辑的纵向切片,胜过一个覆盖很广但不稳定的平台。

### 核心方法论参考映射

| Reference | 核心提炼 | 本项目应用度 |
|-----------|---------|------------|
| **01-adaptation-system** | **男女频判定、冲突池、爽点池、称呼规范、情绪曲线、四阶段强度** | **核心** |
| **02-episode-architecture** | **三幕式结构(全剧+单集)、10 集生死线、事件完整性、防跨集重复** | **核心** |
| **03-script-writing-standard** | **单集 2-3 场景、对话比 70%、句长 12 字、钩子公式、4 种金句公式** | **核心** |
| **04-review-gates** | **四遍修改法、跨集重复检查、事件完整性检查、PASS/FAIL 输出规范** | **核心** |
| **12-genre-specific-techniques** | **4 类体裁(末世重生/玄幻/女频/网文)专属格式与禁忌** | **核心** |
| **14-story-psychology** | **观众预期管理、爽点认知负荷、悬念链路** | **核心** |
| 00-first-principles | 创作底层原则(情感优先、镜头语言) | 部分 |
| 05-compliance-boundaries | 合规边界(平台/法律/敏感词) | 部分 |
| 13-show-dont-tell | 心理→动作/台词的转换规则 | 部分 |

### 工业级短剧工厂与本项目形态对比

| 维度 | 工业级短剧工厂 | 当前项目 | 关键差异 |
|------|--------------|---------|---------|
| 目标产物 | 竖屏短剧(分集/付费卡点/竖屏) | 影视剧本(电影/电视剧,扁平场列表) | **产物形态不同** |
| 运行形态 | Web 应用(Electron + Socket.IO) | Web 应用 + CLI | 类似 |
| Agent 架构 | 完整三层(LLM 决策层) | Pipeline 代码调度 | **调度方式不同** |
| 下游链路 | 分镜 + AI 视频生成 | 无 | 不涉及 |
| 事件提取 | ✅ 先行提取 | ✅ 新增 | 借鉴 |
| 工作区机制 | ✅ 共享状态文件 | ✅ 新增 | 借鉴 |
| 上下文控制 | ✅ 只读最后一集 | ✅ 新增 | 借鉴 |
| 连续性压缩 | ✅ 摘要压缩 | ✅ 新增 | 借鉴 |

## Goals / Non-Goals

**Goals:**

- 支持作者上传 ≥3 章小说文本,一键生成结构化 YAML 剧本初稿。
- 5 阶段 Agent 化 Pipeline:Extractor → Analyzer → Planner → Writer → Reviewer,每阶段有明确输入/输出接口和 Pydantic 校验。
- Workspace 工作区机制:阶段间唯一传递介质是文件,支持 Pipeline 中断后从任意阶段恢复。
- 上下文控制:Writer 每章只注入上一章 100 字梗概,防止上下文线性膨胀。
- 连续性摘要压缩:原始层 + 摘要层双层记录,Writer 注入摘要层 + 本场相关原始层。
- 4 项编辑能力:单集重生成、拆剧可视化、审核结果展示、连续性记录展示。
- 1 项 AI 透明性展示:EventsBoard 展示事件提取结果供作者核对。
- SSE 实时进度:5 类事件(stage_started/stage_progress/stage_completed/stage_failed/pipeline_completed)。
- Pipeline 错误处理:分类重试(指数退避)+ 阶段门禁 + 原子写 + LLM 日志。
- Schema v1.1:向后兼容 v1.0,增加 beat_phase/emotion_marker/conflict_type/is_paywall/meta.analysis 可选字段。
- 独立 YAML Schema 文档:docs/yaml-schema-design.md,包含 9 条设计理由(题目硬要求)。
- Docker Compose 本地部署,5 分钟跑起来。
- 3 章小说成本 ≤ 0.9 元,10 章小说成本 ≤ 2.0 元,10 章总时间 ≤ 90s。

**Non-Goals:**

- 不做分镜/Seedance 提示词/视频生成(赛题不涉及)。
- 不做鉴权/多用户/项目权限(赛题为单用户 demo)。
- 不做完整 Agent 框架(感知-决策-行动-记忆循环),用代码调度替代 LLM 决策层。
- 不做多 LLM 适配,锁定 DeepSeek V4-Pro。
- 不做云端部署,仅本地 Docker。
- 不做 WebSocket,沿用 SSE。
- 不做 AI 对话式改稿,4 项编辑能力已覆盖"可编辑、可打磨"。
- 不做国际化,UI 仅中文。

## Decisions

### Decision: 5-stage pipeline with event extraction first

系统第一步不是"直接分析小说",而是先由 Extractor 每章轻量提取事件摘要。后续所有阶段只读事件表(不读原始小说),降低 token 成本,增加可核对性。

原因:工业级短剧工厂的实践证明"事件提取先行"能显著降低下游阶段的输入复杂度。Analyzer 从读全本小说(12000 token)降为读事件表(8000 token),成本下降 ~30%,且多产出 events.json 供作者核对。

### Decision: Agent-style responsibility separation, not full Agent framework

每个阶段封装为独立 Python Class,有明确输入/输出接口和自己的 Prompt。Orchestrator 用代码调度(非 LLM 决策),既保留模块解耦,又避免完整 Agent 框架的过重开销。

原因:当前 4 个流程本质是数据转换管道(输入→处理→输出),不是自主决策的智能体。套上完整 Agent 框架增加大量额外开发工作,评委看不到"Agent 内部决策过程",产物质量才是评分核心。

### Decision: Workspace file system as the only inter-stage communication medium

阶段间唯一传递介质是工作区文件(00_raw/10_events/20_analysis/30_plan/40_scripts/50_review/60_continuity/90_output),禁止依赖内存中间状态。Pipeline 中断重启后可从任意阶段恢复。

原因:工业级短剧工厂的共享状态文件实践。文件系统是最简单的持久化方案,不需要数据库,不需要消息队列,且天然支持断点续跑。

### Decision: Context control — Writer only reads previous chapter summary

Writer 每章上下文注入 = 上一章 100 字梗概 + 全局角色表 + 当前章节原文,不注入全部已写章节原文。

原因:工业级短剧工厂实践:Writer Agent 上下文只注入"最后一集"内容,避免线性膨胀。10 章小说若注入全部已写章节,上下文会从 6000 token 膨胀到 30000+ token。

### Decision: Atomic write + stage gate + classified retry for error handling

写文件用 `*.tmp` + `os.replace` 原子重命名。阶段开始前必须 `validate_upstream(project_id)`。LLM 失败按类型分类重试(rate limit 指数退避 3 次,Pydantic 失败改 prompt 重试 1 次,磁盘满立即报错不重试)。

原因:Demo 现场必须稳定。没有错误处理的 Pipeline 必崩。分类重试比统一重试更精准,避免磁盘满等不可恢复错误无限重试。

### Decision: SSE event protocol with 5 event types

定义 5 类 SSE 事件(stage_started/stage_progress/stage_completed/stage_failed/pipeline_completed),前端实时展示进度条和"AI 在思考"文案。

原因:Demo 现场 90s 黑盒 = 焦虑。显式进度条和文案让评委感知系统在正常工作。

### Decision: Single capability, one spec document

OpenSpec 只保留一个 capability:`novel2script-pipeline`。所有需求集中到一个 spec.md。

原因:赛题项目当前处于设计驱动开发阶段,一个完整纵向切片比多个能力域拆分更利于实现和评审。

### ADR-001: 为何从 2 阶段升级到 5 阶段?

- **Context**: 题目要求"降低门槛、提升效率、可编辑、可打磨",2 阶段生成剧本质量依赖 LLM 一次性输出,长篇小说上下文复杂时易出现"集与集漂移/题材判定错误/付费卡点乱放"。
- **Decision**: 引入**改编分析 + 分集规划 + 事件提取**三个独立前置阶段(5 阶段 = Extractor / Analyzer / Planner / Writer / Reviewer),作为后续写作的高质量输入。
- **Consequences**:
  - + 质量提升明显(分析阶段提前发现问题)
  - + 可中途干预(分析结果不满意可调整 settings 重跑)
  - + Extractor 先压缩事件,Analyzer/Planner 输入更小,token 成本反而下降
  - - LLM 调用 +4(从 4 → 8),成本 +0.17 元
  - - 总时间 +20-30 秒(可接受)

### ADR-002: 为何不全盘复刻行业标杆 7 阶段?

- **Context**: 行业标杆 7 阶段是为 Agent/Showrunner 设计,我们是为作者设计的 Web 应用,中间有"分镜/Seedance 提示词"等下游环节,与题目无关。
- **Decision**: 只采用 7 阶段中的 4 个核心机制(分析/规划/审核/连续性),舍弃分镜/Seedance 两条下游线。
- **Consequences**:
  - + 形态与 Web 产品一致
  - - 失去"一站式"卖点,但符合题目聚焦

### ADR-004: 为何 4 项编辑能力全做?

- **Context**: 题目强调"可编辑、可进一步打磨"。
- **Decision**: 单集重生 + 拆剧可视化 + 审核展示 + 连续性展示全做。
- **Consequences**:
  - + 全面回应题目"可编辑"要求
  - + 评委可视化加分
  - - 风险面增加(4 个新组件都要测)

### ADR-005: 为何增加事件提取先行阶段?

- **Context**: v2 早期版(4 阶段)的 Analyzer 直接喂全本小说给 LLM,10 章×3000 字时上下文压力大,且 analyzer 需从原始文本中自行提炼事件,容易遗漏或误解。
- **Decision**: 在 Analyzer 之前增加独立的 Extractor 阶段,每章轻量提取事件摘要。后续 Analyzer 只读事件表,不读原始小说。该设计借鉴工业级短剧工厂的"先提取事件、后全流程基于事件表"实践。
- **Consequences**:
  - + Analyzer token 成本下降 ~30%(从 12000→8000 input)
  - + 多产出 `events.json`,作者可核对 AI 理解准确性
  - + Extractor 与 Writer 共享并发池,总时间不增加
  - - LLM 调用 +N 次(N=章节数),但每次成本极低(~0.01 元/章)
  - - 增加一个 Pydantic 模型(Event)和前端组件(EventsBoard)

### ADR-007: 为何把 Schema 文档拆为独立文件?

- **Context**: 题目三明确要求"额外写一篇文档,定义剧本的 YAML Schema。文档中需说明该 Schema 的设计原因"。若 Schema 仅作为 spec 子节,文件层级不满足"独立可交付"要求。
- **Decision**: 把完整 Schema 字段定义、9 条设计理由、JSON Schema 约束、版本演进,抽取到 **`docs/yaml-schema-design.md`**(作为正式可交付文档)。
- **Consequences**:
  - + 满足题目硬要求(独立 Schema 文档)
  - + 评审/试用时 Schema 文档可单独交付
  - - 需要多写一份文档,但内容已在方案中给出,主要工作是迁移 + 扩写

### ADR-010: 为何强制 LLM 调用日志入 jsonl?

- **Context**: LLM 失败时,如果没有任何调用记录,定位问题要重新跑一遍 Pipeline(浪费 90s + 0.84 元)。Demo 现场出问题没日志 = 不可调试。
- **Decision**: 所有 Agent 通过 `llm_logger.log_call(...)` 强制记录每次 LLM 调用的 ts/stage/latency/token/cost/status,写入 `workspace/{project_id}/logs/llm.jsonl`。
- **Consequences**:
  - + Demo 现场出问题可秒级定位
  - + 可回归验证实际 vs 估算成本
  - - 每次调用多一次文件写,但 jsonl append 性能开销极小

## Architecture

```text
Browser (Vite + React)
  | upload novel / view progress / edit script / regenerate episode
  v
FastAPI API
  | validates input, creates workspace, exposes SSE
  v
Pipeline Orchestrator (code-driven, not LLM)
  | manages agent lifecycle: init → execute → output → next
  v
5 Agent Modules (Python Classes)
  | Extractor → Analyzer → Planner → Writer → Reviewer
  | each reads from / writes to workspace files
  v
Workspace File System
  | 00_raw/ 10_events/ 20_analysis/ 30_plan/
  | 40_scripts/ 50_review/ 60_continuity/ 90_output/
  v
DeepSeek V4-Pro (LLM)
  | all agents share one LLM client with logging
```

## Agent Pipeline Flow

```text
[阶段 0] Extractor (N×LLM, 并发 2)
   │ 输入: 单章原始文本
   │ 输出: 事件摘要 JSON → workspace/10_events/
   ▼
[阶段 1] Analyzer (1×LLM, JSON)
   │ 输入: events.json(事件表,非全本小说)
   │ 输出: 题材判定、男女频、冲突池、爽点池、角色档案、称呼规范、改编策略
   │ 落地: workspace/20_analysis/analysis.json
   ▼
[阶段 2] Planner (1×LLM, JSON)
   │ 输入: analysis.json + events.json
   │ 输出: 分集目录(集号/标题/类型/事件流程/钩子/情绪强度)、情绪曲线
   │ 落地: workspace/30_plan/plan.json
   ▼
[阶段 3] Writer (N×LLM, 并发 2, YAML)
   │ 输入: analysis.json + plan.json + 当前章节原文
   │       + 上一章 summary.json(100字梗概)
   │       + continuity_summary(摘要层)
   │ 输出: 本章剧本片段(符合 Schema v1.0/v1.1)
   │ 机制: 每章完成后本地提取连续性增量更新 continuity.json
   │ 落地: workspace/40_scripts/chapter_XX.yaml + chapter_XX.summary.json
   ▼
[阶段 4] Reviewer + Assembler (1×LLM + 本地)
   │ 输入: 完整 Script(初稿) + continuity.json
   │ 输出 1 (LLM): 5 维评分 + Top-3 问题 + 修改建议
   │ 输出 2 (本地): QualityGate 6 项硬性检查 + 引用一致性 + 连续性校验
   │ 落地: workspace/50_review/review.json
   ▼
[产物]
   ├── script.yaml (符合 Schema v1.0/v1.1, 可在 Monaco 直接编辑)
   ├── events.json (事件提取结果,供作者核对)
   ├── analysis.json (改编分析)
   ├── plan.json (分集规划)
   ├── review.json (审核报告)
   └── continuity.json (人设/称呼/道具/伏笔时间线 + 摘要层)
```

## Key Data Objects

- `Event`: 人物/事件/地点/冲突/情感转折,按章组织。
- `EventsResult`: 每章事件列表,Extractor 产出。
- `Analysis`: 题材/男女频/冲突池/爽点池/角色档案/称呼规范/改编策略/改编风险,Analyzer 产出。
- `EpisodePlan`: 分集目录(集号/标题/类型/事件流程/钩子/情绪强度)/情绪曲线/节奏预警,Planner 产出。
- `Script`: 符合 Schema v1.0/v1.1 的完整剧本,Assembler 产出。
- `Review`: 5 维评分/Top-3 问题/修改建议/QualityGate 6 项硬性检查结果,Reviewer 产出。
- `ContinuityRecord`: 人设/称呼/关键道具/伏笔时间线,原始层 + 摘要层,Writer 增量更新。
- `ChapterSummary`: 每章 100 字梗概,Assembler 自动生成,供下一章 Writer 注入。
- `LLMCallLog`: ts/stage/chapter/latency_ms/token_in/token_out/cost_cny/status/error,所有 Agent 强制记录。

## Workspace Directory Structure

```
workspace/{project_id}/
├── 00_raw/                 ← 原始输入
│     └── novel.txt
├── 10_events/              ← 阶段 0 产出:每章事件摘要
│     └── events.json
├── 20_analysis/            ← 阶段 1 产出:改编分析
│     └── analysis.json
├── 30_plan/                ← 阶段 2 产出:分集规划
│     └── plan.json
├── 40_scripts/             ← 阶段 3 产出:逐章剧本片段
│     ├── chapter_01.yaml
│     ├── chapter_01.summary.json
│     ├── chapter_02.yaml
│     └── ...
├── 50_review/              ← 阶段 4 产出:审核报告
│     └── review.json
├── 60_continuity/          ← 连续性记录(增量更新)
│     └── continuity.json
├── 90_output/              ← 最终产物
│     └── script.yaml
└── logs/                   ← LLM 调用日志
      └── llm.jsonl
```

## SSE Event Protocol

```jsonc
// 1. 阶段开始
{"event": "stage_started", "stage": "extractor", "total_chapters": 10, "ts": "..."}

// 2. 阶段进度(每章完成触发,或 500ms 节流)
{"event": "stage_progress", "stage": "extractor", "chapter": 3, "total": 10,
 "elapsed_sec": 12, "chapter_status": "done", "events_count": 8}

// 3. 阶段完成
{"event": "stage_completed", "stage": "extractor", "duration_sec": 35,
 "outputs": {"events_json": "workspace/.../10_events/events.json"}}

// 4. 阶段失败
{"event": "stage_failed", "stage": "extractor", "chapter": 5,
 "error": "LLM rate limit", "retry_count": 2, "recoverable": true}

// 5. 整 Pipeline 完成
{"event": "pipeline_completed", "outputs": ["script.yaml", "events.json", ...],
 "total_duration_sec": 78, "total_cost": 0.84}
```

## Error Handling Strategy

| 错误类型 | 重试策略 | 失败兜底 |
|---------|---------|---------|
| 阶段 0/3 单章 LLM 失败 (rate limit / 5xx) | 重试 3 次(指数退避 1s/3s/9s) | 标记 chapter_status: failed,Pipeline 继续 |
| 阶段 0/3 单章 Pydantic 校验失败 | 改 prompt 重试 1 次 | regex 提取关键字段;再失败则该章 failed |
| 阶段 1/2 LLM 失败 | 重试 2 次 | 整阶段 fail,Pipeline 暂停,前端 banner |
| 阶段 1/2 Pydantic 校验失败 | 改 prompt 重试 1 次 | 整阶段 fail |
| Workspace 写文件失败(磁盘满/权限) | 立即报错 | Pipeline 立即暂停,不重试 |
| 单集重生下游冲突 | 默认重生下游 1 集 | 用户选"仅本集"则下游标 stale |

### LLM 输出校验与降级策略

- **关键字段**(`analysis.json` / `plan.json` / `script.yaml`):100% Pydantic 校验
- **非关键字段**(`events.json` / `continuity.json` 摘要层):可降级接受 80% 字段
- **regex 提取**:截取 `{}` 或 `[]` 块,二次 Pydantic 校验

### Continuity 快照机制

- Writer 调用 LLM 前,**read-time 快照** `continuity.json`(防止后台增量更新读到不一致状态)
- 异步更新 continuity 在 Writer 完成后,**新 asyncio 任务**单独写,防竞态

## Cost Model

| 阶段 | LLM 调用 | 估算 token (in/out) | 估算成本 |
|------|---------|---------------------|---------|
| 0 事件提取 | N (3-10) × 并发 2 | 3000/章 / 200/章 | 0.01 元/章 |
| 1 改编分析 | 1 | 8000 / 3000 | 0.14 元 |
| 2 分集规划 | 1 | 6000 / 2000 | 0.10 元 |
| 3 逐章写作 | N (3-10) × 并发 2 | 6000/章 / 4000/章 | 0.15 元/章 |
| 4 审核 | 1 | 10000 / 2000 | 0.12 元 |
| **3 章合计** | **8 次** | - | **~0.84 元** |
| **10 章合计** | **15 次** | - | **~1.96 元** |

> **核算口径**:按表内单价(0.01/0.14/0.10/0.15/0.12)直接相加。3 章 = 0.03+0.14+0.10+0.45+0.12 = **0.84 元**;10 章 = 0.10+0.14+0.10+1.50+0.12 = **1.96 元**。
>
> **并发池约束**:Extractor 与 Writer 共享同一信号量池(总量 2),Extractor 释放一个槽位后,Writer 即可启动下一章,Pipeline 总时间不增加。

## v2.1 vs 行业标杆 vs 工业级短剧工厂 — 三方对比

| 维度 | **v2.1 5 阶段(本方案)** | 行业标杆 7 阶段(完整版) | 工业级短剧工厂 |
|------|----------------------|---------------------|-------------------|
| Pipeline 阶段 | **5 阶段(提取/分析/规划/写作/审核)** | 7 阶段(+ 分镜 + 完成检查) | 3 层 Agent(决策/执行/监督) |
| 事件提取先行 | **✅ Extractor Agent, N×并发** | ❌ 无 | ✅ 阶段 0 先行提取 |
| 改编分析 | **✅ Analyzer Agent, 读事件表** | ✅ novel-analyzer + insight-architect | ✅ storySkeleton |
| 分集规划 | **✅ Planner Agent, 情绪曲线** | ✅ episode-architect + emotion-architect | ✅ adaptationStrategy |
| 工作区机制 | **✅ Workspace 文件隔离** | ❌ Markdown 文件 | ✅ 共享状态文件 |
| 上下文控制 | **✅ 只读上一章摘要** | ❌ 全文注入 | ✅ 只读最后一集 |
| 连续性摘要 | **✅ 原始层+摘要层双层** | ✅ continuity-recorder | ✅ Memory 3:1 压缩 |
| 审核方式 | **1 LLM 5 维评分 + 6 硬性规则 + 用户决策暂停** | 4 遍修改法 + 双审 + 对比 | ✅ A/B/C/D + 暂停等用户 |
| Agent 架构 | **Agent 化职责分离(代码调度)** | 多 Agent 对话 | 完整 LLM 决策层 |
| 体裁规则 | **✅ 4 类体裁注入** | ✅ 4 类完整规则 | ❌ 通用短剧规范 |
| 编辑能力 | **+ 拆剧可视化 + 审核面板 + 连续性时间线** | Markdown 文件手改 | Web 画布编辑 |
| 产物 | **YAML + 5 个 JSON 辅助(+events)** | 大量 Markdown + .agent-state | 共享状态 + 分镜 |

**v2.1 的定位**: 整合**方法论 × 工程**双轮驱动:
- **方法论** (行业最佳实践):改编分析/分集规划/审核/连续性
- **工程机制** (工业级短剧工厂):事件提取先行/工作区隔离/上下文控制/连续性摘要压缩
- 保持**Web 应用 + YAML 编辑器**形态,用**代码调度替代 LLM 决策层**,避免过度工程化。

## Risks / Trade-offs

- LLM API 临时不可用 → 分类重试 + LLM 日志 + 前端"重试"按钮。
- LLM 输出格式坏 → regex 二次提取 + 改 prompt 重试 + 关键字段 100% 校验。
- Pipeline 中途崩 → Workspace 原子写 + 阶段门禁 + 可从任意阶段恢复。
- 超长小说(>10 章)上下文爆炸 → Writer 只读上一章 100 字梗概。
- Demo 现场黑盒 90s 焦虑 → SSE 显式 5 类事件 + "AI 在思考"文案。
- 评审质疑"为何不用通用 LLM 直接生成" → 强调 5 阶段分工的可控性 + 事件提取核对 + Agent 化模块边界。
- DeepSeek 配额耗尽 → 预留 DEEPSEEK_API_KEY_BACKUP 环境变量。

## Risk Matrix

| 风险 | 概率 | 影响 | 缓解措施 | 任务 |
|------|------|------|---------|------|
| LLM API 临时不可用 | 高 | 高 | 分类重试(指数退避) + LLM 日志 + 前端"重试"按钮 | T0.6 / T4.7 |
| LLM 输出格式坏(Pydantic fail) | 高 | 中 | regex 二次提取 + 改 prompt 重试 1 次 + 关键字段 100% 校验 | T4.7 |
| Workspace 写文件失败(磁盘满/权限) | 低 | 高 | 立即报错不重试(磁盘问题重试无意义) | T4.7 |
| Pipeline 中途崩 | 中 | 高 | Workspace 原子写 + 阶段门禁 validate_upstream() + 可从任意阶段恢复 | T0.2 / T0.3 |
| 超长小说(>10 章)上下文爆炸 | 中 | 中 | Writer 只读上一章 100 字梗概,不注入全部已写章节 | 上下文控制 |
| DeepSeek 配额耗尽 | 低 | 高 | 切到备用 API(预留 DEEPSEEK_API_KEY_BACKUP 环境变量) | T0.1 |
| 评审质疑"为何不用通用 LLM 直接生成" | 高 | 中 | 强调 5 阶段分工的可控性 + 事件提取的事件核对 + Agent 化模块边界 | design.md Decisions |
| 评审质疑"为何不引完整 Agent 框架" | 中 | 低 | ADR-006 已显式说明"取其形,弃其重",Pydantic 边界 | design.md Decisions |
| Schema 9 条设计理由被质疑 | 低 | 中 | 独立 Schema 文档详细说明 | T7.4 |
| Demo 现场黑盒 90s 焦虑 | 中 | 高 | SSE 显式 5 类事件 + "AI 在思考"文案 | T5.2 / T6.8 |
| 前端组件渲染性能差(10 章 50 场) | 低 | 低 | EventsBoard 虚拟滚动;ContinuityTimeline 摘要层优先 | T6.4 / T6.7 |

## Project Directory Structure

```
zundujiadu/
├── backend/                           ← FastAPI 后端
│   ├── app/
│   │   ├── pipeline/                  ← 5 阶段 Agent 化模块
│   │   │   ├── extractor.py           ← T4.0
│   │   │   ├── analyzer.py            ← T4.1
│   │   │   ├── planner.py             ← T4.2
│   │   │   ├── writer.py              ← T4.3
│   │   │   ├── reviewer.py            ← T4.4
│   │   │   ├── assembler.py           ← T4.5
│   │   │   └── orchestrator.py        ← T4.6
│   │   ├── llm/                       ← LLM 客户端
│   │   │   ├── client.py              ← T3.1
│   │   │   └── logger.py              ← T0.6
│   │   ├── workspace/                 ← Workspace 管理
│   │   │   └── manager.py             ← T0.2 / T0.3
│   │   ├── continuity/                ← 连续性记录
│   │   │   └── compressor.py          ← T9.1
│   │   ├── schema/                    ← Pydantic 模型
│   │   │   ├── script.py              ← T2.1
│   │   │   ├── event.py               ← T2.5
│   │   │   ├── continuity.py          ← T2.4
│   │   │   └── analysis.py            ← T2.3
│   │   ├── api/                       ← REST 路由
│   │   │   ├── projects.py            ← T5.1
│   │   │   ├── regenerate.py          ← T5.1
│   │   │   └── retry.py               ← T5.1
│   │   ├── prompts/                   ← 外置 Prompt
│   │   │   ├── extractor.md
│   │   │   ├── analyzer.md
│   │   │   └── ...
│   │   └── main.py
│   ├── tests/                         ← 后端测试
│   │   ├── test_extractor.py
│   │   ├── test_error_injection.py    ← T4.8
│   │   └── ...
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                          ← Vite + React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── ScriptEditor.tsx       ← YAML 编辑器
│   │   │   ├── EventsBoard.tsx        ← T6.4
│   │   │   ├── AnalysisBoard.tsx      ← T6.5
│   │   │   ├── ReviewPanel.tsx        ← T6.6
│   │   │   └── ContinuityTimeline.tsx ← T6.7
│   │   ├── api/                       ← T6.2
│   │   ├── store/                     ← Zustand
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── workspace/                         ← Pipeline 运行时产物
│   └── {project_id}/
│       ├── 00_raw/
│       ├── 10_events/
│       ├── 20_analysis/
│       ├── 30_plan/
│       ├── 40_scripts/
│       ├── 50_review/
│       ├── 60_continuity/
│       └── 90_output/
├── docs/                              ← 项目文档
│   ├── superpowers/
│   │   └── plans/
│   │       └── 2026-06-05-novel2script-brainstorming.md  ← brainstorming 归档
│   ├── yaml-schema-design.md          ← T7.4 独立 Schema 文档(题目硬要求)
│   ├── spec.md
│   └── architecture.md
├── openspec/                          ← OpenSpec 规约文档
│   └── changes/build-novel2script-pipeline/
│       ├── .openspec.yaml
│       ├── proposal.md
│       ├── design.md                  ← 本文件
│       ├── tasks.md
│       └── specs/novel2script-pipeline/spec.md
├── docker-compose.yml                 ← T0.7
├── .env.example
├── README.md
└── tests/                             ← 端到端测试
    └── e2e/
        ├── happy_path.spec.ts
        └── error_injection.spec.ts    ← T4.8
```

## Test Strategy

| 测试层级 | 工具 | 覆盖范围 | 通过标准 | 任务 |
|---------|------|---------|---------|------|
| 单元测试 | pytest | 工具类(Workspace / Continuity / Pydantic) | 行覆盖 ≥ 70% | 散落各 T |
| 模块测试 | pytest | 单个 Agent(Extractor / Analyzer / Writer) | Mock LLM 输出,Pydantic 100% 通过 | T4.x 各任务 |
| 集成测试 | pytest | Pipeline 5 阶段端到端(mock LLM) | 跑通 happy path,产物符合 Schema | T7.1 |
| 错误注入测试 | pytest + mock | 6 类错误(LLM 5xx / rate limit / 格式坏 / 磁盘满 / 权限 / 阶段中途崩) | 每类错误至少 1 用例,验证恢复 | T4.8 |
| 验收测试 | 手工 + 录屏 | 评审 5 分钟跑起来 + 4 项编辑能力 + 6 类错误演示 | 评审现场无卡顿 | T10.2 |
| LLM 日志回归 | 自定义脚本 | 对比实际 vs 估算成本 | 实际 3 章成本 ≤ 0.9 元 | T0.6 |
| 性能基线 | pytest-benchmark | 10 章小说总时间 / 内存 / workspace 大小 | 总时间 ≤ 90s,workspace ≤ 50MB | T10.1 |

**测试比例:**
- 单元/模块测试占 60% 工期
- 集成测试占 20% 工期
- 错误注入占 10% 工期
- 验收 + 性能占 10% 工期
