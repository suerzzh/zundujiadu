
> **日期**: 2026-06-05 | **方法**: 行业最佳实践全量复盘 + 工业级短剧工厂架构经验提炼 + 赛题三需求拆解 + Brainstorming 决策
> **版本说明**: v2 = 4 阶段(分析/规划/写作/审核),无事件提取先行;**v2.1(本文)** = 5 阶段(新增 Extractor 事件提取),其余 4 阶段升级为 Agent 化职责分离模块,并叠加 4 项工程机制(工作区/上下文控制/连续性摘要压缩/原子写)。后文凡提"v2 方案"均指 v2 早期版,凡提"v2.1"即本最终方案。
> **结论**: 采用 **方向 A: 5 阶段 + 轻量审核 + 4 项编辑能力 + Agent 化职责分离**。
> **说明**: v2 方案在行业标杆方法论基础上,融入 4 项工程机制(事件提取先行/工作区共享/上下文控制/连续性摘要压缩),并将 4 个流程升级为 Agent 化职责分离架构。 
>
> **题目硬要求 — 独立 Schema 文档**: 题目三明确要求"额外写一篇文档,定义剧本的 YAML Schema,说明设计原因"。本方案第 4.4 节给出 Schema 概要,完整的字段定义、9 条设计理由、版本演进、JSON Schema 约束抽取到独立文件 **`docs/yaml-schema-design.md`**(与本 brainstorm 平级,作为最终可交付文档)。本节为交叉引用,详细定义见独立文件。

---

## 1. 行业最佳实践(小说→剧本方法论工具链)全量复盘

### 1.1 项目定位

不是单工具,而是**给 Agent(Claude Code/Cursor/Codex)用的方法论工具链**。无 UI,Markdown 文件输出,`outputs/{剧本名}/.agent-state.json` 持久化断点续跑。18 个专业 Agent × 26 个 Skill × 22 份 Reference。

### 1.2 7 阶段流水线

```
阶段0 [可选] 知识收编     ~ingest / ~ingest-pending
阶段1 改编分析            ~analyze      (novel-analyzer + insight-architect)
阶段2 分集规划            ~plan         (episode-architect + emotion-architect)
阶段3 单集写作            ~write N      (script-writer + visual-storyteller)
阶段4 总复核 / 对比审核    ~review N     (script-comparator + review-director)
阶段5A 标准分镜           ~storyboard-film
阶段5B Seedance 流        ~storyboard-seedance
阶段6 完成检查            ~final-check
```

每阶段:Agent 决定谁来负责,Skill 决定怎么执行,Reference 决定判断标准,Scripts 处理可自动化工具动作,Outputs 保存项目记忆。

### 1.3 核心方法论(references/01-21)

| Reference | 核心提炼 | v2 应用度 |
|-----------|---------|----------|
| 00-first-principles | 创作底层原则(情感优先、镜头语言) | 部分 |
| **01-adaptation-system** | **男女频判定、冲突池、爽点池、称呼规范、情绪曲线、四阶段强度** | **核心** |
| **02-episode-architecture** | **三幕式结构(全剧+单集)、10 集生死线、事件完整性、防跨集重复** | **核心** |
| **03-script-writing-standard** | **单集 2-3 场景、对话比 70%、句长 12 字、钩子公式、4 种金句公式** | **核心** |
| **04-review-gates** | **四遍修改法、跨集重复检查、事件完整性检查、PASS/FAIL 输出规范** | **核心** |
| 05-compliance-boundaries | 合规边界(平台/法律/敏感词) | 部分 |
| 10a/10b/10c | 动作戏/氛围戏/悬念戏专题 | 后期 |
| 11a-c | Seedance/Sora2 提示词 | v1.1+ |
| **12-genre-specific-techniques** | **4 类体裁(末世重生/玄幻/女频/网文)专属格式与禁忌** | **核心** |
| 13-show-dont-tell | 心理→动作/台词的转换规则 | 部分 |
| **14-story-psychology** | **观众预期管理、爽点认知负荷、悬念链路** | **核心** |
| 18-theme-selection | 5 种故事导向(人物/目标/困境/奇遇/谜题) | 参考 |
| 19-micro-drama-storyboard | 短剧分镜 | v1.1+ |

### 1.4 核心 Agents(方法论工具链部分)

| Agent | 职责 |
|-------|------|
| novel-analyzer | 文本清洗、男女频判定、冲突池、角色档案、称呼规范 |
| insight-architect | 显性叙事/隐藏真相/爽点虐点/观众预期 |
| episode-architect | 分集目录、进度、钩子、节奏 |
| emotion-architect | 情绪曲线、悬念策略、心理预期管理 |
| script-writer | 单集剧本生成、风格分析 |
| visual-storyteller | Show Don't Tell 检查 |
| review-director | 业务审核+合规审核+总复核 |
| continuity-recorder | 连续性记录 |
| script-comparator | 逐一对比参考剧本 |

### 1.6 与本项目形态对比

| 维度 | 行业标杆方法论 | 当前项目 | 关键差异 |
|------|---------------------|---------|---------|
| 目标用户 | Agent / Showrunner | 小说作者 | **完全不同的用户** |
| 产物形态 | Markdown 文件 + .agent-state.json | Web 应用 + YAML 编辑器 | **完全不同的形态** |
| 运行方式 | 人类在 IDE 中逐阶段跑命令 | 一键转换 + SSE 进度推送 | **完全不同的交互** |
| 内部机制 | LLM 推理链(可读可改) | LLM 直调 + Pydantic 校验 | 类似 |
| RAG | 本地 hit-scripts-md 混合检索 | 不采用 | **不引入** |
| 审核 | 4 遍修改法 + 双审 | Pydantic 格式校验 | **升级** |
| 连续性 | continuity-recorder 持续维护 | 无 | **新增** |

**关键发现**:行业标杆项目是**方法论/工具链**而不是**产品**。我们要把它的**核心机制**(改编分析/分集规划/审核/连续性)封装进我们的 Web 应用中。

---

### 1.7 工业级短剧工厂经验 — 4 项工程机制提炼

> 从工业级"小说 → 短剧剧本 → 分镜 → AI 视频"产品中提炼的上游架构经验,与本项目"小说 → 影视剧本"链路高度重叠。其产品级架构有以下 4 项工程机制可直接落地到本项目的 Pipeline。

**Agent 职责分离思想(已演化为"代码调度 + 模块化")**

```
Orchestrator(调度器,代码控制)
  ├── Extractor(事件提取)
  ├── Analyzer(改编分析)
  ├── Planner(分集规划)
  ├── Writer(逐章写作)
  └── Reviewer(审核监督)
```

每个模块是**封装好的 Python Class**,有明确输入/输出/Skill;Orchestrator 用**代码调度**(非 LLM 决策),既保留模块解耦,又避免完整 Agent 框架的过重开销。

**核心 4 项工程机制**

