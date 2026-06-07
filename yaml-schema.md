# Novel2Script 剧本 YAML Schema 设计文档

> **版本**：v1.1 | **日期**：2026-06-07 | **状态**：已实现

---

## 1. 概述

本文档定义了 Novel2Script 系统输出的剧本 YAML Schema。Schema 是整个 AI 改编管线的核心数据契约——Writer Agent 按 Schema 生成剧本，Assembler 按 Schema 组装最终输出，Reviewer 按 Schema 执行质量校验，前端按 Schema 渲染编辑器。

**设计目标**：

- 机器可校验：通过 JSON Schema 自动验证输出完整性
- 人类可编辑：YAML 格式便于作者直接阅读和修改
- 行业可对接：字段命名和层级结构对齐影视剧本标准格式
- 渐进增强：v1.1 新增字段均为可选，v1.0 输出可无缝升级

---

## 2. 数据流与 Schema 的关系

Schema 不是孤立存在的，它在 5 阶段管线中承担数据契约的角色：

```
小说原文
  │
  ▼
┌──────────┐    events.json     ┌──────────┐    analysis.json
│ Extractor │ ─────────────────▶│ Analyzer │ ────────────────▶
│ (事件提取) │                   │ (改编分析) │
└──────────┘                    └──────────┘
                                      │
                                      ▼
                               ┌──────────┐    plan.json
                               │ Planner  │ ────────────────▶
                               │ (分集规划) │
                               └──────────┘
                                      │
                                      ▼
┌──────────┐   chapter_XX.yaml   ┌──────────┐    script.yaml (本Schema)
│ Continuity│◀──────────────────│  Writer  │ ──────────────────▶
│ (连续性)  │                    │ (剧本写作) │
└──────────┘                    └──────────┘
                                      │
                                      ▼
                               ┌──────────┐   review.json
                               │ Reviewer │ ────────────────▶ 前端展示
                               │ (质量审核) │
                               └──────────┘
```

- **Writer** 按 Schema 逐章输出 `chapter_XX.yaml`
- **Assembler** 将所有章节 YAML 组装为完整的 `script.yaml`（本 Schema 定义的结构）
- **Reviewer** 读取完整剧本执行四遍修改法审核
- **前端** 通过 `/api/projects/{id}/script` 获取 YAML 内容，在 ScriptEditor 中渲染

---

## 3. Schema 结构总览

```yaml
meta:                      # 剧本元信息
  title: string            # 剧本标题
  genre: string            # 题材类型（受控枚举）
  source_novel: string     # 原著名称
  total_episodes: int      # 总集数
  version: string          # Schema 版本号："1.0" | "1.1"
  analysis: object?        # [v1.1] 改编分析摘要

episodes:                  # 集列表
  - episode_number: int    # 集号（从1开始）
    title: string          # 集标题
    logline: string?       # 一句话概述
    scenes:                # 场景列表
      - scene_number: int       # 场景号（集内从1开始）
        location: string        # 场景地点（格式：内景/外景 - 地点）
        time_of_day: string?    # 时间段（受控枚举）
        beats:                  # 节拍列表
          - beat_phase: string?       # [v1.1] setup | confrontation | resolution
            description: string       # 节拍描述
            dialogues:                # 对话列表
              - character: string     # 角色名
                line: string          # 台词
                direction: string?    # 舞台指示/动作描述
            emotion_marker: string?   # [v1.1] 爽点 | 虐点 | 爆点 | 无
            conflict_type: string?    # [v1.1] 冲突类型（受控枚举）
        is_paywall: bool?             # [v1.1] 付费卡点标记
```

---

## 4. 字段定义

### 4.1 Meta（剧本元信息）

| 字段 | 类型 | 必填 | 默认值 | 版本 | 约束 | 说明 |
|------|------|------|--------|------|------|------|
| title | string | 是 | `""` | v1.0 | minLength: 1 | 剧本标题，由 Assembler 从小说标题或首行文本生成 |
| genre | string | 是 | `""` | v1.0 | 枚举值（见 §5.2） | 题材类型，由 Analyzer 识别 |
| source_novel | string | 是 | `""` | v1.0 | minLength: 1 | 原著小说名称 |
| total_episodes | int | 是 | `0` | v1.0 | minimum: 1 | 总集数，由 Assembler 根据实际生成的集数填写 |
| version | string | 是 | `"1.0"` | v1.0 | enum: ["1.0", "1.1"] | Schema 版本号。Pydantic 默认值为 `"1.0"`，Assembler 组装时显式设为 `"1.1"` |
| analysis | object | 否 | `null` | v1.1 | — | 改编分析摘要。代码中类型为 `Optional[dict]`，当前 Assembler 未自动嵌入此字段，输出为 null；后续版本可扩展为从 analysis.json 提取 |

