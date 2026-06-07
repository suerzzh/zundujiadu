# 剧本人AI- AI剧本创作助手

> 将中文小说自动转换为结构化影视剧本，基于 LLM 驱动的多阶段 Pipeline

## Demo 视频

[点击观看 Demo 视频](<!-- https://www.douyin.com/video/7648678675810951409 -->)
https://www.douyin.com/video/7648678675810951409

---

## 项目简介

剧本人AI- AI剧本创作助手 是一款 AI 辅助剧本创作工具，旨在打通"小说 → 影视剧本初稿"的转换链路。用户上传中文小说文本后，系统通过 5 阶段 Pipeline 自动完成事件提取、改编分析、分集规划、剧本撰写和审核校验，最终输出可编辑的结构化 YAML 剧本。

### 核心价值

- **降低专业门槛**：无需影视剧本格式专业知识，AI 自动生成符合行业规范的场景标题、动作描述、对白格式
- **提升改编效率**：自动逐章处理，支持并发调用 LLM，10 章小说端到端转换约 5 分钟
- **可编辑可打磨**：输出结构化 YAML 剧本，内置在线编辑器，支持单集重新生成

---

## 功能特性

- 支持 `.txt` / `.docx` 格式中文小说上传，自动识别章节并切分
- 5 阶段 AI Pipeline：事件提取 → 改编分析 → 分集规划 → 剧本撰写 → 审核校验
- SSE 实时流式进度推送，前端可视化展示处理状态
- 内置 Monaco 剧本编辑器，支持在线修改与保存
- 事件核对、改编分析、情绪曲线、节奏预警等可视化面板
- 单集重新生成 & 失败阶段重试
- 全部 Pipeline 产物一键导出（ZIP）
- Docker 一键部署

---

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  LandingPage / UploadPanel / ScriptEditor / ...    │
└──────────────────────┬──────────────────────────────┘
                       │ SSE + REST API
┌──────────────────────▼──────────────────────────────┐
│                 Backend (FastAPI)                    │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           Pipeline Orchestrator               │   │
│  │  Extractor → Analyzer → Planner → Writer     │   │
│  │                    → Reviewer + Assembler     │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  LLM Client (DeepSeek)  │  Workspace Manager       │
│  SQLite + SQLAlchemy    │  Chapter Splitter         │
└──────────────────────────────────────────────────────┘
```

### Pipeline 阶段说明

| 阶段 | Agent                | 输入        | 输出          | 说明                         |
| ---- | -------------------- | ----------- | ------------- | ---------------------------- |
| 0    | Extractor            | 小说章节    | events.json   | 提取关键事件、角色、地点     |
| 1    | Analyzer             | 事件数据    | analysis.json | 改编可行性分析与策略         |
| 2    | Planner              | 分析结果    | plan.json     | 分集规划、情绪曲线、节奏预警 |
| 3    | Writer               | 规划 + 章节 | script.yaml   | 逐集撰写结构化剧本           |
| 4    | Reviewer + Assembler | 剧本        | review.json   | 审核校验与最终组装           |

---

## 技术栈

| 层级     | 技术                                                 |
| -------- | ---------------------------------------------------- |
| 后端     | Python 3.11+, FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| LLM      | DeepSeek API (兼容 OpenAI SDK 格式)                  |
| 前端     | React 18, Zustand, Monaco Editor, Recharts, Vite     |
| 部署     | Docker, Docker Compose, Nginx                        |
| 数据库   | SQLite                                               |
| 数据格式 | YAML (剧本), JSON (中间产物)                         |

---

## 快速开始

### 环境要求

- Python >= 3.11
- Node.js >= 18
- DeepSeek API Key

### 方式一：本地开发

**1. 克隆仓库**

```bash
git clone https://github.com/<your-username>/novel2script.git
cd novel2script
```

**2. 配置环境变量**

```bash
cp .env.example .env
# 编辑 .env，填入你的 DEEPSEEK_API_KEY
```

**3. 启动后端**

```bash
pip install -e .
python run.py
```

后端运行在 `http://localhost:8000`

**4. 启动前端**

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5173`

### 方式二：Docker 部署

```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 DEEPSEEK_API_KEY

# 一键启动
docker-compose up -d
```

访问 `http://localhost:3000`

---

## 项目结构

```
novel2script/
├── app/                        # 后端应用
│   ├── main.py                 # FastAPI 入口 & API 路由
│   ├── config.py               # 环境变量配置
│   ├── models.py               # 数据库模型
│   ├── schemas.py              # Pydantic 数据模型
│   ├── llm_client.py           # LLM API 客户端
│   ├── llm_logger.py           # LLM 调用日志 & 成本统计
│   ├── chapter_splitter.py     # 章节自动切分
│   ├── workspace.py            # 项目工作区管理
│   ├── validation.py           # 输入校验
│   ├── concurrency.py          # 并发控制
│   ├── pipeline/               # Pipeline 核心
│   │   ├── orchestrator.py     # 流程编排器
│   │   ├── extractor.py        # 事件提取 
│   │   ├── analyzer.py         # 改编分析 
│   │   ├── planner.py          # 分集规划 
│   │   ├── writer.py           # 剧本撰写 
│   │   ├── reviewer.py         # 审核校验 
│   │   ├── assembler.py        # 剧本组装器
│   │   ├── retry.py            # 重试机制
│   │   └── base.py             # 基类
│   ├── prompts/                # Prompt 模板 (Markdown)
│   └── references/             # 参考知识库
├── frontend/                   # 前端应用
│   ├── src/                    # React 组件
│   ├── public/assets/          # 静态资源
│   ├── Dockerfile              # 前端 Docker 构建
│   └── nginx.conf              # Nginx 反向代理配置
├── product-prototype/          # 产品原型 (Figma 导出)
├── docs/                       # 文档
├── docker-compose.yml          # Docker Compose 编排
├── Dockerfile                  # 后端 Docker 构建
├── pyproject.toml              # Python 项目配置
├── .env.example                # 环境变量模板
└── run.py                      # Uvicorn 启动入口
```

---

## API 概览

| 方法 | 路径                                | 说明                            |
| ---- | ----------------------------------- | ------------------------------- |
| POST | `/api/projects/upload`              | 上传小说文件，创建项目          |
| GET  | `/api/projects/{id}/convert/stream` | 启动 Pipeline，SSE 流式返回进度 |
| POST | `/api/projects/{id}/regenerate`     | 重新生成指定集                  |
| POST | `/api/projects/{id}/retry/{stage}`  | 重试失败阶段                    |
| GET  | `/api/projects/{id}/events`         | 获取事件提取结果                |
| GET  | `/api/projects/{id}/analysis`       | 获取改编分析结果                |
| GET  | `/api/projects/{id}/plan`           | 获取分集规划结果                |
| GET  | `/api/projects/{id}/review`         | 获取审核报告                    |
| GET  | `/api/projects/{id}/script`         | 获取最终剧本 YAML               |
| PUT  | `/api/projects/{id}/script`         | 保存编辑后的剧本                |
| GET  | `/api/projects/{id}/export`         | 导出全部产物 (ZIP)              |
| GET  | `/api/health`                       | 健康检查                        |

---

## 分支与团队

| 分支名       | 负责人 |
| ------------ | ------ |
| feature-zmw  | 智明威 |
| feature-zhan | 占付龙 |

---

## License

MIT