| 机制 | 核心设计 | v2.1 应用度 |
|------|---------|------------|
| **事件提取先行** | 阶段 0 先每章轻量提取事件摘要,后续所有阶段只读事件表(不读原始小说) | **核心** |
| **工作区共享状态** | 阶段间唯一传递介质是工作区文件(`00_raw/10_events/20_analysis/...`),不依赖内存中间状态 | **核心** |
| **上下文控制** | Writer 每章上下文只注入"上一章 100 字梗概",防止 N 章小说上下文线性膨胀 | **核心** |
| **连续性摘要压缩** | 双层记录:原始层(每场变化明细)+ 摘要层(每 5-10 场压缩的状态),Writer 注入摘要层 + 本场相关原始层 | **核心** |
| 模块封装为独立类 | 每个 Agent 是封装好的 Python Class,有明确输入/输出接口 | 参考 |
| 评分后暂停 | 监督层评分后必须等用户决策 | 参考 |
| 并发信号量 | 用信号量限制并发,任务完成后立即启动下一个(非固定批次) | 参考 |

**与本项目形态对比**

| 维度 | 工业级短剧工厂 | 当前项目 | 关键差异 |
|------|--------------|---------|---------|
| 目标产物 | 竖屏短剧(分集/付费卡点/竖屏) | 影视剧本(电影/电视剧,扁平场列表) | **产物形态不同** |
| 运行形态 | Web 应用(Electron + Socket.IO) | Web 应用 + CLI | 类似 |
| Agent 架构 | 完整三层(LLM 决策层) | Pipeline 代码调度 | **调度方式不同** |
| 下游链路 | 分镜 + AI 视频生成 | 无 | 不涉及 |
| 事件提取 | ✅ 先行提取 | ❌ 无 | **新增** |
| 工作区机制 | ✅ 共享状态文件 | ❌ 阶段间靠内存传递 | **新增** |
| 上下文控制 | ✅ 只读最后一集 | ❌ 未明确限制 | **新增** |
| 连续性压缩 | ✅ 摘要压缩 | ❌ 无连续性记录 | **新增** |

**关键发现**:工业级短剧工厂的"事件提取/工作区/上下文控制/连续性压缩"四项机制可作为本项目 Pipeline 的工程基线,与行业标杆方法论(改编分析/分集规划/审核/连续性)形成**方法论 × 工程**的双轮驱动。

---

## 2. 赛题三需求拆解

> "很多小说作者希望将自己的作品改编成剧本,请开发一款 AI 辅助剧本创作工具,降低改编门槛,提升效率。要求:能将 3 个章节以上的小说文本自动转换为结构化剧本(YAML 格式),让作者可以快速获得可编辑、可进一步打磨的剧本初稿。请额外写一篇文档,定义剧本的 YAML Schema。文档中需说明该 Schema 的设计原因。"

| 关键词 | 隐含需求 | 我们的设计回应 |
|--------|---------|---------------|
| **AI 辅助**(非全自动) | 必须是**可编辑的初稿**,AI 干最累的活,人做决策 | YAML 编辑器 + 单集重生 |
| **降低门槛** | 作者不懂剧本格式也能上手 | 默认合理 Schema + 硬性质量检查 |
| **提升效率** | 减少从小说到剧本的人工改稿时间 | 自动切章 + 自动改写 + 质量报告 |
| **3 个章节以上** | 至少能处理 3 章,理想 10 章 | Pipeline 设计支持 3-10 章 |
| **结构化剧本** | YAML 而非散装文本 | Schema v1.0 + 字段约束 |
| **可编辑** | 关键!不能是只读 PDF | Monaco YAML 编辑器 + 单集重生 + 字段级表单 |
| **可进一步打磨** | 必须是初稿,不是终稿 | 留 review_log/notes/hooks 字段 |
| **YAML Schema 文档** | 题目明确要求 | 已写入 spec 4 节 |
| **设计原因** | 题目明确要求 | spec 4 节有 9 条设计理由 |

---

## 3. 用户决策(2026-06-05 brainstorm 问答确认)

| 决策项 | 选择 | 理由 |
|--------|------|------|
| Pipeline 架构 | **方向 A: 5 阶段 + 轻量审核 + Agent 化职责分离** | 在 4 阶段基础上增加事件提取先行阶段,4 个核心流程封装为 Agent 化模块 |
| 编辑能力(多选) | 全部 4 项 | 题目强调"可编辑、可进一步打磨" |

---

## 4. v2.1 方案: 5 阶段 + 轻量审核 + Agent 化职责分离 Pipeline

### 4.1 Agent 化架构设计

#### 4.1.1 为什么不引入完整 Agent 框架?

当前 4 个流程本质是**数据转换管道**(输入→处理→输出),不是**自主决策的智能体**。Analyzer 不需要"感知环境后决定做什么",它只需要"读事件表→输出分析"。套上完整的 Agent 框架(感知→决策→行动→记忆循环)会增加大量额外开发工作,而评委看不到"Agent 内部决策过程",产物质量才是评分核心。

#### 4.1.2 工业级三层 Agent 架构的映射(取其形,弃其重)

工业级短剧工厂的三层架构(决策层 LLM / 执行层 / 监督层)映射到本方案:

```
Orchestrator(调度器,代码控制)     ← 工业级短剧工厂的决策层思路,但用代码而非 LLM
    ├── Extractor Agent(事件提取)     ← 新增
    ├── Analyzer Agent(改编分析)
    ├── Planner Agent(分集规划)
    ├── Writer Agent(逐章写作)
    └── Reviewer Agent(审核监督)      ← 工业级短剧工厂的监督层思路
```

每个"Agent"实际上是一个**封装好的 Python Class**,有:
- 明确的输入接口(从工作区文件读取,不从全局变量读取)
- 自己的 Skill/Prompt(外置 markdown)
- 明确的输出接口(写入工作区文件)
- 不依赖其他 Agent 的内部状态

#### 4.1.3 工作区(Workspace)机制:阶段间唯一传递介质

设计原则来自工业级短剧工厂的共享状态文件实践,每个 Pipeline 实例拥有独立工作区目录:

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
│     ├── chapter_02.yaml
│     └── ...
├── 50_review/              ← 阶段 4 产出:审核报告
│     └── review.json
├── 60_continuity/          ← 连续性记录(增量更新)
│     └── continuity.json
└── 90_output/              ← 最终产物
      └── script.yaml
