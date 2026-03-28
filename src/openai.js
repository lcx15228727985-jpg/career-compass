/**
 * 可选：用户本地填入 OpenAI API Key 时调用（仅用于本机验证，勿用于生产公开站点）
 */

const STORAGE_KEY = 'skill_pivot_openai_key';
const BASE = 'https://api.openai.com/v1/chat/completions';

export function getStoredApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key) {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key.trim());
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function buildPrompt(experiences, jdText, template) {
  const exStr = experiences
    .map(
      (e) =>
        `- id:${e.id}\n  类型:${e.typeLabel}\n  标题:${e.title}\n  时间:${e.dateRange}\n  描述:${e.body}`
    )
    .join('\n');

  return `你是「跨界翻译官」职业顾问。根据用户经历与目标岗位，输出严格 JSON（不要 markdown）。

目标岗位模板：${template.name}
模板能力维度：${template.capabilities.join('、')}
用户粘贴的 JD：${jdText || '（空）'}

用户经历：
${exStr}

请输出 JSON 格式：
{
  "rows": [
    {
      "id": "经历id::岗位关键词短语",
      "experienceId": "与输入一致",
      "experienceTitle": "标题",
      "roleKeyword": "来自模板能力或 JD 的关键词短语",
      "strength": "high|medium|low",
      "reasoning": "2-4 句中文，必须引用用户经历中的具体事实，说明为何能迁移到该关键词",
      "kept": true
    }
  ],
  "hiddenSkills": ["3-6 个隐性可迁移能力短语"],
  "gapHints": ["0-3 条与 JD 的差距提示，要可执行"]
}

要求：
- rows 条数建议在 ${Math.min(12, experiences.length * template.capabilities.length)} 以内，优先高质量。
- 禁止编造用户未提及的成果；若需假设，在 reasoning 末尾标注「（示例，请替换真实数据）」。
- strength 要诚实：无关联则为 low。`;
}

export async function generateWithOpenAI(experiences, jdText, template, apiKey) {
  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: '你只输出合法 JSON，键名与结构必须与用户要求一致。' },
      { role: 'user', content: buildPrompt(experiences, jdText, template) },
    ],
  };

  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('空响应');
  const parsed = JSON.parse(text);
  if (!parsed.rows || !Array.isArray(parsed.rows)) {
    throw new Error('返回 JSON 结构异常');
  }
  return {
    rows: parsed.rows.map((r) => ({ ...r, kept: r.kept !== false })),
    hiddenSkills: parsed.hiddenSkills || [],
    gapHints: parsed.gapHints || [],
  };
}