> **注意**：
> 1. 代码中 `title`、`genre`、`source_novel` 的默认值为空字符串，但语义上这些是必填字段。Assembler 在组装时会从上游数据填充，空值表示上游数据缺失。
> 2. 代码中 `MetaInfo.analysis` 的类型为 `Optional[dict]`（而非 `Optional[Analysis]`），当前 Assembler 未将 `analysis.json` 嵌入此字段，输出中该字段为 `null`。Schema 预留此字段供后续版本使用，其子结构定义与 `Analysis` Pydantic 模型一致。

### 4.2 Meta.analysis 子结构 [v1.1]

由 Analyzer 阶段生成，Schema 预留此字段供 Assembler 将分析结果嵌入最终输出的 meta 中，为剧本提供创作背景。当前版本 Assembler 未自动嵌入此字段，输出为 null。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| genre | string | 是 | 题材分类 |
| orientation | string | 是 | 频向：男频 / 女频 / 通用 |
| sub_genres | string[] | 否 | 子题材标签列表 |
| conflict_pool | object | 否 | 冲突池 |
| satisfaction_pool | object | 否 | 爽点池 |
| characters | object[] | 否 | 角色档案列表 |
| naming_conventions | string[] | 否 | 称呼规范 |
| adaptation_strategy | string | 否 | 改编策略概述 |
| risks | object[] | 否 | 改编风险列表 |

**conflict_pool 子结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| core_conflicts | string[] | 核心冲突：贯穿全文的主线矛盾 |
| sub_conflicts | string[] | 阶段冲突：每集/每章的局部矛盾 |
| potential_conflicts | string[] | 潜在冲突：可挖掘但未展开的矛盾 |

**satisfaction_pool 子结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| points | string[] | 爽点列表 |
| fulfillments | object[] | 爽点兑现表 |

**fulfillment 子结构：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| point | string | 是 | 爽点名称 |
| name | string | 否 | 爽点别名 |
| method | string | 否 | 兑现方式 |
| episode | int? | 否 | 兑现时机（集号），minimum: 1 |
| status | string | 否 | 枚举：fulfilled / partial / pending |

**character 子结构：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 角色名 |
| role | string | 否 | 枚举：protagonist / antagonist / supporting |
| traits | string[] | 否 | 性格特质（3-5个关键词） |
| arc | string | 否 | 角色弧线概述 |
| titles | string[] | 否 | 称呼规范（不同身份下的称呼） |
| relationships | string[] | 否 | 关系网络（与其他角色的关系） |

**risk 子结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| risk | string | 风险描述 |
| mitigation | string | 缓解措施 |

### 4.3 Episode（集）

| 字段 | 类型 | 必填 | 默认值 | 版本 | 约束 | 说明 |
|------|------|------|--------|------|------|------|
| episode_number | int | 是 | `0` | v1.0 | minimum: 1 | 集号，从1开始 |
| title | string | 是 | `""` | v1.0 | minLength: 1 | 集标题 |
| logline | string | 否 | `""` | v1.0 | — | 一句话概述 |
| scenes | list | 是 | `[]` | v1.0 | minItems: 1 | 场景列表 |

### 4.4 Scene（场景）

| 字段 | 类型 | 必填 | 默认值 | 版本 | 约束 | 说明 |
|------|------|------|--------|------|------|------|
| scene_number | int | 是 | `0` | v1.0 | minimum: 1 | 场景号，集内从1开始 |
| location | string | 是 | `""` | v1.0 | 格式：`内景/外景 - 地点` | 场景地点 |
| time_of_day | string | 否 | `""` | v1.0 | 枚举值（见 §5.4） | 时间段 |
| beats | list | 是 | `[]` | v1.0 | — | 节拍列表，推荐1-3个 |
| is_paywall | bool | 否 | `null` | v1.1 | — | 付费卡点标记 |

**is_paywall 语义说明：**

| 值 | 含义 |
|----|------|
| `true` | 该场景结尾为付费卡点，观众需付费才能继续观看 |
| `false` | 该场景明确不是付费卡点 |
| `null` | 未标注，由作者后续决定 |

### 4.5 Beat（节拍）

| 字段 | 类型 | 必填 | 默认值 | 版本 | 约束 | 说明 |
|------|------|------|--------|------|------|------|
| beat_phase | string | 否 | `null` | v1.1 | 枚举值（见 §5.1） | 节拍阶段 |
| description | string | 是 | `""` | v1.0 | minLength: 1 | 节拍描述，须具体到人物动作和表情 |
| dialogues | list | 否 | `[]` | v1.0 | — | 对话列表 |
| emotion_marker | string | 否 | `null` | v1.1 | 枚举值（见 §5.3） | 情绪标记 |
| conflict_type | string | 否 | `null` | v1.1 | 枚举值（见 §5.5） | 冲突类型 |