```

**核心规则:后一阶段必须读取前一阶段的产物文件,禁止依赖内存中的中间状态。** 这样 Pipeline 中断重启后,可以从任意阶段恢复。

#### 4.1.4 上下文控制策略:Writer 只读"上一章摘要"

工业级短剧工厂的实践:Writer Agent 上下文只注入"最后一集"内容,避免线性膨胀。本方案延续该设计:
- Writer Agent 每章的上下文注入 = 上一章的 100 字梗概(由 Assembler 在上一章完成后自动生成) + 全局角色表 + 当前章节原文
- **不注入全部已写章节原文**,防止 10 章小说的上下文线性膨胀
- 梗概写入 `workspace/{project_id}/40_scripts/chapter_XX.summary.json`,供下一章读取

#### 4.1.5 连续性记录的"摘要压缩"机制

工业级短剧工厂的 Memory 摘要压缩设计:
- **原始层**:每场变化明细(谁出场、什么道具首次出现、什么伏笔埋下),写入 `continuity.json`
- **摘要层**:每 5-10 场压缩成一段"当前状态摘要"(主角目前在哪、和谁在一起、关键道具状态)
- Writer Agent 注入上下文时,只注入**摘要层 + 本场相关的原始层**,而非全部连续性记录
- 摘要由本地代码自动生成,无需额外 LLM 调用

---

### 4.2 新 Pipeline 全景

```
[用户输入] 小说文本(3-10 章)
   │
   ▼
[阶段 0] 事件提取 Extractor (N×LLM, 并发 2, JSON)
   │ 输入: 每章原始文本(独立调用)
   │ 输出: 每章事件摘要(人物/事件/地点/冲突/情感转折)
   │ 机制: 信号量并发控制,任务完成后立即启动下一个
   │ 落地: workspace/10_events/events.json
   │
   ▼
[阶段 1] 改编分析 Analyzer (1×LLM, JSON)
   │ 输入: events.json(事件表,非全本小说)
   │ 输出: 题材判定、男女频、冲突池、爽点池、3-5 个角色档案、
   │       称呼规范表、改编策略、改编风险
   │ Prompt 注入: references/01-adaptation-system.md 核心规则
   │ 落地: workspace/20_analysis/analysis.json
   │
   ▼
[阶段 2] 分集规划 Planner (1×LLM, JSON)
   │ 输入: analysis.json + events.json
   │ 输出: 分集目录(集号/标题/类型/事件流程/钩子/情绪强度)、
   │       情绪曲线、节奏预警
   │ Prompt 注入: references/02-episode-architecture.md 三幕式
   │ 落地: workspace/30_plan/plan.json + PlanValidation(硬性规则校验)
   │
   ▼
[阶段 3] 逐章写作 Writer (N×LLM, 并发 2, YAML)
   │ 输入: analysis.json + plan.json + 当前章节原文
   │       + 上一章 summary.json(100字梗概)
   │       + continuity_summary(摘要层,非全部明细)
   │ 输出: 本章剧本片段(符合 Schema v1.0)
   │ Prompt 注入: references/03-script-writing-standard.md
   │              + 体裁特定规则(从 analysis.json 取)
   │ 机制: 每章完成后本地提取连续性增量更新 continuity.json
   │ 落地: workspace/40_scripts/chapter_XX.yaml + chapter_XX.summary.json
   │
   ▼
[阶段 4] 审核 + 拼装 Reviewer + Assembler (1×LLM + 本地)
   │ 输入: 完整 Script(初稿) + continuity.json
   │ 输出 1 (LLM): 5 维评分 + Top-3 问题 + 修改建议
   │ 输出 2 (本地): QualityGate 6 项硬性检查 + 引用一致性 + 连续性校验
   │ 机制: 审核报告输出后,CLI 暂停询问用户决策:
   │       "评分 B,发现 2 个中等问题。选择:[1]继续 [2]修复后重跑 [3]查看详情"
   │ 落地: workspace/50_review/review.json
   │
   ▼
[产物]
   ├── script.yaml (符合 Schema v1.0, 可在 Monaco 直接编辑)
   ├── events.json (事件提取结果,供作者核对 AI 理解是否准确)
   ├── analysis.json (改编分析,供作者理解 AI 改编策略)
   ├── plan.json (分集规划,供作者调整)
   ├── review.json (审核报告,供作者决定改稿)
   └── continuity.json (人设/称呼/道具/伏笔时间线 + 摘要层)
```

### 4.3 阶段调用次数与成本

| 阶段 | LLM 调用 | 模型 | 估算 token (in/out) | 估算成本 |
|------|---------|------|---------------------|---------|
| 0 事件提取 | N (3-10) × 并发 2 | DeepSeek V4-Pro | 3000/章 / 200/章 | 0.01 元/章 |
| 1 改编分析 | 1 | DeepSeek V4-Pro | 8000 / 3000 | 0.14 元 |
| 2 分集规划 | 1 | DeepSeek V4-Pro | 6000 / 2000 | 0.10 元 |
| 3 逐章写作 | N (3-10) × 并发 2 | DeepSeek V4-Pro | 6000/章 / 4000/章 | 0.15 元/章 |
| 4 审核 | 1 | DeepSeek V4-Pro | 10000 / 2000 | 0.12 元 |
| **3 章合计** | **8 次** | - | - | **~0.84 元** |
| **10 章合计** | **15 次** | - | - | **~1.96 元** |

> **核算口径**:按表内单价(0.01/0.14/0.10/0.15/0.12)直接相加。3 章 = 0.03+0.14+0.10+0.45+0.12 = **0.84 元**;10 章 = 0.10+0.14+0.10+1.50+0.12 = **1.96 元**。早期文档(评审前)估算的"0.78 元 / 2.1 元"是按略低于当前单价的旧假设,本文以新单价为准。
>
> **并发池约束**:Extractor 与 Writer 共享同一信号量池(总量 2),Extractor 释放一个槽位后,Writer 即可启动下一章,Pipeline 总时间不增加。

**关键洞察**:增加事件提取阶段后,Analyzer 的输入从"全本小说"降级为"事件表",token 成本反而**下降 0.04 元**;总成本增加仅 ~0.17 元(3 章,含新增 Extractor),但获得了"事件核对"这一额外产物。**事件提取与 Writer 阶段可共享并发池**,总时间增加几乎为零。

### 4.4 Schema v1.0 升级

在原 Schema 基础上增加 4 类字段(可选,向后兼容 v1.0):

```yaml
# v1.1 (向后兼容) — 在 Episode 上扩展
- episode_number: 1
  # === v1.0 原有字段 ===
  hook: "..."
  scenes: [...]
  # === v1.1 新增(可选) ===
  beat_phase: "opening"               # opening/development/climax/turn/ending
  emotion_marker: "💥爽点爆发"        # 💥爽点/🔨压力/💔情感/❓悬念/➡️平缓
  conflict_type: "打脸"                # 自由文本,供审核
  is_paywall: false                    # 等同 paywall,冗余,便于前端
  # === EpisodePlan 同步 ===
```

```yaml
# 新增 meta.analysis 字段(可选)
meta:
  # === v1.0 原有字段 ===
  title: "..."
  # === v1.1 新增 ===
  analysis:
    genre: "重生逆袭"                # 重生/穿越/霸总/末世/玄幻/...
    gender_track: "male|female"        # 男频/女频
    orientation: "目标导向+奇遇导向"   # 5 种导向组合
    adaptation_risks:                  # 改编风险
      - "时间线复杂,需简化"
      - "配角过多,需砍到 5 人内"
