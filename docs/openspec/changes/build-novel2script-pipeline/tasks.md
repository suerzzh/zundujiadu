## 1. 基础设施(阶段 0)

- [ ] 1.1 T0.1 根级配置:项目初始化、目录结构、.env.example
- [ ] 1.2 T0.2 Workspace 工作区基础设施:WorkspaceManager 类(创建/读取/写入/清理)、目录结构定义(00_raw~90_output)、阶段恢复机制
- [ ] 1.3 T0.3 Workspace 异常处理:原子写(*.tmp + os.replace)、写完反序列化校验、validate_upstream(project_id) 阶段门禁、单元测试(磁盘满/权限拒绝/并发写)
- [ ] 1.4 T0.4 输入边界校验:章节数 < 3 返回 400、> 50 warn、单章 > 10000 字 warn、空文件 400、单文件 < 5MB
- [ ] 1.5 T0.5 性能预算基线:文档化(总时间 ≤ 90s/10章、首屏 ≤ 2s、LLM 并发 ≤ 2)、占位基准测试
- [ ] 1.6 T0.6 LLM 日志:workspace/{project_id}/logs/llm.jsonl、llm_logger.log_call(...) 工具函数、所有 Agent 强制调用、单测(JSONL 行格式 + 异常时仍能写)
- [ ] 1.7 T0.7 部署基础设施:docker-compose.yml(backend + frontend)、.env.example(DEEPSEEK_API_KEY/LOG_LEVEL/WORKSPACE_DIR)、README "5 分钟跑起来"

## 2. 后端基础(阶段 1)

- [ ] 2.1 T1.1 FastAPI 初始化:app/main.py、CORS、路由注册
- [ ] 2.2 T1.2 SQLAlchemy 模型:Project/Script 基础表 + Plan/Review/Continuity 3 张新表

## 3. Schema 层(阶段 2)

- [ ] 3.1 T2.1 Pydantic 模型:Script/Episode/Scene/Character/Dialogue 基础 models
- [ ] 3.2 T2.2 YAML 序列化 + 示例:script.yaml 示例文件、序列化/反序列化工具
- [ ] 3.3 T2.3 Schema v1.1 扩展:Episode.beat_phase/emotion_marker/conflict_type/is_paywall、Meta.analysis(向后兼容 v1.0)
- [ ] 3.4 T2.4 ContinuityRecord 模型:人设/称呼/关键道具/伏笔时间线
- [ ] 3.5 T2.5 Event 模型:Event(人物/事件/地点/冲突/情感转折)、EventsResult(每章事件列表)

## 4. LLM 客户端(阶段 3)

- [ ] 4.1 T3.1 LLM 客户端 + Prompts:DeepSeek V4-Pro 调用封装、外置 Prompt markdown、Pydantic 输出校验、regex 二次提取降级
- [ ] 4.2 T3.3 章节切分:按章节标题/空行切分,返回 List[Chapter]
- [ ] 4.3 T3.4 并发控制器:信号量模式(任务完成后立即启动下一个)、与 Writer 阶段共享并发池

## 5. Pipeline 5 阶段核心(阶段 4)

- [ ] 5.1 T4.0 Extractor:pipeline/extractor.py、输入单章原文、输出事件摘要 JSON → workspace/10_events/、并发 2 与 Writer 共享信号量池
- [ ] 5.2 T4.1 Analyzer:pipeline/analyzer.py Agent 化封装、输入 events.json(非全本小说)、Prompt 注入 references/01-adaptation-system.md、输出 Analysis → workspace/20_analysis/
- [ ] 5.3 T4.2 Planner:pipeline/planner.py Agent 化封装、输入 analysis.json + events.json、Prompt 注入 references/02-episode-architecture.md、输出 EpisodePlan → workspace/30_plan/、硬性规则校验
- [ ] 5.4 T4.3 Writer:pipeline/writer.py 升级、注入体裁规则 + 上一章 summary.json(100字梗概) + continuity_summary(摘要层)、输出 chapter_XX.yaml + chapter_XX.summary.json → workspace/40_scripts/
- [ ] 5.5 T4.3.1 Continuity 快照机制:Writer 调用 LLM 前 read-time 快照 continuity.json、异步更新在新 asyncio 任务
- [ ] 5.6 T4.4 Reviewer:5 维评分 + Top-3 问题 + 用户决策暂停机制
- [ ] 5.7 T4.5 Assembler:ContinuityRecord 提取 + 每章 summary.json 自动生成(100字梗概)、最终产物写入 workspace/90_output/
- [ ] 5.8 T4.6 Pipeline Orchestrator:代码调度器、管理 Agent 生命周期(初始化→执行→输出→下一 Agent)、SSE 事件流扩展
- [ ] 5.9 T4.7 Pipeline 错误处理与重试:RetryPolicy 工具类(指数退避 + 异常分类)、实施 design.md 错误处理策略、单测(mock LLM rate limit/5xx/timeout)
- [ ] 5.10 T4.8 错误注入测试:mock LLM 临时不可用(503)、mock LLM 输出格式坏(非 JSON)、mock 磁盘写失败、mock Pipeline 中途崩重启验证恢复、每个阶段至少 1 个错误注入用例