### 4.6 Dialogue（对话）

| 字段 | 类型 | 必填 | 默认值 | 版本 | 约束 | 说明 |
|------|------|------|--------|------|------|------|
| character | string | 是 | `""` | v1.0 | minLength: 1 | 角色名，须与 meta.analysis.characters 中的名称一致 |
| line | string | 是 | `""` | v1.0 | minLength: 1 | 台词内容，建议不超过30字（Reviewer 第三遍对话审查会标记超过30字的台词） |
| direction | string | 否 | `""` | v1.0 | — | 舞台指示/动作描述 |

---

## 5. 枚举值定义

以下字段采用受控枚举值，确保 AI 输出一致性、前端可按类型筛选统计、Reviewer 可自动校验。

### 5.1 beat_phase（节拍阶段）

| 值 | 说明 |
|----|------|
| setup | 铺垫阶段：建立场景、引入角色、设置情境 |
| confrontation | 对抗阶段：冲突爆发、矛盾激化、信息揭露 |
| resolution | 解决阶段：冲突暂缓、做出决定、场景收束 |

**设计原因**：三幕式结构（setup → confrontation → resolution）是影视剧本最经典的叙事模型。标注节拍阶段使得作者可以快速审视场景的叙事节奏，避免"全是对抗没有铺垫"或"全是铺垫没有高潮"的结构失衡。Reviewer 在结构审查（第一遍）中会检查每集是否包含完整的 setup → confrontation → resolution 序列。

### 5.2 genre（题材类型）

| 值 | 说明 | 典型爽点 |
|----|------|----------|
| 都市 | 现代都市题材 | 身份逆袭、打脸 |
| 玄幻 | 修仙/武道/奇幻 | 境界突破、以弱胜强 |
| 末世 | 末世/废土/生存 | 信息差逆袭、资源争夺 |
| 悬疑推理 | 推理/悬疑/破案 | 真相揭露、反转 |
| 古装 | 古代/宫廷/武侠 | 宫斗逆袭、权力更替 |
| 女频 | 甜宠/虐恋/宫斗/逆袭 | 宠爱、身份逆袭 |
| 男频 | 升级/打脸/热血 | 装逼打脸、升级 |
| 科幻 | 未来/太空/赛博朋克 | 技术碾压、认知颠覆 |

**设计原因**：题材类型直接影响分集策略、节奏模板和爽点设计。例如末世题材偏重生存压力和资源冲突，女频偏重情感纠葛和身份逆袭。将 genre 设为受控枚举而非自由文本，使得 Writer Agent 能根据题材自动加载对应的创作参考（`references/12-genre-specific-techniques.md`）。

### 5.3 emotion_marker（情绪标记）

| 值 | 说明 | 来源 |
|----|------|------|
| 爽点 | 观众获得满足感、快感的时刻（如主角逆袭、真相大白） | 爽点 = 装 + 打脸 + 震惊 + 收获 |
| 虐点 | 观众感到心疼、揪心的时刻（如角色受难、情感分离） | 关系越紧密虐感越强 |
| 爆点 | 情绪突然爆发的时刻（如反转揭露、震撼登场） | 第一时间勾起观众情绪 |
| 无 | 该节拍无明显情绪标记，属于过渡或铺垫 | — |

**设计原因**：短剧的核心驱动力是情绪节奏。爽点/虐点/爆点的分类来源于网文和短剧行业的创作实践（详见 `references/14-story-psychology.md`），帮助作者和运营团队快速定位每集的情绪分布。Writer Prompt 中硬性要求"每集必须覆盖爆点/虐点/爽点中至少一个"。设为枚举而非自由文本，是为了支持前端按类型筛选统计，以及 Reviewer 自动检查情绪节奏。

### 5.4 time_of_day（时间段）

| 值 | 说明 |
|----|------|
| 日 | 白天场景 |
| 夜 | 夜晚场景 |
| 黄昏 | 黄昏/傍晚场景 |
| 黎明 | 黎明/清晨场景 |
| 晨 | 上午场景 |

**设计原因**：影视剧本的场景头（slugline）必须标注时间，这是行业惯例。采用中文枚举值而非英文（Day/Night/Dusk），是因为本工具面向中文创作者。内景和外景的区分直接影响灯光、拍摄周期和预算安排。

### 5.5 conflict_type（冲突类型）