```

### 4.5 前端 5 项展示能力(4 项编辑 + 1 项 AI 解释)

**4 项编辑能力(直接对剧本做改动)**

| 能力 | 路由/组件 | 数据 | 实现要点 |
|------|----------|------|---------|
| **单集重生成** | `POST /api/regenerate/{project_id}/{ep_num}` | 重写单集 + 更新 Script | 后端复用 writer 阶段 prompt,接收 ep_num 单独生成,merge 进 Script |
| **拆剧可视化** | `frontend/src/components/AnalysisBoard.tsx` | analysis.json + plan.json | 渲染 4 张表:总览卡(题材/导向/风险)、分集目录(集/标题/事件/钩子)、钩子库、爽点兑现表 |
| **审核结果展示** | `frontend/src/components/ReviewPanel.tsx` | review.json | 5 维雷达图 + Top-3 问题清单(可点跳转到对应集)+ 修改建议(可一键采纳) |
| **连续性记录展示** | `frontend/src/components/ContinuityTimeline.tsx` | continuity.json | 时间线展示人设/称呼/关键道具/伏笔,跨集一致性可视化 |

**1 项 AI 解释能力(让作者核对 AI 理解)**

| 能力 | 路由/组件 | 数据 | 实现要点 |
|------|----------|------|---------|
| **AI 理解核对板** | `frontend/src/components/EventsBoard.tsx` | events.json | 每章事件摘要列表(人物/事件/地点/冲突/情感转折),供作者核对 AI 提取是否准确;可手工修正后回灌后续阶段(可选) |

> **命名澄清**:EventsBoard 不是"编辑"动作(不直接改剧本),是 AI **透明性**组件,展示 AI 对小说的理解。把它从"4 项编辑能力"中独立出来,避免读者误解。

### 4.6 SSE 事件协议(可观察性 + Demo 体验)

T5.2 仅说"沿用 SSE 事件流",未定义事件格式。评审指出:**没显式协议的进度条 = 黑盒跑 N 分钟 = 焦虑**。本节定义正式协议。

**协议(Orchestrator → 前端):**

```jsonc
// 1. 阶段开始
{"event": "stage_started", "stage": "extractor", "total_chapters": 10, "ts": 1717...}

// 2. 阶段进度(每章完成触发,或 500ms 节流)
{"event": "stage_progress", "stage": "extractor", "chapter": 3, "total": 10,
 "elapsed_sec": 12, "chapter_status": "done", "events_count": 8}

// 3. 阶段完成
{"event": "stage_completed", "stage": "extractor", "duration_sec": 35,
 "outputs": {"events_json": "workspace/.../10_events/events.json"}}

// 4. 阶段失败(详见 4.7 错误处理)
{"event": "stage_failed", "stage": "extractor", "chapter": 5,
 "error": "LLM rate limit", "retry_count": 2, "recoverable": true}

// 5. 整 Pipeline 完成
{"event": "pipeline_completed", "outputs": ["script.yaml", "events.json", ...],
 "total_duration_sec": 78, "total_cost": 0.84}
