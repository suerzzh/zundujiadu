# novel2script YAML Schema 设计文档

**Schema 版本：** 1.0  
**日期：** 2026-06-05

---

## 1. 完整 Schema 示例

```yaml
schema_version: "1.0"

meta:
  title: "星河往事"
  logline: "太空移民时代，一名普通工程师意外卷入星际政治阴谋，被迫踏上拯救母星之路。"
  genre: "科幻/冒险"
  source: "《星河往事》全文.txt"
  total_chapters: 12
  total_scenes: 47
  generated_at: "2026-06-05T14:30:00+08:00"

characters:
  - name: "陈默"
    description: "男主角，34岁，星联第七工程站维修工程师，沉默寡言，技术极强。"
  - name: "林晓"
    description: "女主角，29岁，星联情报局特工，以记者身份作为掩护。"
  - name: "总督卡赛"
    description: "反派，星联第七星区总督，野心勃勃，策划叛乱。"

scenes:
  - scene_number: 1
    source_chapter: 1
    slugline: "外景 — 第七工程站外壁 — 日（太空）"
    summary: "陈默在站外执行例行维修任务，收到母星发来的神秘加密信号。"
    characters:
      - "陈默"
    action: |
      漆黑的宇宙中，第七工程站庞大的金属外壁延伸至画面边缘。
      陈默身着厚重的舱外作业服，沿磁力轨道缓缓移动，手持焊接设备检修外壁裂缝。
      头盔 HUD 上，一串来自母星方向的异常信号突然闪烁。
    dialogue:
      - character: "陈默"
        parenthetical: "自言自语，皱眉"
        line: "这个频段……已经停播三十年了。"
    transition: "CUT TO"

  - scene_number: 2
    source_chapter: 1
    slugline: "内景 — 第七工程站 控制室 — 日"
    summary: "陈默向值班长汇报异常信号，被告知忽视，独自留下来研究信号内容。"
    characters:
      - "陈默"
      - "值班长赵峰"
    action: |
      控制室灯光昏黄，多名操作员伏案工作。陈默摘下头盔走进来，径直走向值班长。
    dialogue:
      - character: "陈默"
        line: "赵长，我在外壁检修时截获到一段异常信号，来自母星方向，频段是旧军用加密频道。"
      - character: "值班长赵峰"
        parenthetical: "不抬头，翻阅报告"
        line: "宇宙背景噪声。登记一下，下班前提交报告就行。"
      - character: "陈默"
        line: "这不是噪声。里面有结构。"
      - character: "值班长赵峰"
        parenthetical: "终于抬头，语气不耐烦"
        line: "陈默，我们是维修站，不是情报站。去做你该做的事。"
    transition: ~
```

---

## 2. 完整 JSON Schema 定义

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://novel2script/schema/script/v1",
  "title": "Novel2Script Screenplay Schema",
  "type": "object",
  "required": ["schema_version", "meta", "characters", "scenes"],
  "additionalProperties": false,

  "properties": {
    "schema_version": {
      "type": "string",
      "const": "1.0"
    },

    "meta": {
      "type": "object",
      "required": ["title", "generated_at"],
      "additionalProperties": false,
      "properties": {
        "title":          { "type": "string" },
        "logline":        { "type": "string" },
        "genre":          { "type": "string" },
        "source":         { "type": "string" },
        "total_chapters": { "type": "integer", "minimum": 1 },
        "total_scenes":   { "type": "integer", "minimum": 0 },
        "generated_at":   { "type": "string", "format": "date-time" }
      }
    },

    "characters": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name"],
        "additionalProperties": false,
        "properties": {
          "name":        { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },

    "scenes": {
      "type": "array",
      "items": { "$ref": "#/definitions/scene" }
    }
  },

  "definitions": {
    "scene": {
      "type": "object",
      "required": ["scene_number", "source_chapter", "slugline", "action", "dialogue"],
      "additionalProperties": false,
      "properties": {
        "scene_number":   { "type": "integer", "minimum": 1 },
        "source_chapter": { "type": "integer", "minimum": 1 },
        "slugline":       { "type": "string" },
        "summary":        { "type": "string" },
        "characters": {
          "type": "array",
          "items": { "type": "string" }
        },
        "action":     { "type": "string" },
        "dialogue": {
          "type": "array",
          "items": { "$ref": "#/$defs/dialogue_line" }
        },
        "transition": {
          "oneOf": [
            { "type": "string" },
            { "type": "null" }
          ]
        },
        "error": { "type": "string" }
      }
    },

    "dialogue_line": {
      "type": "object",
      "required": ["character", "line"],
      "additionalProperties": false,
      "properties": {
        "character":    { "type": "string" },
        "parenthetical":{ "type": "string" },
        "line":         { "type": "string" }
      }
    }
  }
}
```

---

## 3. 字段设计说明与设计原因

### 3.1 顶层结构：`meta` + `characters` + `scenes`

**为什么是扁平结构，不分集/分幕？**

影视剧本有三层可能的层级：场（scene）→ 幕（act）→ 集（episode）。引入更高层级有两个问题：

1. **"章节 = 集"的映射不成立**。小说章节是叙事单元，影视集数是制作单元，两者没有稳定的对应关系。强行映射会产生误导性的分集边界。
2. **层级增加了编辑成本**。作者拿到初稿后首要任务是调整场，而非调整集数。扁平列表直接可操作。

后续如需分集/分幕，`scenes` 中已有 `source_chapter` 可作为分组依据，由作者手动决策，Schema 也可平滑扩展。

---

### 3.2 `meta.logline`

**为什么一句话简介要单独成字段？**

logline 是影视行业的标准工作文档，用于向制片、投资方快速介绍故事。它与剧名并列是行业惯例。单独字段而非嵌在 `description` 里，是因为它的使用频率高（合同、宣发），值得在 schema 里显式存在。

---

### 3.3 `meta.source` + `meta.total_chapters`

**为什么记录来源信息？**

YAML 文件会离开生成工具独立流通（发邮件、上传云盘、交给编辑）。记录来源文件名和章节数，让任何人打开这份文件就能知道它从哪里来、覆盖多少原著内容，无需反查工具日志。

---

### 3.4 `characters`（顶层全局角色表）

**为什么把角色表放顶层，而不是仅在各场里列角色名？**

1. **一致性锚点**：逐章转换时，AI 有可能对同一角色使用不同称谓（"陈默"/"小陈"/"那个工程师"）。顶层角色表是生成阶段的约束依据（Phase 1 输出），也是阅读阶段的快速参考。
2. **编辑友好**：作者拿到初稿第一件事通常是检查人物是否对、人设是否准确。集中列出比从几十场里逐一翻查高效得多。
3. **下游复用**：角色表可以直接被其他工具消费（如演员表、人设管理系统），字段独立比嵌在场里更易提取。

---

### 3.5 `scene.slugline`（场景标题）

**格式：`内/外景 — 地点 — 时间`**

slugline 是影视剧本最具标志性的元素，标准格式为 `INT./EXT. LOCATION — TIME`。这里用中文"内/外景"替代英文缩写，原因是：

- 目标用户是中文作者，阅读和编辑都用中文。
- 与国内制片行业习惯对齐。

为什么是**字符串**而不是拆成三个子字段（interior/exterior、location、time）？因为：
1. slugline 作为整体被人眼读取，分拆没有显著的编辑优势。
2. 保持字符串允许 AI 生成更自然的措辞（如 "黄昏" 而非强制选 "日/夜"）。
3. 分拆后反而增加 YAML 体积，降低可读性。

---

### 3.6 `scene.action`

使用 YAML 块标量（`|`），保留换行。

**理由：** 动作描述是段落文字，通常多行。块标量让 YAML 文件在编辑器中呈现为自然段落，而非压缩在一行里的转义字符串，极大改善人工编辑体验。

---

### 3.7 `scene.dialogue`（对白序列）

```yaml
dialogue:
  - character: "角色名"
    parenthetical: "(情绪/动作提示)"   # 可选
    line: "台词内容"
