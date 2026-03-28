/**
 * Career Compass API Server
 * 技术栈：Node.js + Express + 大模型 API（兼容 DeepSeek/智谱/爱平）
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// ============================================================
// 基础配置
// ============================================================

const app = express();
const PORT = process.env.PORT || 3001;

// 爱平 API 配置 - 支持多 Key 并发加速
const API_KEYS = [
  process.env.AIPING_API_KEY_1,
  process.env.AIPING_API_KEY_2,
  process.env.AIPING_API_KEY_3,
].filter(Boolean);

const AIPING_BASE_URL = process.env.AIPING_BASE_URL || 'https://aiping.cn/api/v1';

// 模型名称
const LLM_MODEL = process.env.LLM_MODEL || 'DeepSeek-R1-0528';

// Key 轮换索引
let keyIndex = 0;

// 获取下一个 API Key（轮换策略）
const getNextApiKey = () => {
  if (API_KEYS.length === 0) {
    throw new Error('未配置 API Key');
  }
  const key = API_KEYS[keyIndex % API_KEYS.length];
  keyIndex++;
  return key;
};

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================
// 辅助函数：调用大模型（带自动重试和错误修复）
// ============================================================

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,           // 最大重试次数
  baseDelay: 1000,         // 基础延迟(ms)
  maxDelay: 10000,         // 最大延迟(ms)
  retryableErrors: [      // 可重试的错误状态码
    429,  // Rate limit
    500,  // Internal server error
    502,  // Bad gateway
    503,  // Service unavailable
    504,  // Gateway timeout
  ]
};

// 计算指数退避延迟
function getRetryDelay(attempt) {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelay);
}

// 睡眠函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error, response) {
  if (response && RETRY_CONFIG.retryableErrors.includes(response.status)) {
    return true;
  }
  // 网络错误也可重试
  if (error.message && (
    error.message.includes('ECONNRESET') ||
    error.message.includes('ETIMEDOUT') ||
    error.message.includes('ENOTFOUND') ||
    error.message.includes('ECONNREFUSED')
  )) {
    return true;
  }
  return false;
}

/**
 * 调用大模型 API（带自动重试）
 */
async function chatComplete(messages, temperature = 0.7, maxTokens = 4000, jsonMode = true, apiKey = null, retryCount = 0) {
  const requestBody = {
    model: LLM_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    requestBody.response_format = { type: 'json_object' };
  }

  const authKey = apiKey || getNextApiKey();

  try {
    const response = await fetch(`${AIPING_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = new Error(`API Error: ${response.status} ${response.statusText}`);

      // 检查是否可重试
      if (isRetryableError(error, response) && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = getRetryDelay(retryCount);
        console.log(`API错误 ${response.status}，${retryCount + 1}/${RETRY_CONFIG.maxRetries} 次重试，等待 ${Math.round(delay)}ms...`);
        await sleep(delay);
        return chatComplete(messages, temperature, maxTokens, jsonMode, apiKey, retryCount + 1);
      }

      throw error;
    }

    return response.json();
  } catch (error) {
    // 检查是否可重试
    if (isRetryableError(error, null) && retryCount < RETRY_CONFIG.maxRetries) {
      const delay = getRetryDelay(retryCount);
      console.log(`网络错误，${retryCount + 1}/${RETRY_CONFIG.maxRetries} 次重试，延迟 ${Math.round(delay)}ms...`);
      await sleep(delay);
      return chatCompleteWithRetryWithRetry(messages, temperature, maxTokens, jsonMode, apiKey, retryCount + 1);
    }
    throw error;
  }
}

/**
 * 解析 LLM 返回的 JSON（增强版：自动修复异常响应）
 */
function parseLLMResponse(response, maxRetries = 3) {
  // 处理 DeepSeek-R1 等推理模型的响应
  // 新版本 DeepSeek-R1: message.content 有内容
  // 旧版本 DeepSeek-R1-0528: message.content 为 null，内容在 reasoning_content 中
  // 爱平 API 有时返回没有 choices 结构的响应，直接是 JSON 对象

  // 首先尝试从标准 choices 结构中获取 content
  let content = response.choices?.[0]?.message?.content;

  // 如果没有 choices 结构，检查响应本身是否是直接的 JSON 对象（不是 API 响应格式）
  if (!content && typeof response === 'object' && !Array.isArray(response)) {
    // 检查响应是否直接就是业务 JSON（没有 choices/id/model 等 API 元数据）
    const isDirectJSON = response.id && response.object === 'chat.completion' && response.model;

    if (!isDirectJSON) {
      // 确认没有 choices 结构才是真正的直接 JSON
      if (!response.choices) {
        console.log('响应没有 choices 结构，检查是否是直接 JSON 对象');
        // 直接检查响应是否就是 JSON 对象
        if (response.skills || response.work_context || response.factors || response.action_plan_30_days || response.job_title) {
          console.log('直接返回响应对象');
          return response;
        }
        // 检查是否直接就是数组或对象结构
        if (typeof response === 'object' && response !== null) {
          console.log('直接返回响应对象(通用)');
          return response;
        }
      }
    }
  }

  // 如果 content 为空，尝试从 reasoning_content 获取
  if (!content || content === null || content === '') {
    const reasoning = response.choices?.[0]?.message?.reasoning_content;
    if (reasoning) {
      // 尝试从推理内容中提取 JSON
      const jsonMatch = reasoning.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
    }
  }

  if (!content) {
    console.log('响应内容为空，原始响应:', JSON.stringify(response).substring(0, 500));
    throw new Error('API 返回内容为空');
  }

  // 尝试自动修复并解析 JSON
  const parseResult = tryParseJSON(content);
  if (parseResult.success) {
    return parseResult.data;
  }

  // 尝试修复常见的 JSON 问题
  const fixedContent = fixCommonJSONIssues(content);
  const fixedResult = tryParseJSON(fixedContent);
  if (fixedResult.success) {
    console.log('JSON 自动修复成功');
    return fixedResult.data;
  }

  // 最后尝试正则提取
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const extractedResult = tryParseJSON(jsonMatch[0]);
    if (extractedResult.success) {
      console.log('从文本中提取 JSON 成功');
      return extractedResult.data;
    }
  }

  // 所有修复都失败，抛出错误
  throw new Error(`JSON 解析失败: ${parseResult.error}, 内容: ${content.substring(0, 200)}`);
}
function tryParseJSON(str) {
  if (!str || typeof str !== 'string') {
    return { success: false, error: '输入不是字符串' };
  }

  const trimmed = str.trim();
  if (!trimmed) {
    return { success: false, error: '内容为空' };
  }

  try {
    return { success: true, data: JSON.parse(trimmed) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 修复常见的 JSON 格式问题
 */
function fixCommonJSONIssues(content) {
  let fixed = content;

  // 1. 移除 Markdown 代码块标记
  fixed = fixed.replace(/```json\s*/g, '');
  fixed = fixed.replace(/```\s*/g, '');
  fixed = fixed.replace(/`/g, '');

  // 2. 移除 BOM 和特殊字符
  fixed = fixed.replace(/[\uFEFF\u200B]/g, '');

  // 3. 修复尾部逗号（如 "a": 1, } -> "a": 1 }）
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // 4. 修复缺少引号的键（如 {a: 1} -> {"a": 1}）- 简单情况
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // 5. 修复单引号为双引号（简单情况）
  fixed = fixed.replace(/'([^']*)'/g, (match, p1) => {
    // 避免替换已经是双引号的内容
    if (p1.includes('"')) return match;
    return `"${p1}"`;
  });

  // 6. 移除行内注释
  fixed = fixed.replace(/\/\/.*$/gm, '');

  // 7. 修复多余的控制字符
  fixed = fixed.replace(/[\n\r\t]/g, ' ');

  // 8. 清理多余空格
  fixed = fixed.replace(/\s+/g, ' ').trim();

  return fixed;
}