```

**前端消费:**
- 进度条(按 stage):5 个段落,每段 0-100%
- 子进度条(按 chapter):阶段 0 / 3 显示 N/M
- "AI 在思考" 文本提示:"正在提取第 3 章事件...正在分析冲突池..."
- 失败时显示红色 banner,提供"重试"按钮(调 `POST /api/retry/{stage}`)

### 4.7 Pipeline 错误处理与重试策略(工程基础,评审 P0)

评审指出:**22 任务里 0 个错误处理任务,demo 必崩**。本节定义统一策略,作为 T4.7 实施依据。

| 错误类型 | 重试策略 | 失败兜底 |
|---------|---------|---------|
| 阶段 0/3 单章 LLM 失败 (rate limit / 5xx) | 重试 3 次(指数退避 1s/3s/9s) | 标记 `chapter_status: failed`,Pipeline 继续 |
| 阶段 0/3 单章 Pydantic 校验失败 | 改 prompt 重试 1 次 ("严格按 JSON 输出") | regex 提取关键字段;再失败则该章 `failed` |
| 阶段 1/2 LLM 失败 | 重试 2 次 | 整阶段 fail,Pipeline 暂停,前端 banner |
| 阶段 1/2 Pydantic 校验失败 | 改 prompt 重试 1 次 | 整阶段 fail |
| Workspace 写文件失败(磁盘满 / 权限) | 立即报错 | Pipeline 立即暂停,不重试(磁盘问题重试无意义) |
| 单集重生下游冲突(改第 3 集) | 默认重生下游 1 集(防断链) | 用户选"仅本集"则下游标 stale,不自动重写 |

**Workspace 异常处理(T0.3):**
- 写文件用 `*.tmp` + `os.replace` 原子重命名
- 写完后做 `json.load()` 反序列化校验,不通过则删除产物 + 报错
- 阶段开始前必须先 `validate_upstream(project_id)`,上游缺失/损坏则不允许开始

**LLM 输出校验与降级(并入 T3.1 LLM 客户端):**
- 关键字段(`analysis.json` / `plan.json` / `script.yaml`):100% Pydantic 校验
- 非关键字段(`events.json` / `continuity.json` 摘要层):可降级接受 80% 字段
- regex 提取:截取 `{}` 或 `[]` 块,二次 Pydantic 校验

**可观察性(T0.7):**
- 每次 LLM 调用记录到 `workspace/{project_id}/logs/llm.jsonl`:
  ```jsonl
  {"ts":"...","stage":"extractor","chapter":3,"latency_ms":2310,
   "token_in":3120,"token_out":240,"cost_cny":0.012,"status":"ok","error":null}
  ```
- 调试面板(可选 v1.1):前端展示本次 Pipeline 的 token/cost/latency 统计

**Continuity 快照机制(T4.3.1):**
- Writer 调用 LLM 前,**read-time 快照** `continuity.json`(防止后台增量更新读到不一致状态)
- 异步更新 continuity 在 Writer 完成后,**新 asyncio 任务**单独写

---

## 5. v2.1 vs v1 增强 vs 行业标杆完整版 vs 工业级短剧工厂 — 四方对比

| 维度 | v1 增强(已废弃) | **v2.1 5 阶段(新方案)** | 行业标杆 7 阶段(完整版) | 工业级短剧工厂 |
|------|----------------|----------------------|---------------------|-------------------|
| Pipeline 阶段 | 2 阶段 + 1 Review | **5 阶段(提取/分析/规划/写作/审核)** | 7 阶段(+ 分镜 + 完成检查) | 3 层 Agent(决策/执行/监督) |
| 事件提取先行 | ❌ | **✅ Extractor Agent, N×并发** | ❌ 无 | ✅ 阶段 0 先行提取 |
| 改编分析 | 无 | **✅ Analyzer Agent, 读事件表** | ✅ novel-analyzer + insight-architect | ✅ storySkeleton |
| 分集规划 | 无 | **✅ Planner Agent, 情绪曲线** | ✅ episode-architect + emotion-architect | ✅ adaptationStrategy |
| 工作区机制 | ❌ 内存传递 | **✅ Workspace 文件隔离** | ❌ Markdown 文件 | ✅ 共享状态文件 |
| 上下文控制 | ❌ 未限制 | **✅ 只读上一章摘要** | ❌ 全文注入 | ✅ 只读最后一集 |
| 连续性摘要 | ❌ | **✅ 原始层+摘要层双层** | ✅ continuity-recorder | ✅ Memory 3:1 压缩 |
| 审核方式 | 1 LLM + 6 规则 | **1 LLM 5 维评分 + 6 硬性规则 + 用户决策暂停** | 4 遍修改法 + 双审 + 对比 | ✅ A/B/C/D + 暂停等用户 |
| Agent 架构 | 函数调用 | **Agent 化职责分离(代码调度)** | 多 Agent 对话 | 完整 LLM 决策层 |
| 爆款 RAG | 创意#8 内部 prompt | **不采用** | ✅ BM25+语义+男女频 | ❌ 无 |
| 体裁规则 | 通用 prompt | **✅ 4 类体裁注入** | ✅ 4 类完整规则 | ❌ 通用短剧规范 |
| 编辑能力 | YAML 编辑器 + 单集重生 | **+ 拆剧可视化 + 审核面板 + 连续性时间线** | Markdown 文件手改 | Web 画布编辑 |
| 产物 | YAML + Review | **YAML + 5 个 JSON 辅助(+events)** | 大量 Markdown + .agent-state | 共享状态 + 分镜 |
| 工具链依赖 | Web 应用 | **Web 应用 + CLI** | 给 Agent 跑 | Electron + Web |
| LLM 调用(3 章) | 4 次 | **8 次** | 20+ 次 | 15+ 次 |
| 成本(3 章) | 0.61 元 | **~0.84 元** | > 3 元 | ~2 元 |

**v2.1 的定位**: 在 v1 增强基础上,**整合方法论 × 工程双轮驱动**:
- **方法论** (行业最佳实践):改编分析/分集规划/审核/连续性
- **工程机制** (from 工业级短剧工厂):事件提取先行/工作区隔离/上下文控制/连续性摘要压缩
- 保持**Web 应用 + YAML 编辑器**形态,用**代码调度替代 LLM 决策层**,避免过度工程化。

---

## 6. v2.1 任务拆分(共 44 任务,11 阶段)

### 阶段 0: 基础设施
- T0.1 根级配置(沿用)
- **T0.2 Workspace 工作区基础设施** ⭐ 新增
  - `workspace/` 目录结构定义(00_raw/10_events/20_analysis/...)
  - `WorkspaceManager` 类:创建/读取/写入/清理工作区
  - 阶段恢复机制:从任意阶段产物文件恢复 Pipeline 状态
- **T0.3 Workspace 异常处理** ⭐ 评审 P0
  - 写入用 `*.tmp` + `os.replace` 原子重命名
  - 写完反序列化校验,失败则删除产物
  - `validate_upstream(product_id)` 阶段门禁
  - 单元测试:模拟磁盘满、权限拒绝、并发写
- **T0.4 输入边界校验** ⭐ 评审 P0
  - 章节数 < 3:返回 400 "至少 3 章"
  - 章节数 > 50:warn + 提示用户拆分
  - 单章字数 > 10000:warn 上下文截断策略
  - 章节数 0 / 空文件:400
  - 单文件大小限制(< 5MB)
- **T0.5 性能预算基线** ⭐ 评审 P1
  - 文档化:总时间 ≤ 90s (10 章),首屏 ≤ 2s,LLM 调用并发 ≤ 2
  - 单元测试:占位,实现时跑一次基准
- **T0.6 输入可观察性(LLM 日志)** ⭐ 评审 P0
  - `workspace/{project_id}/logs/llm.jsonl` 记录每次 LLM 调用
  - 字段: ts/stage/chapter/latency_ms/token_in/token_out/cost_cny/status/error
  - 工具函数 `llm_logger.log_call(...)`,所有 Agent 强制调用
  - 单测:JSONL 行格式 + 异常时仍能写
- **T0.7 部署基础设施** ⭐ 评审 P0
  - `docker-compose.yml`:backend + frontend + (可选)redis
  - `.env.example`:DEEPSEEK_API_KEY / LOG_LEVEL / WORKSPACE_DIR
  - README "5 分钟跑起来" 段落

### 阶段 1: 后端基础(沿用 v1,微调)
- T1.1 FastAPI 初始化
- T1.2 SQLAlchemy 模型(**升级**:增加 Plan/Review/Continuity 3 张表)

### 阶段 2: Schema 层(扩展)
- T2.1 Pydantic 模型(基础 models,沿用)
- T2.2 YAML 序列化 + 示例
- **T2.3 Schema v1.1 扩展(可选字段,向后兼容)**
  - Episode.beat_phase / emotion_marker / conflict_type
  - Meta.analysis
- T2.4 ContinuityRecord 模型(人设/称呼/道具/伏笔)
- **T2.5 Event 模型** ⭐ 新增
  - `Event`(人物/事件/地点/冲突/情感转折)
  - `EventsResult`(每章事件列表)

### 阶段 3: LLM 客户端(扩展)
- T3.1 LLM 客户端 + Prompts
- T3.3 章节切分(沿用 v1)
- **T3.4 并发控制器** ⭐ 新增
  - 信号量模式(任务完成后立即启动下一个,非固定批次)
  - 与 Writer 阶段共享并发池

### 阶段 4: Pipeline 5 阶段核心 ⭐ 核心变化
- **T4.0 事件提取 Extractor** ⭐ 新增
  - `pipeline/extractor.py`
  - 输入:单章原始文本
  - 输出:事件摘要 JSON → workspace/10_events/
  - 并发 3,与 Writer 共享信号量池
- **T4.1 改编分析 Analyzer** ⭐ 新增(升级)
  - `pipeline/analyzer.py` → Agent 化封装
  - 输入改为**events.json**(非全本小说),降低 token 成本
  - Prompt 注入 references/01-adaptation-system.md
  - 输出 Pydantic: Analysis → workspace/20_analysis/
- **T4.2 分集规划 Planner** ⭐ 新增(升级)
  - `pipeline/planner.py` → Agent 化封装
  - 输入: analysis.json + events.json(从工作区读取)
  - Prompt 注入 references/02-episode-architecture.md
  - 输出 Pydantic: EpisodePlan → workspace/30_plan/
  - 硬性规则校验
- **T4.3 逐章写作 Writer**(对应 v1 T4.2,**升级**)
  - 注入体裁规则(从 analysis.json 取)
  - **注入上一章 summary.json**(100字梗概,上下文控制)
  - **注入 continuity_summary**(摘要层,非全部明细)
  - 输出: chapter_XX.yaml + chapter_XX.summary.json → workspace/40_scripts/
- T4.3.1 Continuity 快照机制 ⭐ 评审 P1
  - Writer 调用 LLM 前 read-time 快照 continuity.json
  - 异步更新在新 asyncio 任务,防竞态
- **T4.4 审核 Reviewer**(沿用 v1 增强)
  - 5 维评分 + Top-3 问题
  - **增加用户决策暂停机制**
- T4.5 拼装 Assembler(**升级**)
  - 增加 ContinuityRecord 提取
  - **增加每章 summary.json 自动生成**(100字梗概)
  - 最终产物写入 workspace/90_output/
- T4.6 Pipeline Orchestrator(升级)
  - 代码调度器(非 LLM 决策层)
  - 管理 Agent 生命周期:初始化 → 执行 → 输出 → 下一 Agent
  - 事件流扩展:加入 extractor/analyzer/planner/reviewer
- **T4.7 Pipeline 错误处理与重试** ⭐ 评审 P0(方案核心)
  - 实施 4.7 节定义的错误处理策略
  - `RetryPolicy` 工具类:指数退避 + 异常分类
  - 单测:mock LLM rate limit / 5xx / timeout
- **T4.8 错误注入测试** ⭐ 评审 P0
  - mock LLM 临时不可用(单次 503)
  - mock LLM 输出格式坏(非 JSON)
  - mock 磁盘写失败
  - mock 阶段中途 Pipeline 崩,重启验证恢复
  - 覆盖:每个阶段至少 1 个错误注入用例

### 阶段 5: FastAPI 路由(扩展)
- T5.1 REST 路由
  - 沿用 projects/convert/stream
  - **新增** POST /api/regenerate/{project_id}/{ep_num}
  - **新增** POST /api/retry/{project_id}/{stage}(评审补,4.6 节定义)
  - **新增** GET /api/projects/{id}/events (事件提取结果)
  - **新增** GET /api/projects/{id}/analysis
  - **新增** GET /api/projects/{id}/plan
  - **新增** GET /api/projects/{id}/review
  - **新增** GET /api/projects/{id}/continuity
- T5.2 SSE 集成(沿用,事件流扩展)

### 阶段 6: 前端(扩展)
- T6.1 Vite + React 脚手架
- T6.2 API 客户端 + Zustand store
- T6.3 三区域布局(沿用)
- **T6.4 EventsBoard 组件** ⭐ 新增
  - 每章事件摘要列表,供作者核对 AI 理解
- **T6.5 AnalysisBoard 组件** ⭐ 新增
  - 4 张表渲染
- **T6.6 ReviewPanel 组件** ⭐ 新增
  - 雷达图 + 问题清单 + 用户决策按钮
- **T6.7 ContinuityTimeline 组件** ⭐ 新增
  - 时间线 + 人设/道具/摘要层切换
- T6.8 单集重生 + SSE 集成

### 阶段 7: 集成 + 文档(扩展)
- T7.1 示例小说 + 集成测试(沿用)
- T7.2 README(沿用)
- **T7.4 独立 Schema 文档拆分** ⭐ 题目硬要求
  - 新建 `docs/yaml-schema-design.md`(与本 brainstorm 平级)
  - 抽取 4.4 节的 Schema 概要为完整字段定义
  - 补全 9 条设计理由(已有 ADR-007 总纲)
  - 补全 JSON Schema 约束
  - 与本 brainstorm 顶部"独立 Schema 文档"交叉引用互链

### 阶段 8: 参考与设计取舍文档
- **T8.1 行业标杆方法论参考映射表** ⭐ 新增
  - 在 spec 末尾追加方法论清单
- **T8.2 工业级短剧工厂 4 项工程机制设计取舍** ⭐ 新增
  - 说明事件提取/工作区/上下文控制/连续性压缩的来源与设计取舍

### 阶段 9: 连续性摘要压缩(独立)
- **T9.1 ContinuityCompressor** ⭐ 新增
  - 原始层 → 摘要层压缩逻辑(本地代码,无 LLM)
  - 每 5-10 场生成一段状态摘要
  - 单元测试:压缩后信息完整度 ≥ 90%

### 阶段 10: 非功能 / 风险 / 验收
- **T10.1 非功能基线测试** ⭐ 评审 P1
  - 性能基线:总时间 ≤ 90s (10 章),首屏 ≤ 2s
  - 资源限制:LLM 并发 ≤ 2,workspace 单项目 ≤ 50MB
  - LLM 日志不超 1MB/项目
- **T10.2 验收场景清单** ⭐ 评审 P1
  - 评审"5 分钟跑起来"流程演练
  - 评审"3 章小说 → 完整剧本 + 4 个 JSON 辅助"产物检查
  - 评审 4 项编辑能力的可视化演示
  - 评审 6 类错误的注入演示(配合 T4.8)

### §6.1 任务依赖关系

**关键路径**:阶段 0 → 阶段 1 → 阶段 2 → 阶段 3 → 阶段 4 → 阶段 5 → 阶段 6 → 阶段 7

**可并行项**:阶段 8 / 阶段 9 / 阶段 10 都可以在阶段 4 完成后并行启动(各自独立)。

---

## 7. 关键决策记录(ADR)

### ADR-001: 为何从 2 阶段升级到 5 阶段?
- **Context**: 题目要求"降低门槛、提升效率、可编辑、可打磨",2 阶段生成剧本质量依赖 LLM 一次性输出,长篇小说上下文复杂时易出现"集与集漂移/题材判定错误/付费卡点乱放"。
- **Decision**: v2.1 引入**改编分析 + 分集规划 + 事件提取** 三个独立前置阶段(5 阶段 = Extractor / Analyzer / Planner / Writer / Reviewer),作为后续写作的高质量输入。
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
- **对应任务**: T2.5(Event 模型)/ T3.4(并发控制器)/ T4.0(Extractor 实现)/ T4.1(Analyzer 改读事件表)/ T6.4(EventsBoard 前端)
- **Consequences**:
  - + Analyzer token 成本下降 ~30%(从 12000→8000 input)
  - + 多产出 `events.json`,作者可核对 AI 理解准确性
  - + Extractor 与 Writer 共享并发池,总时间不增加
  - - LLM 调用 +N 次(N=章节数),但每次成本极低(~0.01 元/章)
  - - 增加一个 Pydantic 模型(Event)和前端组件(EventsBoard)

### ADR-006: 为何采用 Agent 化职责分离,而非完整 Agent 框架?
- **Context**: 工业级短剧工厂采用完整三层 Agent 架构(决策层/执行层/监督层),决策层由 LLM 驱动。用户在讨论是否将 4 个流程封装为 Agent。
- **Decision**: **不引入完整 Agent 框架**(无感知-决策-行动-记忆循环),但将 4 个流程升级为 **Agent 化职责分离模块**:
  - 每个模块封装为独立 Python Class,有明确输入/输出/Skill
  - Orchestrator 用**代码调度**替代 LLM 决策层
  - 采用 4 项工程机制(工作区/上下文控制/连续性摘要/并发信号量)
- **对应任务**: T4.0 / T4.1 / T4.2 / T4.3 / T4.4(各 Agent 模块化封装)/ T4.6(Pipeline Orchestrator 升级)
- **Consequences**:
  - + 每个模块可独立测试、替换、复用
  - + 清晰的 Workspace 机制保证 Pipeline 可恢复
  - - 失去"完整 Agent 自治"叙事,但题目评分核心在产物质量而非 Agent 复杂度
  - - 模块边界需要靠代码契约保证(Pydantic),无 Agent runtime 自动约束
  - - 不具备"LLM 自主决策调度"能力,但赛题不需要
  - - 概念上不是真正的 Multi-Agent 系统,但工程上更稳健

### ADR-007: 为何把 Schema 文档拆为独立文件?(评审后新增)
- **Context**: 题目三明确要求"额外写一篇文档,定义剧本的 YAML Schema。文档中需说明该 Schema 的设计原因"。若 Schema 仅作为 spec 子节,文件层级不满足"独立可交付"要求,评委评审时可能直接判定需求未满足。
- **Decision**: 把完整 Schema 字段定义、9 条设计理由、JSON Schema 约束、版本演进,抽取到 **`docs/yaml-schema-design.md`**(与本 brainstorm 平级,作为正式可交付文档)。本方案 4.4 节保留 Schema 概要,作为交叉引用。
- **对应任务**: **T7.4 独立 Schema 文档拆分** ⭐ 题目硬要求(见 §6 阶段 7)
- **Consequences**:
  - + 满足题目硬要求(独立 Schema 文档)
  - + 评审/试用时 Schema 文档可单独交付
  - - 需要多写一份文档,但内容已在 4.4 节给出,主要工作是迁移 + 扩写

### ADR-008: 为何显式定义 SSE 事件协议?(评审后新增)
- **Context**: T5.2 仅说"沿用 SSE 事件流",未定义事件格式。评审指出:**没显式协议的进度条 = 黑盒跑 N 分钟 = 用户焦虑**。Demo 现场黑盒 90 秒会极大降低展示质量。
- **Decision**: 4.6 节定义 5 类事件(`stage_started`/`stage_progress`/`stage_completed`/`stage_failed`/`pipeline_completed`)的 JSON 格式,前端按 stage + chapter 双层渲染进度。
- **Consequences**:
  - + Demo 时有清晰的"AI 在思考"展示,极具说服力
  - + 失败时前端能给出明确错误和"重试"入口
  - - 需要前后端协调字段,但字段稳定(5 类事件基本不变)

### ADR-009: 为何用"分类重试 + 阶段门禁 + 原子写"作为错误处理策略?(评审后新增)
- **Context**: 原 v2.1 任务拆分**完全没有错误处理任务**,这是 P0 风险。LLM 调用必然出现 rate limit、5xx、超时、JSON 格式坏;磁盘可能写满/权限拒绝;Pipeline 中途崩需要恢复。
- **Decision**: 4.7 节定义 6 类错误的统一处理策略,核心三板斧:
  1. **分类重试**:LLM 错误按类型重试 2-3 次(指数退避);磁盘错误不重试
  2. **阶段门禁**:`validate_upstream()` 校验上游产物,缺/坏则不允许开始
  3. **原子写**:`*.tmp` + `os.replace` 写文件,反序列化校验
- **Consequences**:
  - + Demo 不会因单次网络抖动而崩
  - + Pipeline 可从任意阶段恢复(Workspace + 门禁保证)
  - + 关键产物 100% Pydantic 校验,非关键 80% 降级
  - - 增加 T4.7 + T4.8 错误注入测试

### ADR-010: 为何强制 LLM 调用日志入 jsonl?(评审后新增)
- **Context**: LLM 失败时,如果没有任何调用记录,定位问题要重新跑一遍 Pipeline(浪费 90s + 0.84 元)。Demo 现场出问题没日志 = 不可调试。
- **Decision**: 所有 Agent 通过 `llm_logger.log_call(...)` 强制记录每次 LLM 调用的 ts/stage/latency/token/cost/status,写入 `workspace/{project_id}/logs/llm.jsonl`。
- **Consequences**:
  - + 失败时直接 grep 日志定位(哪个 stage 哪次调用坏)
  - + 可统计真实成本,验证 0.84 元的估算
  - + 可观测性基础,后续可加调试面板
  - - 磁盘占用小(< 1MB/项目),可忽略

---

## 8. 非功能需求与非目标(评审补)

### 8.1 非功能需求(题目虽未要求,但工程质量必需)

| 类别 | 基线要求 | 来源 |
|------|---------|------|
| **性能** | 10 章小说 ≤ 90s,首屏 ≤ 2s,LLM 调用并发 ≤ 2 | T0.5 / T10.1 |
| **可恢复** | Pipeline 任意阶段中断后,可从最近成功产物恢复 | T0.2 / T0.3 |
| **可观测** | 所有 LLM 调用记入 `llm.jsonl`,Demo 现场可 grep | T0.6 / ADR-010 |
| **可测试** | 每个模块有单元测试;Pipeline 有 6 类错误注入测试 | T4.7 / T4.8 |
| **可部署** | `docker-compose up` 5 分钟内跑起来 | T0.7 |
| **可移植** | Workspace 路径参数化,Mac/Linux/Windows 一致 | T0.1 |
| **可扩展** | Pipeline 阶段可插拔(后续加 Stage5 分镜) | T4.6 调度器 |

### 8.2 非目标(显式排除,避免范围蔓延)

| 类别 | 显式不做 | 理由 |
|------|---------|------|
| **鉴权 / 多用户** | 不做用户系统、不做项目权限 | 题目三为单用户 demo,工期不允许扩张 |
| **国际化 (i18n)** | UI 仅中文 | 题目语境为中文短剧,英文化无 ROI |
| **分镜 / 视频生成** | 不做 stageboard、Seedance 提示词 | 题目三不涉及,与剧本输出无关 |
| **AI 对话式改稿** | 不做 chat 改稿 | 4 项编辑能力(单集重生/可视化/审核/连续性)已覆盖"可编辑、可打磨" |
| **多 LLM 适配** | 锁定 DeepSeek V4-Pro,不抽象 Provider 接口 | 工期不允许;Demo 现场不需要切换 |
| **云端部署** | 仅本地 Docker / docker-compose | 训练营无云资源,不需要 |
| **持久数据库** | SQLite(单文件)即够,不上 Postgres | 演示场景数据量小 |
| **WebSocket** | 沿用 SSE | SSE 单向 + 简单,WebSocket 收益不抵复杂度 |

---

## 9. 风险矩阵(评审补)

| 风险 | 概率 | 影响 | 缓解措施 | 任务 |
|------|------|------|---------|------|
| **LLM API 临时不可用** | 高 | 高 | 分类重试(指数退避) + LLM 日志 + 前端"重试"按钮 | T0.6 / T4.7 |
| **LLM 输出格式坏(Pydantic fail)** | 高 | 中 | regex 二次提取 + 改 prompt 重试 1 次 + 关键字段 100% 校验 | T4.7 |
| **Workspace 写文件失败(磁盘满/权限)** | 低 | 高 | 立即报错不重试(磁盘问题重试无意义) | T4.7 |
| **Pipeline 中途崩** | 中 | 高 | Workspace 原子写 + 阶段门禁 `validate_upstream()` + 可从任意阶段恢复 | T0.2 / T0.3 |
| **超长小说(>10 章)上下文爆炸** | 中 | 中 | Writer 只读上一章 100 字梗概,不注入全部已写章节 | §4.1.4 |
| **DeepSeek 配额耗尽** | 低 | 高 | 切到备用 API(预留 `DEEPSEEK_API_KEY_BACKUP` 环境变量) | T0.1 |
| **评审质疑"为何不用通用 LLM 直接生成"** | 高 | 中 | 强调 5 阶段分工的可控性 + 事件提取的事件核对 + Agent 化模块边界 | §4.1 / §7 ADR |
| **评审质疑"为何不引完整 Agent 框架"** | 中 | 低 | ADR-006 已显式说明"取其形,弃其重",Pydantic 边界 | ADR-006 |
| **Schema 9 条设计理由被质疑** | 低 | 中 | 独立 Schema 文档(§4.4 + T7.4)详细说明 | T7.4 |
| **Demo 现场黑盒 90s 焦虑** | 中 | 高 | SSE 显式 5 类事件(§4.6) + "AI 在思考" 文案 | T5.2 / T6.8 |
| **前端组件渲染性能差(10 章 50 场)** | 低 | 低 | EventsBoard 虚拟滚动;ContinuityTimeline 摘要层优先 | T6.4 / T6.7 |

---

## 10. 项目目录结构总览(评审补)

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
│   │       └── 2026-06-05-novel2script-brainstorming.md  ← 本文件
│   ├── yaml-schema-design.md          ← T7.4 独立 Schema 文档(题目硬要求)
│   ├── spec.md                        ← 项目 spec
│   └── architecture.md
├── docker-compose.yml                 ← T0.7
├── .env.example
├── README.md
└── tests/                             ← 端到端测试
    └── e2e/
        ├── happy_path.spec.ts
        └── error_injection.spec.ts    ← T4.8
```