| 值 | 说明 |
|----|------|
| 人际冲突 | 角色之间的对抗、争执、利益冲突 |
| 内心冲突 | 角色内心的纠结、抉择、自我怀疑 |
| 环境冲突 | 角色与外部环境的对抗（自然、社会规则等） |
| 信息冲突 | 信息不对称引发的矛盾（谎言、秘密、误解） |
| 威胁冲突 | 角色面临人身安全或利益威胁 |
| 目标设立 | 角色确立新目标，驱动后续行动 |
| 人与环境 | 角色与物理/社会环境之间的摩擦 |
| 未知冲突 | 冲突性质尚未明确，留待后续展开 |

**设计原因**：冲突是戏剧的核心引擎。对冲突类型进行分类，帮助作者在全局视角审视冲突分布，避免"全是人际冲突缺乏内心戏"的问题。`未知冲突`是一个特殊值，允许作者先标注冲突存在而不必立即分类，鼓励后续回填。

### 5.6 其他枚举值

**meta.analysis.orientation（频向）：**

| 值 | 说明 |
|----|------|
| 男频 | 以升级打怪、装逼打脸为主 |
| 女频 | 以情感纠葛、身份逆袭为主 |
| 通用 | 男女频特征均有或不易区分 |

**meta.analysis.character.role（角色定位）：**

| 值 | 说明 |
|----|------|
| protagonist | 主角 |
| antagonist | 对手/反派 |
| supporting | 配角 |

**meta.analysis.fulfillment.status（爽点兑现状态）：**

| 值 | 说明 |
|----|------|
| fulfilled | 已兑现 |
| partial | 部分兑现 |
| pending | 未兑现 |

---

## 6. 完整示例

以下为一个包含 2 集、每集 2 个场景的完整剧本 YAML，展示了所有字段（含 v1.1 新增字段）的实际用法。注意：当前版本 Assembler 输出中 `meta.analysis` 为 null，示例中展示的是 Schema 完整定义的预期结构：

