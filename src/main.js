import { generateCareerReport, generateCareerSimulator, getRoleSliceSimulator } from './mockEngine.js';
import { extractTextFromResumeFile } from './resumeParser.js';

let entries = [];
let report = null;
let selectedRoleName = null;
let selectedRoleCandidates = [];
let compareViewOpen = false;
let compareFocusKey = '';
let compareAdvantageMap = {};
let compareAdvantageSource = 'mock';
let compareAdvantageLoading = false;
let compareGraphState = {};
let compareGraphRaf = 0;
let compareGraphDrag = null;
let compareGraphMoveHandler = null;
let compareGraphUpHandler = null;
let simulator = null;
let simAnswers = {};
let simResult = null;
let currentStep = 1;
let sliceSimState = null;
// Step 5 & 6 state (path selection + action guide)
let primaryCareerIdx = 0;
let activeBranches = {};
let completedTasks = new Set();
let actionPlanData = null;        // 后端返回的行动指南数据
let actionPlanLoading = false;    // 行动指南加载状态
let resumeForm = null;
let activeTab = 'home';
let forumPosts = [];
let forumCategory = 'all';
let actionTasks = [];
let resumeParseOpen = false;
let resumeParseLoading = false;
let resumeFile = null;
let reflectionForm = {
  achievementRecall: '',
  values: [],
  personality: {
    introExtro: '内向',
    workStyle: '独立思考',
  },
  testReference: '',
};
let coachMessages = [];
let coachDraft = '';
let coachLoading = false;
let coachVoiceOn = false;
let coachStage = 'initial'; // 对话阶段：initial/values/personality/workstyle/boundary/completing
let coachTopicIndex = 0;   // 话题轮转索引
let mentorAgentMentorId = null;
let mentorAgentMessages = [];
let mentorAgentDraft = '';
let mentorAgentLoading = false;
// 用户面板状态
let userProfile = {
  name: '',
  avatar: null, // base64 或 null
  createdAt: null,
};
let showUserPanel = false;

const FACTOR_KEYS = [
  'salary', 'growth', 'pressure', 'match', 'transfer',
  'experience', 'interview', 'portfolio', 'stability', 'optionality',
  'network', 'ai', 'business', 'team', 'remote'
];

// 后端 API 地址
const API_BASE = 'http://localhost:3001/api';

/**
 * 调用后端职业分析 API
 */
async function callAnalyzeCareer(entries) {
  const res = await fetch(`${API_BASE}/analyze-career`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) throw new Error(`分析失败: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '分析失败');
  return data.data;
}

/**
 * 调用后端职业模拟 API
 */
async function callSimulateCareer(jobTitle, userDNA, options = {}) {
  const res = await fetch(`${API_BASE}/simulate-career`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_title: jobTitle, user_dna: userDNA, options }),
  });
  if (!res.ok) throw new Error(`模拟请求失败: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '模拟失败');
  return data.data;
}

/**
 * 调用后端行动指南生成 API
 */
async function callGenerateActionPlan(jobTitle, skills, missingSkills) {
  const res = await fetch(`${API_BASE}/generate-action-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_title: jobTitle, skills, missing_skills: missingSkills }),
  });
  if (!res.ok) throw new Error(`行动指南生成失败: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '生成失败');
  return data.data;
}

/**
 * 调用后端岗位对比 API
 */
async function callCompareJobs(jobA, jobB, userDNA, options = {}) {
  const res = await fetch(`${API_BASE}/compare-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_a: jobA, job_b: jobB, user_dna: userDNA, options }),
  });
  if (!res.ok) throw new Error(`对比分析失败: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '对比失败');
  return data.data;
}

/**
 * 调用后端简历解析 API
 */
async function callParseResume(text) {
  const res = await fetch(`${API_BASE}/parse-resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`简历解析失败: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '解析失败');
  return data.data;
}

/**
 * 调用后端教练对话 API
 */
async function callCoachChat(messages, userInput, stage = 'initial', topicIndex = 0, userEntries = []) {
  const res = await fetch(`${API_BASE}/coach-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      user_input: userInput,
      stage,
      topic_index: topicIndex,
      user_entries: userEntries,
    }),
  });
  if (!res.ok) throw new Error(`教练对话失败: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '对话失败');
  return data.data;
}

/**
 * 调用后端偏好提炼 API
 */
async function callCoachSummarize(messages, userEntries = [], insights = []) {
  const res = await fetch(`${API_BASE}/coach-summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, user_entries: userEntries, insights }),
  });
  if (!res.ok) throw new Error(`偏好提炼失败: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '提炼失败');
  return data.data;
}

/**
 * 调用后端动态因子更新 API
 */
async function callUpdateFactor(jobA, jobB, factorKey, userDNA) {
  const res = await fetch(`${API_BASE}/update-factor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_a: jobA, job_b: jobB, factor_key: factorKey, user_dna: userDNA }),
  });
  if (!res.ok) throw new Error(`因子更新失败: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || '更新失败');
  return data.data;
}

const mentorProfiles = (() => {
  const seeds = [
    ['李学长', '复旦大学', '新闻传播', '内容运营经理', '小红书', '3年内容增长经验', ['转专业求职', '内容运营', '简历优化'], '199 元 / 45 分钟', '可线下 coffee chat（上海）'],
    ['周学姐', '同济大学', '工业工程', '产品经理', '字节跳动', '4年 B/C 端产品经验', ['校招产品', '转岗产品', '面试辅导'], '299 元 / 45 分钟', '可线下 coffee chat（北京）'],
    ['陈学长', '华中科技大学', '统计学', '数据分析师', '美团', '3年数据分析经验', ['数据岗入门', '项目包装', '作品集建议'], '239 元 / 45 分钟', '可线上优先，线下可约（深圳）'],
    ['王学姐', '浙江大学', '心理学', '用户研究员', '阿里巴巴', '5年用户研究经验', ['用户访谈', '研究报告', '转行建议'], '329 元 / 45 分钟', '线上为主，杭州可约'],
    ['赵学长', '北京交通大学', '交通工程', '商业分析师', '京东', '4年商业分析经验', ['商业分析', '求职规划', '简历诊断'], '259 元 / 45 分钟', '可线下 coffee chat（北京）'],
    ['孙学姐', '中山大学', '法学', '招聘运营专家', '腾讯', '6年校招社招经验', ['简历筛选逻辑', '面试技巧', '职业定位'], '299 元 / 45 分钟', '线上优先，广州可约'],
    ['吴学长', '南京大学', '计算机', 'AI评测负责人', '百度', '5年AI产品经验', ['AI岗位', '评测体系', '跨专业转行'], '369 元 / 60 分钟', '线上咨询'],
    ['郑学姐', '厦门大学', '市场营销', '增长运营经理', 'B站', '4年增长与用户运营经验', ['增长策略', '活动策划', '职业成长'], '249 元 / 45 分钟', '上海可线下约'],
    ['冯学长', '武汉大学', '经济学', '客户成功经理', 'Salesforce', '5年B端客户成功经验', ['ToB成长', '沟通协商', '求职辅导'], '269 元 / 45 分钟', '线上咨询'],
    ['褚学姐', '四川大学', '汉语言', '品牌策划总监', '元气森林', '7年品牌与内容经验', ['品牌策略', '内容规划', '职业转型'], '399 元 / 60 分钟', '北京/线上'],
  ];

  const out = [];
  for (let i = 0; i < 3; i += 1) {
    seeds.forEach((s, idx) => {
      out.push({
        id: `m${i * seeds.length + idx + 1}`,
        name: s[0],
        school: s[1],
        major: s[2],
        role: s[3],
        company: s[4],
        years: s[5],
        tags: s[6],
        price: i === 2 ? '免费交流 / 30 分钟' : s[7],
        coffee: s[8],
      });
    });
  }
  return out.slice(0, 28);
})();

const defaultForumPosts = (() => {
  const templates = [
    {
      category: '职业转型',
      title: '从文科转到产品：我最晚但最关键的一个决定',
      content: '不是技能不够，而是方向没定清。建议先做模拟器再定学习计划，能省很多无效努力。',
    },
    {
      category: '岗位认知',
      title: '数据分析岗并不只是会 SQL',
      content: '真正的门槛是业务理解与表达能力。会算只是起点，会讲清楚才有价值。',
    },
    {
      category: '面试经验',
      title: '校招面试最容易被忽视的点：你为什么适合而不是你有多努力',
      content: '面试官更看重你是否理解岗位真实工作，建议带上具体案例和复盘。',
    },
    {
      category: '实习日常',
      title: '实习第一个月的三次崩溃与修复',
      content: '崩溃来自预期错位，不是能力差。先对齐节奏和边界，心态会稳定很多。',
    },
  ];
  const authors = ['匿名学姐', '应届生A', '转行选手B', '产品实习生C', '数据分析D', '运营同学E'];
  const out = [];
  for (let i = 0; i < 52; i += 1) {
    const t = templates[i % templates.length];
    out.push({
      id: `p${i + 1}`,
      title: `${t.title}（案例 ${i + 1}）`,
      author: authors[i % authors.length],
      category: t.category,
      createdAt: i < 5 ? `${i + 1} 小时前` : `${Math.floor(i / 3) + 1} 天前`,
      likes: 12 + ((i * 7) % 89),
      comments: 3 + ((i * 5) % 34),
      content: t.content,
    });
  }
  return out;
})();

const defaultActionTasks = [
  { id: 't1', title: '完成一份目标岗位简历草稿', desc: '用本周分析结果重写简历摘要与经历', eta: '2h', status: 'todo' },
  { id: 't2', title: '约 1 位前辈做 coffee chat', desc: '重点验证岗位真实工作节奏', eta: '45m', status: 'doing' },
  { id: 't3', title: '做一个小型验证项目', desc: '围绕意向岗位产出可展示作品', eta: '6h', status: 'todo' },
  { id: 't4', title: '完成一次路径复盘', desc: '记录适配信号与不适配信号', eta: '30m', status: 'done' },
];

function uid() {
  return `a_${Math.random().toString(36).slice(2, 9)}`;
}

// 计算有效经历数量（至少填写了场景、行动、结果其二的条目）
function countValidEntries() {
  return entries.filter(e => {
    const filled = [e.scene, e.action, e.result].filter(x => x && x.trim()).length;
    return filled >= 2;
  }).length;
}

function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('toast--show');
  setTimeout(() => el.classList.remove('toast--show'), 2200);
}

function loadDraft() {
  try {
    const raw = localStorage.getItem('career_path_demo_v1');
    if (!raw) return;
    const data = JSON.parse(raw);
    entries = data.entries || [];
    report = data.report || null;
    selectedRoleName = data.selectedRoleName || null;
    currentStep = data.currentStep || 1;
    sliceSimState = data.sliceSimState || null;
    activeTab = data.activeTab || 'analysis';
    forumPosts = data.forumPosts || defaultForumPosts;
    forumCategory = data.forumCategory || 'all';
    actionTasks = data.actionTasks || defaultActionTasks;
    reflectionForm = data.reflectionForm || reflectionForm;
    coachMessages = data.coachMessages || [];
    coachDraft = data.coachDraft || '';
    coachStage = data.coachStage || 'initial';
    coachTopicIndex = data.coachTopicIndex || 0;
    selectedRoleCandidates = data.selectedRoleCandidates || [];
    compareViewOpen = !!data.compareViewOpen;
    compareFocusKey = data.compareFocusKey || '';
    compareAdvantageMap = data.compareAdvantageMap || {};
    compareAdvantageSource = data.compareAdvantageSource || 'mock';
    mentorAgentMentorId = data.mentorAgentMentorId || null;
    mentorAgentMessages = data.mentorAgentMessages || [];
    mentorAgentDraft = data.mentorAgentDraft || '';
    completedTasks = new Set(data.completedTasks || []);
    primaryCareerIdx = data.primaryCareerIdx ?? 0;
    activeBranches = data.activeBranches || {};
    resumeForm = data.resumeForm || null;
    userProfile = data.userProfile || { name: '', avatar: null, createdAt: null };
  } catch {
    /* ignore */
  }
}

function saveDraft() {
  try {
    localStorage.setItem(
      'career_path_demo_v1',
      JSON.stringify({
        entries,
        report,
        selectedRoleName,
        currentStep,
        sliceSimState,
        activeTab,
        forumPosts,
        forumCategory,
        actionTasks,
        reflectionForm,
        coachMessages,
        coachDraft,
        coachStage,
        coachTopicIndex,
        selectedRoleCandidates,
        compareViewOpen,
        compareFocusKey,
        compareAdvantageMap,
        compareAdvantageSource,
        mentorAgentMentorId,
        mentorAgentMessages,
        mentorAgentDraft,
        completedTasks: [...completedTasks],
        primaryCareerIdx,
        activeBranches,
        resumeForm,
        userProfile,
      })
    );
  } catch {
    /* ignore */
  }
}

function icon(name) {
  const common = `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const map = {
    chart: `<svg ${common}><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>`,
    briefcase: `<svg ${common}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    route: `<svg ${common}><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 16l8-8"/></svg>`,
    tasks: `<svg ${common}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    bell: `<svg ${common}><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"/><path d="M10 21h4"/></svg>`,
    user: `<svg ${common}><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>`,
  };
  return map[name] || map.chart;
}

// 渲染用户面板
function renderUserPanel() {
  const created = userProfile.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('zh-CN')
    : '未设置';

  return `
    <div id="user-panel" class="user-panel" style="
      position: absolute;
      top: 60px;
      right: 20px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      padding: 20px;
      min-width: 280px;
      z-index: 1000;
    ">
      <div style="text-align:center;margin-bottom:16px;">
        <div style="
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #e8f5e9;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        ">
          ${userProfile.avatar
            ? `<img src="${userProfile.avatar}" alt="头像" style="width:100%;height:100%;object-fit:cover;" />`
            : (userProfile.name
                ? `<span style="font-size:24px;font-weight:600;color:#2e7d32;">${userProfile.name.charAt(0)}</span>`
                : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>`
              )
          }
        </div>
        <h3 style="margin:0;font-size:16px;color:#333;">${userProfile.name || '未设置昵称'}</h3>
        <p style="margin:4px 0 0;font-size:12px;color:#999;">创建于 ${created}</p>
      </div>

      <div style="border-top:1px solid #eee;padding-top:16px;margin-top:16px;">
        <label style="display:block;margin-bottom:8px;font-size:14px;color:#666;">设置头像</label>
        <input type="file" id="avatar-input" accept="image/*" style="display:none;" />
        <button class="btn btn--ghost btn--sm" id="btn-upload-avatar" style="width:100%;margin-bottom:8px;">
          ${userProfile.avatar ? '更换头像' : '上传头像'}
        </button>
      </div>

      <div style="margin-top:12px;">
        <label style="display:block;margin-bottom:8px;font-size:14px;color:#666;">设置昵称</label>
        <input type="text" id="user-name-input" value="${escapeHtml(userProfile.name || '')}"
          placeholder="输入你的昵称"
          style="
            width:100%;
            padding:8px 12px;
            border:1px solid #ddd;
            border-radius:6px;
            font-size:14px;
            box-sizing:border-box;
          " />
      </div>

      <div style="margin-top:16px;display:flex;gap:8px;">
        <button class="btn btn--primary btn--sm" id="btn-save-user" style="flex:1;">保存</button>
        <button class="btn btn--danger btn--sm" id="btn-delete-data" style="flex:1;">删除数据</button>
      </div>

      <div style="margin-top:12px;display:flex;gap:8px;">
        <button class="btn btn--ghost btn--sm" id="btn-clear-all" style="flex:1;color:#999;">清除所有数据</button>
      </div>
    </div>
  `;
}

function renderTopTabs() {
  // Tabs moved into top nav bar
  return '';
}

function renderTopNav() {
  const tabs = [
    { id: 'home', label: '个人主页' },
    { id: 'consulting', label: '职业咨询' },
    { id: 'analysis', label: '职业分析' },
    { id: 'forum', label: '职场论坛' },
  ];

  // 用户头像显示
  let avatarContent = icon('user');
  if (userProfile.avatar) {
    avatarContent = `<img src="${userProfile.avatar}" alt="用户头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  } else if (userProfile.name) {
    avatarContent = `<span style="font-size:14px;font-weight:600;">${userProfile.name.charAt(0)}</span>`;
  }

  return `
    <header class="topnav no-print">
      <div class="topnav__inner">
        <div class="brand">
          <div class="brand__mark">CC</div>
          <div class="brand__name">Career Compass <span>职业指南针</span></div>
        </div>
        <nav class="nav-inline-tabs" aria-label="主模块导航">
          ${tabs.map((t) => `
            <button type="button" class="nav-inline-tab ${activeTab === t.id ? 'nav-inline-tab--active' : ''}" data-tab="${t.id}">
              ${t.label}
            </button>
          `).join('')}
        </nav>
        <div class="topnav__actions">
          <button class="icon-btn" type="button" aria-label="用户" id="btn-user-avatar" style="overflow:hidden;">${avatarContent}</button>
          <button class="btn btn--primary btn--sm" type="button" data-tab-jump="analysis">开始分析</button>
        </div>
      </div>
    </header>
    ${showUserPanel ? renderUserPanel() : ''}
  `;
}