---

## 11. 测试策略汇总(评审补)

| 测试层级 | 工具 | 覆盖范围 | 通过标准 | 任务 |
|---------|------|---------|---------|------|
| **单元测试** | pytest | 工具类(Workspace / Continuity / Pydantic) | 行覆盖 ≥ 70% | 散落各 T |
| **模块测试** | pytest | 单个 Agent(Extractor / Analyzer / Writer) | Mock LLM 输出,Pydantic 100% 通过 | T4.x 各任务 |
| **集成测试** | pytest | Pipeline 5 阶段端到端(mock LLM) | 跑通 happy path,产物符合 Schema | T7.1 |
| **错误注入测试** | pytest + mock | 6 类错误(LLM 5xx / rate limit / 格式坏 / 磁盘满 / 权限 / 阶段中途崩) | 每类错误至少 1 用例,验证恢复 | T4.8 |
| **验收测试** | 手工 + 录屏 | 评审 5 分钟跑起来 + 4 项编辑能力 + 6 类错误演示 | 评审现场无卡顿 | T10.2 |
| **LLM 日志回归** | 自定义脚本 | 对比实际 vs 估算成本 | 实际 3 章成本 ≤ 0.9 元 | T0.6 |
| **性能基线** | pytest-benchmark | 10 章小说总时间 / 内存 / workspace 大小 | 总时间 ≤ 90s,workspace ≤ 50MB | T10.1 |