```yaml
meta:
  title: 雨夜来电
  genre: 悬疑推理
  source_novel: 雨夜来电
  total_episodes: 10
  version: '1.1'
  analysis:
    genre: 悬疑推理
    orientation: 男频
    sub_genres:
      - 都市悬疑
      - 推理解谜
    conflict_pool:
      core_conflicts:
        - 妹妹坠楼真相未明
      sub_conflicts:
        - 神秘人身份之谜
        - 警方调查受阻
      potential_conflicts:
        - 林舟与旧友的信任危机
    satisfaction_pool:
      points:
        - 真相揭露
        - 反击复仇
        - 神秘人身份揭晓
      fulfillments:
        - point: 真相揭露
          name: 坠楼真相
          method: 烂尾楼发现关键证据
          episode: 5
          status: pending
        - point: 反击复仇
          name: 林舟反击
          method: 掌握证据后正面交锋
          episode: 8
          status: pending
    characters:
      - name: 林舟
        role: protagonist
        traits:
          - 执着
          - 冷静
          - 重感情
        arc: 从麻木到觉醒，最终追寻真相
        titles:
          - 林先生
        relationships:
          - 与妹妹林薇：兄妹情深
          - 与神秘人：被引导者
      - name: 神秘人
        role: antagonist
        traits:
          - 神秘
          - 压迫感
          - 目的不明
        arc: 从幕后操控到身份揭露
        titles: []
        relationships:
          - 与林舟：引导者与被引导者
    adaptation_strategy: 以悬疑推理为主线，每集设置一个核心悬念，逐步揭露真相
    risks:
      - risk: 悬疑线过于复杂导致观众流失
        mitigation: 每集至少一个小真相揭露，保持观众获得感

episodes:
  - episode_number: 1
    title: 凌晨两点的来电
    logline: 加班到凌晨的林舟，接到一个神秘来电，对方只说了一句话——你妹妹不是自杀。
    scenes:
      - scene_number: 1
        location: 外景 - 城市地下车库
        time_of_day: 夜
        beats:
          - beat_phase: setup
            description: 凌晨两点，暴雨如注。林舟拖着疲惫的身体走进空旷的地下车库，灯光忽明忽暗，潮湿的水泥地上倒映着他孤单的影子。
            dialogues:
              - character: 林舟
                line: （低声自语）终于结束了……
                direction: 脚步沉重，眼睛布满血丝
            emotion_marker: 无
            conflict_type: 环境冲突
          - beat_phase: confrontation
            description: 林舟刚走到车旁，手机突然震动。屏幕上跳出一个没有备注的陌生号码。电话执拗地响个不停，在空旷的车库里格外刺耳。
            dialogues:
              - character: 林舟
                line: 喂？
                direction: 犹豫了一下，按下接听键
            emotion_marker: 爆点
            conflict_type: 未知冲突
          - beat_phase: resolution
            description: 电话那头沉默了几秒，一个低沉的男声缓缓响起。对方说完便挂断了电话，忙音在空旷的车库里回荡。
            dialogues:
              - character: 神秘人
                line: （低沉）你妹妹不是自杀。
                direction: 声音沙哑，带着一丝压迫感
              - character: 林舟
                line: 你是谁？！
                direction: 压低声音，身体瞬间绷紧
              - character: 神秘人
                line: （轻笑）三年前，她坠楼的那栋烂尾楼。明天晚上八点，来。
                direction: 说完立即挂断
            emotion_marker: 爆点
            conflict_type: 信息冲突
        is_paywall: null
      - scene_number: 2
        location: 内景 - 地下车库
        time_of_day: 夜
        beats:
          - beat_phase: setup
            description: 林舟呆呆地站在原地，手机屏幕还亮着。他低头看着屏幕，那串地址赫然是——三年前妹妹坠楼的那栋烂尾楼。他的手开始微微颤抖。
            dialogues:
              - character: 林舟
                line: （喃喃自语）不是自杀……不是自杀……
                direction: 眼神从震惊转为痛苦，再到坚定
            emotion_marker: 虐点
            conflict_type: 内心冲突
          - beat_phase: confrontation
            description: 林舟猛地抬头，快步走向自己的车。手机突然又震动——是一条新短信。他低头一看，瞳孔骤缩。
            dialogues:
              - character: 林舟
                line: （咬牙）别报警……否则我也会死？
                direction: 盯着屏幕，眼神变得锐利
            emotion_marker: 爽点
            conflict_type: 威胁冲突
          - beat_phase: resolution
            description: 林舟深吸一口气，将手机放进口袋。他没有报警，而是坐进驾驶座，发动了车。引擎轰鸣声中，他看向后视镜，眼神里多了一丝从未有过的决绝。
            dialogues:
              - character: 林舟
                line: （OS）三年了……我终于等到这一天。
                direction: 双手紧握方向盘，目光如炬
            emotion_marker: 爽点
            conflict_type: 目标设立
        is_paywall: true
  - episode_number: 2
    title: 烂尾楼的秘密
    logline: 林舟独自探访城郊烂尾楼，发现血迹和刻痕，却感到被无形的眼睛注视。
    scenes:
      - scene_number: 1
        location: 外景 - 城郊 - 烂尾楼外围
        time_of_day: 日
        beats:
          - beat_phase: setup
            description: 天色阴沉，林舟的黑色轿车停在烂尾楼前。他下车，目光扫过锈蚀的铁门和风中飘动的警示条，表情冷静但眼神锐利。
            dialogues:
              - character: 林舟
                line: （低声自语）锁得再严，总有漏网的地方。
                direction: 他拍了拍手上的灰，抬头望向楼体
            emotion_marker: 无
            conflict_type: 人与环境
        is_paywall: null
      - scene_number: 2
        location: 内景 - 烂尾楼 - 楼梯间
        time_of_day: 日
        beats:
          - beat_phase: setup
            description: 林舟踩着破碎的水泥台阶向上走，每一步都发出清脆的断裂声。灰尘在昏暗光线中飞舞，空气沉闷。
            dialogues: []
            emotion_marker: 无
            conflict_type: 环境冲突
          - beat_phase: confrontation
            description: 他停在七层的标识前，注意到墙上有一道浅浅的刻痕——一个歪歪扭扭的"薇"字。他的瞳孔猛地收缩。
            dialogues:
              - character: 林舟
                line: （颤抖）小薇……你来过这里？
                direction: 手指抚过刻痕，指尖微微颤抖
            emotion_marker: 虐点
            conflict_type: 信息冲突
          - beat_phase: resolution
            description: 林舟蹲下身，在角落发现了一小块暗红色的痕迹。他用手帕小心地刮了一点，放进随身带的密封袋。身后传来细微的响动——像是什么人踩到了碎石。
            dialogues:
              - character: 林舟
                line: （猛然回头）谁？！
                direction: 身体瞬间绷紧，目光扫向楼梯深处
            emotion_marker: 爆点
            conflict_type: 未知冲突
        is_paywall: false
```

---

## 7. 校验规则

Schema 的校验分两个层次执行：

### 7.1 结构校验（JSON Schema 自动校验）

通过 §8 的 JSON Schema 定义，自动校验字段类型、必填性、枚举值合法性。代码中 `assembler.py` 的 `_parse_episode_yaml()` 方法负责将 YAML 解析为 Pydantic 模型，Pydantic 会自动执行类型校验。

### 7.2 业务校验（Reviewer Quality Gates）

Reviewer 在四遍修改法之外，还执行 6 项质量门禁检查：

