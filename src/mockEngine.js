const ROLE_POOL = [
  { name: '产品经理（校招）', tags: ['沟通协作', '问题拆解', '用户洞察'], pressure: 'high', growth: 'high' },
  { name: '用户研究助理', tags: ['用户洞察', '结构化表达', '同理心'], pressure: 'medium', growth: 'medium' },
  { name: '内容运营', tags: ['表达写作', '执行推进', '沟通协作'], pressure: 'medium', growth: 'medium' },
  { name: '社区运营', tags: ['同理心', '沟通协作', '执行推进'], pressure: 'medium', growth: 'medium' },
  { name: '数据分析助理', tags: ['数据分析', '结构化表达', '问题拆解'], pressure: 'medium', growth: 'high' },
  { name: '商业分析助理', tags: ['数据分析', '沟通协作', '结构化表达'], pressure: 'high', growth: 'high' },
  { name: '项目管理专员', tags: ['执行推进', '沟通协作', '问题拆解'], pressure: 'high', growth: 'medium' },
  { name: '客户成功专员', tags: ['沟通协作', '同理心', '执行推进'], pressure: 'medium', growth: 'medium' },
  { name: '招聘运营', tags: ['沟通协作', '结构化表达', '执行推进'], pressure: 'high', growth: 'medium' },
  { name: '品牌策划助理', tags: ['表达写作', '用户洞察', '沟通协作'], pressure: 'medium', growth: 'high' },
  { name: '新媒体编辑', tags: ['表达写作', '用户洞察', '执行推进'], pressure: 'medium', growth: 'medium' },
  { name: '课程运营', tags: ['结构化表达', '沟通协作', '同理心'], pressure: 'medium', growth: 'medium' },
  { name: '企业培训助理', tags: ['表达写作', '同理心', '执行推进'], pressure: 'low', growth: 'medium' },
  { name: '咨询顾问助理', tags: ['问题拆解', '结构化表达', '沟通协作'], pressure: 'high', growth: 'high' },
  { name: '政策研究助理', tags: ['结构化表达', '问题拆解', '表达写作'], pressure: 'low', growth: 'medium' },
  { name: '行业研究分析师（初级）', tags: ['结构化表达', '数据分析', '问题拆解'], pressure: 'medium', growth: 'high' },
  { name: '数据标注质检', tags: ['数据分析', '执行推进', '结构化表达'], pressure: 'low', growth: 'medium' },
  { name: 'AI 评测专员', tags: ['结构化表达', '问题拆解', '数据分析'], pressure: 'medium', growth: 'high' },
  { name: '提示词运营', tags: ['表达写作', '问题拆解', '用户洞察'], pressure: 'medium', growth: 'high' },
  { name: '运营分析', tags: ['数据分析', '执行推进', '结构化表达'], pressure: 'medium', growth: 'high' },
  { name: '销售运营', tags: ['沟通协作', '数据分析', '执行推进'], pressure: 'high', growth: 'high' },
  { name: '增长运营', tags: ['数据分析', '用户洞察', '问题拆解'], pressure: 'high', growth: 'high' },
  { name: '电商运营', tags: ['执行推进', '数据分析', '沟通协作'], pressure: 'high', growth: 'medium' },
  { name: '用户增长内容策划', tags: ['表达写作', '用户洞察', '执行推进'], pressure: 'high', growth: 'high' },
  { name: '企业内控专员', tags: ['结构化表达', '问题拆解', '执行推进'], pressure: 'low', growth: 'medium' },
  { name: 'PMO 助理', tags: ['执行推进', '结构化表达', '沟通协作'], pressure: 'medium', growth: 'medium' },
  { name: '产品运营（B 端）', tags: ['沟通协作', '问题拆解', '执行推进'], pressure: 'medium', growth: 'high' },
  { name: '教育产品助理', tags: ['同理心', '用户洞察', '结构化表达'], pressure: 'medium', growth: 'medium' },
  { name: '知识管理专员', tags: ['结构化表达', '表达写作', '执行推进'], pressure: 'low', growth: 'medium' },
  { name: '企业传播专员', tags: ['表达写作', '沟通协作', '用户洞察'], pressure: 'medium', growth: 'medium' },
];