**测试比例**(评审建议):
- 单元/模块测试占 60% 工期
- 集成测试占 20% 工期
- 错误注入占 10% 工期
- 验收 + 性能占 10% 工期

---

## 12. 下一步行动

1. **生成 v2.1 implementation plan**:把第 6 节任务拆分展开为详细 task 列表(44 任务,11 阶段)
2. **更新 spec 设计文档**:追加"v2.1 5 阶段 Pipeline + Agent 化架构 + Workspace 机制"章节
3. **必做(评审后新增)**:
   - **3.1 T7.4 拆分独立 Schema 文档** `docs/yaml-schema-design.md`(题目硬要求) — 已纳入 §6 任务拆分
   - **3.2 写 Demo 路径设计**(无工期)
4. **范围外(已评审拒绝,不再扩张)**:
   - 作品级导出包 `.zip`(CEO 扩张项 E5)
   - 与通用 LLM 对比 demo(CEO 扩张项 E6)
   - 人类可读 .md 摘要(CEO 扩张项 E4)
   - 这些可在 v1.1 / 训练营之后再追加
5. **实现优先级(关键路径)**:T0.2(Workspace) → T0.3(异常处理) → T0.6(LLM 日志) → T0.7(部署) → T2.5(Event 模型) → T4.0(Extractor) → T4.1(Analyzer 改读事件表) → T3.4(并发控制器) → T4.7(错误处理) → T4.8(错误注入测试) → T7.4(独立 Schema 文档)
6. **评审后增量总览(9 个新任务)**:T0.3 / T0.4 / T0.5 / T0.6 / T4.7 / T4.8 / T7.4 / T10.1 / T10.2

----

> 本头脑风暴 v2.1 由 Trae IDE 基于行业最佳实践(小说→剧本方法论工具链)全量复盘 + 工业级短剧工厂架构经验提炼 + 赛题三需求拆解 + 用户决策生成。
>
> 用户原始问题来源:用户要求调研行业方法论工具链和工业级短剧工厂的"小说 → 短剧剧本"产品,参考其小说转剧本的技术架构与功能,融入现有方案。
>
> 详细来源:
> - 对标方法论工具链:开源的"小说→剧本"Agent 方法论工具链(无 UI,Markdown 输出,18 Agent × 26 Skill × 22 Reference,断点续跑)
> - 工业实践:工业级短剧工厂的"小说 → 短剧剧本"上游产品(提供 4 项工程机制:事件提取先行/工作区共享/上下文控制/连续性摘要压缩)