## 6. FastAPI 路由(阶段 5)

- [ ] 6.1 T5.1 REST 路由:沿用 projects/convert/stream + 新增 POST /api/regenerate/{project_id}/{ep_num} + POST /api/retry/{project_id}/{stage} + GET /api/projects/{id}/events + GET /api/projects/{id}/analysis + GET /api/projects/{id}/plan + GET /api/projects/{id}/review + GET /api/projects/{id}/continuity
- [ ] 6.2 T5.2 SSE 集成:沿用 SSE 事件流、扩展 5 类事件(stage_started/stage_progress/stage_completed/stage_failed/pipeline_completed)

## 7. 前端(阶段 6)

- [ ] 7.1 T6.1 Vite + React 脚手架:项目初始化、依赖安装、基础布局
- [ ] 7.2 T6.2 API 客户端 + Zustand store:后端 API 封装、全局状态管理
- [ ] 7.3 T6.3 三区域布局:左侧输入/中间编辑/右侧展示
- [ ] 7.4 T6.4 EventsBoard 组件:每章事件摘要列表(人物/事件/地点/冲突/情感转折),供作者核对 AI 理解
- [ ] 7.5 T6.5 AnalysisBoard 组件:4 张表渲染(总览卡/分集目录/钩子库/爽点兑现表)
- [ ] 7.6 T6.6 ReviewPanel 组件:5 维雷达图 + Top-3 问题清单(可点跳转)+ 修改建议(可一键采纳)
- [ ] 7.7 T6.7 ContinuityTimeline 组件:时间线展示人设/称呼/关键道具/伏笔 + 摘要层切换
- [ ] 7.8 T6.8 单集重生 + SSE 集成:POST /api/regenerate 调用 + SSE 进度条 + "AI 在思考"文案

## 8. 集成 + 文档(阶段 7)

- [ ] 8.1 T7.1 示例小说 + 集成测试:3 章示例小说 + Pipeline 端到端测试(mock LLM)
- [ ] 8.2 T7.2 README:项目说明 + "5 分钟跑起来"
- [ ] 8.3 T7.4 独立 Schema 文档拆分:新建 docs/yaml-schema-design.md、抽取 Schema 概要为完整字段定义、补全 9 条设计理由、补全 JSON Schema 约束(题目硬要求)

## 9. 参考与设计取舍文档(阶段 8)

- [ ] 9.1 T8.1 行业标杆方法论参考映射表:spec 末尾追加方法论清单
- [ ] 9.2 T8.2 工业级短剧工厂 4 项工程机制设计取舍:事件提取/工作区/上下文控制/连续性压缩的来源与取舍说明

## 10. 连续性摘要压缩(阶段 9)

- [ ] 10.1 T9.1 ContinuityCompressor:原始层→摘要层压缩逻辑(本地代码,无 LLM)、每 5-10 场生成状态摘要、单元测试(压缩后信息完整度 ≥ 90%)

## 11. 非功能 / 验收(阶段 10)

- [ ] 11.1 T10.1 非功能基线测试:性能基线(总时间 ≤ 90s/10章、首屏 ≤ 2s)、资源限制(LLM 并发 ≤ 2、workspace ≤ 50MB)、LLM 日志 ≤ 1MB/项目
- [ ] 11.2 T10.2 验收场景清单:"5 分钟跑起来"流程演练、"3 章小说→完整剧本+5 个 JSON"产物检查、4 项编辑能力可视化演示、6 类错误注入演示

## 12. 任务依赖关系

**关键路径**:阶段 0 → 阶段 1 → 阶段 2 → 阶段 3 → 阶段 4 → 阶段 5 → 阶段 6 → 阶段 7

**可并行项**:阶段 8 / 阶段 9 / 阶段 10 都可以在阶段 4 完成后并行启动(各自独立)。

## 13. 实现优先级(关键路径)

T0.2(Workspace) → T0.3(异常处理) → T0.6(LLM 日志) → T0.7(部署) → T2.5(Event 模型) → T4.0(Extractor) → T4.1(Analyzer 改读事件表) → T3.4(并发控制器) → T4.7(错误处理) → T4.8(错误注入测试) → T7.4(独立 Schema 文档)