// ============================================================
// API 路由
// ============================================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Career Compass API is running',
    model: LLM_MODEL,
    baseURL: AIPING_BASE_URL,
  });
});

// ============================================================
// 1. 职业分析 API（高并发拆分优化）
// ============================================================

app.post('/api/analyze-career', async (req, res) => {
  const { entries } = req.body;

  console.log('\n========== 收到职业分析请求 ==========');
  console.log('收到经历数据条目数:', entries?.length || 0);
  console.log('使用模型:', LLM_MODEL);

  if (entries && Array.isArray(entries)) {
    entries.forEach((entry, index) => {
      console.log(`\n--- 经历 ${index + 1} ---`);
      console.log('情境:', entry.scene);
      console.log('行动:', entry.action);
      console.log('结果:', entry.result);
      console.log('感受:', entry.feeling);
    });
  }

  // 构建用户经历消息
  const userMessages = entries
    .map((e, i) => `【经历 ${i + 1}】
情境：${e.scene || ''}
行动：${e.action || ''}
结果：${e.result || ''}
感受：${e.feeling || ''}`)
    .join('\n\n');

  // 阶段 1：快速生成 Career DNA（前置请求，仅需几百毫秒）
  const dnaSystemPrompt = `你是一个专业的职业规划解析引擎（Career Compass）。你的任务是从用户的经历中提取底层的 Career DNA。

请严格按照以下 JSON 结构返回，不要包含任何 Markdown 代码块包裹：

{
  "skills": ["技能1", "技能2", "技能3"], // 提取 5-8 个核心技能
  "work_context": ["工作情境偏好1", "工作情境偏好2"], // 例如：高度独立、高频沟通、数据驱动
  "boundaries": ["不适配的环境1", "不适配的环境2"] // 反向筛选：用户不喜欢或不能长期承受的因素
}`;

  try {
    console.log('\n>>> 阶段 1: 提取 Career DNA...');
    const startTime1 = Date.now();

    const dnaCompletion = await chatComplete(
      [
        { role: 'system', content: dnaSystemPrompt },
        { role: 'user', content: userMessages },
      ],
      0.7,
      1000,
      true
    );

    console.log(`DNA 获取耗时: ${Date.now() - startTime1}ms`);

    // 将完整的响应对象传递给 parseLLMResponse
    let careerDNA = parseLLMResponse(dnaCompletion);
    console.log('Career DNA 解析完成:', JSON.stringify(careerDNA).substring(0, 200) + '...');

    // 阶段 2：并行生成三个梯队的推荐岗位
    console.log('\n>>> 阶段 2: 并行生成三个梯队推荐...');
    const startTime2 = Date.now();

    const dnaContext = `用户 Career DNA:
- 核心技能: ${careerDNA.skills?.join('、') || '未识别'}
- 工作偏好: ${careerDNA.work_context?.join('、') || '未识别'}
- 边界限制: ${careerDNA.boundaries?.join('、') || '无'}`;

    const tier1Prompt = `你是一个职业推荐引擎。基于用户的 Career DNA，生成 10 个用户已经准备好可以直接上岗的岗位。

要求：
1. 每个岗位必须匹配用户的核心技能
2. 只需要最少的过渡时间或不需要额外培训
3. 返回纯 JSON 数组，不要包含任何解释或 Markdown

返回格式：
[{"job_title":"岗位名称","match_score":95,"reasoning":"简短匹配理由"}]`;

    const tier2Prompt = `你是一个职业推荐引擎。基于用户的 Career DNA，生成 10 个用户需要补齐少量技能即可转型的岗位。

要求：
1. 目标岗位与用户现有技能有 60-80% 的匹配度
2. 明确指出需要补齐的 1-2 个关键技能
3. 返回纯 JSON 数组，不要包含任何解释或 Markdown

返回格式：
[{"job_title":"岗位名称","missing_skills":["需要补齐的技能"],"reasoning":"简短转型理由"}]`;

    const tier3Prompt = `你是一个职业推荐引擎。基于用户的 Career DNA，生成 10 个具有长期发展潜力的探索性岗位。

要求：
1. 这些岗位代表未来趋势或新兴领域
2. 用户目前可能缺乏相关经验，但有潜在天赋或兴趣
3. 返回纯 JSON 数组，不要包含任何解释或 Markdown

返回格式：
[{"job_title":"岗位名称","growth_potential":"长期潜力说明","required_learning":"需要学习的领域"}]`;

    // 并行发起三个请求（每个使用不同的 Key）
    const [tier1Result, tier2Result, tier3Result] = await Promise.allSettled([
      chatComplete(
        [{ role: 'system', content: tier1Prompt }, { role: 'user', content: dnaContext }],
        0.7,
        2000,
        true,
        getNextApiKey()
      ),
      chatComplete(
        [{ role: 'system', content: tier2Prompt }, { role: 'user', content: dnaContext }],
        0.7,
        2000,
        true,
        getNextApiKey()
      ),
      chatComplete(
        [{ role: 'system', content: tier3Prompt }, { role: 'user', content: dnaContext }],
        0.7,
        2000,
        true,
        getNextApiKey()
      ),
    ]);

    console.log(`三个梯队生成耗时: ${Date.now() - startTime2}ms`);

    // 解析结果并处理容错
    const parseTierResult = (result, tierName) => {
      if (result.status === 'fulfilled') {
        try {
          // 使用统一的解析函数
          return parseLLMResponse(result.value);
        } catch (e) {
          console.error(`${tierName} 解析失败:`, e.message);
          return [];
        }
      } else {
        console.error(`${tierName} 请求失败:`, result.reason?.message);
        return [];
      }
    };

    const tier1Jobs = parseTierResult(tier1Result, 'Tier 1');
    const tier2Jobs = parseTierResult(tier2Result, 'Tier 2');
    const tier3Jobs = parseTierResult(tier3Result, 'Tier 3');

    console.log(`\n>>> 三个梯队解析结果: Tier 1=${tier1Jobs.length}, Tier 2=${tier2Jobs.length}, Tier 3=${tier3Jobs.length}`);

    const finalData = {
      career_dna: {
        skills: careerDNA.skills || [],
        work_context: careerDNA.work_context || [],
        boundaries: careerDNA.boundaries || [],
      },
      recommendations: {
        tier_1_ready: tier1Jobs.slice(0, 10),
        tier_2_transferable: tier2Jobs.slice(0, 10),
        tier_3_potential: tier3Jobs.slice(0, 10),
      },
    };

    res.json({
      success: true,
      message: '职业分析完成',
      data: finalData,
      model: LLM_MODEL,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('职业分析失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// 2. 职业体验模拟 API
// ============================================================

app.post('/api/simulate-career', async (req, res) => {
  const { job_title, user_dna = {}, options = {} } = req.body;

  console.log('\n========== 收到职业模拟请求 ==========');
  console.log('岗位:', job_title);
  console.log('请求选项:', options);

  if (!job_title) {
    return res.status(400).json({
      success: false,
      error: '请提供岗位名称',
    });
  }

  // 根据选项决定返回什么类型的模拟数据
  const { type = 'full' } = options; // 'full' | 'nodes' | 'events' | 'skills'

  const baseContext = `用户画像：
- 核心技能：${user_dna.skills?.join('、') || '未识别'}
- 工作偏好：${user_dna.work_context?.join('、') || '未识别'}
- 边界限制：${user_dna.boundaries?.join('、') || '无'}`;

  try {
    let parsedData;

    if (type === 'nodes') {
      // 只生成剧情节点
      const systemPrompt = `你是职业剧情生成器。请为 ${job_title} 岗位生成5个关键剧情节点。

每个节点包含：
- title: 节点标题（20字内）
- scene: 场景描述（80字内）
- options: 3个选项，每个包含 label（选项文本）、feedback（选择后的反馈）、delta（状态变化：prof/social/progress/emotion，各-3到+3）、nextHint（下一节点hint）

返回JSON数组格式：
[{"title":"场景1","scene":"...","options":[{"label":"选项A","feedback":"反馈","delta":{"prof":2,"social":0,"progress":1,"emotion":0},"nextHint":"..."}]}]`;

      const completion = await chatComplete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: baseContext },
        ],
        0.6,
        2000,
        true
      );
      parsedData = parseLLMResponse(completion);
    } else if (type === 'events') {
      // 只生成随机事件池
      const systemPrompt = `你是职业随机事件生成器。请为 ${job_title} 岗位生成5个随机事件。

每个事件包含：
- id: 事件标识
- title: 事件标题
- text: 事件描述
- effect: 状态变化 {prof, social, progress, emotion}，各-3到+3
- probability: 触发概率 0.1-0.5

返回JSON数组格式：
[{"id":"event1","title":"事件标题","text":"事件描述","effect":{"prof":2,"social":1,"progress":-1,"emotion":0},"probability":0.2}]`;

      parsedData = parseLLMResponse(await chatComplete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: baseContext },
        ],
        0.7,
        1500,
        true
      ));
    } else if (type === 'skills') {
      // 只生成技能卡
      const systemPrompt = `你是职业技能卡设计器。请为 ${job_title} 岗位设计3张技能卡。

每张技能卡包含：
- id: 技能标识（英文）
- name: 技能中文名
- description: 技能描述
- effect: 状态变化 {prof, social, progress, emotion}，负面用负数
- cooldown: 是否每局只能用一次（true/false）

返回JSON数组格式：
[{"id":"deepFocus","name":"深度思考","description":"使用后专业判断+3，但情绪-2","effect":{"prof":3,"social":0,"progress":0,"emotion":-2},"cooldown":true}]`;

      const completion = await chatComplete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: baseContext },
        ],
        0.5,
        1000,
        true
      );
      parsedData = parseLLMResponse(completion);
    } else {
      // 完整模拟数据（原有逻辑增强版）
      const systemPrompt = `你是职业体验生成器。请为 ${job_title} 岗位生成完整的职业模拟数据。

${baseContext}

请严格按以下JSON格式输出，不要有任何思考过程、解释或markdown：
{
  "intro": {
    "identity": "你的身份",
    "time": "当前时间",
    "task": "当前任务",
    "goal": "关键目标",
    "risk": "潜在风险"
  },
  "daily_rhythm": {
    "morning": "上午工作内容",
    "afternoon": "下午工作内容",
    "evening": "晚间工作内容"
  },
  "nodes": [
    {
      "title": "节点标题",
      "scene": "场景描述",
      "options": [
        {"label": "选项A", "feedback": "反馈", "delta": {"prof":2,"social":0,"progress":1,"emotion":0}, "nextHint": "下一提示"}
      ]
    }
  ],
  "events": [
    {"id":"evt1", "title": "事件标题", "text": "事件描述", "effect": {"prof":1,"social":1,"progress":-1,"emotion":0}, "probability": 0.2}
  ],
  "skills": [
    {"id": "deepFocus", "name": "深度思考", "description": "效果描述", "effect": {"prof":3,"social":0,"progress":0,"emotion":-2}, "cooldown": true}
  ],
  "wrap_text": "收尾总结"
}`;

      const completion = await chatComplete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请为 ${job_title} 岗位生成完整的职业体验模拟数据。` },
        ],
        0.5,
        2500,
        true
      );

      parsedData = parseLLMResponse(completion);
    }

    res.json({
      success: true,
      data: parsedData,
      model: LLM_MODEL,
    });
  } catch (error) {
    console.error('模拟失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// 3. 行动指南生成 API
// ============================================================

app.post('/api/generate-action-plan', async (req, res) => {
  const { job_title, skills = [], missing_skills = [] } = req.body;

  console.log('\n========== 收到行动指南生成请求 ==========');
  console.log('目标岗位:', job_title);

  if (!job_title) {
    return res.status(400).json({
      success: false,
      error: '请提供目标岗位名称',
    });
  }

  const systemPrompt = `你是一位务实的职业规划师。用户目前具备 ${skills.join('、') || '未识别'}，想向 ${job_title} 发展，但目前欠缺 ${missing_skills.join('、') || '无'}。
请为他规划未来的职业路径，并制定一个能在一个月内落地的最小可行性验证计划（MVP），避免空泛的建议，给出具体动作。
强制返回以下 JSON 格式：
{
  "career_path": {
    "year_1": "1年内的核心目标与基层角色定位",
    "year_3": "3年后的发展分水岭",
    "year_5": "5年后的天花板与跨界可能性"
  },
  "action_plan_30_days": [
    {"day_range": "Day 1-7", "task_name": "具体的验证任务", "purpose": "目的说明"},
    {"day_range": "Day 8-14", "task_name": "任务名称", "purpose": "目的说明"},
    {"day_range": "Day 15-21", "task_name": "任务名称", "purpose": "目的说明"},
    {"day_range": "Day 22-30", "task_name": "任务名称", "purpose": "目的说明"}
  ],
  "risk_warning": "一句话风险提示"
}`;

  try {
    const result = await chatComplete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `目标岗位：${job_title}，已有技能：${skills.join('、') || '未提供'}，欠缺技能：${missing_skills.join('、') || '无'}` },
      ],
      0.7,
      2000,
      true
    );

    // 解析 LLM 返回的 JSON
    const parsed = parseLLMResponse(result);

    res.json({
      success: true,
      data: {
        career_path: parsed.career_path || { year_1: '', year_3: '', year_5: '' },
        action_plan_30_days: parsed.action_plan_30_days || [],
        risk_warning: result.risk_warning || '',
      },
      model: LLM_MODEL,
    });
  } catch (error) {
    console.error('行动指南生成失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// 4. 岗位对比分析 API
// ============================================================

app.post('/api/compare-jobs', async (req, res) => {
  try {
    const { job_a, job_b, user_dna = {}, options = {} } = req.body;

    console.log('\n========== 收到岗位对比请求 ==========');
    console.log('岗位 A:', job_a);
    console.log('岗位 B:', job_b);
    console.log('请求选项:', options);

    if (!job_a || !job_b) {
      return res.status(400).json({
        success: false,
        error: '请提供两个岗位名称',
      });
    }

    const { detail_level = 'summary', factor_filter = [] } = options;

    // 用户画像上下文
    const userContext = `
用户职业画像：
- 核心技能：${user_dna.skills?.join('、') || '未识别'}
- 工作偏好：${user_dna.work_context?.join('、') || '未识别'}
- 边界限制：${user_dna.boundaries?.join('、') || '无'}`;

    // 关系类型说明
    const relationTypes = `
关系类型说明：
- positive: 正向影响（A好则B相关因素也好）
- negative: 负向影响（A好则B相关因素差）
- delayed: 延迟影响（短期A好但长期B可能逆转）
- neutral: 无明显关系`;

    // 根据detail_level决定返回内容
    let result;

    if (detail_level === 'summary') {
      // 简略对比 - 只返回胜负统计
      const summaryPrompt = `你是职业分析师。请对比两个岗位的总体优劣。

${userContext}

只返回以下JSON格式：
{"winner": "推荐岗位", "a_wins": 数字, "b_wins": 数字, "ties": 数字, "recommendation": "一句话建议"}`;

      const summaryResult = await chatComplete(
        [
          { role: 'system', content: summaryPrompt },
          { role: 'user', content: `对比 ${job_a} 和 ${job_b}` },
        ],
        0.7,
        500,
        true
      );
      // 解析 LLM 返回的 JSON
      result = parseLLMResponse(summaryResult);
    } else if (detail_level === 'factor_detail') {
      // 详细因子分析 - 增加关系类型和动态分析
      const factorDetailPrompt = `你是专业职业分析师。请对两个岗位进行详细对比分析。

${userContext}
${relationTypes}

请返回以下JSON格式，包含每个因子的详细分析：
{
  "factors": [
    {
      "key": "salary",
      "name": "薪资水平",
      "score_a": 85,
      "score_b": 90,
      "lean": "b",
      "confidence": 0.9,
      "icon": "💰",
      "aText": "A岗位薪资详情",
      "bText": "B岗位薪资详情",
      "insight": "综合分析洞察",
      "relation_type": "neutral",  // positive/negative/delayed/neutral
      "related_factors": ["growth", "stability"]  // 关联的其他因子
    }
  ],
  "factor_groups": {
    "money": {"factors": ["salary", "stability"], "label": "金钱回报"},
    "growth": {"factors": ["growth", "experience", "transfer"], "label": "成长空间"},
    "effort": {"factors": ["pressure", "interview", "portfolio"], "label": "投入成本"},
    "risk": {"factors": ["ai", "optionality"], "label": "风险评估"}
  },
  "summary": {
    "a_wins": 0,
    "b_wins": 0,
    "ties": 0,
    "winner": "",
    "recommendation": "",
    "decision_factors": ["关键决策因素1", "关键决策因素2"]
  }
}`;

      result = parseLLMResponse(await chatComplete(
        [
          { role: 'system', content: factorDetailPrompt },
          { role: 'user', content: `请详细对比 ${job_a} 和 ${job_b}` },
        ],
        0.7,
        2500,
        true
      ));
    } else {
      // 标准对比 - 原有逻辑增强版
      const standardPrompt = `你是专业的职业分析师。请对比分析两个岗位的差异。

${userContext}

请返回以下JSON格式的对比数据，包含每个因子的详细分析文本：
{
  "factors": [
    {
      "key": "salary",
      "name": "薪资水平",
      "score_a": 85,
      "score_b": 90,
      "lean": "b",
      "confidence": 0.9,
      "icon": "💰",
      "aText": "A岗位的薪资具体情况",
      "bText": "B岗位的薪资具体情况",
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
      "aText": "A岗位的成长机会",
      "bText": "B岗位的成长机会",
      "insight": "综合分析",
      "relation_type": "delayed"
    },
    {
      "key": "pressure",
      "name": "工作压力",
      "score_a": 70,
      "score_b": 60,
      "lean": "b",
      "confidence": 0.8,
      "icon": "⚡",
      "aText": "A岗位的工作压力",
      "bText": "B岗位的工作压力",
      "insight": "综合分析",
      "relation_type": "negative"
    },
    {
      "key": "match",
      "name": "能力匹配",
      "score_a": 90,
      "score_b": 65,
      "lean": "a",
      "confidence": 0.95,
      "icon": "🎯",
      "aText": "A岗位与你的匹配度",
      "bText": "B岗位与你的匹配度",
      "insight": "综合分析",
      "relation_type": "neutral"
    },
    {
      "key": "transfer",
      "name": "技能迁移",
      "score_a": 85,
      "score_b": 70,
      "lean": "a",
      "confidence": 0.88,
      "icon": "🔄",
      "reason": "对比理由"
    },
    {
      "key": "experience",
      "name": "经验积累",
      "score_a": 80,
      "score_b": 75,
      "lean": "a",
      "confidence": 0.82,
      "icon": "📚",
      "reason": "对比理由"
    },
    {
      "key": "interview",
      "name": "面试难度",
      "score_a": 65,
      "score_b": 80,
      "lean": "b",
      "confidence": 0.78,
      "icon": "🎤",
      "reason": "对比理由"
    },
    {
      "key": "portfolio",
      "name": "作品集要求",
      "score_a": 70,
      "score_b": 85,
      "lean": "b",
      "confidence": 0.75,
      "icon": "📁",
      "reason": "对比理由"
    },
    {
      "key": "stability",
      "name": "稳定性",
      "score_a": 75,
      "score_b": 80,
      "lean": "b",
      "confidence": 0.8,
      "icon": "🛡️",
      "reason": "对比理由"
    },
    {
      "key": "optionality",
      "name": "职业可选性",
      "score_a": 85,
      "score_b": 70,
      "lean": "a",
      "confidence": 0.83,
      "icon": "🔀",
      "reason": "对比理由"
    },
    {
      "key": "network",
      "name": "人脉积累",
      "score_a": 80,
      "score_b": 75,
      "lean": "a",
      "confidence": 0.77,
      "icon": "🤝",
      "reason": "对比理由"
    },
    {
      "key": "ai",
      "name": "AI 替代风险",
      "score_a": 60,
      "score_b": 70,
      "lean": "a",
      "confidence": 0.72,
      "icon": "🤖",
      "reason": "对比理由"
    },
    {
      "key": "business",
      "name": "商业价值",
      "score_a": 85,
      "score_b": 80,
      "lean": "a",
      "confidence": 0.8,
      "icon": "💼",
      "reason": "对比理由"
    },
    {
      "key": "team",
      "name": "团队协作",
      "score_a": 75,
      "score_b": 85,
      "lean": "b",
      "confidence": 0.76,
      "icon": "👥",
      "reason": "对比理由"
    },
    {
      "key": "remote",
      "name": "远程友好",
      "score_a": 70,
      "score_b": 65,
      "lean": "a",
      "confidence": 0.7,
      "icon": "🏠",
      "reason": "对比理由"
    }
  ],
  "summary": {
    "a_wins": 9,
    "b_wins": 6,
    "ties": 0,
    "winner": "岗位A",
    "recommendation": "综合建议：基于你的核心技能，建议优先考虑..."
  }
}`;

      result = parseLLMResponse(await chatComplete(
        [
          { role: 'system', content: standardPrompt },
          { role: 'user', content: `对比分析 ${job_a} 和 ${job_b}` },
        ],
        0.7,
        2000,
        true
      ));
    }

    // 如果有因子筛选，筛选返回的因子
    if (factor_filter.length > 0 && result.factors) {
      result.factors = result.factors.filter(f => factor_filter.includes(f.key));
    }

    console.log('对比分析结果:', JSON.stringify(result).substring(0, 300) + '...');

    res.json({
      success: true,
      data: result,
      model: LLM_MODEL,
    });
  } catch (error) {
    console.error('对比分析失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// 5. 简历解析 API
// ============================================================

app.post('/api/parse-resume', async (req, res) => {
  try {
    const { text } = req.body;

    console.log('\n========== 收到简历解析请求 ==========');
    console.log('简历文本长度:', text?.length || 0);

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: '请提供简历文本内容',
      });
    }

    const systemPrompt = `你是一位专业的简历分析师。请从用户提供的文本中提取结构化的职业经历信息。

请严格按照以下 JSON 格式返回：
{
  "entries": [
    {
      "scene": "情境描述（发生了什么，背景是什么）",
      "action": "行动描述（你具体做了什么）",
      "result": "结果描述（产生了什么影响）",
      "feeling": "感受描述（你为什么有成就感）"
    }
  ],
  "summary": {
    "years_experience": 工作年限估算,
    "key_skills": ["技能1", "技能2"],
    "industries": ["行业1", "行业2"],
    "roles": ["职位1", "职位2"]
  }
}`;

    const result = parseLLMResponse(await chatComplete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      0.5,
      3000,
      true
    ));

    console.log('简历解析结果:', JSON.stringify(result).substring(0, 300) + '...');

    res.json({
      success: true,
      data: result,
      model: LLM_MODEL,
    });
  } catch (error) {
    console.error('简历解析失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// 6. 职业偏好校准 API（对话式追问 + 偏好提炼）
// ============================================================

// 对话阶段配置
const CONVERSATION_STAGES = {
  INITIAL: 'initial',      // 初始阶段：基于经历提问
  VALUES: 'values',       // 价值观探索
  PERSONALITY: 'personality', // 性格偏好
  WORKSTYLE: 'workstyle',   // 工作方式
  BOUNDARY: 'boundary',    // 职业边界
  COMPLETING: 'completing', // 完成阶段
};

// 追问主题轮转
const TOPIC_SEQUENCE = [
  CONVERSATION_STAGES.VALUES,
  CONVERSATION_STAGES.PERSONALITY,
  CONVERSATION_STAGES.WORKSTYLE,
  CONVERSATION_STAGES.BOUNDARY,
];

// 对话式追问
app.post('/api/coach-chat', async (req, res) => {
  try {
    const {
      messages = [],
      user_input,
      system_context = {},
      stage = CONVERSATION_STAGES.INITIAL,
      topic_index = 0,
      user_entries = []
    } = req.body;

    console.log('\n========== 收到职业教练对话请求 ==========');
    console.log('当前阶段:', stage);
    console.log('话题索引:', topic_index);
    console.log('用户输入:', user_input?.substring(0, 100));

    // 构建用户经历摘要（用于生成更精准的追问）
    const entrySummary = user_entries.length > 0
      ? user_entries.map((e, i) =>
          `【经历${i + 1}】情境: ${e.scene?.substring(0, 30) || '未提供'} | 行动: ${e.action?.substring(0, 30) || '未提供'} | 成果: ${e.result?.substring(0, 30) || '未提供'} | 感受: ${e.feeling || '未提供'}`
        ).join('\n')
      : '暂无经历信息';

    // 动态系统提示
    const getSystemPrompt = (questionCount) => {
      let basePrompt = `你是职业教练 AI。你要和用户进行职业偏好校准访谈。

请遵循以下原则：
1) 保持友好、专业的语气，像一位资深职业顾问
2) 每次只问一个问题，不要一次性问多个问题
3) 追问要具体、有深度，基于用户的回答继续挖掘
4) 最多追问 3 次，第 3 次必须结束并设置 finished: true
5) 禁止使用任何Markdown格式`;

      // 基于不同阶段添加特定引导
      switch (stage) {
        case CONVERSATION_STAGES.INITIAL:
          basePrompt += `\n\n当前阶段：初始访谈