const SALARY_RANGE_BY_ROLE = {
  '产品经理（校招）': '18k-35k/月（1-3年，一线城市）',
  '用户研究助理': '12k-22k/月（1-3年）',
  内容运营: '8k-18k/月（初中级，一线）',
  社区运营: '8k-16k/月（初中级）',
  数据分析助理: '12k-30k/月（随经验提升）',
  商业分析助理: '15k-32k/月（初中级）',
  项目管理专员: '12k-24k/月',
  客户成功专员: '10k-20k/月（初中级）',
  招聘运营: '9k-18k/月',
  品牌策划助理: '10k-20k/月',
  新媒体编辑: '8k-16k/月',
  课程运营: '10k-20k/月',
  企业培训助理: '9k-18k/月',
  咨询顾问助理: '15k-30k/月',
  政策研究助理: '10k-22k/月',
  '行业研究分析师（初级）': '12k-26k/月',
  数据标注质检: '8k-15k/月',
  'AI 评测专员': '12k-25k/月',
  提示词运营: '12k-24k/月',
  运营分析: '12k-26k/月',
  销售运营: '10k-22k/月',
  增长运营: '12k-28k/月',
  电商运营: '8k-18k/月',
  用户增长内容策划: '12k-24k/月',
  企业内控专员: '10k-20k/月',
  'PMO 助理': '10k-20k/月',
  '产品运营（B 端）': '12k-26k/月',
  教育产品助理: '10k-20k/月',
  知识管理专员: '10k-18k/月',
  企业传播专员: '10k-20k/月',
};

function inferSkillSignals(text) {
  const s = String(text || '');
  const rules = [
    [/数据|分析|统计|sql|python|报表|指标/i, '数据分析'],
    [/沟通|协调|对接|跨部门|谈判|外联/i, '沟通协作'],
    [/写作|文案|内容|表达|汇报|演讲/i, '表达写作'],
    [/用户|访谈|需求|反馈|洞察/i, '用户洞察'],
    [/推进|执行|落地|排期|管理|组织/i, '执行推进'],
    [/拆解|逻辑|归纳|框架|复盘|方案/i, '问题拆解'],
    [/同理|支持|服务|辅导|社群/i, '同理心'],
    [/归档|规范|整理|核对|校验|文档/i, '结构化表达'],
  ];
  return rules.filter(([re]) => re.test(s)).map((item) => item[1]);
}

function inferDrives(text) {
  const s = String(text || '');
  const drives = [];
  if (/成就|挑战|突破|拿下|增长/.test(s)) drives.push('成就驱动');
  if (/稳定|长期|安心|节奏|可持续/.test(s)) drives.push('稳定偏好');
  if (/影响|带动|帮助|改变/.test(s)) drives.push('影响力驱动');
  if (/探索|创新|尝试|新领域/.test(s)) drives.push('探索驱动');
  return drives.length ? drives : ['成就驱动'];
}

function inferBoundaries(text) {
  const s = String(text || '');
  const out = [];
  if (/不喜欢加班|抗压差|高压/.test(s)) out.push('不适合长期高压和强加班环境');
  if (/不喜欢销售|讨厌应酬/.test(s)) out.push('对高频销售和应酬场景兴趣较低');
  if (/不喜欢重复|机械/.test(s)) out.push('不适合高度重复、低自主性工作');
  if (/社恐|不擅长公开表达/.test(s)) out.push('需避免过重的公开演讲和纯 BD 岗位');
  return out;
}

function toPath(role) {
  return {
    oneYear: `1年内：进入 ${role.name}，完成基础业务闭环并形成1-2个可展示成果。`,
    threeYear: `3年内：在 ${role.name} 方向成为可独立负责模块的骨干，沉淀方法论。`,
    fiveYear: `5年内：可成长为该方向高级岗位，或向相关管理/专家路径延展。`,
  };
}

function planForRole(role) {
  return [
    `完成一个与「${role.name}」相关的小项目并公开复盘。`,
    `访谈2位该岗位从业者，验证真实工作节奏与压力。`,
    `补齐1项核心能力：${role.tags[0]}。`,
    '更新个人叙事：我为什么适合 + 我为什么长期愿意做。',
  ];
}