function renderHomePage() {
  const completed = report ? 40 : 0;
  const recommended = report?.tiers?.[0]?.jobs?.slice(0, 3) || [
    { name: '产品经理（校招）', score: 82, tags: ['沟通协作', '问题拆解', '用户洞察'] },
    { name: '咨询顾问助理', score: 76, tags: ['问题拆解', '结构化表达', '沟通协作'] },
    { name: '产品运营（B 端）', score: 74, tags: ['沟通协作', '问题拆解', '执行推进'] },
  ];

  const statCards = [
    { icon: '✅', color: 'green', label: '已完成经历分析数', value: countValidEntries(), hint: '建议至少 3 段，可提升分析稳定性。' },
    { icon: '💼', color: 'green', label: '推荐岗位数量', value: report ? 30 : 0, hint: '包含高匹配、可探索、低优先级分层。' },
    { icon: '🔓', color: 'amber', label: '已解锁路径数', value: report?.focusRoles?.length || 0, hint: 'Top 路径对比支持 1/3/5 年预览。' },
  ];

  const quickItems = [
    { icon: '📋', label: '输入经历', desc: '随时填写你的成就经历。', tab: 'analysis' },
    { icon: '🎮', label: '继续模拟器', desc: '体验最接近真实的职业场景。', tab: 'analysis' },
    { icon: '🗺️', label: '查看路径对比', desc: '两条路径全方位对比分析。', tab: 'analysis' },
    { icon: '💬', label: '进入论坛', desc: '看看别人的职业故事。', tab: 'forum' },
  ];

  return `
    <section class="panel home-main-panel">
      <div class="home-hub">
        <div class="home-hub__left">
          <h2 class="home-hub__title">你的职业成长中枢</h2>
          <p class="muted small">基于近期输入与模拟记录，系统将持续更新职业路径建议与行动清单。</p>
          <div class="stat-cards-row">
            ${statCards.map((s) => `
              <div class="stat-card stat-card--compact">
                <div class="stat-icon-box stat-icon-box--${s.color}">${s.icon}</div>
                <div class="stat-card__body">
                  <p class="stat-card__label small muted">${s.label}</p>
                  <p class="stat-card__num">${s.value}</p>
                  <p class="stat-card__hint small muted">${s.hint}</p>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="toolbar" style="margin-top:1rem">
            <button type="button" class="btn btn--primary" data-tab-jump="analysis">继续分析</button>
            <button type="button" class="btn btn--ghost" data-tab-jump="analysis">查看行动指南</button>
          </div>
        </div>
        <div class="progress-card">
          <p class="small muted">职业分析完成进度</p>
          <div class="progress-num">${completed}%</div>
          <div class="progress-track"><span style="width:${completed}%"></span></div>
          <p class="small muted" style="margin-top:0.5rem">至少 5 分钟，继续填写更多信息可提升分析质量。</p>
        </div>
      </div>

      <h3 class="section-title">意向岗位推荐</h3>
      <div class="job-reco-list">
        ${recommended.map((job) => `
          <article class="job-card job-card--horizontal">
            <div class="job-card-icon">💼</div>
            <div class="job-card__body">
              <div class="job-card__head-row">
                <span class="job-name">${escapeHtml(job.name)}</span>
                <span class="job-match-badge">${job.score}%</span>
                <div class="chip-group-inline">
                  ${(job.tags || []).slice(0, 3).map((t) => `<span class="chip chip--small">${escapeHtml(t)}</span>`).join('')}
                </div>
              </div>
              <p class="small muted">基于你的经历结构化能力与协同偏好给出的推荐方向。</p>
            </div>
            <button class="btn btn--primary btn--sm" data-tab-jump="analysis" type="button">查看详情</button>
          </article>
        `).join('')}
      </div>

      <h3 class="section-title">快捷入口</h3>
      <div class="toolbar">
        ${quickItems.map((q) => `
          <button type="button" class="btn btn--ghost" data-tab-jump="${q.tab}">${q.icon} ${q.label}</button>
        `).join('')}
      </div>
    </section>

    <div class="quick-grid">
      ${quickItems.map((q) => `
        <button type="button" class="quick-grid-card" data-tab-jump="${q.tab}">
          <div class="quick-grid-card__icon">${q.icon}</div>
          <div class="quick-grid-card__text">
            <strong>${q.label}</strong>
            <span>${q.desc}</span>
          </div>
        </button>
      `).join('')}
    </div>
  `;
}

function renderConsultingPage() {
  if (mentorAgentMentorId) {
    return renderMentorAgentPage();
  }
  const industries = ['互联网', '消费品', '咨询', '教育', 'AI'];
  const roles = ['产品', '运营', '数据分析', '市场', '职能'];
  const formats = ['文字', '语音', '视频', '线下 coffee'];
  const aiPriceText = (humanPrice) => {
    if (!humanPrice) return '69 元 / 30 分钟';
    const m = String(humanPrice).match(/(\d+(?:\.\d+)?)/);
    if (!m) return '69 元 / 30 分钟';
    const human = Number(m[1]);
    if (!Number.isFinite(human) || human <= 0) return '69 元 / 30 分钟';
    const ai = Math.max(19, Math.round(human / 3));
    return `${ai} 元 / 45 分钟`;
  };
  return `
    <section class="panel">
      <h2>职业咨询</h2>
      <p class="muted">与有经验的前辈交流，获得更真实的行业视角。</p>
      <div class="filterbar">
        <select>${industries.map((x) => `<option>${x}</option>`).join('')}</select>
        <select>${roles.map((x) => `<option>${x}</option>`).join('')}</select>
        <select>${formats.map((x) => `<option>${x}</option>`).join('')}</select>
        <select><option>综合排序</option><option>价格优先</option><option>评价优先</option></select>
        <input type="text" placeholder="搜索学校/公司/岗位" />
      </div>
      <div class="mentor-grid">
        ${mentorProfiles
          .map(
            (m) => `
          <article class="mentor-card">
            <h3>${escapeHtml(m.name)} · ${escapeHtml(m.role)}</h3>
            <p class="small muted">${escapeHtml(m.school)} · ${escapeHtml(m.major)} ｜ 现就职于 ${escapeHtml(
              m.company
            )}</p>
            <p class="small">${escapeHtml(m.years)}</p>
            <div class="chip-group">
              ${m.tags.map((t) => `<span class="chip chip--small">${escapeHtml(t)}</span>`).join('')}
            </div>
            <p class="small"><strong>咨询价格：</strong>${escapeHtml(m.price)}</p>
            <p class="small"><strong>智能体咨询：</strong>${escapeHtml(aiPriceText(m.price))}</p>
            <p class="small"><strong>约聊方式：</strong>${escapeHtml(m.coffee)}</p>
            <div class="toolbar">
              <button type="button" class="btn btn--primary" data-book-mentor="${m.id}">立即预约咨询</button>
              <button type="button" class="btn btn--ghost" data-book-ai="${m.id}">智能体咨询</button>
            </div>
          </article>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}

function getMentorById(id) {
  return mentorProfiles.find((m) => m.id === id) || null;
}

function ensureMentorAgentSession(mentor) {
  if (!mentor) return;
  if (mentorAgentMessages.length > 0) return;
  mentorAgentMessages = [
    {
      role: 'assistant',
      text: `我是${mentor.name}的职业咨询智能体。这个智能体由${mentor.name}的真实经历与复盘语料锻炼而成，我会用${mentor.name}的表达风格和你聊。先说说你现在最纠结的职业选择是什么？`,
    },
  ];
}

async function askMentorAgent(userText, mentor) {
  // 构建消息历史
  const messages = [
    {
      role: 'system',
      content: `你是${mentor.name}的职业咨询智能体。请严格使用第一人称，语气像真实前辈，具体、温和、直接，不空话。每次回答控制在120字以内，并给出一个可执行动作。你必须在适当时机提醒：该智能体由${mentor.name}的经历锻炼而成。`,
    },
    ...mentorAgentMessages.slice(-8).map((m) => ({
      role: m.role,
      content: m.text,
    })),
    { role: 'user', content: userText },
  ];

  // 调用后端教练聊天 API
  try {
    const result = await callCoachChat(
      mentorAgentMessages.slice(-8).map(m => ({ role: m.role, content: m.text })),
      userText,
      'personality',
      0,
      []
    );
    if (result.reply) {
      // 添加智能体身份提醒
      return result.reply.includes('智能体') || result.reply.includes(mentor.name)
        ? result.reply
        : `${result.reply}\n\n💡 该智能体由${mentor.name}的经历锻炼而成。`;
    }
  } catch (e) {
    console.warn('后端智能体聊天调用失败:', e.message);
  }

  // 后端 API 失败时返回默认回复
  return `我按${mentor.name}平时带学弟学妹的方式给你一句建议：先别急着"定终局"，先做一个7天可验证的小动作。你可以把你的背景、目标岗位和担心点各写1句话，我再帮你拆。`;
}

function renderMentorAgentPage() {
  const mentor = getMentorById(mentorAgentMentorId);
  if (!mentor) return '';
  ensureMentorAgentSession(mentor);
  const mentorInitial = (mentor.name || '李').slice(0, 1);
  return `
    <section class="panel mentor-agent-page">
      <div class="toolbar">
        <button type="button" class="btn btn--ghost btn--sm" id="btn-back-consulting">← 返回咨询列表</button>
      </div>
      <div class="mentor-agent-head">
        <div class="mentor-avatar mentor-avatar--lg">${escapeHtml(mentorInitial)}</div>
        <div>
          <h2>${escapeHtml(mentor.name)}智能体咨询</h2>
          <p class="muted">该智能体由${escapeHtml(mentor.name)}的经历锻炼过，将以${escapeHtml(mentor.name)}的语气与你对话。</p>
        </div>
      </div>
      <div class="chat-wrap mentor-chat-wrap">
        <div class="chat-messages mentor-chat-messages">
          ${mentorAgentMessages
            .map(
              (m) => `
            <div class="chat-msg chat-msg--${m.role === 'user' ? 'user' : 'bot'} mentor-chat-msg">
              ${
                m.role === 'user'
                  ? '<div class="mentor-avatar mentor-avatar--user">我</div>'
                  : `<div class="mentor-avatar mentor-avatar--bot">${escapeHtml(mentorInitial)}</div>`
              }
              <div class="chat-msg__bubble">${escapeHtml(m.text)}</div>
            </div>
          `
            )
            .join('')}
          ${
            mentorAgentLoading
              ? `
            <div class="chat-msg chat-msg--bot mentor-chat-msg">
              <div class="mentor-avatar mentor-avatar--bot">${escapeHtml(mentorInitial)}</div>
              <div class="chat-msg__bubble">正在思考...</div>
            </div>
          `
              : ''
          }
        </div>
        <div class="chat-input mentor-chat-input">
          <textarea id="mentor-agent-input" placeholder="例如：我在产品和数据分析之间很纠结..." rows="3">${escapeHtml(mentorAgentDraft)}</textarea>
          <div class="toolbar mentor-chat-actions">
            <button type="button" class="btn btn--primary" id="btn-send-mentor-agent" ${mentorAgentLoading ? 'disabled' : ''}>发送</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderForumPage() {
  const cats = ['all', '面试经验', '岗位认知', '职业转型', '实习日常'];
  const labels = { all: '全部', 面试经验: '面试经验', 岗位认知: '岗位认知', 职业转型: '职业转型', 实习日常: '实习日常' };
  const list = forumCategory === 'all' ? forumPosts : forumPosts.filter((p) => p.category === forumCategory);
  return `
    <section class="panel">
      <h2>职场论坛</h2>
      <p class="muted">分享就职体验、转行经历和职业选择故事，让更多人看到人生的多样可能。</p>
      <div class="forum-tabs">
        ${cats
          .map(
            (c) => `<button type="button" class="forum-tab ${forumCategory === c ? 'forum-tab--active' : ''}" data-forum-cat="${c}">${labels[c]}</button>`
          )
          .join('')}
      </div>
      <div class="field">
        <label for="forum-title">发帖标题</label>
        <input id="forum-title" type="text" placeholder="例如：我从土木转到数据分析的 6 个月复盘" />
      </div>
      <div class="field">
        <label for="forum-content">帖子内容</label>
        <textarea id="forum-content" placeholder="分享你的经历、决策过程、踩坑与建议..."></textarea>
      </div>
      <div class="toolbar">
        <button type="button" class="btn btn--primary" id="btn-post-forum">发布帖子</button>
      </div>
      <div class="forum-list">
        ${list
          .map(
            (p) => `
          <article class="forum-card">
            <h3>${escapeHtml(p.title)}</h3>
            <p class="small muted">作者：${escapeHtml(p.author)} · ${escapeHtml(p.createdAt || '刚刚')}</p>
            <div class="chip-group"><span class="chip chip--small">${escapeHtml(p.category || '岗位认知')}</span></div>
            <p>${escapeHtml(p.content)}</p>
            <p class="small muted">👍 ${p.likes || 0} · 💬 ${p.comments || 0}</p>
          </article>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}

function addEntry() {
  entries.push({
    id: uid(),
    scene: '',
    action: '',
    result: '',
    feeling: '',
  });
  saveDraft();
  render();
}

async function parseResumeAndFill() {
  if (!resumeFile) {
    toast('请先上传简历文件');
    return;
  }

  try {
    resumeParseLoading = true;
    render();
    const text = await extractTextFromResumeFile(resumeFile);
    if (!text || text.trim().length < 30) {
      throw new Error('简历文本提取失败或内容过少');
    }

    // 调用后端 API 解析简历
    const result = await callParseResume(text);
    const parsed = result.entries || [];

    const toAppend = parsed.map((x) => ({
      id: uid(),
      scene: x.scene || '',
      action: x.action || '',
      result: x.result || '',
      feeling: x.feeling || '',
    }));
    entries = [...entries, ...toAppend];
    resumeParseOpen = false;
    resumeFile = null;
    saveDraft();
    toast(`已解析并填入 ${toAppend.length} 段经历`);
  } catch (e) {
    toast(`简历解析失败：${e.message?.slice(0, 42) || '请重试'}`);
  } finally {
    resumeParseLoading = false;
    render();
  }
}

function removeEntry(id) {
  entries = entries.filter((item) => item.id !== id);
  saveDraft();
  render();
}

function updateEntry(id, field, value) {
  const item = entries.find((x) => x.id === id);
  if (item) item[field] = value;
  saveDraft();
}

function fillDemo() {
  entries = [
    {
      id: uid(),
      scene: '在社团活动筹备期间，团队资源不足且时间紧。',
      action: '我拆解任务优先级，协调外联、宣传和场地负责人，每天同步进度。',
      result: '活动顺利落地，拿到3家赞助，参与人数超过预期。',
      feeling: '最有成就感的是复杂事情被我理顺，团队执行起来很顺。',
    },
    {
      id: uid(),
      scene: '实习期间负责整理用户反馈，信息非常零散。',
      action: '我把反馈做分类标签，抽取高频问题并整理成周报。',
      result: '帮助产品团队确定两个优先迭代点，减少重复沟通。',
      feeling: '我喜欢把混乱信息结构化，并帮助决策。',
    },
    {
      id: uid(),
      scene: '课程项目需要在短时间完成调研报告。',
      action: '我设计访谈提纲，访谈目标用户并输出洞察框架。',
      result: '报告获得课程高分，老师评价逻辑清晰且有可执行建议。',
      feeling: '我享受通过洞察提出方案，不喜欢纯重复执行。',
    },
  ];
  report = null;
  saveDraft();
  toast('已填充示例经历');
  render();
}

function validateEntries() {
  if (entries.length < 3) {
    toast('至少填写3段成就经历');
    return false;
  }
  const valid = entries.every(
    (e) => e.scene.trim() && e.action.trim() && e.result.trim() && e.feeling.trim()
  );
  if (!valid) {
    toast('请补全每段经历的4个字段');
    return false;
  }
  return true;
}

async function runAnalysis() {
  if (!validateEntries()) return;

  // 显示加载状态
  const originalStep = currentStep;
  currentStep = -1; // 临时设为加载状态
  render();
  toast('正在生成职业分析...');

  try {
    // 优先尝试调用后端 API
    const result = await callAnalyzeCareer(entries);
    if (result) {
      // 后端返回格式转换
      report = convertBackendReport(result);
      toast('AI 职业分析已完成');
    } else {
      throw new Error('分析结果为空');
    }
  } catch (e) {
    console.warn('后端职业分析调用失败，使用本地生成:', e.message);
    // Fallback：使用本地 mockEngine
    report = generateCareerReport(entries, reflectionForm);
    toast('职业分析已完成，请查看推荐岗位');
  }

  // 新的画像生成后，清空选中岗位与模拟结果
  selectedRoleName = null;
  selectedRoleCandidates = [];
  compareViewOpen = false;
  compareFocusKey = '';
  compareAdvantageMap = {};
  compareAdvantageSource = 'mock';
  compareAdvantageLoading = false;
  simulator = null;
  simAnswers = {};
  simResult = null;
  sliceSimState = null;
  currentStep = 3;
  saveDraft();
  render();
}

/**
 * 将后端返回的职业分析结果转换为前端格式
 */
function convertBackendReport(backendResult) {
  // 后端返回格式：{ career_dna: {...}, recommendations: { tier_1_ready, tier_2_transferable, tier_3_potential } }
  if (!backendResult) return null;

  const tiers = [];

  // 第一梯队：现在可试
  if (backendResult.recommendations?.tier_1_ready) {
    tiers.push({
      name: '第一梯队',
      desc: '现在可试',
      jobs: (backendResult.recommendations.tier_1_ready || []).map(j => ({
        name: j.job_title || j.name,
        score: j.match_score || j.score,
        reason: j.reasoning || j.reason,
        tags: j.missing_skills || j.required_skills || [],
        salaryRange: j.salary || '10k-25k/月',
      })),
    });
  }

  // 第二梯队：可迁移
  if (backendResult.recommendations?.tier_2_transferable) {
    tiers.push({
      name: '第二梯队',
      desc: '可迁移',
      jobs: (backendResult.recommendations.tier_2_transferable || []).map(j => ({
        name: j.job_title || j.name,
        score: j.match_score || j.score,
        reason: j.reasoning || j.reason,
        tags: j.missing_skills || j.required_skills || [],
        salaryRange: j.salary || '8k-20k/月',
      })),
    });
  }

  // 第三梯队：探索潜力
  if (backendResult.recommendations?.tier_3_potential) {
    tiers.push({
      name: '第三梯队',
      desc: '探索潜力',
      jobs: (backendResult.recommendations.tier_3_potential || []).map(j => ({
        name: j.job_title || j.name,
        score: j.match_score || j.score,
        reason: j.reasoning || j.reason,
        tags: j.required_learning || j.required_skills || [],
        salaryRange: j.salary || '6k-15k/月',
      })),
    });
  }

  return {
    profile: {
      skills: backendResult.career_dna?.skills || [],
      work_context: backendResult.career_dna?.work_context || [],
      boundaries: backendResult.career_dna?.boundaries || [],
    },
    tiers,
  };
}

function validateReflection() {
  const userAnswerCount = coachMessages.filter((m) => m.role === 'user').length;
  if (userAnswerCount === 0) {
    toast('请先和 AI 职业教练完成至少一轮对话');
    return false;
  }
  if (userAnswerCount >= 4) {
    toast('对话已达4轮上限，请点击"生成职业分析"完成校准');
    return false;
  }
  return true;
}

function ensureCoachSession() {
  if (coachMessages.length) return;
  coachMessages = [
    {
      role: 'assistant',
      content: '回忆一下过去3个让你感觉成就的事件。你当时分别做了什么？结果是什么？',
    },
  ];
}

function buildCoachSystemPrompt() {
  const resumeContext = entries
    .map(
      (e, idx) =>
        `经历${idx + 1}\n情境:${e.scene}\n行动:${e.action}\n结果:${e.result}\n感受:${e.feeling}`
    )
    .join('\n\n');
  return `你是职业教练 AI。你要和用户进行职业偏好校准访谈。
规则：
1) 第一个问题固定为："回忆一下过去3个让你感觉成就的事件。"（已由前端发出，不要重复）
2) 后续每次只问一个高质量追问，围绕：价值观、性格偏好、工作方式、职业边界。
3) 回答简洁专业，避免鸡汤，每次 2-4 句。
4) 严格基于用户输入和以下经历上下文进行追问，不编造事实。

用户已有经历上下文：
${resumeContext}`;
}

async function askCoachAI(nextUserText) {
  // 优先尝试调用后端 API
  try {
    const formattedMessages = coachMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const result = await callCoachChat(formattedMessages, nextUserText, coachStage || 'initial', coachTopicIndex || 0, entries);
    if (result.reply) {
      // 根据返回的 next_topic 更新对话阶段
      if (result.next_topic && result.next_topic !== 'complete') {
        coachStage = result.next_topic === 'values' ? 'values'
          : result.next_topic === 'personality' ? 'personality'
          : result.next_topic === 'workstyle' ? 'workstyle'
          : result.next_topic === 'boundary' ? 'boundary'
          : coachStage;
        if (coachStage !== 'completing') {
          coachTopicIndex = (coachTopicIndex + 1) % 4;
        }
      } else if (result.next_topic === 'complete') {
        coachStage = 'completing';
      }
      return result.reply;
    }
  } catch (e) {
    console.warn('后端教练对话调用失败，尝试本地 fallback:', e.message);
  }

  // Fallback：本地预设问题（按阶段轮转）
  const fallback = {
    initial: [
      '这三个事件里，哪一个最让你有"这就是我擅长的事"的感觉？为什么？',
    ],
    values: [
      '你在工作里更看重什么：成就感、稳定性、创新空间，还是生活平衡？可以排序一下。',
    ],
    personality: [
      '你更偏向独立推进，还是与团队协作？在什么场景下你会表现最好？',
    ],
    workstyle: [
      '你更喜欢快节奏高强度的项目，还是稳定可预期的日常工作？',
    ],
    boundary: [
      '哪些工作状态会明显消耗你？这能帮我们排除不适配岗位。',
    ],
  };
  const stageList = fallback[coachStage] || fallback.initial;
  const asked = coachMessages.filter((m) => m.role === 'assistant' && m.content?.includes(stageList[0]?.split('？')[0])).length;
  return stageList[Math.min(asked, stageList.length - 1)];
}

async function summarizeReflectionFromChat() {
  // 优先尝试调用后端 API
  try {
    const result = await callCoachSummarize(coachMessages, entries);
    reflectionForm = {
      achievementRecall: result.achievementRecall || '',
      values: result.values || [],
      personality: result.personality || { introExtro: '均衡', workStyle: '均衡' },
      testReference: result.testReference || 'AI 对话提炼',
    };
    // 更新对话阶段
    if (result.next_topic) {
      coachStage = result.next_topic === 'values' ? 'values'
        : result.next_topic === 'personality' ? 'personality'
        : result.next_topic === 'workstyle' ? 'workstyle'
        : result.next_topic === 'boundary' ? 'boundary'
        : 'completing';
      if (coachStage !== 'completing') {
        coachTopicIndex = (coachTopicIndex + 1) % 4;
      }
    }
    return;
  } catch (e) {
    console.warn('后端偏好提炼调用失败，使用本地 fallback:', e.message);
  }

  // Fallback：本地简单解析
  const userText = coachMessages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n');

  const values = ['成就感', '稳定性', '创新探索', '平衡生活', '高收入'].filter((v) =>
    userText.includes(v)
  );
  reflectionForm = {
    achievementRecall: userText.slice(0, 260) || reflectionForm.achievementRecall,
    values: values.length ? values : ['成就感'],
    personality: {
      introExtro: /外向/.test(userText) ? '外向' : /均衡/.test(userText) ? '均衡' : '内向',
      workStyle: /团队|协作/.test(userText) ? '团队协作' : /均衡/.test(userText) ? '均衡' : '独立思考',
    },
    testReference: reflectionForm.testReference || '本地对话提炼',
  };
}

async function sendCoachMessage() {
  const text = coachDraft.trim();
  if (!text || coachLoading) return;
  coachMessages = [...coachMessages, { role: 'user', content: text }];
  coachDraft = '';
  coachLoading = true;
  saveDraft();
  render();
  try {
    const assistantText = await askCoachAI(text);
    coachMessages = [...coachMessages, { role: 'assistant', content: assistantText }];
  } catch (e) {
    coachMessages = [
      ...coachMessages,
      { role: 'assistant', content: `我这边暂时连不上模型服务。你可以继续回答，我先记录：${e.message?.slice(0, 60)}` },
    ];
  } finally {
    coachLoading = false;
    saveDraft();
    render();
  }
}

function startVoiceInput() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast('当前浏览器不支持语音输入，请使用 Chrome');
    return;
  }
  const recog = new SR();
  recog.lang = 'zh-CN';
  recog.interimResults = false;
  recog.maxAlternatives = 1;
  coachVoiceOn = true;
  render();
  recog.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || '';
    coachDraft = text ? `${coachDraft}${coachDraft ? '\n' : ''}${text}` : coachDraft;
    saveDraft();
    render();
  };
  recog.onerror = () => {
    coachVoiceOn = false;
    render();
    toast('语音识别失败，请重试');
  };
  recog.onend = () => {
    coachVoiceOn = false;
    render();
  };
  recog.start();
}