- 基于用户的经历提炼1个关键问题
- 问题应该能揭示用户的核心能力倾向和潜在价值观
- 示例： "你说在XXX中感到成就感，能具体说说是什么让你有这样的感受吗？"
- 注意：这是第 ${questionCount + 1} 次追问，还剩 ${2 - questionCount} 次`;
          break;
        case CONVERSATION_STAGES.VALUES:
          basePrompt += `\n\n当前阶段：价值观探索
- 探索用户职业价值观：成就感、稳定性、创新探索、平衡生活、高收入等
- 问具体情境而非抽象概念
- 示例： "如果一份工作能让你快速成长但不太稳定，你会怎么选择？"
- 注意：这是第 ${questionCount + 1} 次追问，还剩 ${2 - questionCount} 次`;
          break;
        case CONVERSATION_STAGES.PERSONALITY:
          basePrompt += `\n\n当前阶段：性格与工作方式偏好
- 探索内外向、团队/独立工作、决策风格等
- 通过具体场景了解用户的舒适区
- 示例： "你喜欢在团队讨论中发言，还是更倾向独立思考后再分享？"
- 注意：这是第 ${questionCount + 1} 次追问，还剩 ${2 - questionCount} 次`;
          break;
        case CONVERSATION_STAGES.WORKSTYLE:
          basePrompt += `\n\n当前阶段：工作方式与节奏偏好