| 门禁 | 规则 | 对应 Schema 字段 |
|------|------|-----------------|
| Gate 1 | 至少3集 | `episodes` minItems |
| Gate 2 | 每集至少1个场景 | `episode.scenes` minItems |
| Gate 3 | 存在对话 | `dialogues` 非空 |
| Gate 4 | 无空集 | `episode.scenes` 非空 |
| Gate 5 | 引用一致性：对话中的角色名须在 analysis.characters 中定义 | `dialogue.character` ↔ `meta.analysis.characters[].name` |
| Gate 6 | 连续性校验：连续性记录中的集号须在剧本中存在 | `continuity.raw[].episode` ↔ `episodes[].episode_number` |

### 7.3 写作规范校验（四遍修改法）

| 遍次 | 聚焦维度 | 涉及 Schema 字段 |
|------|----------|-----------------|
| 第一遍 | 结构审查 | `beat_phase` 序列完整性、`logline` 存在性 |
| 第二遍 | 角色审查 | `character` 名称一致性、`titles` 称呼统一 |
| 第三遍 | 对话审查 | `line` 长度（≤30字）、`direction` 与 `line` 协调 |
| 第四遍 | 细节审查 | `is_paywall` 位置、`emotion_marker` 分布、`conflict_type` 多样性 |

---

## 8. JSON Schema 约束