function toggleValue(value) {
  const has = reflectionForm.values.includes(value);
  reflectionForm.values = has
    ? reflectionForm.values.filter((v) => v !== value)
    : [...reflectionForm.values, value];
  saveDraft();
}

function renderReflectionStep() {
  ensureCoachSession();
  return `
    <section class="panel">
      <h2>步骤 2 / 6 · 职业偏好校准</h2>
      <p class="muted small">AI 职业教练会基于你已输入的经历进行追问。完成对话后，系统自动提炼偏好画像并开始岗位推荐。</p>
      <div class="chat-wrap">
        <div class="chat-messages">
          ${coachMessages
            .map(
              (m) => `
            <div class="chat-msg chat-msg--${m.role === 'assistant' ? 'bot' : 'user'}">
              <div class="chat-msg__role">${m.role === 'assistant' ? 'AI 教练' : '你'}</div>
              <div class="chat-msg__bubble">${escapeHtml(m.content)}</div>
            </div>
          `
            )
            .join('')}
          ${coachLoading ? '<p class="small muted">AI 正在思考下一步追问...</p>' : ''}
        </div>
        <div class="field">
          <label>你的回答</label>
          <textarea id="coach-input" placeholder="继续回答 AI 问题，越具体越好...">${escapeHtml(coachDraft)}</textarea>
        </div>
        <div class="toolbar">
          <button type="button" class="btn btn--ghost btn--sm" id="btn-voice-input">${coachVoiceOn ? '语音输入中...' : '语音输入'}</button>
          <button type="button" class="btn btn--primary" id="btn-send-coach" ${coachLoading ? 'disabled' : ''}>发送</button>
        </div>
      </div>
      <div class="toolbar">
        <button type="button" class="btn btn--primary" id="btn-generate-analysis">生成职业分析选岗</button>
      </div>
    </section>
  `;
}

function renderEntryCard(item, index) {
  return `
    <article class="entry-card">
      <div class="card-head">
        <h3>经历 ${index + 1}</h3>
        <button type="button" class="btn btn--danger" data-del="${item.id}">删除</button>
      </div>
      <div class="field">
        <label>情境（发生了什么）</label>
        <textarea data-id="${item.id}" data-field="scene" placeholder="例如：当时的任务背景、约束和挑战">${escapeHtml(item.scene)}</textarea>
      </div>
      <div class="field">
        <label>行动（你具体做了什么）</label>
        <textarea data-id="${item.id}" data-field="action" placeholder="例如：你如何拆解、协调、推进">${escapeHtml(item.action)}</textarea>
      </div>
      <div class="field">
        <label>结果（产生了什么影响）</label>
        <textarea data-id="${item.id}" data-field="result" placeholder="例如：效率提升、指标变化、项目结果">${escapeHtml(item.result)}</textarea>
      </div>
      <div class="field">
        <label>感受（你为什么有成就感）</label>
        <textarea data-id="${item.id}" data-field="feeling" placeholder="例如：你喜欢什么，不喜欢什么">${escapeHtml(item.feeling)}</textarea>
      </div>
    </article>
  `;
}

function renderProfile() {
  if (!report) return '';
  const p = report.profile;
  return `
    <section class="panel">
      <div class="toolbar">
        <h2>职业画像（Career DNA）</h2>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          data-open-compare="1"
          ${selectedRoleCandidates.length === 2 ? '' : 'disabled'}
        >
          开始对比
        </button>
      </div>
      <p class="small muted">已选意向岗位：${selectedRoleCandidates.length ? selectedRoleCandidates.map(escapeHtml).join(' vs ') : '请先选择2个岗位'}</p>
      <div class="chip-group">
        ${p.skills.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}
      </div>
      <p><strong>驱动力：</strong>${p.drives.map(escapeHtml).join('、')}</p>
      <p><strong>边界（不适配提醒）：</strong>${p.boundaries.map(escapeHtml).join('；')}</p>
    </section>
  `;
}

function renderTier(item, selectedNames) {
  return `
    <section class="panel">
      <h2>${escapeHtml(item.name)}</h2>
      <div class="job-grid">
        ${item.jobs
          .map(
            (job) => `
          <article class="job-card">
            <div class="job-name">${escapeHtml(job.name)}</div>
            <div class="job-meta">
              匹配分：${job.score} · 发展性：${job.growth === 'high' ? '高' : '中'} · 压力：${
                job.pressure === 'high' ? '高' : job.pressure === 'medium' ? '中' : '低'
              }
            </div>
            <div class="job-meta">薪资范围：${escapeHtml(job.salaryRange || '10k-25k/月（公开区间参考）')}</div>
            <div class="job-tags">${job.tags.map((x) => `<span class="chip chip--small">${escapeHtml(x)}</span>`).join('')}</div>
            <div class="toolbar job-toolbar">
              <button
                type="button"
                class="btn ${selectedNames.includes(job.name) ? 'btn--primary' : 'btn--ghost'}"
                data-pick-role="${escapeAttr(job.name)}"
              >
                ${selectedNames.includes(job.name) ? '已加入对比' : '加入对比'}
              </button>
            </div>
          </article>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}

function parseSalaryRangeNum(salaryText) {
  const text = String(salaryText || '');
  const matches = text.match(/\d+(?:\.\d+)?/g) || [];
  if (!matches.length) return { low: 10, high: 25 };
  const nums = matches.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  if (!nums.length) return { low: 10, high: 25 };
  if (nums.length === 1) return { low: nums[0], high: nums[0] };
  return { low: Math.min(nums[0], nums[1]), high: Math.max(nums[0], nums[1]) };
}

function toPressureScore(pressure) {
  if (pressure === 'low') return 88;
  if (pressure === 'medium') return 64;
  return 42;
}

