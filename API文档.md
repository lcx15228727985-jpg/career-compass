】# Career Compass API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3001`
- **接口格式**: RESTful JSON API
- **认证方式**: API Key（通过 Header 传递）

---

## 目录

1. [健康检查](#1-健康检查)
2. [职业分析](#2-职业分析)
3. [职业体验模拟](#3-职业体验模拟)
4. [行动指南生成](#4-行动指南生成)
5. [岗位对比分析](#5-岗位对比分析)
6. [简历解析](#6-简历解析)
7. [职业偏好校准对话](#7-职业偏好校准对话)
8. [偏好提炼总结](#8-偏好提炼总结)
9. [动态因子更新](#9-动态因子更新)

---

## 1. 健康检查

### 请求

```http
GET /api/health
```

### 响应

```json
{
  "status": "ok",
  "message": "Career Compass API is running",
  "model": "DeepSeek-R1-0528",
  "baseURL": "https://aiping.cn/api/v1"
}
```

---

## 2. 职业分析

基于用户提交的成就经历，生成职业画像（Career DNA）和三个梯队的岗位推荐。

### 请求

```http
POST /api/analyze-career
Content-Type: application/json
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `entries` | Array | 是 | 成就经历数组，最少 3 条 |

### entries 结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `scene` | String | 是 | 情境（发生了什么，背景是什么） |
| `action` | String | 是 | 行动（你具体做了什么） |
| `result` | String | 是 | 结果（产生了什么影响） |
| `feeling` | String | 是 | 感受（为什么有成就感） |

### 示例

```json
{
  "entries": [
    {
      "scene": "在上一份工作中，负责带领团队完成年度销售目标",
      "action": "制定详细的销售计划，分解目标到个人，每天复盘进展",
      "result": "超额完成年度目标的120%，团队获得最佳团队奖",
      "feeling": "看到团队成员共同成长，目标达成时的成就感"
    },
    {
      "scene": "客户投诉率突然上升30%",
      "action": "深入分析客户反馈，梳理问题根因，优化服务流程",
      "result": "2个月内将投诉率降至5%，客户满意度提升至95%",
      "feeling": "通过解决问题的过程感受到自己的价值"
    }
  ]
}
```

### 响应

```json
{
  "success": true,
  "message": "职业分析完成",
  "data": {
    "career_dna": {
      "skills": ["领导力", "目标管理", "问题解决", "团队协作", "数据分析"],
      "work_context": ["高度独立", "高频沟通", "目标导向"],
      "boundaries": ["高压环境", "纯销售岗"]
    },
    "recommendations": {
      "tier_1_ready": [
        {
          "job_title": "销售经理",
          "match_score": 95,
          "reasoning": "与用户领导力和目标管理能力高度匹配"
        }
      ],
      "tier_2_transferable": [
        {
          "job_title": "产品经理",
          "missing_skills": ["产品思维", "需求分析"],
          "reasoning": "需要补齐产品相关技能"
        }
      ],
      "tier_3_potential": [
        {
          "job_title": "数据分析师",
          "growth_potential": "数据驱动决策是未来趋势",
          "required_learning": "需要学习统计分析工具"
        }
      ]
    }
  },
  "model": "DeepSeek-R1-0528",
  "receivedAt": "2024-03-28T10:00:00.000Z"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `career_dna.skills` | Array | 提取的核心技能（5-8个） |
| `career_dna.work_context` | Array | 工作情境偏好 |
| `career_dna.boundaries` | Array | 边界限制（不适配的环境） |
| `recommendations.tier_1_ready` | Array | 第一梯队：可直接上岗的岗位 |
| `recommendations.tier_2_transferable` | Array | 第二梯队：需少量技能转型 |
| `recommendations.tier_3_potential` | Array | 第三梯队：长期潜力探索 |

---

## 3. 职业体验模拟

生成特定岗位的职业模拟数据，包括剧情节点、随机事件、技能卡等。

### 请求

```http
POST /api/simulate-career
Content-Type: application/json
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `job_title` | String | 是 | 目标岗位名称 |
| `user_dna` | Object | 否 | 用户职业画像 |
| `options.type` | String | 否 | 返回类型：`full`（默认）/ `nodes` / `events` / `skills` |

### 示例

```json
{
  "job_title": "产品经理",
  "user_dna": {
    "skills": ["数据分析", "沟通协作"],
    "work_context": ["团队协作", "目标导向"],
    "boundaries": ["高压环境"]
  },
  "options": {
    "type": "full"
  }
}
```

### 响应（type=full）

```json
{
  "success": true,
  "data": {
    "intro": {
      "identity": "初级产品经理",
      "time": "入职第3个月",
      "task": "负责一个新功能的需求调研和上线",
      "goal": "在两周内完成需求文档并推动上线",
      "risk": "需求变更频繁，可能导致延期"
    },
    "daily_rhythm": {
      "morning": "查看数据报表，分析用户行为",
      "下午": "与开发、设计对接，确认实现方案",
      "晚间": "整理用户反馈，规划迭代方向"
    },
    "nodes": [
      {
        "title": "需求评审",
        "scene": "开发团队对需求提出质疑，认为实现成本过高",
        "options": [
          {
            "label": "坚持原方案",
            "feedback": "开发配合但有情绪，后续沟通成本增加",
            "delta": {"prof": 2, "social": -1, "progress": 1, "emotion": 0}
          },
          {
            "label": "调整方案",
            "feedback": "成功简化实现，但功能完整性略有下降",
            "delta": {"prof": 1, "social": 2, "progress": 2, "emotion": 1}
          }
        ]
      }
    ],
    "events": [
      {
        "id": "evt1",
        "title": "突发线上问题",
        "text": "线上出现严重Bug，需要紧急修复",
        "effect": {"prof": 2, "social": 1, "progress": -2, "emotion": -1},
        "probability": 0.2
      }
    ],
    "skills": [
      {
        "id": "deepFocus",
        "name": "深度思考",
        "description": "使用后专业判断+3，但情绪-2",
        "effect": {"prof": 3, "social": 0, "progress": 0, "emotion": -2},
        "cooldown": true
      }
    ],
    "wrap_text": "产品经理需要平衡各方需求，在有限资源下做出最优决策。"
  },
  "model": "DeepSeek-R1-0528"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `intro` | Object | 模拟场景基本信息 |
| `daily_rhythm` | Object | 每日工作节奏 |
| `nodes` | Array | 关键剧情节点（5个） |
| `events` | Array | 随机事件池 |
| `skills` | Array | 技能卡（3张） |
| `wrap_text` | String | 模拟总结 |

---

## 4. 行动指南生成

基于目标岗位和用户技能，生成职业发展路径和30天行动计划。

### 请求

```http
POST /api/generate-action-plan
Content-Type: application/json
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `job_title` | String | 是 | 目标岗位名称 |
| `skills` | Array | 否 | 用户已具备的技能 |
| `missing_skills` | Array | 否 | 欠缺技能 |

### 示例

```json
{
  "job_title": "产品经理",
  "skills": ["数据分析", "项目管理"],
  "missing_skills": ["产品设计", "用户调研"]
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "career_path": {
      "year_1": "进入产品经理岗位，从初级产品经理开始，侧重需求文档撰写和基础数据分析",
      "year_3": "晋升为高级产品经理，开始负责完整产品线，具备独立决策能力",
      "year_5": "成为产品总监或转向产品VP，具备战略视野和团队管理能力"
    },
    "action_plan_30_days": [
      {
        "day_range": "Day 1-7",
        "task_name": "产品经理入门学习",
        "purpose": "了解产品经理职责和工作流程"
      },
      {
        "day_range": "Day 8-14",
        "task_name": "竞品分析练习",
        "purpose": "掌握竞品分析方法论"
      },
      {
        "day_range": "Day 15-21",
        "task_name": "完成一个模拟需求文档",
        "purpose": "实践需求文档撰写"
      },
      {
        "day_range": "Day 22-30",
        "task_name": "模拟面试准备",
        "purpose": "准备产品经理岗位面试"
      }
    ],
    "risk_warning": "产品经理岗位竞争激烈，需要持续学习和实战经验积累"
  },
  "model": "DeepSeek-R1-0528"
}
```

---

## 5. 岗位对比分析

对比两个岗位的多个维度，生成详细的对比分析报告。

### 请求

```http
POST /api/compare-jobs
Content-Type: application/json
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `job_a` | String | 是 | 岗位A名称 |
| `job_b` | String | 是 | 岗位B名称 |
| `user_dna` | Object | 否 | 用户职业画像 |
| `options.detail_level` | String | 否 | 详细程度：`summary` / `standard`（默认）/ `factor_detail` |
| `options.factor_filter` | Array | 否 | 因子筛选 |

### 示例

```json
{
  "job_a": "产品经理",
  "job_b": "数据分析师",
  "user_dna": {
    "skills": ["数据分析", "沟通协作"],
    "work_context": ["团队协作"],
    "boundaries": ["高压环境"]
  },
  "options": {
    "detail_level": "standard"
  }
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "factors": [
      {
        "key": "salary",
        "name": "薪资水平",
        "score_a": 85,
        "score_b": 90,
        "lean": "b",
        "confidence": 0.9,
        "icon": "💰",
        "aText": "产品经理的薪资水平",
        "bText": "数据分析师的薪资水平",
        "insight": "综合分析",
        "relation_type": "positive"
      },
      {
        "key": "growth",
        "name": "成长空间",
        "score_a": 80,
        "score_b": 75,
        "lean": "a",
        "confidence": 0.85,
        "icon": "📈",
        "aText": "产品经理的成长机会",
        "bText": "数据分析师的成长机会",
        "insight": "综合分析",
        "relation_type": "delayed"
      }
    ],
    "summary": {
      "a_wins": 9,
      "b_wins": 6,
      "ties": 0,
      "winner": "产品经理",
      "recommendation": "综合建议：基于你的核心技能，建议优先考虑..."
    }
  },
  "model": "DeepSeek-R1-0528"
}
```

### 因子说明

| 因子 | 说明 | 关系类型 |
|------|------|----------|
| `salary` | 薪资水平 | positive |
| `growth` | 成长空间 | delayed |
| `pressure` | 工作压力 | negative |
| `match` | 能力匹配 | neutral |
| `transfer` | 技能迁移 | - |
| `experience` | 经验积累 | - |
| `interview` | 面试难度 | - |
| `portfolio` | 作品集要求 | - |
| `stability` | 稳定性 | - |
| `optionality` | 职业可选性 | - |
| `network` | 人脉积累 | - |
| `ai` | AI替代风险 | - |
| `business` | 商业价值 | - |
| `team` | 团队协作 | - |
| `remote` | 远程友好 | - |

---

## 6. 简历解析

从简历文本中提取结构化的职业经历信息。

### 请求

```http
POST /api/parse-resume
Content-Type: application/json
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | String | 是 | 简历文本内容 |

### 示例

```json
{
  "text": "张三，5年产品经验。曾在XX公司担任产品经理，负责用户增长工作..."
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "scene": "负责公司核心产品的用户增长工作",
        "action": "制定增长策略，优化产品体验",
        "result": "实现DAU增长200%",
        "feeling": "数据增长带来的成就感"
      }
    ],
    "summary": {
      "years_experience": 5,
      "key_skills": ["产品设计", "数据分析", "用户增长"],
      "industries": ["互联网", "科技"],
      "roles": ["产品经理"]
    }
  },
  "model": "DeepSeek-R1-0528"
}
```

---

## 7. 职业偏好校准对话

通过对话方式追问用户偏好，完成职业偏好校准。

### 请求

```http
POST /api/coach-chat
Content-Type: application/json
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `messages` | Array | 否 | 对话历史 |
| `user_input` | String | 是 | 用户输入 |
| `system_context` | Object | 否 | 系统上下文 |
| `stage` | String | 否 | 当前阶段：`initial`/`values`/`personality`/`workstyle`/`boundary`/`completing` |
| `topic_index` | Number | 否 | 话题索引 |
| `user_entries` | Array | 否 | 用户经历 |

### 示例

```json
{
  "messages": [
    {"role": "assistant", "content": "你说在项目管理中感到成就感，能具体说说是什么让你有这样的感受吗？"},
    {"role": "user", "content": "当我带领团队完成一个复杂项目，看到大家一起成长进步，我感到很有成就感。"}
  ],
  "user_input": "我喜欢看到团队成员共同成长",
  "stage": "values",
  "topic_index": 0,
  "user_entries": [
    {"scene": "...", "action": "...", "result": "...", "feeling": "..."}
  ]
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "reply": "那如果让你在个人成就和团队成功之间选择，你会更看重哪个？",
    "finished": false,
    "next_topic": "values",
    "insight": "用户重视团队协作和成员成长"
  },
  "model": "DeepSeek-R1-0528"
}
```

---

## 8. 偏好提炼总结

基于对话记录和用户经历，提炼完整的偏好画像。

### 请求

```http
POST /api/coach-summarize
Content-Type: application/json
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `messages` | Array | 是 | 对话消息记录 |
| `user_entries` | Array | 是 | 用户经历 |
| `insights` | Array | 否 | 教练分析的洞察 |

### 示例

```json
{
  "messages": [
    {"role": "assistant", "content": "问题1"},
    {"role": "user", "content": "回答1"},
    {"role": "assistant", "content": "问题2"},
    {"role": "user", "content": "回答2"}
  ],
  "user_entries": [
    {"scene": "...", "action": "...", "result": "...", "feeling": "..."}
  ],
  "insights": ["用户重视团队协作"]
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "achievementRecall": "通过带领团队完成目标获得成就感",
    "values": ["团队协作", "成就感", "成长"],
    "personality": {
      "introExtro": "平衡",
      "workStyle": "团队协作",
      "decisionStyle": "协商共识"
    },
    "workPreferences": {
      "pace": "平衡节奏",
      "collaboration": "适度协作",
      "communication": "按需沟通"
    },
    "boundaries": ["高压环境", "纯销售岗"],
    "riskTolerance": "中等平衡",
    "testReference": ""
  },
  "model": "DeepSeek-R1-0528"
}
```

---

## 9. 动态因子更新

用于图谱交互，动态更新特定因子的分析结果。

### 请求

```http
POST /api/update-factor
Content-Type: application/json
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `job_a` | String | 是 | 岗位A名称 |
| `job_b` | String | 是 | 岗位B名称 |
| `factor_key` | String | 是 | 要更新的因子（如 `salary`, `growth`） |
| `user_dna` | Object | 否 | 用户职业画像 |

### 示例

```json
{
  "job_a": "产品经理",
  "job_b": "数据分析师",
  "factor_key": "salary",
  "user_dna": {
    "skills": ["数据分析"],
    "work_context": ["团队协作"],
    "boundaries": []
  }
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "factor": {
      "key": "salary",
      "name": "薪资水平",
      "score_a": 85,
      "score_b": 90,
      "lean": "b",
      "confidence": 0.92,
      "icon": "💰",
      "aText": "产品经理的薪资详情",
      "bText": "数据分析师的薪资详情",
      "insight": "综合洞察",
      "relation_type": "positive",
      "related_factors": ["growth", "stability"]
    }
  },
  "model": "DeepSeek-R1-0528"
}
```

---

## 错误响应格式

所有接口的错误响应格式统一：

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

---

## 注意事项

1. 所有 POST 请求需要设置 `Content-Type: application/json`
2. 接口基于大模型 API，可能存在响应延迟
3. 职业分析接口使用高并发拆分优化，三个梯队并行生成
4. 建议在生产环境添加请求限流和错误重试机制