```

**为什么是数组而不是字典？**

同一角色在一场中可能有多段连续台词（被舞台动作分隔），用字典无法表达顺序和重复键。数组保留了对白的时序结构。

**为什么 `parenthetical` 是可选字段而不是每行都要填？**

括注（parenthetical）在影视剧本中是"补充说明"，不是每句话都需要。强制填写会导致 AI 生成大量无意义的括注（如 "(说道)"），污染输出质量。设为可选，由 AI 在确实需要时才生成。

---

### 3.8 `scene.summary`

每场一句话梗概。

**为什么要有这个字段？**

这是 novel2script 相比标准剧本格式的一个主动扩展。理由：

1. **作者用途**：作者在浏览初稿时，可以通过 summary 快速定位"第几场讲了什么"，而无需逐字阅读 action。50 场的剧本，summary 就是一份场次大纲。
2. **AI 工作流**：summary 可作为"检查项"——作者觉得某场 summary 描述不对，就知道那场内容需要大幅修改。
3. **可去除性**：这个字段不影响标准剧本的格式语义，导出 Final Draft 时可以直接忽略。

---

### 3.9 `scene.source_chapter`

标注本场来源于小说第几章。

**为什么要记录这个？**

逐章转换是本工具的核心策略。记录 `source_chapter` 让作者在修改时可以快速翻回原著对应章节核对细节（对白是否符合原著语气？动作是否有原著依据？）。这是"可打磨的初稿"承诺的一部分——工具不仅给结果，也给来源。

---

### 3.10 `scene.transition`

转场提示（CUT TO / DISSOLVE / FADE OUT 等），允许 `null`。

**为什么允许 null？**

现代影视剧本中，CUT TO 是默认转场，通常省略不写，只在需要特殊转场效果时才标注。用 `null` 而非空字符串，语义更明确：`null` = "使用默认转场"，空字符串 = 数据可能缺失。

---

### 3.11 `scene.error`（预留占位字段）

```yaml
- scene_number: 15
  source_chapter: 5
  slugline: ""
  action: ""
  dialogue: []
  error: "API 调用失败（重试3次）：Rate limit exceeded"
```

**为什么不直接跳过出错的章节？**

跳过会破坏场号连续性，且让作者不知道哪里有缺漏。保留占位场 + error 字段，作者打开文件就能看到哪些场需要手动补写，同时场号序列保持完整。

---

## 4. 设计原则总结

| 原则 | 体现 |
|------|------|
| **人工可读优先** | 块标量、扁平结构、summary 字段 |
| **编辑友好** | 顶层角色表、source_chapter、error 占位 |
| **最小必要字段** | parenthetical/transition/summary 均为可选，不强制 |
| **语义清晰** | null vs 空字符串区分，additionalProperties: false 防止字段污染 |
| **可扩展** | schema_version 字段，为 v2 预留升级路径 |
