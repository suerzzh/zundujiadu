# YAML Schema 设计文档

## 概述

本文档定义了 Novel2Script 系统输出的剧本 YAML Schema，包括完整字段定义、设计理由和 JSON Schema 约束。Schema 版本为 v1.1，向后兼容 v1.0。

---

## Schema 结构总览

```yaml
meta:                    # 剧本元信息
  title: string          # 剧本标题
  genre: string          # 题材类型
  source_novel: string   # 原著名称
  total_episodes: int    # 总集数
  version: string        # Schema 版本号
  analysis: object?      # [v1.1] 改编分析摘要

episodes:                # 集列表
  - episode_number: int  # 集号
    title: string        # 集标题
    logline: string      # 一句话概述
    scenes:              # 场景列表
      - scene_number: int     # 场景号
        location: string      # 场景地点
        time_of_day: string   # 日/夜
        beats:                # 节拍列表
          - beat_phase: string?     # [v1.1] setup/confrontation/resolution
            description: string     # 节拍描述
            dialogues:              # 对话列表
              - character: string   # 角色名
                line: string        # 台词
                direction: string   # 舞台指示
            emotion_marker: string?  # [v1.1] 情绪标记
            conflict_type: string?   # [v1.1] 冲突类型
        is_paywall: bool?           # [v1.1] 付费卡点标记
```

---

## 字段定义

### Meta 信息

| 字段           | 类型   | 必填 | 版本 | 说明                               |
| -------------- | ------ | ---- | ---- | ---------------------------------- |
| title          | string | 是   | v1.0 | 剧本标题                           |
| genre          | string | 是   | v1.0 | 题材类型（都市/玄幻/末世/女频等）  |
| source_novel   | string | 是   | v1.0 | 原著小说名称                       |
| total_episodes | int    | 是   | v1.0 | 总集数                             |
| version        | string | 是   | v1.0 | Schema 版本号，默认 "1.0"          |
| analysis       | object | 否   | v1.1 | 改编分析摘要（题材/频向/冲突池等） |

### Episode（集）

| 字段           | 类型   | 必填 | 版本 | 说明          |
| -------------- | ------ | ---- | ---- | ------------- |
| episode_number | int    | 是   | v1.0 | 集号，从1开始 |
| title          | string | 是   | v1.0 | 集标题        |
| logline        | string | 否   | v1.0 | 一句话概述    |
| scenes         | list   | 是   | v1.0 | 场景列表      |

### Scene（场景）

| 字段         | 类型   | 必填 | 版本 | 说明                   |
| ------------ | ------ | ---- | ---- | ---------------------- |
| scene_number | int    | 是   | v1.0 | 场景号，集内从1开始    |
| location     | string | 是   | v1.0 | 场景地点               |
| time_of_day  | string | 否   | v1.0 | 时间段（日/夜/黄昏等） |
| beats        | list   | 是   | v1.0 | 节拍列表               |
| is_paywall   | bool   | 否   | v1.1 | 是否为付费卡点         |

### Beat（节拍）

| 字段           | 类型   | 必填 | 版本 | 说明                                     |
| -------------- | ------ | ---- | ---- | ---------------------------------------- |
| beat_phase     | string | 否   | v1.1 | 节拍阶段：setup/confrontation/resolution |
| description    | string | 是   | v1.0 | 节拍描述                                 |
| dialogues      | list   | 否   | v1.0 | 对话列表                                 |
| emotion_marker | string | 否   | v1.1 | 情绪标记（紧张/悲伤/喜悦等）             |
| conflict_type  | string | 否   | v1.1 | 冲突类型（人际/内心/环境等）             |

### Dialogue（对话）

| 字段      | 类型   | 必填 | 版本 | 说明              |
| --------- | ------ | ---- | ---- | ----------------- |
| character | string | 是   | v1.0 | 角色名            |
| line      | string | 是   | v1.0 | 台词内容          |
| direction | string | 否   | v1.0 | 舞台指示/动作描述 |

---

## 9 条设计理由

### 1. 为什么用 YAML 而非 JSON？

YAML 更适合人工阅读和编辑。剧本创作是创意工作，作者需要频繁阅读和修改剧本内容。YAML 的缩进格式比 JSON 的花括号更清晰，注释支持也便于作者做笔记。同时，YAML 可以直接被 Monaco Editor 等代码编辑器高亮显示，兼顾了可编辑性。