以下为 Schema v1.1 的完整 JSON Schema 定义，可用于自动校验：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Novel2Script",
  "description": "Novel2Script 剧本 YAML Schema v1.1",
  "type": "object",
  "required": ["meta", "episodes"],
  "additionalProperties": false,
  "properties": {
    "meta": {
      "type": "object",
      "required": ["title", "genre", "source_novel", "total_episodes", "version"],
      "additionalProperties": false,
      "properties": {
        "title": { "type": "string", "minLength": 1, "description": "剧本标题" },
        "genre": {
          "type": "string",
          "enum": ["都市", "玄幻", "末世", "悬疑推理", "古装", "女频", "男频", "科幻"],
          "description": "题材类型"
        },
        "source_novel": { "type": "string", "minLength": 1, "description": "原著小说名称" },
        "total_episodes": { "type": "integer", "minimum": 1, "description": "总集数" },
        "version": { "type": "string", "enum": ["1.0", "1.1"], "description": "Schema版本号" },
        "analysis": {
          "type": "object",
          "additionalProperties": false,
          "required": ["genre", "orientation"],
          "properties": {
            "genre": { "type": "string", "description": "题材分类" },
            "orientation": {
              "type": "string",
              "enum": ["男频", "女频", "通用"],
              "description": "频向"
            },
            "sub_genres": {
              "type": "array",
              "items": { "type": "string" },
              "description": "子题材标签"
            },
            "conflict_pool": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "core_conflicts": { "type": "array", "items": { "type": "string" } },
                "sub_conflicts": { "type": "array", "items": { "type": "string" } },
                "potential_conflicts": { "type": "array", "items": { "type": "string" } }
              }
            },
            "satisfaction_pool": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "points": { "type": "array", "items": { "type": "string" } },
                "fulfillments": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "point": { "type": "string" },
                      "name": { "type": "string" },
                      "method": { "type": "string" },
                      "episode": { "type": "integer", "minimum": 1 },
                      "status": { "type": "string", "enum": ["fulfilled", "partial", "pending"] }
                    }
                  }
                }
              }
            },
            "characters": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": ["name"],
                "properties": {
                  "name": { "type": "string" },
                  "role": { "type": "string", "enum": ["protagonist", "antagonist", "supporting"] },
                  "traits": { "type": "array", "items": { "type": "string" } },
                  "arc": { "type": "string" },
                  "titles": { "type": "array", "items": { "type": "string" } },
                  "relationships": { "type": "array", "items": { "type": "string" } }
                }
              }
            },
            "naming_conventions": {
              "type": "array",
              "items": { "type": "string" },
              "description": "称呼规范"
            },
            "adaptation_strategy": { "type": "string" },
            "risks": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "risk": { "type": "string" },
                  "mitigation": { "type": "string" }
                }
              }
            }
          }
        }
      }
    },
    "episodes": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["episode_number", "title", "scenes"],
        "additionalProperties": false,
        "properties": {
          "episode_number": { "type": "integer", "minimum": 1 },
          "title": { "type": "string", "minLength": 1 },
          "logline": { "type": "string" },
          "scenes": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["scene_number", "location"],
              "additionalProperties": false,
              "properties": {
                "scene_number": { "type": "integer", "minimum": 1 },
                "location": { "type": "string", "minLength": 1, "pattern": "^(内景|外景)\\s*-\\s*.+$" },
                "time_of_day": {
                  "type": "string",
                  "enum": ["日", "夜", "黄昏", "黎明", "晨"]
                },
                "is_paywall": { "type": "boolean" },
                "beats": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["description"],
                    "additionalProperties": false,
                    "properties": {
                      "beat_phase": {
                        "type": "string",
                        "enum": ["setup", "confrontation", "resolution"]
                      },
                      "description": { "type": "string", "minLength": 1 },
                      "emotion_marker": {
                        "type": "string",
                        "enum": ["爽点", "虐点", "爆点", "无"]
                      },
                      "conflict_type": {
                        "type": "string",
                        "enum": ["人际冲突", "内心冲突", "环境冲突", "信息冲突", "威胁冲突", "目标设立", "人与环境", "未知冲突"]
                      },
                      "dialogues": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "required": ["character", "line"],
                          "additionalProperties": false,
                          "properties": {
                            "character": { "type": "string", "minLength": 1 },
                            "line": { "type": "string", "minLength": 1 },
                            "direction": { "type": "string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 9. 设计理由

### 9.1 为什么用 YAML 而非 JSON？

YAML 更适合人工阅读和编辑。剧本创作是创意工作，作者需要频繁阅读和修改剧本内容。YAML 的缩进格式比 JSON 的花括号更清晰，注释支持也便于作者做笔记。同时，YAML 可以直接被 Monaco Editor 等代码编辑器高亮显示，兼顾了可编辑性。前端通过 `yaml.dump()` / `yaml.safe_load()` 完成序列化与反序列化。

### 9.2 为什么采用 Episode → Scene → Beat → Dialogue 四级结构？

这四级结构对应了影视剧本的标准层级：一集包含多个场景，一个场景包含多个戏剧节拍，一个节拍包含多句对话。这种层级关系与导演和编剧的工作方式完全一致，便于从宏观（集）到微观（台词）的导航和编辑。在代码中，这四级分别对应 `schemas.py` 的 `Episode` → `Scene` → `Beat` → `Dialogue` 四个 Pydantic 模型。

### 9.3 为什么 beat_phase 是可选字段？

beat_phase 是 v1.1 新增字段，用于标注节拍在三幕式结构中的位置。v1.0 不包含此字段，为保持向后兼容性设为可选。Writer Prompt 中已要求 AI 自动填充此字段，但旧版剧本仍可正常解析。

### 9.4 为什么 emotion_marker 和 conflict_type 是可选字段？

这两个字段用于增强剧本的结构化信息，帮助作者快速定位情绪高潮和冲突点。但它们不是剧本的必要信息——一个没有标注情绪和冲突类型的剧本仍然是完整可用的。设为可选确保了 Schema 的渐进增强特性，同时 Writer Prompt 中已硬性要求"每集必须覆盖爆点/虐点/爽点中至少一个"。

### 9.5 为什么 is_paywall 在 Scene 级别而非 Episode 级别？

付费卡点通常设在某个场景的结尾处（"欲知后事如何，请付费观看"），而非整集。将 is_paywall 放在 Scene 级别可以精确控制付费断点位置，更符合短剧的实际运营需求。根据 `references/14-story-psychology.md` 的付费转化心理模型，最佳卡点位置是"悬念高峰期"，这通常是某个场景的结尾而非整集的结尾。

### 9.6 为什么 direction 字段在 Dialogue 中而非 Beat 级别？

direction（舞台指示）与对话紧密关联，放在 Dialogue 内部而非 Beat 级别，是因为舞台指示通常描述的是说话时的动作（如"他握紧了拳头"），与台词是同一个表达单元。这种设计也与 Final Draft 等专业剧本软件一致。

### 9.7 为什么 meta.analysis 是可选的？

meta.analysis 包含改编分析的摘要信息，是 v1.1 新增字段。它为剧本提供了创作背景信息，但不是剧本本身的必要内容。设为可选确保 v1.0 剧本可以无缝升级到 v1.1。当前版本 Assembler 未自动将 `analysis.json` 嵌入此字段（输出为 null），Schema 预留此字段供后续版本扩展。

### 9.8 为什么 episode_number 从 1 开始而非 0？

影视行业的惯例是集号从 1 开始计数（第1集、第2集），而非编程的从 0 开始。这确保了剧本对非技术背景的创作者更友好，减少沟通成本。

### 9.9 为什么 logline 是可选的？

logline（一句话概述）是编剧工具中的常见概念，但不是每集都必须有。在快速迭代阶段，作者可能先写场景再补概述。设为可选降低了创作门槛，同时鼓励作者后续补充以提升剧本可读性。

### 9.10 为什么 emotion_marker 使用枚举值而非自由文本？

爽点/虐点/爆点是短剧行业的标准情绪分类，具有明确的创作含义（详见 `references/14-story-psychology.md`）。使用枚举值有三个好处：一是保证标注一致性，避免不同 AI 调用用不同词汇描述同一种情绪；二是支持前端按类型筛选和统计（如"本集有几个爽点"）；三是便于 Reviewer 在第四遍（细节审查）中自动检查情绪节奏是否合理。`无`作为特殊值，用于标注无明显情绪的过渡节拍，避免字段缺失导致的歧义。

### 9.11 为什么 location 格式为"内景/外景 - 地点"？

"内景/外景 - 具体地点"是影视剧本场景头（slugline）的标准格式（INT./EXT. - Location）。这种格式让导演和制片在前期勘景时一眼就能判断场景类型和地点，是行业通用惯例。内景和外景的区分直接影响灯光、拍摄周期和预算安排。JSON Schema 中通过 `pattern: "^(内景|外景)\\s*-\\s*.+$"` 约束此格式。

### 9.12 为什么 conflict_type 包含"未知冲突"这个值？

在剧本创作过程中，有些冲突的性质在当前节拍中尚未完全展现（如神秘人打来电话，冲突性质暂时不明）。"未知冲突"作为一个合法枚举值，允许作者先标注冲突存在而不必立即分类，避免因"没有合适的分类"而跳过标注。这也鼓励作者在后续迭代中回填更精确的类型。

### 9.13 为什么 Dialogues 是列表而非单条对话？

一个节拍中通常包含多轮对话（如角色A说一句、角色B回一句）。将 Dialogues 设计为列表，可以自然地表达对话的交替顺序，同时保持节拍作为叙事单元的完整性。当节拍只有动作描述没有对话时，Dialogues 为空列表即可。

### 9.14 为什么 meta.analysis 中包含 satisfaction_pool？

爽点是短剧的核心卖点。将爽点池嵌入 meta.analysis，使得每个爽点都有明确的兑现方式和兑现时机。这帮助作者在全局视角追踪爽点的兑现进度，避免"承诺了爽点却忘记兑现"或"爽点扎堆在同一集"的问题。Reviewer 在第四遍（细节审查）中会检查爽点兑现的完整性。

### 9.15 为什么 version 字段使用字符串而非数字？

版本号如"1.0"、"1.1"包含主版本和次版本信息，字符串格式比纯数字更具表达力。同时，YAML 中的 `1.0` 会被解析为浮点数，加引号写成 `'1.0'` 又增加了出错概率。显式声明为字符串类型，配合 JSON Schema 的 enum 约束，确保版本号格式一致。

### 9.16 为什么 is_paywall 允许 null / false / true 三种值而非仅布尔？

三值设计比简单布尔更精确：`true` 表示"此处是付费卡点"，`false` 表示"此处明确不是付费卡点"，`null` 表示"未决定"。这种区分让 Reviewer 可以区分"作者已确认不是卡点"和"作者还没标注"两种状态，避免误报。

---

## 10. 版本演进

| 版本 | 变更 | 向后兼容 |
|------|------|----------|
| v1.0 | 初始版本：meta + episodes + scenes + beats + dialogues | — |
| v1.1 | 新增 beat_phase, emotion_marker, conflict_type, is_paywall, meta.analysis | 是 |

v1.1 的所有新增字段均为可选，v1.0 的剧本可以无缝升级到 v1.1 解析。

---

## 11. 与代码的映射关系

| Schema 结构 | Pydantic 模型 | 代码位置 |
|-------------|--------------|----------|
| Script（顶层） | `Script` | `app/schemas.py` |
| Meta | `MetaInfo` | `app/schemas.py` |
| Episode | `Episode` | `app/schemas.py` |
| Scene | `Scene` | `app/schemas.py` |
| Beat | `Beat` | `app/schemas.py` |
| Dialogue | `Dialogue` | `app/schemas.py` |
| Analysis | `Analysis`（注：`MetaInfo.analysis` 实际类型为 `Optional[dict]`） | `app/schemas.py` |
| CharacterProfile | `CharacterProfile` | `app/schemas.py` |
| ConflictPool | `ConflictPool` | `app/schemas.py` |
| SatisfactionPool | `SatisfactionPool` | `app/schemas.py` |
| Fulfillment | `SatisfactionFulfillment` | `app/schemas.py` |
| Risk | `AdaptationRisk` | `app/schemas.py` |

| 管线阶段 | 输入 | 输出 | 代码位置 |
|----------|------|------|----------|
| Writer | analysis + plan + chapter | chapter_XX.yaml | `app/pipeline/writer.py` |
| Assembler | chapter_XX.yaml × N | script.yaml | `app/pipeline/assembler.py` |
| Reviewer | script.yaml + continuity | review.json | `app/pipeline/reviewer.py` |