export function generateCareerReport(entries, reflection = {}) {
  const text = entries
    .map((e) => `${e.scene}\n${e.action}\n${e.result}\n${e.feeling}`)
    .join('\n');
  const skillVotes = new Map();
  for (const tag of inferSkillSignals(text)) {
    skillVotes.set(tag, (skillVotes.get(tag) || 0) + 1);
  }

  if (!skillVotes.size) {
    skillVotes.set('沟通协作', 2);
    skillVotes.set('执行推进', 2);
    skillVotes.set('结构化表达', 2);
  }

  const topSkills = [...skillVotes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((item) => item[0]);
  const drives = [...new Set(inferDrives(text))].slice(0, 4);
  const valuePrefs = reflection.values || [];
  if (valuePrefs.includes('稳定性') && !drives.includes('稳定偏好')) drives.push('稳定偏好');
  if (valuePrefs.includes('成就感') && !drives.includes('成就驱动')) drives.push('成就驱动');
  if (valuePrefs.includes('创新探索') && !drives.includes('探索驱动')) drives.push('探索驱动');
  const boundaries = inferBoundaries(text).slice(0, 5);
  if (!boundaries.length) boundaries.push('暂未识别明确边界，建议补充“不想做什么”的描述。');

  const ranked = ROLE_POOL.map((role) => {
    const skillMatch = role.tags.reduce((n, tag) => n + (topSkills.includes(tag) ? 1 : 0), 0);
    const growthWeight = role.growth === 'high' ? 1.2 : 0.8;
    const pressurePenalty = boundaries.some((b) => b.includes('高压')) && role.pressure === 'high' ? -1 : 0;
    const score = skillMatch * 20 + growthWeight * 10 + pressurePenalty * 8;
    return {
      ...role,
      score: Math.round(score),
      salaryRange: SALARY_RANGE_BY_ROLE[role.name] || '10k-25k/月（公开招聘区间参考）',
    };
  }).sort((a, b) => b.score - a.score);

  const jobs = ranked.slice(0, 30);
  const tier1 = jobs.slice(0, 10);
  const tier2 = jobs.slice(10, 20);
  const tier3 = jobs.slice(20, 30);

  const focusRoles = jobs.slice(0, 3).map((role) => ({
    name: role.name,
    reason: `你的能力簇与岗位能力重合度高（${role.tags.join(' / ')}），且发展性为 ${role.growth === 'high' ? '高' : '中'}。`,
    risk: role.pressure === 'high'
      ? '该方向节奏偏快，需评估压力承受与长期可持续性。'
      : '该方向节奏相对可控，但需注意成长上限与晋升通道。',
    path: toPath(role),
    actionPlan: planForRole(role),
  }));

  return {
    profile: {
      skills: topSkills,
      drives,
      boundaries,
      reflection,
    },
    tiers: [
      { name: '第一梯队（现在可试）', jobs: tier1 },
      { name: '第二梯队（可迁移）', jobs: tier2 },
      { name: '第三梯队（探索潜力）', jobs: tier3 },
    ],
    focusRoles,
  };
}

function intersectionCount(a = [], b = []) {
  const setB = new Set(b);
  let n = 0;
  for (const x of a) if (setB.has(x)) n += 1;
  return n;
}

function normalizeSkillLabel(s) {
  // 兼容 profile.skills 里的标签名称
  return String(s || '').trim();
}

function boundaryKeyword(boundaries = []) {
  // 将边界句子归一成可命中的关键词
  const joined = boundaries.join('；');
  if (/高压|加班|强加班/i.test(joined)) return 'pressure';
  if (/销售|应酬/i.test(joined)) return 'sales';
  if (/重复|机械/i.test(joined)) return 'repeat';
  if (/公开演讲|社恐|BD/i.test(joined)) return 'public';
  return 'none';
}

function dayScheduleForRole(role) {
  // 用岗位标签生成一日节奏（近似“真实感”但不冒充具体公司）
  const tags = role.tags || [];
  const primary = tags[0] || '问题拆解';
  const second = tags[1] || '沟通协作';
  const third = tags[2] || '结构化表达';
  return [
    `09:30 · 任务接入与目标对齐：确认这天要解决什么，以及“交付标准”。（偏好：${primary}）`,
    `11:00 · 产出主线：做分析/整理/沟通推进中的一个关键环节，产出可复用的中间件。（偏好：${second}）`,
    `14:00 · 协同与对齐：同步不同角色口径，必要时更新一份简短的文档/清单。（偏好：${third}）`,
    `16:30 · 风险回看：检查事实、异常或口径冲突，记录下一次如何避免同类问题。`,
    `18:00 · 收尾复盘：沉淀方法论要点，并把待验证事项列成下一步清单。`,
  ];
}

function generateQuestionBank(role) {
  const roleTags = role.tags || [];
  const hasData = roleTags.includes('数据分析');
  const hasUser = roleTags.includes('用户洞察');
  const hasComms = roleTags.includes('沟通协作');

  return [
    {
      id: 'q1',
      prompt: '上午收到一个“看起来差不多”的任务，你第一步怎么做？',
      options: [
        {
          id: 'a',
          text: '先澄清边界与成功标准：把需求拆成可验收清单，再对齐相关人。',
          signals: ['问题拆解', '沟通协作', '结构化表达'],
          risk: '',
        },
        {
          id: 'b',
          text: '直接开干：先交一个版本，边做边修正。',
          signals: ['执行推进'],
          risk: '如果口径没对齐，后续返工概率上升。',
        },
        {
          id: 'c',
          text: '先找模板照做：节省时间，但不一定验证适配性。',
          signals: ['结构化表达', '表达写作'],
          risk: '可能错过关键差异点，导致“做对了但不对题”。',
        },
      ],
      hint: `该岗位更看重“${roleTags[0] || '问题拆解'}”带来的可控交付。`,
    },
    {
      id: 'q2',
      prompt: hasData
        ? '你拿到一份数据，发现其中一段与预期不一致。你会怎么处理？'
        : '你发现信息不完整/口径冲突时，你会怎么处理？',
      options: [
        {
          id: 'a',
          text: '做假设并标注待验证点：同时记录复现步骤/异常原因，降低未来踩坑成本。',
          signals: ['问题拆解', '结构化表达'],
          risk: '需要时间写清楚假设与验证路径。',
        },
        {
          id: 'b',
          text: '先把不一致的部分跳过，保证今天能交付。',
          signals: ['执行推进'],
          risk: '短期交付ok，但可能在下游被放大成“事实错误”。',
        },
        {
          id: 'c',
          text: '宁愿晚点交付，也要做到“看起来很完美”。',
          signals: ['执行推进', '结构化表达'],
          risk: '可能牺牲节奏与迭代速度，导致错过窗口期。',
        },
      ],
      hint: hasUser
        ? '在“用户洞察”相关岗位里，异常数据往往意味着用户真实行为不同。'
        : '在真实工作里，“先验证再推进”比“先追求完美”更常见。',
    },
    {
      id: 'q3',
      prompt: hasComms ? '跨部门/多角色对同一问题给出不同观点，你怎么对齐？' : '同一问题出现不同观点，你怎么落到行动？',
      options: [
        {
          id: 'a',
          text: '把分歧写进文档：列出判断依据、证据与下一步验证方式，推动一致。',
          signals: ['沟通协作', '结构化表达', '问题拆解'],
          risk: '',
        },
        {
          id: 'b',
          text: '按我判断的“最合理方案”定下来，然后尽量说服对方。',
          signals: ['沟通协作', '执行推进'],
          risk: '需要很强的说服与情绪管理；否则容易对立。',
        },
        {
          id: 'c',
          text: '先延期：等信息更全再做决定。',
          signals: ['执行推进'],
          risk: '可能导致决策窗口错过，拖慢整体节奏。',
        },
      ],
      hint: `岗位标签：${roleTags.join(' / ') || '通用协作'}`,
    },
    {
      id: 'q4',
      prompt: '一天结束，你如何让“今天的产出”在明天可复用？',
      options: [
        {
          id: 'a',
          text: '产出复盘要点：把结论、假设、待验证清单记录下来，并形成轻量模板。',
          signals: ['结构化表达', '问题拆解', '用户洞察'],
          risk: '需要你习惯“写得够用”。',
        },
        {
          id: 'b',
          text: '只要结果交付就行：把文档留到以后补。',
          signals: ['执行推进'],
          risk: '以后补通常会失去时间与记忆准确性。',
        },
        {
          id: 'c',
          text: '把所有细节都写进去，力求无遗漏。',
          signals: ['结构化表达'],
          risk: '信息过载会降低复用效率。',
        },
      ],
      hint: '长期竞争力来自“可复用的方法论”，而不是一次性完成。',
    },
  ];
}

/**
 * 职业模拟器：用于让用户在未实习/未进入行业之前，理解真实工作节奏与决策取舍。
 */
export function generateCareerSimulator(role, profile) {
  const r = role || {};
  const p = profile || { skills: [], drives: [], boundaries: [] };

  const skillPool = (p.skills || []).map(normalizeSkillLabel);
  const drives = p.drives || [];
  const boundaries = p.boundaries || [];
  const bkw = boundaryKeyword(boundaries);

  const questions = generateQuestionBank(r).map((q) => ({
    ...q,
    options: q.options.map((opt) => ({
      ...opt,
      signals: (opt.signals || []).map(normalizeSkillLabel),
    })),
  }));

  const challenges = [];
  // 依据岗位标签，给出“真实感挑战”
  if (r.tags?.includes('执行推进')) challenges.push('节奏与优先级管理：经常需要在不确定下推进，并做取舍。');
  if (r.tags?.includes('沟通协作')) challenges.push('口径对齐：多方视角不同，沟通成本会比你想的更高。');
  if (r.tags?.includes('数据分析')) challenges.push('数据/事实的一致性：异常不是问题本身，而是需要你解释“为什么”。');
  if (r.tags?.includes('用户洞察')) challenges.push('从反馈到洞察：同样的反馈可能意味着不同的真实需求。');
  if (r.tags?.includes('结构化表达')) challenges.push('文档与复盘质量：写作能力决定协作效率。');
  if (!challenges.length) challenges.push('把复杂问题拆成可执行步骤，是这份工作最常见的能力。');

  // 基于边界给出“更可能卡住”的方向
  const likelyFriction = [];
  if (bkw === 'pressure' && r.pressure === 'high') likelyFriction.push('高压节奏：你可能更容易在“不断切换任务”时耗能。');
  if (bkw === 'sales' && r.name.includes('销售')) likelyFriction.push('销售/应酬：如果你排斥这类场景，长期满意度可能偏低。');
  if (bkw === 'repeat') likelyFriction.push('重复性工作：需要检查是否存在足够的自主性与迭代空间。');
  if (bkw === 'public') likelyFriction.push('公开表达负担：如果岗位需要频繁公开输出，需要提前做训练或选择更合适的子方向。');
  if (!likelyFriction.length) likelyFriction.push('你需要通过“真实任务模拟”验证自己的舒适区，而不是只看兴趣。');

  // 返回前端用于交互的结构
  return {
    role: {
      name: r.name || '意向岗位',
      tags: r.tags || [],
      pressure: r.pressure || 'medium',
      growth: r.growth || 'medium',
    },
    daySchedule: dayScheduleForRole(r),
    challenges,
    drives,
    likelyFriction,
    questions,
    scoring: {
      skillPool,
      // 用于前端评估
      boundaryKeyword: bkw,
    },
  };
}

const SLICE_SIMULATORS = {
  pm: {
    id: 'pm',
    title: '产品经理 · 消息改版冲刺',
    intro: {
      identity: '你是功能线 PM，负责下一版本消息通知改版。',
      time: '周二 10:00，距离封板还有 10 天。',
      task: '在老板目标、研发产能、用户投诉之间排出上线方案。',
      goal: '封板前达成可灰度验证的最小闭环。',
      risk: '研发 headcount 已满，插入需求意味着砍掉别的。',
    },
    nodes: [
      {
        title: '老板与研发的拉扯',
        scene: '老板希望本周提升打开率，研发说再加功能会压缩测试时间。',
        options: [
          {
            id: 'pm1a',
            label: '先拉数据，列 3 个可验证假设再开会',
            feedback: '你赢得了更清晰的讨论基础，但会议推迟了半天。',
            delta: { prof: 2, social: 0, progress: 1, emotion: 0 },
            nextHint: '老板在走廊问你：结论什么时候给？',
          },
          {
            id: 'pm1b',
            label: '先答应方向，会后再拆风险',
            feedback: '老板满意，研发团队开始追问具体取舍。',
            delta: { prof: -1, social: 1, progress: 2, emotion: 0 },
            nextHint: '研发在等你拍板砍哪条需求。',
          },
          {
            id: 'pm1c',
            label: '立刻拉三方对齐目标-约束-取舍',
            feedback: '争论更聚焦，沟通成本也瞬间上升。',
            delta: { prof: 0, social: 2, progress: 0, emotion: 1 },
            nextHint: '大家同意“先定优先级再谈实现”。',
          },
        ],
      },
      {
        title: '降噪与触达冲突',
        scene: '用户反馈“通知太吵”，运营又希望加活动触达位。',
        options: [
          {
            id: 'pm2a',
            label: '优先做降噪，活动位延期',
            feedback: '用户价值更明确，但运营侧短期不满。',
            delta: { prof: 1, social: -1, progress: 0, emotion: 1 },
            nextHint: '你需要补一份运营解释。',
          },
          {
            id: 'pm2b',
            label: '做“活动可关闭”折中方案',
            feedback: '短期冲突降低，但研发复杂度上升。',
            delta: { prof: 1, social: 0, progress: 2, emotion: 0 },
            nextHint: '测试提醒边界 case 变多。',
          },
          {
            id: 'pm2c',
            label: '先按设计最小稿推进，再估点',
            feedback: '设计推进顺，但研发担心“需求反复”。',
            delta: { prof: 0, social: 2, progress: 1, emotion: 1 },
            nextHint: '估点可能超过封板窗口。',
          },
        ],
      },
      {
        title: '评审会最后一分钟',
        scene: '你必须拍板 A/B/C 三条方案的取舍，所有人都看着你。',
        options: [
          {
            id: 'pm3a',
            label: '先 A+C，B 下期',
            feedback: '上线风险可控，但体验创新延后。',
            delta: { prof: 1, social: 0, progress: -1, emotion: 0 },
            nextHint: '',
          },
          {
            id: 'pm3b',
            label: '先 A+B，C 下期',
            feedback: '产品体验更完整，运营短期压力上升。',
            delta: { prof: 2, social: -1, progress: 0, emotion: 1 },
            nextHint: '',
          },
          {
            id: 'pm3c',
            label: '三线并行，压缩测试',
            feedback: '看似都保住，实际交付风险快速上升。',
            delta: { prof: -1, social: 0, progress: -2, emotion: 2 },
            nextHint: '',
          },
        ],
      },
    ],
    wrapText: '没有“完美版本”，只有当下能背锅且可验证的版本。',
  },
  analyst: {
    id: 'analyst',
    title: '数据分析 · 周报与异常排查',
    intro: {
      identity: '你是业务分析同学，负责本周核心指标复盘。',
      time: '周三 09:30，下午要对管理层做汇报。',
      task: '解释核心指标波动并给出可执行建议。',
      goal: '在有限时间内产出可信结论，避免误判业务方向。',
      risk: '数据口径可能不一致，部分字段当天刚上线。',
    },
    nodes: [
      {
        title: '指标突然下滑',
        scene: '核心转化率较上周下降 12%，业务负责人要求“先给结论”。',
        options: [
          {
            id: 'an1a',
            label: '先核对口径与埋点，再出初步判断',
            feedback: '你延迟了结论输出，但降低了误判风险。',
            delta: { prof: 2, social: 0, progress: 1, emotion: 0 },
            nextHint: '业务方在催：能不能先说方向？',
          },
          {
            id: 'an1b',
            label: '先按历史经验给出可能原因',
            feedback: '沟通变快，但团队开始质疑证据充分性。',
            delta: { prof: -1, social: 1, progress: 2, emotion: 1 },
            nextHint: '你需要补证据闭环。',
          },
          {
            id: 'an1c',
            label: '拉上数据工程师与业务一起开 20 分钟对齐会',
            feedback: '会议成本上升，但信息对齐更完整。',
            delta: { prof: 1, social: 2, progress: 1, emotion: 0 },
            nextHint: '你获得了关键字段解释权。',
          },
        ],
      },
      {
        title: '异常值怎么处理',
        scene: '某渠道数据异常高，是否纳入本周汇报结论？',
        options: [
          {
            id: 'an2a',
            label: '单独标注异常，不纳入主结论',
            feedback: '结论更稳健，但看起来“保守”。',
            delta: { prof: 2, social: 0, progress: 0, emotion: 0 },
            nextHint: '管理层会追问增长机会。',
          },
          {
            id: 'an2b',
            label: '纳入结论并给出激进建议',
            feedback: '短期看起来亮眼，但后续验证压力增大。',
            delta: { prof: -1, social: 1, progress: 1, emotion: 1 },
            nextHint: '你需要承担后续偏差风险。',
          },
          {
            id: 'an2c',
            label: '做两版结论：含异常/不含异常',
            feedback: '解释更全面，但汇报复杂度上升。',
            delta: { prof: 1, social: 1, progress: 1, emotion: 0 },
            nextHint: '你得把“为什么”讲得更清楚。',
          },
        ],
      },
      {
        title: '汇报前最后 30 分钟',
        scene: '老板希望 1 页讲清“问题、原因、动作、预期”。',
        options: [
          {
            id: 'an3a',
            label: '保留关键图表，压缩叙事',
            feedback: '信息密度高，可能不易被非数据同学理解。',
            delta: { prof: 1, social: -1, progress: -1, emotion: 0 },
            nextHint: '',
          },
          {
            id: 'an3b',
            label: '先讲业务故事，再落到数据证据',
            feedback: '沟通更顺畅，技术细节需备份页支撑。',
            delta: { prof: 1, social: 2, progress: 0, emotion: 0 },
            nextHint: '',
          },
          {
            id: 'an3c',
            label: '把所有明细放进主汇报',
            feedback: '“很完整”，但决策者可能抓不到重点。',
            delta: { prof: 0, social: -1, progress: 1, emotion: 1 },
            nextHint: '',
          },
        ],
      },
    ],
    wrapText: '分析工作的难点不只是“算对”，更是让结论被正确理解并真正推动决策。',
  },
  content: {
    id: 'content',
    title: '内容运营 · 热点与转化平衡',
    intro: {
      identity: '你是内容运营，负责本周重点活动传播。',
      time: '周一 11:00，今晚要发活动主推内容。',
      task: '兼顾流量、品牌调性与转化目标。',
      goal: '在平台规则下拿到有效曝光与可追踪转化。',
      risk: '热点窗口很短，团队对内容方向意见不一。',
    },
    nodes: [
      {
        title: '选题冲突',
        scene: '团队在“热点蹭流量”与“品牌长期内容”之间争论。',
        options: [
          {
            id: 'co1a',
            label: '做热点切入，但保留品牌主线',
            feedback: '内容更平衡，执行复杂度也提高。',
            delta: { prof: 1, social: 1, progress: 1, emotion: 0 },
            nextHint: '你需要更快推进物料协同。',
          },
          {
            id: 'co1b',
            label: '纯热点打法，先拿流量',
            feedback: '短期曝光上升，品牌一致性承压。',
            delta: { prof: -1, social: 1, progress: -1, emotion: 1 },
            nextHint: '老板会关注“是否偏离定位”。',
          },
          {
            id: 'co1c',
            label: '坚持品牌内容，不跟热点',
            feedback: '调性稳定，但可能错过窗口。',
            delta: { prof: 1, social: 0, progress: 2, emotion: 0 },
            nextHint: '你要解释增长预期。',
          },
        ],
      },
      {
        title: '数据反馈不理想',
        scene: '首条内容点赞还行，但收藏和转化低于预期。',
        options: [
          {
            id: 'co2a',
            label: '快速改封面和标题，再测一版',
            feedback: '短周期可验证，但需要频繁迭代。',
            delta: { prof: 1, social: 0, progress: 0, emotion: 1 },
            nextHint: '设计与审核资源变紧张。',
          },
          {
            id: 'co2b',
            label: '保持不动，观察 24 小时再说',
            feedback: '工作压力短暂下降，但可能错过最佳调整窗口。',
            delta: { prof: 0, social: 0, progress: 2, emotion: 0 },
            nextHint: '窗口期正在流失。',
          },
          {
            id: 'co2c',
            label: '联动社群与私域补发解释内容',
            feedback: '转化链路更完整，协同成本上升。',
            delta: { prof: 1, social: 2, progress: 1, emotion: 0 },
            nextHint: '你需要协调跨团队节奏。',
          },
        ],
      },
      {
        title: '复盘会',
        scene: '你需要给出“下周内容策略”：继续追热点，还是回归体系化选题。',
        options: [
          {
            id: 'co3a',
            label: '双轨制：热点 30% + 体系化 70%',
            feedback: '策略可执行，但要求更强排期管理。',
            delta: { prof: 2, social: 1, progress: 0, emotion: 0 },
            nextHint: '',
          },
          {
            id: 'co3b',
            label: '全面热点化，先把数据拉上去',
            feedback: '短期冲刺感强，长期品牌风险增加。',
            delta: { prof: -1, social: 1, progress: -1, emotion: 1 },
            nextHint: '',
          },
          {
            id: 'co3c',
            label: '全面回归品牌调性，放弃热点',
            feedback: '品牌更统一，但增长预期可能下修。',
            delta: { prof: 1, social: 0, progress: 1, emotion: 0 },
            nextHint: '',
          },
        ],
      },
    ],
    wrapText: '内容运营的真实工作不是“发内容”，而是持续在流量、品牌与转化之间做动态平衡。',
  },
  lecturer: {
    id: 'lecturer',
    title: '教育教学 · 课堂与课程运营',
    intro: {
      identity: '你负责一门课程的教学与课程运营。',
      time: '周三下午，公开课与学生反馈同步进行。',
      task: '确保课堂体验、学习结果和课程口碑。',
      goal: '让学生“听得懂、愿意学、能应用”。',
      risk: '教学准备、学生管理与课程迭代会同时占用精力。',
    },
    nodes: [
      {
        title: '课堂参与度低',
        scene: '后排学生分心，前排互动也不活跃。',
        options: [
          {
            id: 'le1a',
            label: '点名提醒并回到讲授节奏',
            feedback: '秩序提升，但课堂氛围略紧。',
            delta: { prof: 1, social: -1, progress: 0, emotion: 0 },
            nextHint: '后续需要修复参与感。',
          },
          {
            id: 'le1b',
            label: '插入 5 分钟互动任务',
            feedback: '参与度上升，课时压力增加。',
            delta: { prof: 0, social: 2, progress: 1, emotion: 0 },
            nextHint: '你要压缩后半段内容。',
          },
          {
            id: 'le1c',
            label: '继续按原计划推进',
            feedback: '进度稳定，但学生投入感没有改善。',
            delta: { prof: 1, social: 0, progress: -1, emotion: 1 },
            nextHint: '课后反馈可能偏弱。',
          },
        ],
      },
      {
        title: '课程反馈两极',
        scene: '部分学生认为“很有收获”，部分认为“太抽象”。',
        options: [
          {
            id: 'le2a',
            label: '增加案例拆解，降低抽象度',
            feedback: '理解门槛下降，但备课负担上升。',
            delta: { prof: 1, social: 1, progress: 1, emotion: 0 },
            nextHint: '你需要重做部分课件。',
          },
          {
            id: 'le2b',
            label: '保持深度，给补充阅读材料',
            feedback: '深度保住了，但学习分层更明显。',
            delta: { prof: 2, social: -1, progress: 0, emotion: 0 },
            nextHint: '需处理“跟不上”人群。',
          },
          {
            id: 'le2c',
            label: '开课后答疑会，集中解决难点',
            feedback: '口碑提升，但你的时间被进一步占用。',
            delta: { prof: 0, social: 2, progress: 1, emotion: 1 },
            nextHint: '需要安排长期机制。',
          },
        ],
      },
      {
        title: '课程迭代决策',
        scene: '下个周期你必须决定：强化结果导向还是继续理论深耕。',
        options: [
          {
            id: 'le3a',
            label: '结果导向：增加练习与作业反馈',
            feedback: '学习可衡量性上升，教学运营成本提高。',
            delta: { prof: 1, social: 1, progress: 1, emotion: 0 },
            nextHint: '',
          },
          {
            id: 'le3b',
            label: '理论导向：保持深度体系',
            feedback: '课程定位清晰，但受众面可能变窄。',
            delta: { prof: 2, social: -1, progress: 0, emotion: 0 },
            nextHint: '',
          },
          {
            id: 'le3c',
            label: '分层导向：核心理论 + 选修实践',
            feedback: '平衡度较高，但组织复杂度明显提升。',
            delta: { prof: 1, social: 2, progress: 1, emotion: 1 },
            nextHint: '',
          },
        ],
      },
    ],
    wrapText: '教育岗位的长期挑战是：在教学质量、个体投入与可持续节奏之间找到平衡。',
  },
  bizops: {
    id: 'bizops',
    title: '业务运营 · 多方协同与交付',
    intro: {
      identity: '你负责跨团队业务运营项目推进。',
      time: '本周中段，多个任务节点临近。',
      task: '在资源有限的情况下保障关键项目交付。',
      goal: '让目标达成且协同关系不失控。',
      risk: '目标变化快，协同方优先级不一致。',
    },
    nodes: [
      {
        title: '需求临时变更',
        scene: '上级临时加了目标，执行团队表示无法按原排期完成。',
        options: [
          {
            id: 'bo1a',
            label: '重排优先级，先保关键指标',
            feedback: '方向更清晰，但部分需求被延后。',
            delta: { prof: 1, social: 1, progress: 0, emotion: 0 },
            nextHint: '你要管理预期差。',
          },
          {
            id: 'bo1b',
            label: '承诺全部完成，后续再协调',
            feedback: '短期气氛好，后续风险迅速堆积。',
            delta: { prof: -1, social: 1, progress: 2, emotion: 1 },
            nextHint: '执行侧出现疲态。',
          },
          {
            id: 'bo1c',
            label: '拉齐决策人开快会，确认取舍',
            feedback: '决策效率提升，但沟通成本提高。',
            delta: { prof: 1, social: 2, progress: 1, emotion: 0 },
            nextHint: '你需要会后快速落表。',
          },
        ],
      },
      {
        title: '跨团队冲突',
        scene: 'A 团队认为 B 团队响应慢，B 团队认为需求变更多。',
        options: [
          {
            id: 'bo2a',
            label: '先做事实复盘：时间线 + 责任边界',
            feedback: '争议降温，问题更容易被拆解。',
            delta: { prof: 2, social: 1, progress: 0, emotion: 0 },
            nextHint: '需要推进改进机制。',
          },
          {
            id: 'bo2b',
            label: '先定结果目标，责任后置',
            feedback: '交付短期推进，但潜在矛盾未消失。',
            delta: { prof: 0, social: 1, progress: -1, emotion: 1 },
            nextHint: '后续可能再次爆发。',
          },
          {
            id: 'bo2c',
            label: '交给上级裁决',
            feedback: '冲突暂时止住，但你对过程掌控减弱。',
            delta: { prof: -1, social: 0, progress: 1, emotion: 0 },
            nextHint: '你需要重建信任。',
          },
        ],
      },
      {
        title: '周复盘',
        scene: '你需要给出下周行动：提效、控风险、稳协同。',
        options: [
          {
            id: 'bo3a',
            label: '建立标准化周节奏（周目标、周中校准、周复盘）',
            feedback: '长期效率提升，但初期执行阻力存在。',
            delta: { prof: 2, social: 1, progress: 0, emotion: 0 },
            nextHint: '',
          },
          {
            id: 'bo3b',
            label: '继续人治协调，按项目逐个推进',
            feedback: '短期灵活，但难以规模化复制。',
            delta: { prof: 0, social: 1, progress: 1, emotion: 1 },
            nextHint: '',
          },
          {
            id: 'bo3c',
            label: '先压 KPI，不改机制',
            feedback: '数字可能短期好看，团队负担明显提升。',
            delta: { prof: -1, social: -1, progress: -1, emotion: 2 },
            nextHint: '',
          },
        ],
      },
    ],
    wrapText: '运营岗位的真实难点，是在“结果、节奏、关系”三角中持续做平衡。',
  },
};

export function getRoleSliceSimulator(roleName) {
  const name = String(roleName || '');
  // 1) 产品/项目
  if (/产品经理|产品运营|PMO|项目管理|产品/.test(name)) return SLICE_SIMULATORS.pm;
  // 2) 数据分析/评测/研究/内控/知识管理
  if (/数据分析|商业分析|运营分析|AI 评测|数据标注|行业研究|内控|知识管理/.test(name)) {
    return SLICE_SIMULATORS.analyst;
  }
  // 3) 内容传播/品牌/社区
  if (/内容运营|社区运营|品牌策划|新媒体|企业传播|用户增长内容策划/.test(name)) {
    return SLICE_SIMULATORS.content;
  }
  // 4) 教育教学相关
  if (/课程运营|企业培训|教育产品|用户研究助理/.test(name)) {
    return SLICE_SIMULATORS.lecturer;
  }
  // 5) 业务运营协同类（兜底）
  if (/客户成功|招聘运营|销售运营|增长运营|电商运营/.test(name)) {
    return SLICE_SIMULATORS.bizops;
  }
  return null;
}