function avg(n1, n2) {
  return Math.round((n1 + n2) / 2);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function compareFactor(a, b, options) {
  const delta = (options.aVal || 0) - (options.bVal || 0);
  const abs = Math.abs(delta);
  const tieThreshold = options.tieThreshold ?? 4;
  const lean = abs <= tieThreshold ? 'tie' : delta > 0 ? 'a' : 'b';
  const confidence = clamp(55 + abs * 3, 56, 95);
  return {
    key: options.key,
    title: options.title,
    icon: options.icon || '•',
    aText: options.aText,
    bText: options.bText,
    insight: options.insight,
    lean,
    confidence,
  };
}

function getMockAdvantageMap() {
  return {
    salary: { lean: 'a', reason: 'A 方向通常在同级岗位里起薪更稳，短期现金流更好。' },
    growth: { lean: 'b', reason: 'B 方向在跨职能协作和能力复利上更快，成长曲线更陡。' },
    pressure: { lean: 'a', reason: 'A 的交付节奏相对可控，可持续性更强。' },
    match: { lean: 'b', reason: 'B 与当前职业画像能力重合度更高，上手阻力更小。' },
    transfer: { lean: 'b', reason: 'B 的通用能力可迁移到更多邻近岗位。' },
    experience: { lean: 'a', reason: 'A 的工作体验波动更小，幸福感预期更稳定。' },
    interview: { lean: 'a', reason: 'A 的面试评估标准更明确，短期上岸概率更高。' },
    portfolio: { lean: 'b', reason: 'B 更容易产出可展示作品，利于强化简历。' },
    stability: { lean: 'a', reason: 'A 的业务波动风险较小，稳定性更优。' },
    optionality: { lean: 'b', reason: 'B 的后续可选路径更丰富，长期选择权更大。' },
    network: { lean: 'b', reason: 'B 更依赖协同网络，人脉放大效应更明显。' },
    ai: { lean: 'b', reason: 'B 与 AI 工具结合场景更多，效率红利更显著。' },
    business: { lean: 'a', reason: 'A 的商业结果更直接可衡量，价值转化更快。' },
    team: { lean: 'b', reason: 'B 的团队协作机制更成熟，跨团队配合更顺。' },
    remote: { lean: 'a', reason: 'A 在弹性与远程工作方式下更容易保持稳定产出。' },
  };
}

function applyAdvantageMap(factors, advantageMap) {
  if (!advantageMap) return factors;
  return factors.map((f) => {
    const adv = advantageMap[f.key];
    if (!adv || !['a', 'b', 'tie'].includes(adv.lean)) return f;
    return {
      ...f,
      lean: adv.lean,
      insight: adv.reason ? `${f.insight} ${adv.reason}` : f.insight,
      confidence: Math.max(f.confidence, adv.lean === 'tie' ? 70 : 82),
    };
  });
}

async function fetchAgentAdvantageMap(jobA, jobB, factors) {
  // 调用后端 API
  const userDNA = report?.profile || {};
  try {
    const result = await callCompareJobs(jobA.name, jobB.name, userDNA, { detail_level: 'standard' });
    if (result?.factors) {
      const out = {};
      for (const f of result.factors) {
        out[f.key] = { lean: f.lean, reason: f.insight?.slice(0, 80) || '' };
      }
      if (Object.keys(out).length >= 8) {
        compareAdvantageSource = 'agent';
        return out;
      }
    }
  } catch (e) {
    console.warn('后端对比 API 调用失败:', e.message);
  }

  // 后端 API 失败时使用模拟数据
  throw new Error('后端 API 失败');
}

async function runCompareAdvantageAnalysis() {
  const jobs = selectedRoleCandidates.map((name) => findJobByName(name)).filter(Boolean);
  if (!report || jobs.length !== 2) return;
  const [a, b] = jobs;
  const base = buildRoleFactors(a, b, report.profile);
  compareAdvantageLoading = true;
  saveDraft();
  render();
  try {
    const map = await fetchAgentAdvantageMap(a, b, base);
    compareAdvantageMap = map;
    compareAdvantageSource = 'agent';
    toast('已完成 agent 联网对比');
  } catch {
    compareAdvantageMap = getMockAdvantageMap();
    compareAdvantageSource = 'mock';
    toast('agent 连接失败，已切换模拟优势数据');
  } finally {
    compareAdvantageLoading = false;
    saveDraft();
    render();
  }
}

function buildRoleFactors(a, b, profile) {
  const sA = parseSalaryRangeNum(a.salaryRange);
  const sB = parseSalaryRangeNum(b.salaryRange);
  const skills = profile?.skills || [];
  const tagsA = a.tags || [];
  const tagsB = b.tags || [];
  const hitA = intersectionCount(skills, tagsA);
  const hitB = intersectionCount(skills, tagsB);

  const salaryA = avg(sA.low, sA.high);
  const salaryB = avg(sB.low, sB.high);
  const growthA = (a.growth === 'high' ? 85 : 68) + Math.round((a.score || 0) * 0.15);
  const growthB = (b.growth === 'high' ? 85 : 68) + Math.round((b.score || 0) * 0.15);
  const pressureA = toPressureScore(a.pressure);
  const pressureB = toPressureScore(b.pressure);
  const matchA = clamp(Math.round((a.score || 0) * 0.72 + hitA * 8), 30, 98);
  const matchB = clamp(Math.round((b.score || 0) * 0.72 + hitB * 8), 30, 98);
  const migrationA = clamp(50 + (tagsA.length || 0) * 6 + (a.growth === 'high' ? 10 : 0), 45, 95);
  const migrationB = clamp(50 + (tagsB.length || 0) * 6 + (b.growth === 'high' ? 10 : 0), 45, 95);

  const experienceA = clamp(60 + (a.growth === 'high' ? 16 : 8) + (a.pressure === 'low' ? 8 : -4), 35, 95);
  const experienceB = clamp(60 + (b.growth === 'high' ? 16 : 8) + (b.pressure === 'low' ? 8 : -4), 35, 95);
  const interviewA = clamp(45 + (a.score || 0) * 0.42 + hitA * 5, 30, 95);
  const interviewB = clamp(45 + (b.score || 0) * 0.42 + hitB * 5, 30, 95);
  const portfolioA = clamp(48 + tagsA.length * 5 + (a.growth === 'high' ? 6 : 0), 35, 95);
  const portfolioB = clamp(48 + tagsB.length * 5 + (b.growth === 'high' ? 6 : 0), 35, 95);
  const stabilityA = clamp(70 - (a.pressure === 'high' ? 22 : a.pressure === 'medium' ? 10 : 2), 35, 95);
  const stabilityB = clamp(70 - (b.pressure === 'high' ? 22 : b.pressure === 'medium' ? 10 : 2), 35, 95);
  const optionalityA = clamp(52 + (a.growth === 'high' ? 10 : 4) + tagsA.length * 4, 30, 95);
  const optionalityB = clamp(52 + (b.growth === 'high' ? 10 : 4) + tagsB.length * 4, 30, 95);
  const networkA = clamp(40 + (a.score || 0) * 0.35 + (tagsA.includes('协作') ? 10 : 3), 30, 95);
  const networkB = clamp(40 + (b.score || 0) * 0.35 + (tagsB.includes('协作') ? 10 : 3), 30, 95);
  const aiFitA = clamp(44 + intersectionCount(tagsA, ['AI', '数据', '自动化', '增长']) * 12, 25, 95);
  const aiFitB = clamp(44 + intersectionCount(tagsB, ['AI', '数据', '自动化', '增长']) * 12, 25, 95);
  const businessA = clamp(46 + intersectionCount(tagsA, ['商业', '运营', '增长', '策略']) * 11, 25, 95);
  const businessB = clamp(46 + intersectionCount(tagsB, ['商业', '运营', '增长', '策略']) * 11, 25, 95);
  const teamworkA = clamp(50 + intersectionCount(tagsA, ['协作', '沟通', '管理']) * 10, 30, 95);
  const teamworkB = clamp(50 + intersectionCount(tagsB, ['协作', '沟通', '管理']) * 10, 30, 95);
  const remoteA = clamp(45 + (a.pressure === 'low' ? 16 : a.pressure === 'medium' ? 8 : 2) + tagsA.length * 2, 25, 95);
  const remoteB = clamp(45 + (b.pressure === 'low' ? 16 : b.pressure === 'medium' ? 8 : 2) + tagsB.length * 2, 25, 95);

  return [
    compareFactor(a, b, {
      key: 'salary',
      title: '起薪与收入弹性',
      icon: '💼',
      aVal: salaryA,
      bVal: salaryB,
      tieThreshold: 1,
      aText: `${a.name}区间约 ${a.salaryRange || `${sA.low}k-${sA.high}k/月`}`,
      bText: `${b.name}区间约 ${b.salaryRange || `${sB.low}k-${sB.high}k/月`}`,
      insight: '用于判断短中期现金流与议价空间。',
    }),
    compareFactor(a, b, {
      key: 'growth',
      title: '成长路径与上限',
      icon: '🚀',
      aVal: growthA,
      bVal: growthB,
      aText: `${a.name}成长性${a.growth === 'high' ? '高' : '中'}，匹配分${a.score}`,
      bText: `${b.name}成长性${b.growth === 'high' ? '高' : '中'}，匹配分${b.score}`,
      insight: '看三年后是否有更高能力复利空间。',
    }),
    compareFactor(a, b, {
      key: 'pressure',
      title: '工作节奏与可持续性',
      icon: '⏱️',
      aVal: pressureA,
      bVal: pressureB,
      aText: `${a.name}压力等级：${a.pressure === 'high' ? '高' : a.pressure === 'medium' ? '中' : '低'}`,
      bText: `${b.name}压力等级：${b.pressure === 'high' ? '高' : b.pressure === 'medium' ? '中' : '低'}`,
      insight: '高压未必不好，但要和你的恢复能力匹配。',
    }),
    compareFactor(a, b, {
      key: 'match',
      title: '能力匹配度',
      icon: '🎯',
      aVal: matchA,
      bVal: matchB,
      aText: `${a.name}与你画像技能重合 ${hitA} 项`,
      bText: `${b.name}与你画像技能重合 ${hitB} 项`,
      insight: '重合度越高，通常上手更快、反馈更正向。',
    }),
    compareFactor(a, b, {
      key: 'transfer',
      title: '可迁移性与兜底性',
      icon: '🧭',
      aVal: migrationA,
      bVal: migrationB,
      aText: `${a.name}可迁移标签：${tagsA.slice(0, 4).join(' / ') || '通用能力'}`,
      bText: `${b.name}可迁移标签：${tagsB.slice(0, 4).join(' / ') || '通用能力'}`,
      insight: '判断若方向变化，已有能力是否容易转向。',
    }),
    compareFactor(a, b, {
      key: 'experience',
      title: '体验满意度',
      icon: '🙂',
      aVal: experienceA,
      bVal: experienceB,
      aText: `${a.name}在长期体验上预计更${experienceA > experienceB ? '顺手' : '有挑战'}`,
      bText: `${b.name}在长期体验上预计更${experienceB > experienceA ? '顺手' : '有挑战'}`,
      insight: '综合节奏与成长反馈，估计工作幸福感。',
    }),
    compareFactor(a, b, {
      key: 'interview',
      title: '上岸难度',
      icon: '🧪',
      aVal: interviewA,
      bVal: interviewB,
      aText: `${a.name}上岸把握指数 ${interviewA}`,
      bText: `${b.name}上岸把握指数 ${interviewB}`,
      insight: '基于画像匹配与技能重合度估算。',
    }),
    compareFactor(a, b, {
      key: 'portfolio',
      title: '作品产出潜力',
      icon: '🧱',
      aVal: portfolioA,
      bVal: portfolioB,
      aText: `${a.name}更容易形成可展示作品`,
      bText: `${b.name}更容易形成可展示作品`,
      insight: '作品越快越完整，求职正反馈越快。',
    }),
    compareFactor(a, b, {
      key: 'stability',
      title: '稳定性与风险',
      icon: '🛡️',
      aVal: stabilityA,
      bVal: stabilityB,
      aText: `${a.name}职业稳定指数 ${stabilityA}`,
      bText: `${b.name}职业稳定指数 ${stabilityB}`,
      insight: '越高代表节奏与风险可控性更强。',
    }),
    compareFactor(a, b, {
      key: 'optionality',
      title: '未来选择权',
      icon: '🪄',
      aVal: optionalityA,
      bVal: optionalityB,
      aText: `${a.name}可延展路径数量更多`,
      bText: `${b.name}可延展路径数量更多`,
      insight: '看3-5年是否容易横向或纵向切换。',
    }),
    compareFactor(a, b, {
      key: 'network',
      title: '行业人脉杠杆',
      icon: '🤝',
      aVal: networkA,
      bVal: networkB,
      aText: `${a.name}的人脉放大效率 ${networkA}`,
      bText: `${b.name}的人脉放大效率 ${networkB}`,
      insight: '人脉能加速信息与机会流动。',
    }),
    compareFactor(a, b, {
      key: 'ai',
      title: 'AI协作红利',
      icon: '✨',
      aVal: aiFitA,
      bVal: aiFitB,
      aText: `${a.name}对 AI 工具的适配程度 ${aiFitA}`,
      bText: `${b.name}对 AI 工具的适配程度 ${aiFitB}`,
      insight: '更高代表更容易借力 AI 放大产出。',
    }),
    compareFactor(a, b, {
      key: 'business',
      title: '商业价值转化',
      icon: '📈',
      aVal: businessA,
      bVal: businessB,
      aText: `${a.name}商业结果可见度 ${businessA}`,
      bText: `${b.name}商业结果可见度 ${businessB}`,
      insight: '结果可见度影响升职与议价速度。',
    }),
    compareFactor(a, b, {
      key: 'team',
      title: '协作适配',
      icon: '👥',
      aVal: teamworkA,
      bVal: teamworkB,
      aText: `${a.name}团队协作适配指数 ${teamworkA}`,
      bText: `${b.name}团队协作适配指数 ${teamworkB}`,
      insight: '协作阻力越低，交付效率越高。',
    }),
    compareFactor(a, b, {
      key: 'remote',
      title: '远程与弹性',
      icon: '🏡',
      aVal: remoteA,
      bVal: remoteB,
      aText: `${a.name}在弹性工作场景下更${remoteA >= remoteB ? '适配' : '受限'}`,
      bText: `${b.name}在弹性工作场景下更${remoteB >= remoteA ? '适配' : '受限'}`,
      insight: '结合节奏与任务类型评估工作弹性。',
    }),
  ];
}

function renderCompareGraphPage() {
  if (!report || selectedRoleCandidates.length !== 2) return '';
  const jobs = selectedRoleCandidates.map((name) => findJobByName(name)).filter(Boolean);
  if (jobs.length !== 2) return '';
  const [a, b] = jobs;
  const baseFactors = buildRoleFactors(a, b, report.profile);
  const factors = applyAdvantageMap(baseFactors, compareAdvantageMap);
  const factorMap = Object.fromEntries(factors.map((f) => [f.key, f]));
  const focus = factorMap[compareFocusKey] || factors[0];
  const aWins = factors.filter((f) => f.lean === 'a').length;
  const bWins = factors.filter((f) => f.lean === 'b').length;
  const ties = factors.length - aWins - bWins;
  const winner = aWins === bWins ? ((a.score || 0) >= (b.score || 0) ? a : b) : aWins > bWins ? a : b;
  const maxConf = Math.max(...factors.map((x) => x.confidence), 1);
  const nodeSpec = [
    { key: 'salary', x: 10, y: 66 },
    { key: 'growth', x: 18, y: 34 },
    { key: 'pressure', x: 32, y: 16 },
    { key: 'match', x: 50, y: 10 },
    { key: 'transfer', x: 68, y: 16 },
    { key: 'experience', x: 82, y: 34 },
    { key: 'interview', x: 90, y: 66 },
    { key: 'portfolio', x: 80, y: 84 },
    { key: 'stability', x: 64, y: 92 },
    { key: 'optionality', x: 48, y: 94 },
    { key: 'network', x: 32, y: 90 },
    { key: 'ai', x: 18, y: 82 },
    { key: 'business', x: 6, y: 50 },
    { key: 'team', x: 38, y: 74 },
    { key: 'remote', x: 62, y: 76 },
  ];
  const focusNode = nodeSpec.find((n) => n.key === focus.key) || nodeSpec[0];
  const panelLeft = focusNode.x > 62 ? Math.max(6, focusNode.x - 42) : Math.min(54, focusNode.x + 8);
  const panelTop = focusNode.y > 62 ? Math.max(6, focusNode.y - 33) : Math.min(58, focusNode.y + 6);
  return `
    <section class="panel">
      <div class="toolbar">
        <h2>对比分析图谱</h2>
        <button type="button" class="btn btn--ghost btn--sm" data-back-compare="1">返回选岗</button>
      </div>
      <p class="small muted">${escapeHtml(a.name)} vs ${escapeHtml(b.name)} · 点击图谱节点查看该因素对 A/B 的影响分析。</p>
      <div class="factor-overview">
        <div class="factor-overview__title">因素战况：A（${escapeHtml(a.name)}）${aWins} : ${bWins} B（${escapeHtml(b.name)}）</div>
        <div class="factor-overview__meta">
          中立因素 ${ties} 个 · 建议先验证：<strong>${escapeHtml(winner.name)}</strong> ·
          ${
            compareAdvantageLoading
              ? 'agent 联网分析中...'
              : compareAdvantageSource === 'agent'
                ? '优势判断来源：agent 联网结果'
                : '优势判断来源：预设模拟数据（含节点理由）'
          }
        </div>
      </div>
      <div class="factor-graph">
        <div class="graph-center">
          <div class="graph-center__label">职业决策</div>
          <div class="graph-center__ab">A / B</div>
        </div>
        <svg class="graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${nodeSpec.map((n) => `<line x1="50" y1="50" x2="${n.x}" y2="${n.y}" data-line-key="${escapeAttr(n.key)}" />`).join('')}
        </svg>
        ${nodeSpec
          .map((n) => {
            const f = factorMap[n.key];
            if (!f) return '';
            const size = Math.round(56 + ((f.confidence / maxConf) * 26));
            return `
              <button
                type="button"
                class="graph-node graph-node--${f.lean} ${focus.key === f.key ? 'graph-node--active' : ''}"
                style="left:${n.x}%;top:${n.y}%;width:${size}px;height:${size}px;"
                data-factor-node="${escapeAttr(f.key)}"
                data-x="${n.x}"
                data-y="${n.y}"
                data-lean="${escapeAttr(f.lean)}"
                data-icon="${escapeAttr(f.icon)}"
                data-title="${escapeAttr(f.title)}"
                data-badge="${escapeAttr(f.lean === 'tie' ? '势均力敌' : f.lean === 'a' ? 'A 更优' : 'B 更优')}"
                data-a-text="${escapeAttr(`A（${a.name}）：${f.aText}`)}"
                data-b-text="${escapeAttr(`B（${b.name}）：${f.bText}`)}"
                data-insight="${escapeAttr(`${f.insight} · 置信度 ${f.confidence}%`)}"
              >
                <span>${escapeHtml(f.icon)}</span>
                <small>${escapeHtml(f.title)}</small>
              </button>
            `;
          })
          .join('')}
        <article class="graph-detail graph-detail--${focus.lean}" style="left:${panelLeft}%;top:${panelTop}%;" id="graph-detail-card">
          <div class="factor-card__head">
            <span class="factor-icon" id="graph-detail-icon">${escapeHtml(focus.icon)}</span>
            <h4 id="graph-detail-title">${escapeHtml(focus.title)}</h4>
            <span class="factor-badge" id="graph-detail-badge">${focus.lean === 'tie' ? '势均力敌' : focus.lean === 'a' ? 'A 更优' : 'B 更优'}</span>
          </div>
          <p class="small" id="graph-detail-a">${escapeHtml(`A（${a.name}）：${focus.aText}`)}</p>
          <p class="small" id="graph-detail-b">${escapeHtml(`B（${b.name}）：${focus.bText}`)}</p>
          <p class="small muted" id="graph-detail-insight">${escapeHtml(`${focus.insight} · 置信度 ${focus.confidence}%`)}</p>
        </article>
      </div>
      <div class="toolbar">
        <button type="button" class="btn ${selectedRoleName === a.name ? 'btn--a' : 'btn--ghost'}" data-final-role="${escapeAttr(a.name)}">选择 A：${escapeHtml(a.name)}</button>
        <button type="button" class="btn ${selectedRoleName === b.name ? 'btn--b' : 'btn--ghost'}" data-final-role="${escapeAttr(b.name)}">选择 B：${escapeHtml(b.name)}</button>
      </div>
      <p class="small muted">建议优先验证：<strong>${escapeHtml(winner.name)}</strong>；先点"选择A/B"锁定方向，再点页面下方"下一步"进入模拟器。</p>
    </section>
  `;
}

async function updateCompareGraphFocus(nodeEl) {
  if (!nodeEl) return;
  const key = nodeEl.getAttribute('data-factor-node') || '';
  compareFocusKey = key;

  // 获取岗位名称
  const jobs = selectedRoleCandidates.map(name => findJobByName(name)).filter(Boolean);
  const jobA = jobs[0]?.name || '';
  const jobB = jobs[1]?.name || '';
  const userDNA = report?.profile || {};

  // 尝试调用后端 API 获取深度分析
  let factorData = null;
  if (jobA && jobB && key) {
    try {
      const result = await callUpdateFactor(jobA, jobB, key, userDNA);
      if (result?.factor) {
        factorData = result.factor;
      }
    } catch (e) {
      console.warn('后端因子更新调用失败，使用本地数据:', e.message);
    }
  }

  document.querySelectorAll('[data-factor-node]').forEach((el) => {
    el.classList.toggle('graph-node--active', el === nodeEl);
  });

  const card = document.getElementById('graph-detail-card');
  if (!card) return;
  const graph = document.querySelector('.factor-graph');
  let x = Number(nodeEl.getAttribute('data-x') || 50);
  let y = Number(nodeEl.getAttribute('data-y') || 50);
  if (graph) {
    const gRect = graph.getBoundingClientRect();
    const nRect = nodeEl.getBoundingClientRect();
    if (gRect.width > 0 && gRect.height > 0) {
      x = ((nRect.left + nRect.width / 2 - gRect.left) / gRect.width) * 100;
      y = ((nRect.top + nRect.height / 2 - gRect.top) / gRect.height) * 100;
    }
  }
  const left = x > 62 ? Math.max(6, x - 42) : Math.min(54, x + 8);
  const top = y > 62 ? Math.max(6, y - 33) : Math.min(58, y + 6);
  card.style.left = `${left}%`;
  card.style.top = `${top}%`;

  // 优先使用后端返回的深度分析，否则使用节点属性
  const lean = factorData?.lean || nodeEl.getAttribute('data-lean') || 'tie';
  card.classList.remove('graph-detail--a', 'graph-detail--b', 'graph-detail--tie');
  card.classList.add(`graph-detail--${lean}`);

  const icon = document.getElementById('graph-detail-icon');
  const title = document.getElementById('graph-detail-title');
  const badge = document.getElementById('graph-detail-badge');
  const aText = document.getElementById('graph-detail-a');
  const bText = document.getElementById('graph-detail-b');
  const insight = document.getElementById('graph-detail-insight');

  if (icon) icon.textContent = factorData?.icon || nodeEl.getAttribute('data-icon') || '';
  if (title) title.textContent = factorData?.name || nodeEl.getAttribute('data-title') || '';
  if (badge) {
    const badgeText = lean === 'a' ? 'A 更优' : lean === 'b' ? 'B 更优' : '势均力敌';
    badge.textContent = badgeText;
  }
  if (aText) aText.textContent = factorData?.aText || nodeEl.getAttribute('data-a-text') || '';
  if (bText) bText.textContent = factorData?.bText || nodeEl.getAttribute('data-b-text') || '';
  if (insight) {
    const confidence = factorData?.confidence ? `· 置信度 ${Math.round(factorData.confidence * 100)}%` : '';
    const insightText = factorData?.insight ? `${factorData.insight}${confidence}` : nodeEl.getAttribute('data-insight') || '';
    insight.textContent = insightText;
  }
}

function stopCompareGraphPhysics() {
  if (compareGraphRaf) {
    cancelAnimationFrame(compareGraphRaf);
    compareGraphRaf = 0;
  }
  if (compareGraphMoveHandler) {
    window.removeEventListener('pointermove', compareGraphMoveHandler);
    compareGraphMoveHandler = null;
  }
  if (compareGraphUpHandler) {
    window.removeEventListener('pointerup', compareGraphUpHandler);
    compareGraphUpHandler = null;
  }
  compareGraphDrag = null;
}

function startCompareGraphPhysics() {
  const graph = document.querySelector('.factor-graph');
  if (!graph) return;
  stopCompareGraphPhysics();
  const nodeEls = [...graph.querySelectorAll('[data-factor-node]')];
  if (!nodeEls.length) return;
  const lineMap = {};
  graph.querySelectorAll('[data-line-key]').forEach((line) => {
    lineMap[line.getAttribute('data-line-key')] = line;
  });

  let width = Math.max(1, graph.clientWidth);
  let height = Math.max(1, graph.clientHeight);

  const nodes = nodeEls.map((el) => {
    const key = el.getAttribute('data-factor-node');
    const anchorX = (Number(el.getAttribute('data-x') || 50) / 100) * width;
    const anchorY = (Number(el.getAttribute('data-y') || 50) / 100) * height;
    const prev = compareGraphState[key];
    const x = prev ? prev.xPct * width : anchorX;
    const y = prev ? prev.yPct * height : anchorY;
    const vx = prev ? prev.vx : 0;
    const vy = prev ? prev.vy : 0;
    return {
      key,
      el,
      line: lineMap[key],
      x,
      y,
      vx,
      vy,
      anchorX,
      anchorY,
      radius: Math.max(22, el.offsetWidth / 2),
    };
  });

  const nodeByKey = Object.fromEntries(nodes.map((n) => [n.key, n]));
  const centerX = () => width * 0.5;
  const centerY = () => height * 0.5;

  compareGraphMoveHandler = (e) => {
    if (!compareGraphDrag) return;
    const rect = graph.getBoundingClientRect();
    const n = nodeByKey[compareGraphDrag.key];
    if (!n) return;
    n.x = Math.min(width - n.radius, Math.max(n.radius, e.clientX - rect.left - compareGraphDrag.dx));
    n.y = Math.min(height - n.radius, Math.max(n.radius, e.clientY - rect.top - compareGraphDrag.dy));
    n.vx = 0;
    n.vy = 0;
  };
  compareGraphUpHandler = () => {
    if (compareGraphDrag?.el) compareGraphDrag.el.classList.remove('graph-node--dragging');
    compareGraphDrag = null;
  };
  window.addEventListener('pointermove', compareGraphMoveHandler);
  window.addEventListener('pointerup', compareGraphUpHandler);

  nodes.forEach((n) => {
    n.el.addEventListener('pointerdown', (e) => {
      const rect = n.el.getBoundingClientRect();
      compareGraphDrag = {
        key: n.key,
        el: n.el,
        dx: e.clientX - rect.left - rect.width / 2,
        dy: e.clientY - rect.top - rect.height / 2,
      };
      n.el.classList.add('graph-node--dragging');
    });
  });

  let lastTs = performance.now();
  const step = (ts) => {
    const dt = Math.min(24, Math.max(12, ts - lastTs));
    lastTs = ts;
    width = Math.max(1, graph.clientWidth);
    height = Math.max(1, graph.clientHeight);

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = a.radius + b.radius + 20;
        if (dist < minDist) {
          const push = ((minDist - dist) / minDist) * 0.34;
          const ux = dx / dist;
          const uy = dy / dist;
          a.vx -= ux * push;
          a.vy -= uy * push;
          b.vx += ux * push;
          b.vy += uy * push;
        }
      }
    }

    nodes.forEach((n) => {
      if (!compareGraphDrag || compareGraphDrag.key !== n.key) {
        n.vx += (n.anchorX - n.x) * 0.0014 * dt;
        n.vy += (n.anchorY - n.y) * 0.0014 * dt;
        n.vx += (centerX() - n.x) * 0.00016 * dt;
        n.vy += (centerY() - n.y) * 0.00016 * dt;
        n.vx *= 0.93;
        n.vy *= 0.93;
        n.x += n.vx * (dt / 16);
        n.y += n.vy * (dt / 16);
      }
      n.x = Math.min(width - n.radius, Math.max(n.radius, n.x));
      n.y = Math.min(height - n.radius, Math.max(n.radius, n.y));
      n.el.style.left = `${n.x}px`;
      n.el.style.top = `${n.y}px`;

      if (n.line) {
        n.line.setAttribute('x2', ((n.x / width) * 100).toFixed(2));
        n.line.setAttribute('y2', ((n.y / height) * 100).toFixed(2));
      }
      compareGraphState[n.key] = {
        xPct: n.x / width,
        yPct: n.y / height,
        vx: n.vx,
        vy: n.vy,
      };
    });

    const active = document.querySelector('.graph-node--active');
    if (active) updateCompareGraphFocus(active);
    compareGraphRaf = requestAnimationFrame(step);
  };

  compareGraphRaf = requestAnimationFrame(step);
}