- 探索工作节奏、沟通频率、压力承受度等
- 了解用户的理想工作状态
- 示例： "你更喜欢快节奏高强度的项目，还是稳定可预期的日常工作？"
- 注意：这是第 ${questionCount + 1} 次追问，还剩 ${2 - questionCount} 次`;
          break;
        case CONVERSATION_STAGES.BOUNDARY:
          basePrompt += `\n\n当前阶段：职业边界探索
- 了解用户绝对不接受的工作场景
- 识别可能让用户离职的触发因素
- 示例： "什么样的工作内容或环境是你绝对不想接受的？"
- 注意：这是第 ${questionCount + 1} 次追问，还剩 ${2 - questionCount} 次`;
          break;
        default:
          break;
      }

      basePrompt += `\n\n返回格式（JSON）：
{
  "reply": "你的回复（纯文本，不要markdown）",
  "finished": false,
  "next_topic": "下一个探索主题（values/personality/workstyle/boundary/complete）",
  "insight": "从用户回答中提取的关键洞察（用于后续参考）"
}`;

      return basePrompt;
    };

    // 构建对话历史
    const conversationHistory = [
      ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: user_input || '请开始' }
    ];

    // 如果是初始对话，添加经历摘要作为上下文
    if (stage === CONVERSATION_STAGES.INITIAL && user_entries.length > 0) {
      conversationHistory.unshift({
        role: 'system',
        content: `用户已提供的经历摘要：\n${entrySummary}\n\n请基于这些经历生成有针对性的初始问题。`
      });
    }

    // 计算追问次数（用户发送的消息数）
    const questionCount = messages.filter(m => m.role === 'user').length;
    console.log('当前追问次数:', questionCount);

    // 第 3 次追问后强制结束
    const isLastQuestion = questionCount >= 2;

    const parsedResult = parseLLMResponse(await chatComplete(
      [
        { role: 'system', content: getSystemPrompt(questionCount) },
        ...conversationHistory,
      ],
      0.7,
      1200,
      true
    ));

    console.log('教练回复:', parsedResult.reply?.substring(0, 200));
    console.log('是否完成:', parsedResult.finished);

    // 第 3 次必须返回 finished: true
    const finalFinished = isLastQuestion ? true : (parsedResult.finished || false);

    res.json({
      success: true,
      data: {
        reply: parsedResult.reply || '好的，我已经了解了你的情况。',
        finished: finalFinished,
        next_topic: parsedResult.next_topic || 'complete',
        insight: parsedResult.insight || '',
        remaining_questions: Math.max(0, 3 - questionCount - 1),
      },
      model: LLM_MODEL,
    });
  } catch (error) {
    console.error('教练对话失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 偏好提炼总结（增强版）
app.post('/api/coach-summarize', async (req, res) => {
  try {
    const {
      messages = [],
      user_entries = [],
      insights = []
    } = req.body;

    console.log('\n========== 收到偏好提炼请求 ==========');
    console.log('对话消息数:', messages.length);
    console.log('经历条目数:', user_entries.length);
    console.log('洞察记录数:', insights.length);

    // 构建更丰富的上下文
    const conversationText = messages
      .map((m) => `${m.role === 'assistant' ? '教练' : '用户'}：${m.content}`)
      .join('\n\n');

    // 提取经历中的关键信息
    const entryInsights = user_entries.map((e, i) => ({
      index: i + 1,
      scene: e.scene?.substring(0, 50) || '',
      result: e.result?.substring(0, 50) || '',
      feeling: e.feeling || '',
    }));

    // 整合对话洞察
    const conversationInsights = insights.join('\n');

    const systemPrompt = `你是职业偏好总结器。根据用户的对话记录、经历和洞察输出完整的偏好画像。

