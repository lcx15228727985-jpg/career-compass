import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// 使用 CDN worker 方式
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.0/pdf.worker.min.mjs`;

// 提取简历文本的函数
async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items.map((item) => item.str).join(' ');
    if (line.trim()) pages.push(line);
  }

  return pages.join('\n');
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

async function extractDocText(file) {
  const arrayBuffer = await file.arrayBuffer();
  // .doc 二进制格式很难在前端完整解析，这里做降级文本提取
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
  return decoded.replace(/[^\x09\x0A\x0D\x20-\x7E\u4E00-\u9FFF]/g, ' ');
}

export async function extractTextFromResumeFile(file) {
  const name = (file?.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return extractPdfText(file);
  if (name.endsWith('.docx')) return extractDocxText(file);
  if (name.endsWith('.doc')) return extractDocText(file);
  throw new Error('仅支持 PDF / DOC / DOCX 文件');
}

function buildPrompt(resumeText) {
  return `你是职业规划助理。请把以下简历文本解析为结构化经历，输出严格 JSON（不要 markdown）。

目标：提取 3-8 段经历，并把每段整理为：
- scene（情境）
- action（行动）
- result（结果）
- feeling（感受）

要求：
1) 只基于简历文本，不要编造事实。
2) 如果简历缺少“感受”，可给“基于内容的合理推断”，并在文本末尾标注“（推断）”。
3) 每个字段尽量 1-2 句话，简洁清晰。
4) 输出格式：
{
  "experiences": [
    {
      "scene": "...",
      "action": "...",
      "result": "...",
      "feeling": "..."
    }
  ]
}

简历文本：
${resumeText}`;
}

export async function parseExperiencesWithOpenAI(resumeText, apiKey) {
  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: '你只输出合法 JSON。' },
      { role: 'user', content: buildPrompt(resumeText) },
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
  if (!text) throw new Error('模型返回为空');

  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed.experiences) ? parsed.experiences : [];
  if (!list.length) throw new Error('未解析到经历，请检查简历内容');

  return list
    .slice(0, 8)
    .map((item) => ({
      scene: String(item.scene || '').trim(),
      action: String(item.action || '').trim(),
      result: String(item.result || '').trim(),
      feeling: String(item.feeling || '').trim(),
    }))
    .filter((x) => x.scene || x.action || x.result || x.feeling);
}