### 2. 为什么采用 Episode → Scene → Beat → Dialogue 四级结构？

这四级结构对应了影视剧本的标准层级：一集包含多个场景，一个场景包含多个戏剧节拍，一个节拍包含多句对话。这种层级关系与导演和编剧的工作方式完全一致，便于从宏观（集）到微观（台词）的导航和编辑。

### 3. 为什么 beat_phase 是可选字段？

beat_phase（setup/confrontation/resolution）是 v1.1 新增字段，用于标注节拍在三幕式结构中的位置。v1.0 不包含此字段，为保持向后兼容性设为可选。当 Writer Agent 能力足够时自动填充，不影响 v1.0 的剧本正常解析。

### 4. 为什么 emotion_marker 和 conflict_type 是可选字段？

这两个字段用于增强剧本的结构化信息，帮助作者快速定位情绪高潮和冲突点。但它们不是剧本的必要信息——一个没有标注情绪和冲突类型的剧本仍然是完整可用的。设为可选确保了 Schema 的渐进增强特性。

### 5. 为什么 is_paywall 在 Scene 级别而非 Episode 级别？

付费卡点通常设在某个场景的结尾处（"欲知后事如何，请付费观看"），而非整集。将 is_paywall 放在 Scene 级别可以精确控制付费断点位置，更符合短剧的实际运营需求。

### 6. 为什么 direction 字段在 Dialogue 中？

direction（舞台指示）与对话紧密关联，放在 Dialogue 内部而非 Beat 级别，是因为舞台指示通常描述的是说话时的动作（如"他握紧了拳头"），与台词是同一个表达单元。这种设计也与 Final Draft 等专业剧本软件一致。

### 7. 为什么 meta.analysis 是可选的？

meta.analysis 包含改编分析的摘要信息（题材、冲突池、角色等），是 v1.1 新增字段。它为剧本提供了创作背景信息，但不是剧本本身的必要内容。设为可选确保 v1.0 剧本可以无缝升级到 v1.1。

### 8. 为什么 episode_number 从 1 开始而非 0？

影视行业的惯例是集号从 1 开始计数（第1集、第2集），而非编程的从 0 开始。这确保了剧本对非技术背景的创作者更友好，减少沟通成本。

### 9. 为什么 logline 是可选的？

logline（一句话概述）是编剧工具中的常见概念，但不是每集都必须有。在快速迭代阶段，作者可能先写场景再补概述。设为可选降低了创作门槛，同时鼓励作者后续补充以提升剧本可读性。

---

## JSON Schema 约束

以下为 Schema v1.1 的 JSON Schema 定义，可用于自动校验：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Script",
  "description": "Novel2Script YAML Schema v1.1",
  "type": "object",
  "required": ["meta", "episodes"],
  "properties": {
    "meta": {
      "type": "object",
      "required": ["title", "genre", "source_novel", "total_episodes", "version"],
      "properties": {
        "title": { "type": "string", "minLength": 1 },
        "genre": { "type": "string", "minLength": 1 },
        "source_novel": { "type": "string" },
        "total_episodes": { "type": "integer", "minimum": 1 },
        "version": { "type": "string", "enum": ["1.0", "1.1"] },
        "analysis": { "type": "object" }
      }
    },
    "episodes": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["episode_number", "title", "scenes"],
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
              "properties": {
                "scene_number": { "type": "integer", "minimum": 1 },
                "location": { "type": "string" },
                "time_of_day": { "type": "string" },
                "is_paywall": { "type": "boolean" },
                "beats": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["description"],
                    "properties": {
                      "beat_phase": { "type": "string", "enum": ["setup", "confrontation", "resolution"] },
                      "description": { "type": "string" },
                      "emotion_marker": { "type": "string" },
                      "conflict_type": { "type": "string" },
                      "dialogues": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "required": ["character", "line"],
                          "properties": {
                            "character": { "type": "string" },
                            "line": { "type": "string" },
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

## 版本演进

| 版本 | 变更                                                         | 向后兼容 |
| ---- | ------------------------------------------------------------ | -------- |
| v1.0 | 初始版本：meta + episodes + scenes + beats + dialogues       | —        |
| v1.1 | 新增 beat_phase, emotion_marker, conflict_type, is_paywall, meta.analysis | 是       |

v1.1 的所有新增字段均为可选，v1.0 的剧本可以无缝升级到 v1.1 解析。