请从以下维度进行总结：

## 价值观（values）
可选：成就感、稳定性、创新探索、平衡生活、高收入、独立自主、社会价值、影响力

## 成就来源（achievementRecall）
一句话总结用户的核心成就感来源

## 性格特征（personality）
- introExtro: 内向/外向/平衡
- workStyle: 独立完成/团队协作/指导他人
- decisionStyle: 快速果断/谨慎分析/协商共识

## 工作方式偏好（workPreferences）
- pace: 快节奏/平衡节奏/稳定节奏
- collaboration: 高度协作/适度协作/独立为主
- communication: 频繁沟通/按需沟通/书面为主

## 职业边界（boundaries）
用户绝对不接受的工作场景或条件

## 风险承受（riskTolerance）
高风险高回报/中等平衡/稳定优先

返回格式（JSON）：
{
  "achievementRecall": "一句话描述",
  "values": ["价值观1", "价值观2"],
  "personality": {
    "introExtro": "内向/外向/平衡",
    "workStyle": "独立完成/团队协作/指导他人",
    "decisionStyle": "快速果断/谨慎分析/协商共识"
  },
  "workPreferences": {
    "pace": "快节奏/平衡节奏/稳定节奏",
    "collaboration": "高度协作/适度协作/独立为主",
    "communication": "频繁沟通/按需沟通/书面为主"
  },
  "boundaries": ["边界1", "边界2"],
  "riskTolerance": "高风险高回报/中等平衡/稳定优先",
  "testReference": "简短备注"
}`;

    const userContent = `