async function prepareSimulatorForRole(name) {
  const job = findJobByName(name);
  if (!job || !report || selectedRoleCandidates.length !== 2) return false;
  selectedRoleName = name;
  const userDNA = report.profile || {};

  // 优先尝试调用后端 API 获取模拟器配置
  let sliceCfg = null;
  try {
    const result = await callSimulateCareer(name, userDNA, { type: 'full' });
    if (result?.nodes?.length) {
      // 转换后端格式为前端格式
      sliceCfg = convertBackendSimulator(result, name);
    }
  } catch (e) {
    console.warn('后端模拟器生成失败，使用本地配置:', e.message);
  }

  // 如果后端成功，使用后端数据；否则使用本地配置
  if (sliceCfg) {
    sliceSimState = {
      config: sliceCfg,
      phase: 'intro',
      nodeIndex: 0,
      pending: null,
      stats: { prof: 50, social: 50, progress: 50, emotion: 50 },
      score: 0,
      streak: 1,
      skillsUsed: { deepFocus: false, teamSync: false, sprint: false },
      skillLog: '',
    };
    simulator = null;
  } else {
    // Fallback：使用本地配置
    const localSliceCfg = getRoleSliceSimulator(name);
    if (localSliceCfg) {
      sliceSimState = {
        config: localSliceCfg,
        phase: 'intro',
        nodeIndex: 0,
        pending: null,
        stats: { prof: 50, social: 50, progress: 50, emotion: 50 },
        score: 0,
        streak: 1,
        skillsUsed: { deepFocus: false, teamSync: false, sprint: false },
        skillLog: '',
      };
      simulator = null;
    } else {
      sliceSimState = null;
      simulator = generateCareerSimulator(job, userDNA);
    }
  }

  simAnswers = {};
  simResult = null;
  return true;
}

/**
 * 将后端返回的模拟器数据转换为前端格式
 */
function convertBackendSimulator(backendResult, roleName) {
  if (!backendResult) return null;

  return {
    id: roleName,
    title: backendResult.title || `${roleName} 模拟器`,
    intro: backendResult.intro || {
      identity: `你是 ${roleName}`,
      time: '工作日',
      task: '完成今日任务',
      goal: '达成工作目标',
      risk: '可能面临挑战',
    },
    nodes: (backendResult.nodes || []).map((node, idx) => ({
      title: node.title || `场景 ${idx + 1}`,
      scene: node.scene || '',
      options: (node.options || []).map((opt, optIdx) => ({
        id: `opt-${idx}`,
        label: opt.label || '',
        feedback: opt.feedback || '',
        delta: opt.delta || { prof: 0, social: 0, progress: 0, emotion: 0 },
        nextHint: opt.nextHint || '',
      })),
    })),
    events: (backendResult.events || []).map(evt => ({
      id: evt.id || `evt-${Math.random()}`,
      title: evt.title || '',
      text: evt.text || '',
      effect: evt.effect || { prof: 0, social: 0, progress: 0, emotion: 0 },
    })),
    skills: (backendResult.skills || []).map(skill => ({
      id: skill.id || 'skill',
      name: skill.name || '',
      description: skill.description || '',
      effect: skill.effect || { prof: 0, social: 0, progress: 0, emotion: 0 },
    })),
    wrapText: backendResult.wrap_text || '恭喜完成本次模拟！',
  };
}

// ─── Step 5 helpers ──────────────────────────────────────────────────────────

function getRoleTags(roleName) {
  if (!report?.tiers?.length) return [];
  for (const tier of report.tiers) {
    const found = (tier.jobs || []).find((j) => j.name === roleName);
    if (found) return found.tags || [];
  }
  return [];
}

function getBranchContent(roleName, branch) {
  const name = roleName || '';
  if (branch === 'manager') {
    if (name.includes('产品')) return '晋升产品总监，带领3-5人产品团队，负责完整业务线P&L，推动用户价值与商业目标对齐。核心能力：团队协调、OKR拆解、跨职能资源整合。';
    if (name.includes('咨询')) return '晋升合伙人/项目总监，管理咨询项目团队，负责客户关系维护与业务拓展，推动团队方法论建设。';
    if (name.includes('数据') || name.includes('分析')) return '转型数据团队负责人，管理数据工程与分析师团队，推动数据驱动的组织决策文化建立。';
    return '带领2-3人小团队，负责完整业务模块，向上汇报结果。核心能力：团队协调、跨部门资源整合、业务规划拆解。';
  } else {
    if (name.includes('产品')) return '成为高级产品专家/首席产品官，深耕垂直领域，输出行业级最佳实践与方法论，影响力向行业延展。';
    if (name.includes('咨询')) return '成为领域专家顾问，输出可复用的行业洞察与最佳实践，在专业社群建立声誉，推动行业知识沉淀。';
    if (name.includes('数据') || name.includes('分析')) return '成为数据科学专家或首席分析师，深耕建模预测与算法研究，输出行业级数据洞察，建立专业壁垒。';
    return '成为方法论专家，输出可复用的行业洞察与最佳实践，影响力向行业延展。核心能力：深度研究、知识系统化输出、外部声誉建立。';
  }
}