用户经历摘要：
${JSON.stringify(entryInsights, null, 2)}

对话记录：
${conversationText}

对话洞察（来自教练分析）：
${conversationInsights}`;

    const result = parseLLMResponse(await chatComplete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      0.5,
      1500,
      true
    ));

    console.log('偏好提炼结果:', JSON.stringify(result).substring(0, 300));

    res.json({
      success: true,
      data: {
        achievementRecall: result.achievementRecall || '',
        values: result.values || [],
        personality: result.personality || {
          introExtro: '平衡',
          workStyle: '团队协作',
          decisionStyle: '协商共识'
        },
        workPreferences: result.workPreferences || {
          pace: '平衡节奏',
          collaboration: '适度协作',
          communication: '按需沟通'
        },
        boundaries: result.boundaries || [],
        riskTolerance: result.riskTolerance || '中等平衡',
        testReference: result.testReference || '',
      },
      model: LLM_MODEL,
    });
  } catch (error) {
    console.error('偏好提炼失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// 7. 动态因子更新 API（用于图谱交互）
// ============================================================

app.post('/api/update-factor', async (req, res) => {
  try {
    const { job_a, job_b, factor_key, user_dna = {} } = req.body;

    console.log('\n========== 收到因子更新请求 ==========');
    console.log('岗位 A:', job_a);
    console.log('岗位 B:', job_b);
    console.log('更新因子:', factor_key);

    if (!job_a || !job_b || !factor_key) {
      return res.status(400).json({
        success: false,
        error: '请提供两个岗位名称和要更新的因子',
      });
    }

    // 因子中文名称映射
    const factorNames = {
      salary: '薪资水平',
      growth: '成长空间',
      pressure: '工作压力',
      match: '能力匹配',
      transfer: '技能迁移',
      experience: '经验积累',
      interview: '面试难度',
      portfolio: '作品集要求',
      stability: '稳定性',
      optionality: '职业可选性',
      network: '人脉积累',
      ai: 'AI替代风险',
      business: '商业价值',
      team: '团队协作',
      remote: '远程友好',
    };

    const factorName = factorNames[factor_key] || factor_key;

    const systemPrompt = `你是专业职业分析师。请针对用户关注的具体因子，深入分析两个岗位的差异。

用户职业画像：
- 核心技能：${user_dna.skills?.join('、') || '未识别'}
- 工作偏好：${user_dna.work_context?.join('、') || '未识别'}
- 边界限制：${user_dna.boundaries?.join('、') || '无'}

请返回以下JSON格式：
{
  "factor": {
    "key": "${factor_key}",
    "name": "${factorName}",
    "score_a": 0-100的数字分数,
    "score_b": 0-100的数字分数,
    "lean": "a"或"b"或"tie",
    "confidence": 0-1的置信度,
    "icon": "相关emoji",
    "aText": "A岗位在该维度的详细分析",
    "bText": "B岗位在该维度的详细分析",
    "insight": "综合洞察和建议",
    "relation_type": "positive/negative/delayed/neutral",
    "related_factors": ["关联的其他因子key"]
  }
}`;

    const rawResult = await chatComplete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请详细分析 ${job_a} vs ${job_b} 在 ${factorName} 这个维度上的差异` },
      ],
      0.7,
      1500,
      true
    );

    const result = parseLLMResponse(rawResult);

    console.log('因子更新结果:', JSON.stringify(result).substring(0, 200));

    res.json({
      success: true,
      data: result,
      model: LLM_MODEL,
    });
  } catch (error) {
    console.error('因子更新失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// 启动服务器
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 Career Compass API Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Model: ${LLM_MODEL}`);
  console.log(`   Base URL: ${AIPING_BASE_URL}`);
  console.log(`   API Keys: ${API_KEYS.length} 个`);
});

export default app;