function renderPrimaryPathCard(role, idx) {
  const isSelectedRole = role.name === selectedRoleName;
  const roleTags = getRoleTags(role.name);
  const branch = activeBranches[idx] || 'manager';
  const branchContent = getBranchContent(role.name, branch);

  return `
    <div class="primary-card">
      <div class="primary-card__header">
        <div class="primary-card__badges">
          ${idx === 0 ? '<span class="path-badge path-badge--top">⭐ 最优推荐</span>' : '<span class="path-badge path-badge--alt">✦ 次优展示</span>'}
          ${isSelectedRole ? '<span class="path-badge path-badge--chosen">✓ 已选择</span>' : ''}
        </div>
        <div class="primary-card__title-row">
          <h3 class="primary-card__name">${escapeHtml(role.name)}</h3>
          ${role.score != null ? `<div class="primary-card__score">匹配分 <span class="primary-score-num">${role.score}</span></div>` : ''}
        </div>
        <p class="primary-card__reason muted small">${escapeHtml(role.reason)}</p>
        <div class="primary-card__tags">
          ${roleTags.map((t) => `<span class="chip chip--small">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <div class="inline-stepper">
        <div class="stepper-label-row">发展路线图 1Y → 3Y → 5Y</div>
        <div class="stepper-nodes">
          <div class="stepper-node">
            <div class="stepper-dot stepper-dot--1">1Y</div>
            <div class="stepper-body">
              <div class="stepper-period">1年内 · 基础闭环</div>
              <p class="stepper-desc">${escapeHtml(role.path.oneYear)}</p>
              <div class="stepper-skills">
                ${roleTags.slice(0, 2).map((t) => `<span class="chip chip--small">${escapeHtml(t)}</span>`).join('')}
              </div>
              <div class="stepper-risk">⚠ 适应岗位节奏，建立早期可信度</div>
            </div>
          </div>
          <div class="stepper-node">
            <div class="stepper-dot stepper-dot--3">3Y</div>
            <div class="stepper-body">
              <div class="stepper-period">3年内 · 核心骨干</div>
              <p class="stepper-desc">${escapeHtml(role.path.threeYear)}</p>
              <div class="stepper-skills">
                ${roleTags.map((t) => `<span class="chip chip--small">${escapeHtml(t)}</span>`).join('')}
              </div>
              <div class="stepper-risk">⚠ ${escapeHtml(role.risk)}</div>
            </div>
          </div>
          <div class="stepper-node">
            <div class="stepper-dot stepper-dot--5">5Y</div>
            <div class="stepper-body">
              <div class="stepper-period">5年内 · 高级 / 分叉</div>
              <p class="stepper-desc">${escapeHtml(role.path.fiveYear)}</p>
              <div class="path-branch-tabs">
                <button class="branch-tab ${branch === 'manager' ? 'branch-tab--active' : ''}"
                        data-branch-primary="manager" data-card-idx="${idx}">管理轨</button>
                <button class="branch-tab ${branch === 'expert' ? 'branch-tab--active' : ''}"
                        data-branch-primary="expert" data-card-idx="${idx}">专家轨</button>
              </div>
              <div class="branch-detail">${escapeHtml(branchContent)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSecondaryPathCard(role, originalIdx) {
  const roleTags = getRoleTags(role.name);
  const isSelectedRole = role.name === selectedRoleName;
  return `
    <article class="secondary-card" data-switch-primary="${originalIdx}">
      <div class="secondary-card__badges">
        ${originalIdx === 0 ? '<span class="path-badge path-badge--top path-badge--sm">⭐ 最优</span>' : ''}
        ${isSelectedRole ? '<span class="path-badge path-badge--chosen path-badge--sm">✓ 已选</span>' : ''}
      </div>
      <h4 class="secondary-card__name">${escapeHtml(role.name)}</h4>
      <div class="secondary-card__tags">
        ${roleTags.map((t) => `<span class="chip chip--small">${escapeHtml(t)}</span>`).join('')}
      </div>
      ${role.score != null ? `<div class="secondary-card__score">匹配分 ${role.score}</div>` : ''}
      <div class="secondary-card__hint">点击查看路线 →</div>
    </article>
  `;
}

function renderCareerPath() {
  if (!report) return '';
  const roles = report.focusRoles || [];
  if (!roles.length) return '';

  const simBannerHtml = simResult
    ? `<div class="sim-summary-banner">
        <div class="sim-summary-score">
          <div class="sim-score-circle">
            <span class="sim-score-num">${simResult.score}</span>
            <span class="sim-score-denom">/100</span>
          </div>
          <div class="sim-score-label">模拟匹配分</div>
        </div>
        <div class="sim-summary-info">
          <p><strong>模拟优势信号：</strong>${(simResult.dominant || []).map(escapeHtml).join(' · ') || '暂未识别'}</p>
          <p><strong>需关注卡点：</strong>${(simResult.friction || []).map(escapeHtml).join(' · ') || '需进一步验证'}</p>
          <p class="small muted">${escapeHtml(simResult.realisticExpectations || '')}</p>
        </div>
      </div>`
    : `<div class="sim-banner-empty">
        <span>💡</span>
        <span>完成第 4 步职业模拟器，可在此查看你的岗位匹配分析。</span>
      </div>`;

  const safeIdx = Math.min(primaryCareerIdx, roles.length - 1);
  const primaryRole = roles[safeIdx];
  const secondaryRoles = roles
    .map((r, i) => ({ role: r, idx: i }))
    .filter(({ idx }) => idx !== safeIdx);

  return `
    <section class="panel path-section">
      <h2>职业发展路径</h2>
      ${simBannerHtml}
      <div class="path-primary-row">
        ${renderPrimaryPathCard(primaryRole, safeIdx)}
      </div>
      <div class="path-secondary-row">
        ${secondaryRoles.map(({ role, idx }) => renderSecondaryPathCard(role, idx)).join('')}
      </div>
    </section>
  `;
}

// ─── Step 6: Action Guide (30-day calendar + resume studio) ──────────────────

/**
 * 获取行动指南日历数据（优先后端，本地兜底）
 */
function buildCalendarDays() {
  // 优先使用后端返回的数据
  if (actionPlanData?.action_plan_30_days?.length) {
    return actionPlanData.action_plan_30_days.map((item, idx) => {
      const dayRange = item.day_range || `Day ${idx + 1}`;
      const dayMatch = dayRange.match(/Day\s*(\d+)/);
      const day = dayMatch ? parseInt(dayMatch[1]) : idx + 1;
      // 根据天数分配组：1-7=组1, 8-21=组2, 22-30=组3
      const group = day <= 7 ? 1 : day <= 21 ? 2 : 3;
      return {
        id: `cal-${day}`,
        day,
        group,
        title: item.task_name || '任务',
        detail: item.purpose || '',
      };
    });
  }

  // Fallback：使用本地静态数据
  const roleName = selectedRoleName || '目标岗位';
  const roleTags = selectedRoleName ? getRoleTags(selectedRoleName) : [];
  const tag0 = roleTags[0] || '核心技能';
  const tag1 = roleTags[1] || '协作能力';

  return [
    { id: 'cal-1',  day: 1,  group: 1, title: '确认方向边界', detail: `写下你绝对不愿长期承受的3件事，与职业画像边界对比，确认方向不冲突。` },
    { id: 'cal-2',  day: 2,  group: 1, title: '更新"不做清单"', detail: `整理边界条目，贴在桌面或备忘录最显眼处，随时可查阅。` },
    { id: 'cal-3',  day: 3,  group: 1, title: '调研 JD → 提取关键词', detail: `搜集3份真实「${roleName}」招聘JD，提取5个高频核心关键词，记录成清单。` },
    { id: 'cal-4',  day: 4,  group: 1, title: '标注能力差距', detail: `逐条标注JD关键词：✓能做到 / ？不确定 / ✗还不会，生成你的"能力差距清单"。` },
    { id: 'cal-5',  day: 5,  group: 1, title: '整理职业叙事', detail: `写出"我为什么适合${roleName}"的3条理由，每条必须有具体经历支撑，禁止空话。` },
    { id: 'cal-6',  day: 6,  group: 1, title: '完善叙事草稿', detail: `找1位信任的朋友听你讲3条理由，收集反馈并优化表达。` },
    { id: 'cal-7',  day: 7,  group: 1, title: 'Week 1 复盘', detail: `用10分钟复盘：方向是否需要微调？边界清单和叙事是否清晰？记录关键洞察。` },
    { id: 'cal-8',  day: 8,  group: 2, title: '确定小项目选题', detail: `选1个可在两周内完成的小项目，写清楚目标与成功标准，明确量化交付指标。` },
    { id: 'cal-9',  day: 9,  group: 2, title: '项目资料收集', detail: `收集项目所需资料与参考，输出信息摘要，识别数据/知识缺口，制定填补计划。` },
    { id: 'cal-10', day: 10, group: 2, title: '完成项目初稿', detail: `产出项目第一版成果，重点是"可交付"而非"完美"，记录未解决的问题。` },
    { id: 'cal-11', day: 11, group: 2, title: '自我审查与迭代', detail: `按照JD关键词逐条检查初稿，识别3个以上改进点，明确优先级。` },
    { id: 'cal-12', day: 12, group: 2, title: '深化项目成果', detail: `针对改进点完成核心部分深化，产出接近"可公开展示"的版本。` },
    { id: 'cal-13', day: 13, group: 2, title: '发出访谈邀约', detail: `通过LinkedIn/脉脉/校友网络，发出至少2封信息访谈邀请，说清楚你的问题方向。` },
    { id: 'cal-14', day: 14, group: 2, title: 'Week 2 阶段小结', detail: `记录项目进展与核心收获，同步更新能力差距清单，准备访谈提纲。` },
    { id: 'cal-15', day: 15, group: 2, title: '完成第1次信息访谈', detail: `完成15-30分钟信息访谈，重点问：真实日常/最常踩坑/真正需要哪些能力。录音或速记。` },
    { id: 'cal-16', day: 16, group: 2, title: '整理访谈收获', detail: `把访谈内容结构化成：✓验证了 / ✗颠覆了 / ？新发现，更新你的方向认知。` },
    { id: 'cal-17', day: 17, group: 2, title: `练习 ${tag0}`, detail: `找1个实际任务刻意练习「${tag0}」，产出一个可展示的具体成果，记录练习反思。` },
    { id: 'cal-18', day: 18, group: 2, title: `强化 ${tag1}`, detail: `针对「${tag1}」设计1个小型练习任务，聚焦"我能做到哪一步"，记录能力边界。` },
    { id: 'cal-19', day: 19, group: 2, title: '公开或分享项目成果', detail: `把项目成果发布到公开平台或向目标圈子里的人展示，收集真实反馈。` },
    { id: 'cal-20', day: 20, group: 2, title: '发出第2封访谈邀约', detail: `再联系1位不同背景/公司的从业者，对比不同公司同一岗位的真实差异。` },
    { id: 'cal-21', day: 21, group: 2, title: 'Week 2-3 复盘', detail: `记录：访谈最颠覆认知的3句话 + 项目最难的1个决策 + 你的下一步行动。` },
    { id: 'cal-22', day: 22, group: 3, title: '整理前3周产出', detail: `汇总所有成果，识别最值得放进简历的2-3个亮点，用STAR结构重写描述。` },
    { id: 'cal-23', day: 23, group: 3, title: '更新简历框架', detail: `用简历工作坊，把3周成果整合进简历，确保每条经历都有量化数据支撑。` },
    { id: 'cal-24', day: 24, group: 3, title: '简历精修', detail: `找1位HR或目标方向从业者审简历，针对反馈完成最终精修，聚焦表达精准与关键词匹配。` },
    { id: 'cal-25', day: 25, group: 3, title: '完成第2次信息访谈', detail: `完成与第20天联系的从业者的访谈，重点聚焦：入职前最应准备什么？哪些能力真正稀缺？` },
    { id: 'cal-26', day: 26, group: 3, title: '输出公开复盘帖', detail: `写一篇500字以上的复盘分享，总结30天核心洞察，建立个人可信度。` },
    { id: 'cal-27', day: 27, group: 3, title: '30天深度复盘', detail: `写完整复盘报告：喜欢哪些部分 / 不喜欢哪些部分 / 是否愿意再花3年在这上面？` },
    { id: 'cal-28', day: 28, group: 3, title: '作出方向决策', detail: `给出明确结论：继续深耕${roleName} / 切换第二方向，并说明理由，形成书面记录。` },
    { id: 'cal-29', day: 29, group: 3, title: '更新自我介绍', detail: `用访谈和复盘的洞察，重写一段精准的自我介绍（50-100字），让表达更有力量。` },
    { id: 'cal-30', day: 30, group: 3, title: '制定下30天计划', detail: `基于本月复盘，设定下一阶段3个可量化目标，制定新的行动节奏，保持动能。` },
  ];
}

function renderCalendar(calDays) {
  const groupColors = { 1: '#ca8a04', 2: '#15803d', 3: '#b45309' };
  const cells = calDays.map((d) => {
    const isDone = completedTasks.has(d.id);
    const color = groupColors[d.group] || '#ca8a04';
    return `
      <div class="cal-cell ${isDone ? 'cal-cell--done' : ''}"
           data-cal-day="${escapeAttr(d.id)}"
           data-title="${escapeAttr(d.title)}"
           data-detail="${escapeAttr(d.detail)}"
           style="--cell-accent:${color}">
        <div class="cal-cell__day">${d.day}</div>
        <div class="cal-cell__title">${escapeHtml(d.title)}</div>
        ${isDone ? '<div class="cal-cell__check">✓</div>' : ''}
      </div>
    `;
  }).join('');
  return `<div class="cal-grid">${cells}</div>`;
}

function buildResumeFormInitial() {
  const skills = report?.profile?.skills?.slice(0, 5).join(' / ') || '';
  const drives = report?.profile?.drives || [];
  const skillStr = report?.profile?.skills?.slice(0, 3).join('、') || '多项核心技能';
  const summary = drives.length
    ? `以${drives[0]}为核心驱动，擅长${skillStr}，专注于${selectedRoleName || '职业方向'}的持续成长与价值创造。`
    : '';
  return { name: '', contact: '', targetRole: selectedRoleName || '', skills, summary };
}

function buildResumePreviewHtml() {
  const form = resumeForm || {};
  const name = form.name || '姓名';
  const contact = form.contact || '联系方式';
  const targetRole = form.targetRole || selectedRoleName || '求职方向';
  const skills = form.skills || (report?.profile?.skills?.slice(0, 5).join(' / ') || '');
  const summary = form.summary || '';

  const expItems = (entries || []).map((e, i) => {
    const scene = form[`exp_${i}_scene`] !== undefined ? form[`exp_${i}_scene`] : e.scene;
    const action = form[`exp_${i}_action`] !== undefined ? form[`exp_${i}_action`] : e.action;
    const result = form[`exp_${i}_result`] !== undefined ? form[`exp_${i}_result`] : e.result;
    return `
      <div class="rp-exp">
        <div class="rp-exp-title">项目 / 经历 ${i + 1}</div>
        ${scene ? `<p class="resume-bullet"><strong>情境：</strong>${escapeHtml(scene)}</p>` : ''}
        ${action ? `<p class="resume-bullet"><strong>行动：</strong>${escapeHtml(action)}</p>` : ''}
        ${result ? `<p class="resume-bullet"><strong>结果：</strong>${escapeHtml(result)}</p>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="rp-header">
      <div class="rp-name">${escapeHtml(name)}</div>
      <div class="rp-meta">${escapeHtml(contact)}</div>
      <div class="rp-target">求职意向：<strong>${escapeHtml(targetRole)}</strong></div>
    </div>
    ${skills ? `<div class="rp-section"><div class="resume-section-line">CORE SKILLS · 核心技能</div><p class="resume-bullet">${escapeHtml(skills)}</p></div>` : ''}
    ${summary ? `<div class="rp-section"><div class="resume-section-line">SUMMARY · 个人总结</div><p class="resume-bullet">${escapeHtml(summary)}</p></div>` : ''}
    ${expItems ? `<div class="rp-section"><div class="resume-section-line">EXPERIENCE · 项目经历</div>${expItems}</div>` : ''}
  `;
}

function buildLatexSource() {
  const form = resumeForm || {};
  const name = form.name || '姓名';
  const contact = form.contact || '';
  const targetRole = form.targetRole || selectedRoleName || '';
  const skills = form.skills || (report?.profile?.skills?.slice(0, 5).join(', ') || '');
  const summary = form.summary || '';
  const escape = (s) => String(s ?? '').replace(/[&%$#_{}~^\\]/g, (c) => `\\${c}`);
  const expItems = (entries || []).map((e, i) => {
    const scene = form[`exp_${i}_scene`] !== undefined ? form[`exp_${i}_scene`] : e.scene;
    const action = form[`exp_${i}_action`] !== undefined ? form[`exp_${i}_action`] : e.action;
    const result = form[`exp_${i}_result`] !== undefined ? form[`exp_${i}_result`] : e.result;
    return `\\textbf{项目 / 经历 ${i + 1}}\\\\[2pt]\n情境：${escape(scene)}\\\\[2pt]\n行动：${escape(action)}\\\\[2pt]\n结果：${escape(result)}\\\\[6pt]`;
  }).join('\n\n');
  return `\\documentclass[11pt]{article}
\\usepackage[a4paper, top=25mm, bottom=25mm, left=25mm, right=25mm]{geometry}
\\usepackage[UTF8]{ctex}
\\usepackage{parskip}
\\setlength{\\parindent}{0pt}
\\pagestyle{empty}

\\begin{document}

{\\LARGE \\textbf{${escape(name)}}}

\\noindent ${escape(contact)}${contact && targetRole ? '\\quad |\\quad ' : ''}求职意向：${escape(targetRole)}

\\noindent\\rule{\\textwidth}{1.2pt}

${skills ? `\\vspace{4pt}\n{\\large \\textbf{CORE SKILLS · 核心技能}}\n\n\\noindent\\rule{\\textwidth}{0.4pt}\n\n\\noindent ${escape(skills)}\n` : ''}
${summary ? `\\vspace{8pt}\n{\\large \\textbf{SUMMARY · 个人总结}}\n\n\\noindent\\rule{\\textwidth}{0.4pt}\n\n\\noindent ${escape(summary)}\n` : ''}
${expItems ? `\\vspace{8pt}\n{\\large \\textbf{EXPERIENCE · 项目经历}}\n\n\\noindent\\rule{\\textwidth}{0.4pt}\n\n${expItems}` : ''}

\\end{document}
`;
}

function exportLatex() {
  const tex = buildLatexSource();
  const blob = new Blob([tex], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resume.tex';
  a.click();
  URL.revokeObjectURL(url);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(tex).then(() => toast('LaTeX 已下载并复制到剪贴板')).catch(() => toast('已导出 resume.tex'));
  } else {
    toast('已导出 resume.tex');
  }
}

function exportWord() {
  const form = resumeForm || {};
  const name = form.name || '姓名';
  const contact = form.contact || '';
  const targetRole = form.targetRole || selectedRoleName || '';
  const skills = form.skills || (report?.profile?.skills?.slice(0, 5).join(' / ') || '');
  const summary = form.summary || '';

  // 构建经历 HTML
  const expItems = (entries || []).map((e, i) => {
    const scene = form[`exp_${i}_scene`] !== undefined ? form[`exp_${i}_scene`] : e.scene;
    const action = form[`exp_${i}_action`] !== undefined ? form[`exp_${i}_action`] : e.action;
    const result = form[`exp_${i}_result`] !== undefined ? form[`exp_${i}_result`] : e.result;
    return `
      <h2>项目 / 经历 ${i + 1}</h2>
      <p><b>情境：</b>${escapeHtml(scene || '')}</p>
      <p><b>行动：</b>${escapeHtml(action || '')}</p>
      <p><b>结果：</b>${escapeHtml(result || '')}</p>
    `;
  }).join('');

  // 构建完整 HTML 文档
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(name)} - 简历</title>
  <style>
    body { font-family: 'Microsoft YaHei', SimSun, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { text-align: center; margin-bottom: 10px; font-size: 24pt; }
    .contact { text-align: center; margin-bottom: 20px; color: #666; }
    h2 { border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 20px; font-size: 14pt; }
    p { margin: 8px 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(name)}</h1>
  <p class="contact">${escapeHtml(contact)}${contact && targetRole ? ' | ' : ''}求职意向：${escapeHtml(targetRole)}</p>

  ${skills ? `<h2>核心技能 CORE SKILLS</h2><p>${escapeHtml(skills)}</p>` : ''}
  ${summary ? `<h2>个人总结 SUMMARY</h2><p>${escapeHtml(summary)}</p>` : ''}
  ${expItems ? `<h2>项目经历 EXPERIENCE</h2>${expItems}` : ''}
</body>
</html>`;

  // 使用 Blob 下载，Word 可识别 HTML 格式
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resume.doc';
  a.click();
  URL.revokeObjectURL(url);
  toast('已导出 Word 简历');
}

function renderResumeStudio() {
  if (!report) {
    return `<div class="resume-studio resume-studio--empty"><p class="muted">完成分析后可在此制作简历。</p></div>`;
  }
  if (!resumeForm) resumeForm = buildResumeFormInitial();
  const form = resumeForm;

  const expHtml = (entries || []).map((e, i) => `
    <div class="rf-exp-block">
      <div class="rf-exp-label">经历 ${i + 1}</div>
      <textarea class="rf-textarea" data-resume-field="exp_${i}_scene" placeholder="情境">${escapeHtml(form[`exp_${i}_scene`] !== undefined ? form[`exp_${i}_scene`] : (e.scene || ''))}</textarea>
      <textarea class="rf-textarea" data-resume-field="exp_${i}_action" placeholder="行动">${escapeHtml(form[`exp_${i}_action`] !== undefined ? form[`exp_${i}_action`] : (e.action || ''))}</textarea>
      <textarea class="rf-textarea" data-resume-field="exp_${i}_result" placeholder="结果">${escapeHtml(form[`exp_${i}_result`] !== undefined ? form[`exp_${i}_result`] : (e.result || ''))}</textarea>
    </div>
  `).join('');

  return `
    <div class="resume-studio">
      <div class="resume-studio__header">
        <span class="resume-studio__title">简历工作室 · Resume Studio</span>
        <div class="export-bar">
          <button type="button" class="btn btn--sm btn--ghost" id="btn-resume-print">打印 / PDF</button>
          <button type="button" class="btn btn--sm btn--ghost" id="btn-export-latex">导出 LaTeX</button>
          <button type="button" class="btn btn--sm btn--ghost" id="btn-export-word">导出 Word</button>
        </div>
      </div>
      <div class="resume-studio__form-section">
        <div class="rf-grid">
          <div class="rf-field">
            <label>姓名</label>
            <input type="text" class="rf-input" data-resume-field="name" value="${escapeAttr(form.name || '')}" placeholder="输入你的姓名" />
          </div>
          <div class="rf-field">
            <label>联系方式</label>
            <input type="text" class="rf-input" data-resume-field="contact" value="${escapeAttr(form.contact || '')}" placeholder="138xxxx · xx@email.com" />
          </div>
          <div class="rf-field">
            <label>求职方向</label>
            <input type="text" class="rf-input" data-resume-field="targetRole" value="${escapeAttr(form.targetRole || selectedRoleName || '')}" placeholder="目标岗位" />
          </div>
          <div class="rf-field">
            <label>核心技能</label>
            <input type="text" class="rf-input" data-resume-field="skills" value="${escapeAttr(form.skills || '')}" placeholder="技能标签，用 / 分隔" />
          </div>
        </div>
        <div class="rf-field">
          <label>个人总结</label>
          <textarea class="rf-textarea" data-resume-field="summary" placeholder="2-3句话介绍核心优势与求职目标">${escapeHtml(form.summary || '')}</textarea>
        </div>
        <div class="rf-section-label">工作 / 项目经历（自动同步第1步）</div>
        ${expHtml}
      </div>
      <div class="resume-studio__preview-wrap">
        <div class="resume-preview" id="resume-preview-content">
          ${buildResumePreviewHtml()}
        </div>
      </div>
    </div>
  `;
}

function renderNewActionGuide() {
  if (!report) return '';
  const calDays = buildCalendarDays();
  const doneCount = calDays.filter((d) => completedTasks.has(d.id)).length;
  const pct = calDays.length > 0 ? Math.round((doneCount / calDays.length) * 100) : 0;

  const noRoleNotice = !selectedRoleName
    ? `<div class="action-notice">💡 回到第 3 步选择意向岗位，可生成针对该岗位的专属验证任务。</div>`
    : '';

  const legend = [
    { g: 1, label: 'Week 1 · 准备', color: '#ca8a04' },
    { g: 2, label: 'Week 2–3 · 验证', color: '#15803d' },
    { g: 3, label: 'Week 4 · 冲刺', color: '#b45309' },
  ];

  // 生成按钮：后端有数据时显示"刷新"，无数据时显示"生成"
  const generateBtn = selectedRoleName
    ? `<button type="button" class="btn btn--primary btn--sm" id="btn-generate-action-plan" ${actionPlanLoading ? 'disabled' : ''}>
        ${actionPlanLoading ? '生成中...' : (actionPlanData ? '刷新行动指南' : 'AI 生成行动指南')}
      </button>`
    : '';

  // 显示后端返回的职业路径信息（如果有）
  const careerPathInfo = actionPlanData?.career_path
    ? `<div class="action-career-path">
        <h4>职业发展路径</h4>
        <p><strong>1年：</strong>${escapeHtml(actionPlanData.career_path.year_1 || '')}</p>
        <p><strong>3年：</strong>${escapeHtml(actionPlanData.career_path.year_3 || '')}</p>
        <p><strong>5年：</strong>${escapeHtml(actionPlanData.career_path.year_5 || '')}</p>
        ${actionPlanData.risk_warning ? `<p class="risk-warning">⚠️ ${escapeHtml(actionPlanData.risk_warning)}</p>` : ''}
      </div>`
    : '';

  return `
    <section class="panel action-section">
      <div class="action-header">
        <h2 style="margin:0">30 天行动日历 · 简历工作室</h2>
        <div class="progress-wrap">
          <div class="action-progress-track">
            <div class="action-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="progress-text">${doneCount} / ${calDays.length} 已完成</span>
        </div>
      </div>
      ${careerPathInfo}
      <div class="step5-layout">
        <div class="step5-left">
          ${noRoleNotice}
          <div class="cal-legend">
            ${legend.map((l) => `
              <div class="cal-legend-item">
                <span class="cal-legend-dot" style="background:${l.color}"></span>
                <span>${l.label}</span>
              </div>
            `).join('')}
            <div class="cal-legend-item">
              <span class="cal-legend-dot cal-legend-dot--done"></span>
              <span>已完成</span>
            </div>
          </div>
          ${renderCalendar(calDays)}
          <div class="toolbar" style="margin-top:0.5rem">
            ${generateBtn}
            <button type="button" class="btn btn--ghost btn--sm" id="btn-export-plan">
              导出行动计划
            </button>
          </div>
        </div>
        <div class="step5-right">
          ${renderResumeStudio()}
        </div>
      </div>
    </section>
    <div class="cal-tooltip" id="cal-tooltip"></div>
  `;
}

function exportActionPlan() {
  const calDays = buildCalendarDays();
  const lines = ['我的 30 天行动计划', '='.repeat(28), ''];
  if (selectedRoleName) lines.push(`目标方向：${selectedRoleName}`, '');
  if (simResult) {
    lines.push(`模拟器匹配分：${simResult.score} / 100`);
    lines.push(`优势信号：${(simResult.dominant || []).join('、')}`);
    lines.push(`关注卡点：${(simResult.friction || []).join('、')}`);
    lines.push('');
  }
  const groups = [
    { label: 'Week 1: 准备', days: calDays.filter((d) => d.group === 1) },
    { label: 'Week 2-3: 验证', days: calDays.filter((d) => d.group === 2) },
    { label: 'Week 4: 冲刺', days: calDays.filter((d) => d.group === 3) },
  ];
  for (const g of groups) {
    lines.push(`【${g.label}】`);
    for (const d of g.days) {
      const done = completedTasks.has(d.id) ? '✓' : '○';
      lines.push(`  Day ${d.day} ${done} ${d.title}`);
      lines.push(`     ${d.detail}`);
      lines.push('');
    }
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '30天行动计划.txt';
  a.click();
  URL.revokeObjectURL(url);
  toast('已导出 30 天行动计划');
}

function intersectionCount(a = [], b = []) {
  const setB = new Set(b);
  let n = 0;
  for (const x of a) if (setB.has(x)) n += 1;
  return n;
}

function findJobByName(name) {
  if (!report?.tiers?.length) return null;
  for (const tier of report.tiers) {
    const found = (tier.jobs || []).find((j) => j.name === name);
    if (found) return found;
  }
  return null;
}

function evaluateSimulator(sim, answers) {
  const skillPool = new Set(sim?.scoring?.skillPool || []);
  const bkw = sim?.scoring?.boundaryKeyword || 'none';
  const roleTags = sim?.role?.tags || [];

  let raw = 0;
  const perQuestionMax = 70; // 放大单题分差

  for (const q of sim.questions || []) {
    const chosen = answers[q.id];
    const opt = (q.options || []).find((x) => x.id === chosen);
    if (!opt) {
      raw -= 12;
      continue;
    }

    const matchCount = opt.signals ? intersectionCount(opt.signals, [...skillPool]) : 0;
    const roleMatch = opt.signals ? intersectionCount(opt.signals, roleTags) : 0;
    let add = 16 + matchCount * 18 + roleMatch * 8;

    // 边界关键词惩罚（加大力度）
    if (bkw === 'pressure' && opt.id === 'b' && add > 0) add -= 14;
    if (bkw === 'public' && opt.id === 'c' && add > 0) add -= 8;
    if (bkw === 'repeat' && opt.id === 'b' && add > 0) add -= 10;

    raw += add;
  }

  const totalMax = (sim.questions?.length || 1) * perQuestionMax;
  const answered = Object.keys(answers || {}).length;
  const completionBonus = Math.round((answered / Math.max(1, sim.questions?.length || 1)) * 12);
  const coverage = roleTags.length
    ? intersectionCount(
        roleTags,
        [...new Set(Object.values(answers || {}).flatMap((id) => {
          const q = (sim.questions || []).find((qq) => (qq.options || []).some((o) => o.id === id));
          const opt = q?.options?.find((o) => o.id === id);
          return opt?.signals || [];
        }))]
      )
    : 0;
  const coverageBonus = coverage * 4;

  let score = Math.round((raw / totalMax) * 100) + completionBonus + coverageBonus;
  score = Math.max(0, Math.min(100, score));

  // 归纳：你在模拟里更倾向选择哪些"信号"
  const signalVotes = new Map();
  for (const q of sim.questions || []) {
    const opt = (q.options || []).find((x) => x.id === answers[q.id]);
    if (!opt) continue;
    for (const s of opt.signals || []) {
      signalVotes.set(s, (signalVotes.get(s) || 0) + 1);
    }
  }
  const dominant = [...signalVotes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map((x) => x[0])
    .slice(0, 3);

  // "最可能卡点"：岗位标签里你没怎么用到的部分（再加上模拟引擎给的 likelyFriction）
  const missing = roleTags.filter((t) => !dominant.includes(t)).slice(0, 3);
  const friction = [...(missing.length ? missing : sim.likelyFriction || [])].slice(0, 3);

  const nextSteps = [];
  if (missing[0]) nextSteps.push(`用 7 天练习补齐：做一个小任务把「${missing[0]}」做到"可复用"。`);
  if (sim.likelyFriction?.length) nextSteps.push(`把"真实挑战"当成验证清单：${sim.likelyFriction[0]}`);
  nextSteps.push(`找 1 位该岗位从业者聊 15 分钟：问"你最常返工/踩坑的点是什么"。`);

  const realisticExpectations =
    score >= 70
      ? '你的选择风格和岗位常见决策模式较匹配，更可能在早期快速建立信心。'
      : score >= 45
        ? '你有机会适配，但需要提前练习一些关键能力/决策习惯，否则容易反复返工。'
        : '你可能更容易在节奏、口径对齐或事实一致性上卡住；建议先用小型模拟与真实对话验证，再投入更深学习。';

  return { score, dominant, friction, nextSteps, realisticExpectations };
}

function renderSimulator() {
  if (sliceSimState) return renderSliceSimulator();
  if (!simulator) return '';
  const roleName = simulator.role.name;

  const optionsByQuestion = (simulator.questions || []).map((q) => {
    const answer = simAnswers[q.id];
    return q.options
      .map((opt) => {
        const checked = answer === opt.id ? 'checked' : '';
        return `
          <label class="sim-option">
            <input type="radio" name="${escapeAttr(q.id)}" value="${escapeAttr(opt.id)}" ${checked} />
            <div class="sim-option__text">${escapeHtml(opt.text)}</div>
            ${opt.risk ? `<div class="sim-option__risk">现实代价：${escapeHtml(opt.risk)}</div>` : ''}
          </label>
        `;
      })
      .join('');
  });

  const questionsHtml = (simulator.questions || [])
    .map((q, idx) => {
      const hint = q.hint ? `<p class="muted small">${escapeHtml(q.hint)}</p>` : '';
      return `
        <div class="sim-q">
          <h3 class="sim-q__title">${escapeHtml(q.prompt)}</h3>
          ${hint}
          <div class="sim-q__options">
            ${optionsByQuestion[idx] || ''}
          </div>
        </div>
      `;
    })
    .join('');

  const resultHtml = simResult
    ? `
      <div class="sim-result">
        <h3>模拟结论：匹配度 ${simResult.score}/100</h3>
        <p><strong>你更擅长的决策信号：</strong>${(simResult.dominant || []).map(escapeHtml).join('、') || '暂未识别'}</p>
        <p><strong>更可能卡点：</strong>${(simResult.friction || []).map(escapeHtml).join('、') || '需进一步模拟验证'}</p>
        <p class="muted"><strong>真实期待：</strong>${escapeHtml(simResult.realisticExpectations)}</p>
        <p><strong>下一步验证（建议马上做）：</strong></p>
        <ul>
          ${simResult.nextSteps.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}
        </ul>
      </div>
    `
    : `<div class="sim-actions">
        <button type="button" class="btn btn--primary" id="btn-submit-sim">提交本次模拟</button>
        <button type="button" class="btn btn--ghost" id="btn-reset-sim">重新开始</button>
      </div>`;

  return `
    <section class="panel sim-panel">
      <h2>职业模拟器（让你提前理解真实工作）</h2>
      <p class="muted small">你选择了：<strong>${escapeHtml(roleName)}</strong>。该模拟为近似场景，用于帮助你做"适配性验证"。</p>

      <div class="sim-block">
        <h3>一日工作节奏（模拟）</h3>
        <ul>
          ${(simulator.daySchedule || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}
        </ul>
      </div>

      <div class="sim-block">
        <h3>真实挑战（你可能会遇到的）</h3>
        <ul>
          ${(simulator.challenges || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}
        </ul>
      </div>

      <div class="sim-block">
        <h3>选择题：你会怎么做？</h3>
        ${questionsHtml}
      </div>

      ${resultHtml}
    </section>
  `;
}

function calcMomentumGain(delta = {}) {
  const pos = Math.max(0, delta.prof || 0) + Math.max(0, delta.social || 0);
  const pressureRelief = Math.max(0, -(delta.progress || 0));
  const emotionRelief = Math.max(0, -(delta.emotion || 0));
  return pos * 4 + pressureRelief * 2 + emotionRelief * 2;
}

function rollSliceEvent() {
  const pool = [
    { id: 'mentor', title: '前辈提示卡', effect: { prof: 2, social: 1, progress: -1, emotion: -1 }, text: '你收到前辈建议，决策更稳健。' },
    { id: 'deadline', title: '突发 Deadline', effect: { progress: 3, emotion: 2 }, text: '临时任务插入，节奏突然变快。' },
    { id: 'ally', title: '队友支援', effect: { social: 2, progress: -2 }, text: '跨团队同学帮你分担了关键任务。' },
    { id: 'bug', title: '隐形 Bug', effect: { prof: -1, progress: 2, emotion: 1 }, text: '关键细节出错，需要紧急修复。' },
  ];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

function applySliceSkill(skillId) {
  if (!sliceSimState || sliceSimState.skillsUsed[skillId]) return;
  const effects = {
    deepFocus: { prof: 3, emotion: -2 },
    teamSync: { social: 3, progress: -1 },
    sprint: { progress: -3, emotion: 1 },
  };
  const effect = effects[skillId];
  if (!effect) return;
  applySliceDelta(effect);
  sliceSimState.skillsUsed[skillId] = true;
  sliceSimState.skillLog = skillId;
  saveDraft();
  render();
}

function sliceStatBar(label, val, invertForColor = false) {
  const raw = Math.max(0, Math.min(100, Math.round(val)));
  const display = invertForColor ? 100 - raw : raw;
  const cls = display >= 70 ? 'excellent' : display >= 50 ? 'good' : display >= 35 ? 'warn' : 'danger';
  return `
    <div class="slice-bar">
      <span>${escapeHtml(label)}</span>
      <div class="slice-track"><div class="slice-fill ${cls}" style="width:${raw}%"></div></div>
      <b>${raw}</b>
    </div>
  `;
}

function renderSliceSimulator() {
  const s = sliceSimState;
  const cfg = s.config;
  const st = s.stats;
  const top = `
    <div class="sim-block">
      <h3>${escapeHtml(cfg.title)} · 模拟状态</h3>
      <div class="game-kpi-row">
        <div class="game-kpi"><span>关卡</span><b>${Math.min(s.nodeIndex + 1, cfg.nodes.length)} / ${cfg.nodes.length}</b></div>
        <div class="game-kpi"><span>积分</span><b>${s.score}</b></div>
        <div class="game-kpi"><span>连击</span><b>x${Math.max(1, s.streak)}</b></div>
      </div>
      <div class="slice-bars">
        ${sliceStatBar('专业判断', st.prof)}
        ${sliceStatBar('人际协调', st.social)}
        ${sliceStatBar('进度压力', st.progress, true)}
        ${sliceStatBar('情绪负荷', st.emotion, true)}
      </div>
      ${
        s.skillLog
          ? `<p class="small muted">最近技能：${s.skillLog === 'deepFocus' ? '深度思考' : s.skillLog === 'teamSync' ? '团队同步' : '冲刺模式'}</p>`
          : ''
      }
    </div>
  `;

  if (s.phase === 'intro') {
    const i = cfg.intro;
    return `
      <section class="panel sim-panel">
        <h2>职业模拟器（对应岗位剧情）</h2>
        <p class="muted small">已根据你选择的岗位加载对应模拟器：<strong>${escapeHtml(selectedRoleName || '')}</strong></p>
        <div class="sim-block">
          <p><b>你的身份：</b>${escapeHtml(i.identity)}</p>
          <p><b>当前时间：</b>${escapeHtml(i.time)}</p>
          <p><b>当前任务：</b>${escapeHtml(i.task)}</p>
          <p><b>关键目标：</b>${escapeHtml(i.goal)}</p>
          <p><b>潜在风险：</b>${escapeHtml(i.risk)}</p>
        </div>
        <div class="sim-actions">
          <button type="button" class="btn btn--primary" id="btn-slice-start">开始这段工作</button>
        </div>
      </section>
    `;
  }

  if (s.phase === 'feedback' && s.pending) {
    const d = s.pending.delta || { prof: 0, social: 0, progress: 0, emotion: 0 };
    return `
      <section class="panel sim-panel">
        <h2>职业模拟器（对应岗位剧情）</h2>
        ${top}
        <div class="sim-block">
          <h3>即时反馈</h3>
          <p>${escapeHtml(s.pending.feedback)}</p>
          <p class="muted">
            状态变化：专业 ${d.prof >= 0 ? '+' : ''}${d.prof} · 协调 ${d.social >= 0 ? '+' : ''}${d.social} ·
            进度 ${d.progress >= 0 ? '+' : ''}${d.progress} · 情绪 ${d.emotion >= 0 ? '+' : ''}${d.emotion}
          </p>
          ${s.pending.nextHint ? `<p class="small">${escapeHtml(s.pending.nextHint)}</p>` : ''}
        </div>
        <div class="sim-actions">
          <button type="button" class="btn btn--primary" id="btn-slice-continue">继续</button>
        </div>
      </section>
    `;
  }

  if (s.phase === 'node') {
    const node = cfg.nodes[s.nodeIndex];
    if (!node) return '';
    return `
      <section class="panel sim-panel">
        <h2>职业模拟器（对应岗位剧情）</h2>
        ${top}
        <div class="sim-block">
          <h3>${escapeHtml(node.title)}（第 ${s.nodeIndex + 1}/${cfg.nodes.length} 幕）</h3>
          <p>${escapeHtml(node.scene)}</p>
        </div>
        <div class="sim-block">
          <h3>技能卡（每局各可用一次）</h3>
          <div class="skill-cards">
            <button type="button" class="skill-card ${s.skillsUsed.deepFocus ? 'skill-card--used' : ''}" data-skill="deepFocus" ${
              s.skillsUsed.deepFocus ? 'disabled' : ''
            }>
              <b>深度思考</b><span>专业 +3，情绪 -2</span>
            </button>
            <button type="button" class="skill-card ${s.skillsUsed.teamSync ? 'skill-card--used' : ''}" data-skill="teamSync" ${
              s.skillsUsed.teamSync ? 'disabled' : ''
            }>
              <b>团队同步</b><span>协作 +3，压力 -1</span>
            </button>
            <button type="button" class="skill-card ${s.skillsUsed.sprint ? 'skill-card--used' : ''}" data-skill="sprint" ${
              s.skillsUsed.sprint ? 'disabled' : ''
            }>
              <b>冲刺模式</b><span>压力 -3，情绪 +1</span>
            </button>
          </div>
        </div>
        <div class="sim-block">
          <h3>你会怎么做？</h3>
          <div class="sim-q__options">
            ${node.options
              .map(
                (o, idx) => `
                  <button type="button" class="sim-option slice-opt" data-opt-idx="${idx}">
                    <div class="sim-option__text">${escapeHtml(o.label)}</div>
                  </button>
                `
              )
              .join('')}
          </div>
        </div>
      </section>
    `;
  }

  if (s.phase === 'wrap') {
    return `
      <section class="panel sim-panel">
        <h2>职业模拟器（对应岗位剧情）</h2>
        ${top}
        <div class="sim-block">
          <h3>片段收尾</h3>
          <p>${escapeHtml(cfg.wrapText)}</p>
        </div>
        <div class="sim-actions">
          <button type="button" class="btn btn--primary" id="btn-slice-finish">生成本次模拟结论</button>
        </div>
      </section>
    `;
  }

  if (s.phase === 'done') {
    const rank = simResult?.score >= 85 ? 'S' : simResult?.score >= 70 ? 'A' : simResult?.score >= 55 ? 'B' : 'C';
    return `
      <section class="panel sim-panel">
        <h2>职业模拟器（对应岗位剧情）</h2>
        ${top}
        <div class="sim-result">
          <p class="game-rank">本局评级：<strong>${rank}</strong></p>
          <h3>模拟结论：匹配度 ${simResult?.score ?? '--'}/100</h3>
          <p><strong>你更擅长的决策信号：</strong>${(simResult?.dominant || []).map(escapeHtml).join('、')}</p>
          <p><strong>更可能卡点：</strong>${(simResult?.friction || []).map(escapeHtml).join('、')}</p>
          <p class="muted"><strong>真实期待：</strong>${escapeHtml(simResult?.realisticExpectations || '')}</p>
          <ul>
            ${(simResult?.nextSteps || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}
          </ul>
        </div>
        <div class="sim-actions">
          <button type="button" class="btn btn--ghost" id="btn-reset-sim">重新开始</button>
        </div>
      </section>
    `;
  }

  return '';
}

function applySliceDelta(delta) {
  const d = delta || {};
  const s = sliceSimState.stats;
  s.prof = Math.max(0, Math.min(100, s.prof + (d.prof || 0)));
  s.social = Math.max(0, Math.min(100, s.social + (d.social || 0)));
  s.progress = Math.max(0, Math.min(100, s.progress + (d.progress || 0)));
  s.emotion = Math.max(0, Math.min(100, s.emotion + (d.emotion || 0)));
}

function buildSliceResult() {
  const s = sliceSimState.stats;
  const base = 50;
  const sorted = [
    ['专业判断', s.prof],
    ['人际协调', s.social],
    ['进度压力', 100 - s.progress],
    ['情绪恢复', 100 - s.emotion],
  ].sort((a, b) => b[1] - a[1]);
  const statScore = Math.round((sorted[0][1] + sorted[1][1]) / 2);

  // 成长幅度：相对初始值（50）提升越多，分数越高
  const growthRaw =
    (s.prof - base) +
    (s.social - base) +
    (base - s.progress) +
    (base - s.emotion);
  const growthScore = Math.max(0, Math.min(100, Math.round(50 + growthRaw * 0.7)));

  // 表现分：积分 + 连击纳入最终分，避免"总在50附近"
  const perfScore = Math.max(
    0,
    Math.min(100, Math.round(38 + sliceSimState.score * 0.85 + (sliceSimState.streak - 1) * 6))
  );

  let score = Math.round(statScore * 0.42 + growthScore * 0.18 + perfScore * 0.4);
  if (sliceSimState.skillsUsed.deepFocus && sliceSimState.skillsUsed.teamSync) score += 3;
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    dominant: [sorted[0][0], sorted[1][0]],
    friction: [
      s.progress > 60 ? '节奏与交付压力偏高' : '节奏压力可控',
      s.emotion > 60 ? '情绪负荷偏高，需要恢复机制' : '情绪负荷总体可控',
    ],
    nextSteps: [
      `把「${sorted[0][0]}」写成可复用方法，并在下周真实任务里验证一次。`,
      '找 1 位该岗位从业者，核对你在模拟中最难的一幕是否真实常见。',
      '完成 1 个小型作品并复盘：我是否愿意长期承受这种工作节奏。',
    ],
    realisticExpectations: '这次结果来自剧情模拟，不代表最终职业结论；请结合真实实践持续修正。',
  };
}

function canGoStep(step) {
  if (step <= 1) return true;
  if (step === 2) return entries.length >= 3;
  if (step === 3) return entries.length >= 3;
  if (!report) return false;
  if (step >= 4 && !selectedRoleName) return false;
  return true;
}

function renderStepNav() {
  const labels = ['输入经历', '偏好校准', '职业分析选岗', '职业体验模拟器', '职业发展路径', '行动指南'];
  const status = labels
    .map((_, idx) => {
      const step = idx + 1;
      if (step < currentStep) return 'done';
      if (step === currentStep) return 'active';
      return 'todo';
    });
  return `
    <nav class="stepper panel no-print" aria-label="流程步骤">
      <div class="stepper-line"></div>
      ${labels
        .map((label, idx) => {
          const step = idx + 1;
          const disabled = !canGoStep(step) ? 'disabled' : '';
          return `
            <button class="stepper-node stepper-node--${status[idx]}" data-jump-step="${step}" ${disabled}>
              <span class="dot">${step < currentStep ? '✓' : step}</span>
              <span class="txt">${escapeHtml(label)}</span>
            </button>
          `;
        })
        .join('')}
    </nav>
  `;
}

function renderCurrentStep() {
  if (currentStep === 1) {
    return `
      <div class="panel">
        <h2>步骤 1 / 6 · 输入经历（至少3段）</h2>
        <p class="muted small">每段都写清楚：情境、行动、结果、感受。系统会更准确识别你的稳定优势和边界。</p>
        <div class="toolbar">
          <button type="button" class="btn btn--primary" id="btn-add">+ 添加经历</button>
          <button type="button" class="btn btn--ghost" id="btn-open-resume-parse">简历解析</button>
          <button type="button" class="btn btn--ghost" id="btn-fill">载入示例</button>
          <button type="button" class="btn btn--primary" id="btn-run">下一步：偏好校准</button>
        </div>
        ${
          resumeParseOpen
            ? `
          <div class="resume-parse-box">
            <h3>简历解析（PDF / Word）</h3>
            <p class="small muted">上传简历后，系统会调用大模型解析并自动填入"情境、行动、结果、感受"。</p>
            <div class="field">
              <label>上传文件</label>
              <input id="resume-file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
              <p class="small muted">${resumeFile ? `已选择：${escapeHtml(resumeFile.name)}` : '未选择文件'}</p>
            </div>
            <div class="toolbar">
              <button type="button" class="btn btn--primary" id="btn-parse-resume" ${resumeParseLoading ? 'disabled' : ''}>
                ${resumeParseLoading ? '解析中...' : '开始解析并填入'}
              </button>
              <button type="button" class="btn btn--ghost" id="btn-cancel-resume-parse">取消</button>
            </div>
          </div>
        `
            : ''
        }
        <div class="entry-list">
          ${entries.map((item, idx) => renderEntryCard(item, idx)).join('') || '<p class="muted">暂无经历，先添加一段吧。</p>'}
        </div>
      </div>
    `;
  }

  if (currentStep === 2) {
    return renderReflectionStep();
  }

  if (!report) {
    return `
      <section class="panel">
        <h2>请先完成偏好校准</h2>
        <p class="muted">你已经进入选岗/后续步骤，但还没有职业分析结果。请先在第 2 步完成偏好校准并生成分析。</p>
      </section>
    `;
  }

  if (currentStep === 3) {
    if (compareViewOpen) {
      return `${renderProfile()}${renderCompareGraphPage()}`;
    }
    return `
      ${renderProfile()}
      <section class="panel">
        <div class="toolbar no-print">
          <button class="btn btn--ghost btn--sm" type="button">卡片视图</button>
          <button class="btn btn--ghost btn--sm" type="button">列表视图</button>
          <button class="btn btn--ghost btn--sm" type="button">高匹配</button>
          <button class="btn btn--ghost btn--sm" type="button">可探索</button>
        </div>
        <p class="small muted">请先从岗位中仅选择你最想去的2个方向，然后点击职业画像旁的"开始对比"。</p>
      </section>
      ${report ? report.tiers.map((t) => renderTier(t, selectedRoleCandidates)).join('') : ''}
    `;
  }

  if (currentStep === 4) {
    return selectedRoleName
      ? renderSimulator()
      : `<section class="panel"><h2>请先在第 3 步选择意向岗位</h2></section>`;
  }

  if (currentStep === 5) {
    return renderCareerPath();
  }

  return renderNewActionGuide();
}

function renderPager() {
  const prevDisabled = currentStep <= 1;
  const nextDisabled = currentStep >= 6 || !canGoStep(currentStep + 1);
  return `
    <div class="panel no-print">
      <div class="toolbar">
        <button class="btn btn--ghost btn--sm" type="button">保存草稿</button>
        <button class="btn btn--ghost" id="btn-prev-step" ${prevDisabled ? 'disabled' : ''}>上一步</button>
        <button class="btn btn--primary" id="btn-next-step" ${nextDisabled ? 'disabled' : ''}>下一步</button>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/\n/g, '&#10;');
}

function render() {
  stopCompareGraphPhysics();
  const root = document.getElementById('app');
  const moduleBody =
    activeTab === 'home'
      ? renderHomePage()
      : activeTab === 'consulting'
        ? renderConsultingPage()
        : activeTab === 'forum'
          ? renderForumPage()
          : `${renderStepNav()}<main class="stage" data-step="${currentStep}">${renderCurrentStep()}</main>${renderPager()}`;

  const heroSection = activeTab === 'home'
    ? `<div class="home-hero no-print">
        <p class="home-hero__greeting">你好，Alex，继续你的职业探索 🌿</p>
        <p class="home-hero__sub muted">你正在追寻适合你的职业方向</p>
       </div>`
    : `<div class="hero no-print">
        <div class="hero__eyebrow">Career Compass · Direction-Oriented Career OS</div>
        <h1>Career Compass 职业指南针</h1>
        <p>专业可信的职业探索与决策平台，帮助你在复杂选择中找到长期方向。</p>
       </div>`;

  root.innerHTML = `
    ${renderTopNav()}
    ${heroSection}
    ${renderTopTabs()}
    ${moduleBody}
  `;

  bind();
  startCompareGraphPhysics();
}

function bind() {
  const add = document.getElementById('btn-add');
  if (add) add.addEventListener('click', () => addEntry());

  const openResumeParse = document.getElementById('btn-open-resume-parse');
  if (openResumeParse) {
    openResumeParse.addEventListener('click', () => {
      resumeParseOpen = true;
      render();
    });
  }

  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab');
      saveDraft();
      render();
    });
  });
  document.querySelectorAll('[data-tab-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab-jump');
      activeTab = targetTab;
      saveDraft();
      render();
      // 滚动到内容区域
      setTimeout(() => {
        document.querySelector('.stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    });
  });

  document.querySelectorAll('[data-del]').forEach((b) => {
    b.addEventListener('click', () => removeEntry(b.getAttribute('data-del')));
  });

  // 用户头像点击事件
  const userAvatarBtn = document.getElementById('btn-user-avatar');
  if (userAvatarBtn) {
    userAvatarBtn.addEventListener('click', () => {
      showUserPanel = !showUserPanel;
      saveDraft();
      render();
    });
  }

  // 点击其他地方关闭用户面板
  document.addEventListener('click', (e) => {
    if (showUserPanel && !e.target.closest('#user-panel') && !e.target.closest('#btn-user-avatar')) {
      showUserPanel = false;
      saveDraft();
      render();
    }
  });

  // 用户面板事件处理
  const avatarInput = document.getElementById('avatar-input');
  const btnUploadAvatar = document.getElementById('btn-upload-avatar');
  if (btnUploadAvatar && avatarInput) {
    btnUploadAvatar.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          userProfile.avatar = evt.target.result;
          saveDraft();
          render();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const userNameInput = document.getElementById('user-name-input');
  if (userNameInput) {
    userNameInput.addEventListener('input', () => {
      userProfile.name = userNameInput.value;
      saveDraft();
      render();
    });
  }

  const btnSaveUser = document.getElementById('btn-save-user');
  if (btnSaveUser) {
    btnSaveUser.addEventListener('click', () => {
      if (!userProfile.createdAt) {
        userProfile.createdAt = new Date().toISOString();
      }
      saveDraft();
      showUserPanel = false;
      render();
      toast('保存成功');
    });
  }

  const btnDeleteData = document.getElementById('btn-delete-data');
  if (btnDeleteData) {
    btnDeleteData.addEventListener('click', () => {
      if (confirm('确定要删除所有数据吗？此操作不可恢复。')) {
        localStorage.removeItem('career_path_demo_v1');
        location.reload();
      }
    });
  }

  const btnClearAll = document.getElementById('btn-clear-all');
  if (btnClearAll) {
    btnClearAll.addEventListener('click', () => {
      if (confirm('确定要清除所有本地数据吗？此操作不可恢复。')) {
        localStorage.removeItem('career_path_demo_v1');
        // 重置所有状态变量
        entries = [];
        report = null;
        selectedRoleName = null;
        currentStep = 1;
        sliceSimState = null;
        activeTab = 'home';
        forumPosts = [...defaultForumPosts];
        forumCategory = 'all';
        actionTasks = [...defaultActionTasks];
        reflectionForm = {
          achievementRecall: '',
          values: [],
          personality: { introExtro: '内向', workStyle: '独立思考' },
          testReference: '',
        };
        coachMessages = [];
        coachDraft = '';
        coachStage = 'initial';
        coachTopicIndex = 0;
        selectedRoleCandidates = [];
        compareViewOpen = false;
        compareFocusKey = '';
        compareAdvantageMap = {};
        compareAdvantageSource = 'mock';
        mentorAgentMentorId = null;
        mentorAgentMessages = [];
        mentorAgentDraft = '';
        completedTasks = new Set();
        primaryCareerIdx = 0;
        activeBranches = {};
        resumeForm = null;
        userProfile = { name: '', avatar: null, createdAt: null };
        showUserPanel = false;
        render();
        // 下次加载时会自动 addEntry
        toast('已清除所有数据');
      }
    });
  }

  document.querySelectorAll('[data-field]').forEach((el) => {
    const handler = () => {
      const id = el.getAttribute('data-id');
      const field = el.getAttribute('data-field');
      updateEntry(id, field, el.value);
    };
    el.addEventListener('change', handler);
    el.addEventListener('input', handler);
  });

  const fill = document.getElementById('btn-fill');
  if (fill) fill.addEventListener('click', () => fillDemo());

  const run = document.getElementById('btn-run');
  if (run) {
    run.addEventListener('click', () => {
      if (!validateEntries()) return;
      currentStep = 2;
      saveDraft();
      render();
    });
  }

  const generateAnalysisBtn = document.getElementById('btn-generate-analysis');
  if (generateAnalysisBtn) {
    generateAnalysisBtn.addEventListener('click', async () => {
      if (!validateReflection()) return;
      try {
        coachLoading = true;
        render();
        await summarizeReflectionFromChat();
      } catch (e) {
        toast(`偏好提炼失败：${e.message?.slice(0, 50) || '请重试'}`);
      } finally {
        coachLoading = false;
      }
      runAnalysis();
      currentStep = 3;
      saveDraft();
      render();
    });
  }

  const coachInput = document.getElementById('coach-input');
  if (coachInput) {
    coachInput.addEventListener('input', () => {
      coachDraft = coachInput.value;
      saveDraft();
    });
  }
  const sendCoachBtn = document.getElementById('btn-send-coach');
  if (sendCoachBtn) sendCoachBtn.addEventListener('click', () => sendCoachMessage());
  const voiceBtn = document.getElementById('btn-voice-input');
  if (voiceBtn) voiceBtn.addEventListener('click', () => startVoiceInput());

  const resumeFileInput = document.getElementById('resume-file');
  if (resumeFileInput) {
    resumeFileInput.addEventListener('change', (e) => {
      resumeFile = e.target.files?.[0] || null;
    });
  }

  const parseResumeBtn = document.getElementById('btn-parse-resume');
  if (parseResumeBtn) parseResumeBtn.addEventListener('click', () => parseResumeAndFill());

  const cancelResumeParse = document.getElementById('btn-cancel-resume-parse');
  if (cancelResumeParse) {
    cancelResumeParse.addEventListener('click', () => {
      resumeParseOpen = false;
      resumeFile = null;
      render();
    });
  }

  document.querySelectorAll('[data-book-mentor]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mentorId = btn.getAttribute('data-book-mentor');
      const mentor = mentorProfiles.find((m) => m.id === mentorId);
      if (!mentor) return;
      toast(`已提交预约：${mentor.name}（演示版）`);
    });
  });

  document.querySelectorAll('[data-book-ai]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mentorId = btn.getAttribute('data-book-ai');
      const mentor = mentorProfiles.find((m) => m.id === mentorId);
      if (!mentor) return;
      mentorAgentMentorId = mentorId;
      mentorAgentMessages = [];
      mentorAgentDraft = '';
      mentorAgentLoading = false;
      saveDraft();
      render();
    });
  });

  const backConsulting = document.getElementById('btn-back-consulting');
  if (backConsulting) {
    backConsulting.addEventListener('click', () => {
      mentorAgentMentorId = null;
      mentorAgentDraft = '';
      mentorAgentLoading = false;
      saveDraft();
      render();
    });
  }

  const mentorAgentInput = document.getElementById('mentor-agent-input');
  if (mentorAgentInput) {
    mentorAgentInput.addEventListener('input', (e) => {
      mentorAgentDraft = e.target.value;
      saveDraft();
    });
  }

  const mentorAgentSend = document.getElementById('btn-send-mentor-agent');
  if (mentorAgentSend) {
    mentorAgentSend.addEventListener('click', async () => {
      const mentor = getMentorById(mentorAgentMentorId);
      const text = mentorAgentDraft.trim();
      if (!mentor || !text || mentorAgentLoading) return;
      mentorAgentMessages.push({ role: 'user', text });
      mentorAgentDraft = '';
      mentorAgentLoading = true;
      saveDraft();
      render();
      try {
        const reply = await askMentorAgent(text, mentor);
        mentorAgentMessages.push({ role: 'assistant', text: reply });
      } catch {
        mentorAgentMessages.push({
          role: 'assistant',
          text: `我是${mentor.name}智能体。我这边网络有点忙，先给你一个通用建议：先选一个方向做7天低成本验证，再根据反馈迭代。`,
        });
      } finally {
        mentorAgentLoading = false;
        saveDraft();
        render();
      }
    });
  }

  const postBtn = document.getElementById('btn-post-forum');
  if (postBtn) {
    postBtn.addEventListener('click', () => {
      const titleEl = document.getElementById('forum-title');
      const contentEl = document.getElementById('forum-content');
      const title = titleEl?.value?.trim() || '';
      const content = contentEl?.value?.trim() || '';
      if (!title || !content) {
        toast('请先填写标题和内容');
        return;
      }
      forumPosts = [
        {
          id: `p_${Date.now()}`,
          title,
          author: '你',
          category: forumCategory === 'all' ? '岗位认知' : forumCategory,
          createdAt: '刚刚',
          likes: 0,
          comments: 0,
          content,
        },
        ...forumPosts,
      ];
      if (titleEl) titleEl.value = '';
      if (contentEl) contentEl.value = '';
      saveDraft();
      render();
      toast('发布成功');
    });
  }

  document.querySelectorAll('[data-forum-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      forumCategory = btn.getAttribute('data-forum-cat');
      saveDraft();
      render();
    });
  });

  // 选择2个意向岗位用于对比
  document.querySelectorAll('[data-pick-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-pick-role');
      if (!name || !report) return;
      if (selectedRoleCandidates.includes(name)) {
        selectedRoleCandidates = selectedRoleCandidates.filter((x) => x !== name);
      } else {
        if (selectedRoleCandidates.length >= 2) {
          toast('最多选择2个意向岗位进行对比');
          return;
        }
        selectedRoleCandidates = [...selectedRoleCandidates, name];
      }
      if (selectedRoleCandidates.length !== 2) {
        compareViewOpen = false;
        compareFocusKey = '';
      }
      selectedRoleName = null;
      simulator = null;
      sliceSimState = null;
      simAnswers = {};
      simResult = null;
      compareAdvantageMap = {};
      compareAdvantageSource = 'mock';
      compareAdvantageLoading = false;
      saveDraft();
      render();
    });
  });

  document.querySelectorAll('[data-open-compare]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (selectedRoleCandidates.length !== 2) {
        toast('请先选择2个意向岗位');
        return;
      }
      compareViewOpen = true;
      if (!compareFocusKey) compareFocusKey = 'salary';
      saveDraft();
      render();
      runCompareAdvantageAnalysis();
    });
  });

  document.querySelectorAll('[data-back-compare]').forEach((btn) => {
    btn.addEventListener('click', () => {
      compareViewOpen = false;
      saveDraft();
      render();
    });
  });

  document.querySelectorAll('[data-factor-node]').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateCompareGraphFocus(btn);
      saveDraft();
    });
  });

  document.querySelectorAll('[data-final-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-final-role');
      if (!prepareSimulatorForRole(name)) return;
      saveDraft();
      render();
      toast(`已确定岗位：${name}，点击"下一步"进入模拟器`);
    });
  });

  // 提交/重置模拟
  const submit = document.getElementById('btn-submit-sim');
  if (submit) {
    submit.addEventListener('click', () => {
      const answers = {};
      for (const q of simulator.questions || []) {
        const checked = document.querySelector(`input[name="${q.id}"]:checked`);
        if (checked) answers[q.id] = checked.value;
      }
      simAnswers = answers;
      simResult = evaluateSimulator(simulator, answers);
      saveDraft();
      render();
    });
  }

  const startSlice = document.getElementById('btn-slice-start');
  if (startSlice) {
    startSlice.addEventListener('click', () => {
      sliceSimState.phase = 'node';
      saveDraft();
      render();
    });
  }

  document.querySelectorAll('.slice-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-opt-idx'));
      const node = sliceSimState?.config?.nodes?.[sliceSimState.nodeIndex];
      if (!node || Number.isNaN(idx)) return;
      const opt = node.options[idx];
      if (!opt) return;
      sliceSimState.pending = opt;
      sliceSimState.phase = 'feedback';
      saveDraft();
      render();
    });
  });

  const continueSlice = document.getElementById('btn-slice-continue');
  if (continueSlice) {
    continueSlice.addEventListener('click', () => {
      if (!sliceSimState?.pending) return;
      applySliceDelta(sliceSimState.pending.delta);
      const gain = calcMomentumGain(sliceSimState.pending.delta);
      if (gain >= 4) {
        sliceSimState.streak += 1;
      } else {
        sliceSimState.streak = 1;
      }
      sliceSimState.score += gain * sliceSimState.streak;

      if (Math.random() < 0.36) {
        const evt = rollSliceEvent();
        applySliceDelta(evt.effect);
        toast(`事件：${evt.title} · ${evt.text}`);
      }

      sliceSimState.pending = null;
      sliceSimState.nodeIndex += 1;
      if (sliceSimState.nodeIndex >= sliceSimState.config.nodes.length) {
        sliceSimState.phase = 'wrap';
      } else {
        sliceSimState.phase = 'node';
      }
      saveDraft();
      render();
    });
  }

  const finishSlice = document.getElementById('btn-slice-finish');
  if (finishSlice) {
    finishSlice.addEventListener('click', () => {
      simResult = buildSliceResult();
      sliceSimState.phase = 'done';
      saveDraft();
      render();
    });
  }

  document.querySelectorAll('[data-skill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const skillId = btn.getAttribute('data-skill');
      applySliceSkill(skillId);
      toast('技能已使用');
    });
  });

  const reset = document.getElementById('btn-reset-sim');
  if (reset) {
    reset.addEventListener('click', () => {
      simAnswers = {};
      simResult = null;
      if (sliceSimState?.config) {
        sliceSimState = {
          config: sliceSimState.config,
          phase: 'intro',
          nodeIndex: 0,
          pending: null,
          stats: { prof: 50, social: 50, progress: 50, emotion: 50 },
          score: 0,
          streak: 1,
          skillsUsed: { deepFocus: false, teamSync: false, sprint: false },
          skillLog: '',
        };
      }
      saveDraft();
      render();
    });
  }

  // 步骤跳转
  document.querySelectorAll('[data-jump-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const to = Number(btn.getAttribute('data-jump-step') || 1);
      if (!canGoStep(to)) return;
      currentStep = to;
      saveDraft();
      render();
    });
  });

  const prev = document.getElementById('btn-prev-step');
  if (prev) {
    prev.addEventListener('click', () => {
      if (currentStep <= 1) return;
      currentStep -= 1;
      saveDraft();
      render();
    });
  }

  const next = document.getElementById('btn-next-step');
  if (next) {
    next.addEventListener('click', async () => {
      if (currentStep === 2 && !report) {
        if (!validateReflection()) return;
        try {
          coachLoading = true;
          render();
          await summarizeReflectionFromChat();
        } catch (e) {
          toast(`偏好提炼失败：${e.message?.slice(0, 50) || '请重试'}`);
          coachLoading = false;
          render();
          return;
        }
        coachLoading = false;
        runAnalysis();
        currentStep = 3;
        saveDraft();
        render();
        return;
      }
      const target = currentStep + 1;
      if (!canGoStep(target)) {
        toast(target >= 4 ? '请先完成分析并选择意向岗位' : '请先完成当前步骤');
        return;
      }
      currentStep = Math.min(6, target);
      saveDraft();
      render();
    });
  }

  // ── Step 5: Career Path ──────────────────────────────────────────
  document.querySelectorAll('[data-switch-primary]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-switch-primary'), 10);
      if (!isNaN(idx)) {
        primaryCareerIdx = idx;
        saveDraft();
        render();
      }
    });
  });

  document.querySelectorAll('[data-branch-primary]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const branch = btn.getAttribute('data-branch-primary');
      const cardIdx = btn.getAttribute('data-card-idx');
      if (branch && cardIdx !== null) {
        activeBranches[cardIdx] = branch;
        saveDraft();
        render();
      }
    });
  });

  // ── Step 6: Action Guide ─────────────────────────────────────────
  document.querySelectorAll('[data-cal-day]').forEach((cell) => {
    cell.addEventListener('click', () => {
      const dayId = cell.getAttribute('data-cal-day');
      if (!dayId) return;
      if (completedTasks.has(dayId)) {
        completedTasks.delete(dayId);
      } else {
        completedTasks.add(dayId);
      }
      saveDraft();
      render();
    });
  });

  // Calendar tooltip
  document.querySelectorAll('.cal-cell').forEach((cell) => {
    cell.addEventListener('mouseenter', () => {
      const tip = cell.querySelector('.cal-tooltip');
      if (tip) tip.style.display = 'block';
    });
    cell.addEventListener('mouseleave', () => {
      const tip = cell.querySelector('.cal-tooltip');
      if (tip) tip.style.display = 'none';
    });
  });

  // Resume studio export buttons
  const btnResumePrint = document.getElementById('btn-resume-print');
  if (btnResumePrint) {
    btnResumePrint.addEventListener('click', () => {
      window.print();
    });
  }
  const btnExportLatex = document.getElementById('btn-export-latex');
  if (btnExportLatex) btnExportLatex.addEventListener('click', () => exportLatex());
  const btnExportWord = document.getElementById('btn-export-word');
  if (btnExportWord) btnExportWord.addEventListener('click', () => exportWord());

  // Resume form live sync
  document.querySelectorAll('[data-resume-field]').forEach((el) => {
    const sync = () => {
      if (!resumeForm) resumeForm = buildResumeFormInitial();
      const field = el.getAttribute('data-resume-field');
      resumeForm[field] = el.tagName === 'TEXTAREA' ? el.value : el.value;
      // Update preview without full re-render
      const preview = document.getElementById('resume-preview-content');
      if (preview) preview.innerHTML = buildResumePreviewHtml();
      saveDraft();
    };
    el.addEventListener('input', sync);
    el.addEventListener('change', sync);
  });

  const btnGenerateActionPlan = document.getElementById('btn-generate-action-plan');
  if (btnGenerateActionPlan) {
    btnGenerateActionPlan.addEventListener('click', async () => {
      if (!selectedRoleName || actionPlanLoading) return;
      actionPlanLoading = true;
      render();
      try {
        const roleTags = getRoleTags(selectedRoleName);
        const missingSkills = []; // 可后续扩展
        const result = await callGenerateActionPlan(selectedRoleName, roleTags, missingSkills);
        actionPlanData = result;
        toast('行动指南已生成');
      } catch (e) {
        toast(`生成失败: ${e.message?.slice(0, 30) || '请重试'}`);
      } finally {
        actionPlanLoading = false;
        saveDraft();
        render();
      }
    });
  }

  const btnExportPlan = document.getElementById('btn-export-plan');
  if (btnExportPlan) btnExportPlan.addEventListener('click', () => exportActionPlan());
}

loadDraft();
// 根据本地的 selectedRoleName 还原模拟器
if (report && selectedRoleName) {
  const job = findJobByName(selectedRoleName);
  if (job && !sliceSimState) simulator = generateCareerSimulator(job, report.profile);
}
if (!forumPosts.length || forumPosts.length < 40) forumPosts = [...defaultForumPosts];
if (!actionTasks.length) actionTasks = [...defaultActionTasks];
if (!entries.length) addEntry();
render();
