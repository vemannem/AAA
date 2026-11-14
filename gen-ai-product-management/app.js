/* Generative AI in Product Management · AAA Academy
   Self-paced course app: modules, slides, prompts, practice lab, worked case and LMS demo.
   Everything runs in the browser; progress is saved on this device only. */
'use strict';
let course;
const KEY = 'aaa-genai-pm-course-v1';
const OLD_KEY = 'product-studio-course-v1';
const COMMUNITY = 'https://chat.whatsapp.com/IA5P0yMb7c9AuLn22ND2t4';
const COURSE_NAME = 'Generative AI in Product Management';
const baseState = {
  completed: [], slides: {}, notes: {}, answers: {}, scores: {}, rubric: {},
  profile: {
    domain: 'Academic course development', product: 'SkillForge Academy',
    audience: 'working analysts and early-career professionals with basic Python and SQL',
    goal: 'validate paid demand for an eight-week Data Science + Generative AI course and help learners complete a reviewed capstone',
    constraint: 'a 30-seat pilot, a small delivery team and unvalidated price and acquisition assumptions'
  },
  rice: [
    {name: 'LMS-01 · Understand the course before buying', reach: 30, impact: 2, confidence: 80, effort: 0.75},
    {name: 'LMS-02 · Enroll with clear payment and access status', reach: 30, impact: 3, confidence: 70, effort: 1.5},
    {name: 'LMS-03 · Study an accessible lesson', reach: 30, impact: 3, confidence: 80, effort: 2},
    {name: 'LMS-04 · Resume where I stopped', reach: 24, impact: 1, confidence: 80, effort: 0.5},
    {name: 'LMS-05 · Get feedback from a knowledge check', reach: 30, impact: 2, confidence: 70, effort: 1},
    {name: 'LMS-06 · Submit a project against a visible rubric', reach: 24, impact: 2, confidence: 70, effort: 1.25},
    {name: 'LMS-07 · Receive actionable mentor feedback', reach: 24, impact: 2, confidence: 60, effort: 1},
    {name: 'LMS-08 · Plan study time and office hours', reach: 18, impact: 1, confidence: 60, effort: 0.75},
    {name: 'LMS-09 · Find help without losing context', reach: 18, impact: 1, confidence: 70, effort: 0.75},
    {name: 'LMS-10 · Understand completion and credential rules', reach: 18, impact: 1, confidence: 50, effort: 0.75}
  ],
  scenario: {baseline: 12, ceiling: 80, rate: 15, years: 10},
  revenue: {visitors: 5000, leadRate: 8, paidRate: 7.5, price: 299, refundRate: 8, capacity: 30, variable: 45, processing: 3, marketing: 600, fixed: 1200},
  lms: {enrolled: false, lessonDone: false, quizPassed: false, project: ''}
};
let state, route = 'home', moduleId = 1, promptMode = {}, labTab = 'rice', lastFocused, lmsView = 'catalog';
try {
  const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
  const v = JSON.parse(raw || 'null');
  state = v ? {...structuredClone(baseState), ...v, profile: {...baseState.profile, ...v.profile}} : structuredClone(baseState);
} catch { state = structuredClone(baseState); }
if (state.caseVersion !== 'academic-v2') {
  if (state.profile.product === 'Compass' || state.profile.domain === 'Travel') state.profile = structuredClone(baseState.profile);
  if (state.rice.some(r => /Trip personalization|Sustainable search|One-click booking|Trip timeline/.test(r.name))) state.rice = structuredClone(baseState.rice);
  state.caseVersion = 'academic-v2';
}
state.revenue = {...baseState.revenue, ...state.revenue};
state.lms = {...baseState.lms, ...state.lms};

const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const substitute = text => text.replace(/\{\{(\w+)\}\}/g, (_, k) => state.profile[k] || `[${k}]`);
const money = v => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2}).format(v);
const accent = id => `var(--c${((id - 1) % 6) + 1})`;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { $$('.save-status').forEach(el => { el.textContent = 'Device storage unavailable. Export your notes.'; }); }
}
function toast(message) {
  const t = $('#toast');
  t.textContent = message; t.classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('visible'), 2600);
}

/* ---------- navigation: left rail on desktop, picker on phones ---------- */
function progress() {
  const n = state.completed.length, pct = `${n / 6 * 100}%`;
  ['#progress-text', '#progress-text-2'].forEach(s => { if ($(s)) $(s).textContent = `${n} / 6`; });
  ['#progress-bar', '#progress-bar-2'].forEach(s => { if ($(s)) $(s).style.width = pct; });
  $('#module-nav').innerHTML = course.modules.map(m => {
    const active = route === 'module' && moduleId === m.id, done = state.completed.includes(m.id);
    return `<a class="${active ? 'active' : ''}" href="#module/${m.id}" ${active ? 'aria-current="page"' : ''}><span class="num ${done ? 'done' : ''}">${done ? '✓' : pad(m.id)}</span><span>${h(m.short)}</span></a>`;
  }).join('');
  $$('#nav>a, #nav-work>a').forEach(a => {
    const active = a.hash && a.hash === '#' + route;
    a.classList.toggle('active', !!active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const current = route === 'module' ? `#module/${moduleId}` : '#' + route;
  const opts = [['#home', 'Course overview'], ...course.modules.map(m => [`#module/${m.id}`, `Module ${pad(m.id)} · ${m.short}${state.completed.includes(m.id) ? ' ✓' : ''}`]),
    ['#case', 'Course business case'], ['#lms', 'LMS prototype'], ['#prompts', 'Prompt reference (28)'], ['#practice', 'Practice lab'], ['#resources', 'Resources & downloads']];
  $('#picker').innerHTML = `<label class="field" style="margin:0"><span class="mini-label">Jump to · ${n} of 6 modules complete</span><select id="picker-select" aria-label="Go to a part of the course">${opts.map(([v, t]) => `<option value="${v}" ${v === current ? 'selected' : ''}>${h(t)}</option>`).join('')}</select></label><p style="margin:8px 0 0;font-size:13px"><a href="../">← All AAA Academy courses</a></p>`;
}

/* ---------- home ---------- */
const orbit = `<div class="orbit" aria-hidden="true"><svg viewBox="0 0 340 270"><g fill="none" class="o-ring" stroke-width=".8"><ellipse cx="171" cy="133" rx="114" ry="108"/><ellipse cx="171" cy="133" rx="78" ry="74" stroke-dasharray="3 7"/><path d="M61 132H282M171 25V241" opacity=".5"/></g><circle class="o-core" cx="171" cy="133" r="48"/><text class="o-core-t" x="171" y="125" text-anchor="middle" font-size="10" letter-spacing="1.6">HUMAN</text><text class="o-core-t" x="171" y="146" text-anchor="middle" font-size="19">+ AI</text><g class="o-node" stroke-width="1"><rect x="109" y="6" width="126" height="33" rx="16"/><rect x="220" y="115" width="113" height="33" rx="16"/><rect x="104" y="226" width="135" height="33" rx="16"/><rect x="3" y="115" width="113" height="33" rx="16"/></g><g class="o-node-t" text-anchor="middle" font-size="11"><text x="172" y="27">Understand</text><text x="276" y="136">Explore</text><text x="171" y="247">Decide</text><text x="59" y="136">Validate</text></g><circle class="o-dot" cx="253" cy="57" r="4"/><circle class="o-dot" cx="88" cy="212" r="4"/></svg></div>`;
const ICONS = ['✳', '⌕', '◇', '▥', '⌁', '↗'];

function home() {
  const next = course.modules.find(m => !state.completed.includes(m.id)) || course.modules[0];
  const slides = course.modules.reduce((n, m) => n + m.slides.length, 0);
  return `<section class="hero"><div><div class="eyebrow">AAA ACADEMY · COURSE 3 · ${h(COURSE_NAME.toUpperCase())}</div><h1>Better product decisions.<br><em>With AI in the loop.</em></h1><p>A practical course for product managers and product owners. Go from a first idea to a clear strategy, with AI as your thinking partner and you owning the decision.</p><div class="hero-actions"><a class="button lime" href="#module/${next.id}">${state.completed.length ? 'Continue learning' : 'Start learning'} <span>↗</span></a><a class="text-link" href="#prompts">Explore the prompts →</a></div></div>${orbit}<div class="hero-meta"><span><strong>06</strong> focused modules</span><span><strong>${slides}</strong> lesson slides</span><span><strong>${course.prompts.length}</strong> practical prompts</span><span><strong>Self-paced</strong> · about 4½ hours</span></div></section>
  ${window.Trainer.panel('overview')}
  <div class="section-top"><div><div class="eyebrow">THE COURSE</div><h2>One product journey. Six useful skills.</h2><p>Learn the idea, practice the workflow, build an artifact.</p></div><span class="meta">BEGINNER → PRACTITIONER</span></div>
  <div class="module-grid">${course.modules.map((m, i) => `<a class="module-card" href="#module/${m.id}" style="--accent-c:${accent(m.id)}"><div class="module-top"><span class="module-icon">${ICONS[i]}</span><span class="module-index">MODULE ${pad(m.id)}</span></div><h3>${h(m.title)}</h3><p>${h(m.subtitle)}</p><div class="module-foot"><span>${m.minutes} MIN · ${m.slides.length} SLIDES</span><span>${state.completed.includes(m.id) ? 'Completed ✓' : 'Explore →'}</span></div></a>`).join('')}</div>
  <section class="bottom-banner"><div><h3>Make it work in your world.</h3><p>Adapt every prompt to your domain, audience and product goal.</p></div><a class="button secondary" href="#prompts">Open prompt reference ↗</a></section>
  <div class="section-top"><div><h2>Build a portfolio as you go.</h2><p>SkillForge Academy is the running example: develop a market-informed Data Science + Generative AI course and LMS.</p></div></div>
  <div class="panel"><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px"><a class="button" href="#case">Explore the complete course business case →</a><a class="button secondary" href="#lms">Try the LMS prototype →</a></div><div class="artifact-trail">PRD <span>→</span> Research <span>→</span> Prototype <span>→</span> Roadmap <span>→</span> Evidence <span>→</span> Strategy</div><p style="margin:15px 0 0">Use the practice labs to test assumptions, save reflections on this device, and export your work. Prompts are ready to copy into your chosen AI tool.</p></div>
  ${communityPanel(true)}`;
}

function communityPanel(compact) {
  return `<section class="community-panel${compact ? ' compact' : ''}" aria-labelledby="community-title"><div class="community-copy"><p class="eyebrow">THE AAA LEARNING COMMUNITY</p><h2 id="community-title">Learn, share, grow together.</h2><p>Ask questions, exchange resources and share your learning with the AAA Academy WhatsApp community.</p><a class="button community-join" href="${COMMUNITY}" target="_blank" rel="noopener noreferrer">Join our WhatsApp community →</a><p class="community-privacy">Opens WhatsApp in a new tab. Your phone number may be visible to other members. Keep discussions respectful and avoid sharing confidential information.</p></div><figure class="community-qr"><a href="${COMMUNITY}" target="_blank" rel="noopener noreferrer" aria-label="Join the AAA Academy WhatsApp community"><img src="assets/aaa-community-qr.svg" width="220" height="220" loading="lazy" alt="QR code that opens the AAA Academy WhatsApp community invitation"></a><figcaption>Scan with your phone camera, or use the join button.</figcaption></figure></section>`;
}

/* ---------- modules ---------- */
function slideMarkup(m, index) {
  const s = m.slides[index];
  return `<article class="slide ${s.kind === 'hero' ? 'hero-slide' : ''}" style="--accent-c:${accent(m.id)}"><div class="eyebrow">MODULE ${pad(m.id)} / ${h(m.short)}</div><h2>${h(s.title)}</h2><p class="takeaway">${h(s.takeaway)}</p><ul>${s.points.map(p => `<li>${h(p)}</li>`).join('')}</ul><div class="slide-bottom"><span>AAA ACADEMY</span><span>${pad(index + 1)} / ${pad(m.slides.length)}</span></div></article>`;
}
function profileMarkup() {
  return `<details class="profile"><summary>Your product context <span class="small-note" style="font-weight:400">· ${h(state.profile.product)} / ${h(state.profile.domain)} · customize every adapted prompt</span></summary><div class="profile-grid"><label class="field">Domain<select data-profile="domain">${course.domainExamples.map(x => `<option ${state.profile.domain === x.domain ? 'selected' : ''}>${h(x.domain)}</option>`).join('')}<option ${state.profile.domain === 'Custom' ? 'selected' : ''}>Custom</option></select></label><label class="field">Product name<input data-profile="product" value="${h(state.profile.product)}" maxlength="150"></label><label class="field wide">Target users<input data-profile="audience" value="${h(state.profile.audience)}" maxlength="350"></label><label class="field wide">Desired outcome<input data-profile="goal" value="${h(state.profile.goal)}" maxlength="400"></label><label class="field wide">Constraints<input data-profile="constraint" value="${h(state.profile.constraint)}" maxlength="400"></label></div><p class="small-note">Stored on this device. No AI requests are sent by this site. Copy your customized prompt into an approved AI tool.</p></details>`;
}
function promptCard(p, open = false) {
  const mode = promptMode[p.id] || 'adapted';
  return `<details class="prompt-card" data-prompt="${p.id}" ${open ? 'open' : ''}><summary><span class="prompt-id">${p.id}</span><span class="prompt-title">${h(p.title)}</span><span class="prompt-tag">${p.extension ? 'PRACTICE TEMPLATE' : 'COURSE WORKFLOW'}</span></summary><div class="prompt-body"><div class="prompt-info"><div><span class="mini-label">When to use</span><p>${h(p.when)}</p></div><div><span class="mini-label">What to attach</span><p>${h(p.inputs)}</p></div></div><div class="prompt-switch"><button type="button" data-action="prompt-mode" data-id="${p.id}" data-mode="adapted" class="${mode === 'adapted' ? 'active' : ''}" aria-pressed="${mode === 'adapted'}">Adapted for your product</button>${p.original ? `<button type="button" data-action="prompt-mode" data-id="${p.id}" data-mode="original" class="${mode === 'original' ? 'active' : ''}" aria-pressed="${mode === 'original'}">Course case prompt</button>` : ''}</div><pre class="prompt-text" data-text="${p.id}">${h(mode === 'original' ? p.original : substitute(p.adapted))}</pre><div class="prompt-bottom"><span class="small-note">Output: ${h(p.output)}</span><button type="button" class="button small" data-action="copy-prompt" data-id="${p.id}">Copy prompt ⧉</button></div><div class="check-note"><strong>Review before using:</strong> ${h(p.checks)}</div><p class="domain-example"><strong>In practice:</strong> ${h(p.example)}</p>${window.Trainer.panel('prompt-' + p.id)}</div></details>`;
}
function modulePage(m) {
  const last = m.slides.length - 1;
  const i = Math.max(0, Math.min(last, state.slides[m.id] || 0));
  state.slides[m.id] = i;
  const ps = course.prompts.filter(p => p.module === m.id && !p.extension), ext = course.prompts.filter(p => p.module === m.id && p.extension);
  return `<div class="page-head"><div><div class="eyebrow">MODULE ${pad(m.id)} · ${m.minutes} MINUTES</div><h1>${h(m.title)}</h1><p>${h(m.subtitle)}</p></div><span class="pill">Build: ${h(m.artifact)}</span></div>
  <div class="module-tabs"><a href="#module/${m.id}" class="active">Learn</a><a href="#module/${m.id}/prompts">Prompts</a><a href="#module/${m.id}/practice">Practice</a><a href="#module/${m.id}/quiz">Knowledge check</a></div>
  <section id="learn" aria-label="Module slides"><div class="learning-grid"><div><div id="slide-area">${slideMarkup(m, i)}</div><div class="slide-controls"><button type="button" class="button secondary small" data-action="prev-slide" ${i === 0 ? 'disabled' : ''}>← Previous</button><div class="slide-dots">${m.slides.map((_, j) => `<button type="button" data-action="slide" data-index="${j}" class="${j === i ? 'active' : ''}" aria-label="Slide ${j + 1}" ${j === i ? 'aria-current="step"' : ''}></button>`).join('')}</div><button type="button" class="button small" data-action="next-slide" ${i === last ? 'disabled' : ''}>Next →</button><button type="button" class="icon-button" data-action="present" aria-label="Open presentation mode" title="Presentation mode">⤢</button></div></div><aside class="lesson-list"><div class="eyebrow">IN THIS MODULE</div>${m.slides.map((s, j) => `<button type="button" data-action="slide" data-index="${j}" class="${j === i ? 'active' : ''}"><span>${pad(j + 1)}</span>${h(s.title)}</button>`).join('')}</aside></div><div id="trainer-slide">${window.Trainer.panel(`slide-${m.id}-${i}`, true)}</div><div class="objectives">${m.objectives.map(o => `<span>✓ ${h(o)}</span>`).join('')}</div></section>
  <section id="prompts"><div class="section-top"><div><div class="eyebrow">YOUR NEXT ACTION</div><h2>Prompts, in workflow order.</h2><p>Customize, copy, run in your AI tool, then review the evidence.</p></div></div><div class="case-callout"><div><strong>Follow the academic course example</strong><p>See the worked example of this module's artifact (${h(m.artifact)}) for SkillForge Academy, with assumptions, evidence and decisions.</p></div><a class="button secondary small" href="#case/${m.id}">Open worked example →</a></div>${profileMarkup()}<div id="module-prompts">${ps.map((p, j) => promptCard(p, j === 0)).join('')}${ext.length ? `<h3 class="prompt-stage-title">Additional practice templates</h3>${ext.map(p => promptCard(p)).join('')}` : ''}</div></section>
  <section id="practice" class="panel"><div class="eyebrow">PRACTICE / BUILD YOUR ARTIFACT</div><h2>${h(m.lab.title)}</h2><p>${h(m.lab.brief)}</p>${window.Trainer.panel('practice-' + m.id)}<ol class="lab-steps">${m.lab.steps.map(s => `<li>${h(s)}</li>`).join('')}</ol><div class="rubric">${m.lab.rubric.map(r => `<span>✓ ${h(r)}</span>`).join('')}</div><label class="field reflection">Your reflection &amp; evidence notes<textarea data-note="${m.id}" rows="5" placeholder="What did you learn? Which assumptions changed? Link your artifact or describe the evidence you checked.">${h(state.notes[m.id] || '')}</textarea></label><p class="small-note">Automatically saved on this device. Export all reflections from the Resources page.</p>${[4, 5, 6].includes(m.id) ? `<a class="button secondary small" href="#practice" style="margin-top:15px">Open the interactive practice lab ↗</a>` : ''}</section>
  <section id="quiz" class="panel quiz"><div class="eyebrow">CHECK YOUR UNDERSTANDING</div><h2>A quick knowledge check.</h2><div id="quiz-area">${quizMarkup(m)}</div></section>
  <div class="module-finish"><button type="button" class="button ${state.completed.includes(m.id) ? 'secondary' : ''}" data-action="complete">${state.completed.includes(m.id) ? 'Completed ✓ · Mark incomplete' : 'Mark module complete ✓'}</button>${m.id < 6 ? `<a class="button secondary" href="#module/${m.id + 1}">Next module →</a>` : `<a class="button secondary" href="#practice">Review your capstone →</a>`}</div>`;
}
function quizMarkup(m, graded = false) {
  const a = state.answers[m.id] || {};
  const picked = (j, k) => a[j] !== undefined && Number(a[j]) === k;
  return `${window.Trainer.panel('quiz-' + m.id)}<form id="quiz-form">${m.quiz.map((q, j) => `<fieldset class="question"><legend>${j + 1}. ${h(q.q)}</legend>${q.options.map((o, k) => `<label class="answer"><input type="radio" name="q${j}" value="${k}" data-answer="${j}" ${picked(j, k) ? 'checked' : ''}>${h(o)}</label>`).join('')}${graded ? `<div class="feedback ${picked(j, q.answer) ? 'correct' : ''}">${picked(j, q.answer) ? 'Correct.' : 'Review this one.'} ${h(q.why)}</div>` : ''}</fieldset>`).join('')}<button class="button" type="submit">Check my answers</button><span class="quiz-score">${state.scores[m.id] !== undefined ? `Last result: ${state.scores[m.id]} / 3` : ''}</span></form>`;
}

/* ---------- prompt reference ---------- */
function library() {
  const own = course.prompts.filter(p => !p.extension).length, ext = course.prompts.length - own;
  return `<div class="page-head"><div><div class="eyebrow">THE FIELD GUIDE</div><h1>Your prompt reference.</h1><p>${own} workflows rewritten for academic course development. ${ext} additional templates help you interview, test and decide.</p></div><a class="button secondary" href="prompt-reference.pdf" download>Download handbook ↓</a></div><div class="source-notice">Course case prompts and reusable templates are labeled separately. The worked SkillForge case links market sources and marks personas, prices and financial assumptions.</div>${window.Trainer.panel('library')}${profileMarkup()}<div class="filterbar"><input id="prompt-search" aria-label="Search prompts" type="search" placeholder="Search by task, output or use case…"><select id="prompt-filter" aria-label="Filter prompts by module"><option value="all">All modules</option>${course.modules.map(m => `<option value="${m.id}">${pad(m.id)} · ${h(m.short)}</option>`).join('')}<option value="extension">Additional templates</option></select></div><div id="prompt-results"></div>`;
}
function renderPromptResults() {
  const q = ($('#prompt-search')?.value || '').toLowerCase(), f = $('#prompt-filter')?.value || 'all';
  const list = course.prompts.filter(p => (f === 'all' || (f === 'extension' && p.extension) || Number(f) === p.module) && [p.title, p.when, p.inputs, p.example, p.output].join(' ').toLowerCase().includes(q));
  $('#prompt-results').innerHTML = list.length ? list.map(p => promptCard(p)).join('') : '<div class="empty">No prompts match. Try a broader task or another module.</div>';
}

/* ---------- practice lab ---------- */
function practice() {
  return `<div class="page-head"><div><div class="eyebrow">LEARN BY DOING</div><h1>The practice lab.</h1><p>Adjust assumptions, inspect the result, and explain your decision. All examples here are fictional and saved only on this device.</p></div><button type="button" class="button secondary" data-action="export-notes">Export my portfolio ↓</button></div><div class="practice-tabs" role="group" aria-label="Practice activities">${[['rice', 'RICE prioritization'], ['data', 'Course analytics'], ['revenue', 'Revenue model'], ['scenario', 'Scenario explorer'], ['capstone', 'Capstone review']].map(([k, n]) => `<button type="button" data-action="lab-tab" data-tab="${k}" class="${labTab === k ? 'active' : ''}" aria-pressed="${labTab === k}">${n}</button>`).join('')}</div><div id="lab-content">${labContent()}</div>`;
}
function labContent() {
  const content = labTab === 'rice' ? riceLab() : labTab === 'data' ? dataLab() : labTab === 'revenue' ? revenueLab() : labTab === 'scenario' ? scenarioLab() : capstoneLab();
  return window.Trainer.panel('lab-' + labTab) + content;
}
function score(r) {
  const ok = [r.reach, r.impact, r.confidence, r.effort].every(v => v !== '' && Number.isFinite(Number(v)));
  return ok && r.reach >= 0 && r.impact >= 0 && r.confidence >= 0 && r.confidence <= 100 && r.effort > 0 ? r.reach * r.impact * (r.confidence / 100) / r.effort : null;
}
function riceLab() {
  return `<div class="source-notice">Illustrative estimates only. Reach = learners, out of a planned 30-seat cohort, that a story would affect over a 90-day pilot (so some stories reach 18 or 24, not all 30); confidence = percent; effort = person-months. Edit these values to explore how a ranking changes.</div><div class="panel"><h2>What makes the MVP?</h2><div class="formula-box"><strong>Reach × Impact × Confidence ÷ Effort</strong><small>Confidence is divided by 100 in the calculation.</small></div><div class="table-wrap"><table><thead><tr><th>Initiative</th><th>Reach</th><th>Impact</th><th>Confidence %</th><th>Effort</th><th>Score</th><th><span class="mini-label">Remove</span></th></tr></thead><tbody>${state.rice.map((r, i) => `<tr>${['name', 'reach', 'impact', 'confidence', 'effort'].map(k => `<td><input class="${k === 'name' ? 'story-name' : ''}" data-rice="${i}" data-key="${k}" aria-label="${h(r.name)} ${k}" type="${k === 'name' ? 'text' : 'number'}" ${k !== 'name' ? `min="${k === 'effort' ? '0.1' : '0'}" step="${k === 'impact' || k === 'effort' ? '0.25' : '1'}" ${k === 'confidence' ? 'max="100"' : ''}` : ''} value="${h(r[k])}"></td>`).join('')}<td><span class="score" id="rice-score-${i}">${score(r) === null ? 'TBD' : score(r).toFixed(1)}</span></td><td><button type="button" class="icon-button" data-action="remove-rice" data-index="${i}" aria-label="Remove ${h(r.name)}">×</button></td></tr>`).join('')}</tbody></table></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button type="button" class="button secondary small" data-action="add-rice">+ Add initiative</button><button type="button" class="button small" data-action="export-rice">Export CSV ↓</button><button type="button" class="button secondary small" data-action="reset-rice">Reset to the worked example</button></div><div id="rice-ranking">${riceRanking()}</div></div><div class="panel"><h3>Make a call, then challenge it.</h3><p>Which assumption could reverse the top two priorities? What dependency or required work is missing from the score?</p><label class="field">Your decision &amp; rationale<textarea data-note="rice">${h(state.notes.rice || '')}</textarea></label></div>`;
}
function riceRanking() {
  const ranked = state.rice.map((r, i) => ({...r, score: score(r), i})).filter(r => r.score !== null).sort((a, b) => b.score - a.score);
  const max = Math.max(1, ...ranked.map(r => r.score));
  return `<div class="rank-list"><div class="mini-label">LIVE RANKING</div>${ranked.length ? ranked.map((r, i) => `<div class="rank-row"><span class="rank-name">${i + 1}. ${h(r.name || 'Untitled')}</span><div class="rank-bar" style="width:${r.score / max * 55}%"></div><strong>${r.score.toFixed(1)}</strong></div>`).join('') : '<p>Enter valid inputs to calculate scores.</p>'}</div>`;
}
const sample = () => course.practiceData;
function aggregates(channel = 'all') {
  return ['2026-01', '2026-02', '2026-03'].map(month => {
    const rows = sample().filter(r => r.month === month && (channel === 'all' || r.channel === channel));
    return {month, ...Object.fromEntries(['visitors', 'leads', 'paid', 'activated', 'completed', 'refunded', 'marketing'].map(k => [k, rows.reduce((n, r) => n + r[k], 0)])),
      gross: rows.reduce((n, r) => n + r.paid * r.price, 0), net: rows.reduce((n, r) => n + (r.paid - r.refunded) * r.price, 0)};
  });
}
function dataLab() {
  return `<div class="source-notice">Fictional SkillForge Academy cohorts, Jan–Mar 2026, USD. Every cohort is assumed mature after eight weeks. This dataset does not measure real market demand or product performance.</div><div class="panel"><div class="section-top" style="margin-top:0"><div><h2>Read acquisition and learning together.</h2><p>Compare paid seats, activation, assessed completion and refund-adjusted tuition.</p></div><a class="button secondary small" href="sample-course-funnel.csv" download>Download CSV ↓</a></div><label class="field" style="max-width:260px">Acquisition channel<select id="data-region"><option value="all">All channels</option><option>Organic</option><option>Partner</option><option>Paid</option></select></label><div id="data-chart">${dataChart()}</div></div><div class="panel"><h3>Interpret without overclaiming.</h3><p>Check the denominator for each conversion. Are cohorts equally mature? Does a channel with more paid seats also produce completed capstones at an acceptable cost?</p><label class="field">Your analysis notes<textarea data-note="data">${h(state.notes.data || '')}</textarea></label></div>`;
}
function dataChart(channel = 'all') {
  const rows = aggregates(channel), max = Math.max(1, ...rows.map(r => r.paid));
  const total = Object.fromEntries(['visitors', 'leads', 'paid', 'activated', 'completed', 'refunded', 'gross', 'net', 'marketing'].map(k => [k, rows.reduce((n, r) => n + r[k], 0)]));
  const bars = ['paid', 'activated', 'completed'], colors = ['var(--c1)', 'var(--c2)', 'var(--c5)'];
  const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : 'n/a';
  const byChannel = ['Organic', 'Partner', 'Paid'].map(c => [c, sample().filter(r => r.channel === c).reduce((n, r) => n + r.paid, 0)]);
  const chMax = Math.max(1, ...byChannel.map(x => x[1]));
  return `<svg class="chart" viewBox="0 0 690 280" role="img" aria-labelledby="chart-title"><title id="chart-title">Fictional mature cohort counts for ${h(channel === 'all' ? 'all channels' : channel)}; the same numbers are in the table below.</title><text x="0" y="22">PAID / ACTIVATED / COMPLETED LEARNERS</text>${rows.map((r, i) => `<text x="0" y="${70 + i * 76}">${r.month}</text>${bars.map((k, j) => `<rect x="100" y="${42 + i * 76 + j * 18}" width="${r[k] / max * 440}" height="13" rx="2" style="fill:${colors[j]}"/><text x="${108 + r[k] / max * 440}" y="${53 + i * 76 + j * 18}">${r[k]} ${k}</text>`).join('')}`).join('')}</svg><div class="table-wrap"><table><thead><tr><th>Cohort</th><th>Visitors</th><th>Leads</th><th>Paid</th><th>Activated</th><th>Completed</th><th>Refunds</th><th>Net tuition USD</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.month}</td>${['visitors', 'leads', 'paid', 'activated', 'completed', 'refunded'].map(k => `<td>${r[k]}</td>`).join('')}<td>${money(r.net)}</td></tr>`).join('')}<tr><td><strong>Total</strong></td>${['visitors', 'leads', 'paid', 'activated', 'completed', 'refunded'].map(k => `<td>${total[k]}</td>`).join('')}<td>${money(total.net)}</td></tr></tbody></table></div><div class="rubric"><span>Lead → paid: ${pct(total.paid, total.leads)}</span><span>Activation / all paid: ${pct(total.activated, total.paid)}</span><span>Completion / all paid: ${pct(total.completed, total.paid)}</span><span>Acquisition spend / paid seat: ${total.paid ? money(total.marketing / total.paid) : 'n/a'}</span></div><p class="small-note">Net tuition = (paid seats − fully refunded seats) × $299. Completion uses all paid seats, including refunded learners; non-refunded cohort analysis needs learner-level reconciliation. Counts are mature-cohort snapshots, not events from a partial month.</p><div style="margin-top:24px"><h3>Paid enrollments by acquisition channel</h3><div class="rank-list">${byChannel.map(([c, n]) => `<div class="rank-row"><span class="rank-name">${c}</span><div class="rank-bar" style="width:${n / chMax * 55}%"></div><strong>${n} seats</strong></div>`).join('')}</div><p class="small-note">This second chart shows all channels across all three fictional cohorts; the filter above applies only to the cohort chart and table.</p></div>`;
}
function scenarioLab() {
  const c = state.scenario;
  return `<div class="source-notice">An illustrative adoption model, not a market forecast. Explore how assumptions change outcomes; no external market data or AI prediction is used.</div><div class="two-col"><div class="panel"><h2>Same question. Different assumptions.</h2><p>For this educational example, adoption is the share of an eligible learner audience taking a course. This abstract model is not a paid-enrollment or revenue forecast; use the Revenue model for commercial assumptions.</p>${[['baseline', 'Current adoption', 1, 50, '%'], ['ceiling', 'Long-run ceiling', 51, 99, '%'], ['rate', 'Central growth parameter', 1, 35, '% / year'], ['years', 'Years from baseline', 1, 25, ' years']].map(([k, n, min, max, unit]) => `<label class="range-field">${n}<strong id="scenario-label-${k}">${c[k]}${unit}</strong><input type="range" min="${min}" max="${max}" value="${c[k]}" data-scenario="${k}" aria-label="${n}"></label>`).join('')}<details><summary style="font-size:13px;cursor:pointer">Model and assumptions</summary><p style="margin-top:12px">Logistic illustration: A(t) = K / [1 + ((K − A₀) / A₀) × exp(−r × t)]. Baseline A₀, ceiling K and parameter r are user inputs. Conservative uses 0.65r; accelerated uses 1.35r. This simple model omits competition, policy and shocks.</p></details></div><div class="panel" id="scenario-result">${scenarioResult()}</div></div><div class="panel"><h3>What evidence would change your choice?</h3><label class="field">Your leading indicator &amp; decision trigger<textarea data-note="scenario">${h(state.notes.scenario || '')}</textarea></label></div>`;
}
function scenarioResult() {
  const c = state.scenario, f = mult => c.ceiling / (1 + ((c.ceiling - c.baseline) / c.baseline) * Math.exp(-c.rate / 100 * mult * c.years));
  return `<div class="eyebrow">ILLUSTRATIVE CENTRAL SCENARIO</div><div class="scenario-number">${f(1).toFixed(1)}<span>% adoption</span></div><p>After ${c.years} years under your current assumptions.</p><div class="metric-row"><div><strong>${f(.65).toFixed(1)}%</strong><small>Conservative</small></div><div><strong>${f(1.35).toFixed(1)}%</strong><small>Accelerated</small></div></div><p style="margin-top:28px">Which assumption is least supported? What leading indicator would help distinguish these scenarios early?</p><a class="button secondary small" href="#module/6/prompts">Explore scenario prompts →</a>`;
}
const rubricItems = [['Problem evidence', 'The problem is linked to verified customer or market evidence.'], ['User relevance', 'Needs, context and accessibility are represented.'], ['Traceability', 'Each recommendation links to sources and assumptions.'], ['Feasibility', 'Scope, capacity, constraints and dependencies are explicit.'], ['Metric quality', 'Baselines, targets and measurement methods are defined.'], ['Uncertainty', 'Risks, counterevidence and next experiments are visible.']];
function capstoneLab() {
  return `<div class="panel"><h2>Your product portfolio review.</h2><p>Review your PRD, research, personas, prototype, roadmap, backlog, analytics and strategic brief. This is a self-assessment, not an AI grade or external certification.</p><div class="table-wrap"><table class="rubric-table"><thead><tr><th>Dimension</th><th>Look for</th><th>Score 0–2</th></tr></thead><tbody>${rubricItems.map(([n, d], i) => `<tr><td>${n}</td><td>${d}</td><td><select data-rubric="${i}" aria-label="${n} score"><option value="">Review</option>${[0, 1, 2].map(v => `<option value="${v}" ${String(state.rubric[i]) === String(v) ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><p class="small-note">0 = missing · 1 = partial or assumption-based · 2 = clear and supported</p><div id="capstone-score">${capstoneScore()}</div><label class="field reflection">Your three improvements and next validation step<textarea data-note="capstone">${h(state.notes.capstone || '')}</textarea></label><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button type="button" class="button" data-action="export-notes">Export my portfolio ↓</button><a class="button secondary" href="#prompts">Use prompt 28 for a critique ↗</a></div></div>`;
}
function capstoneScore() {
  const v = Object.values(state.rubric).filter(v => v !== ''), n = v.reduce((s, x) => s + Number(x), 0);
  return `<div class="capstone-output"><strong>${n} / 12</strong><p>${v.length} of 6 dimensions reviewed. Focus on the weakest evidence, not just the total.</p></div>`;
}

/* ---------- resources ---------- */
const DOWNLOADS = [
  ['PDF', 'Product owner prompt handbook', 'All 28 prompts with course-case prompts, reusable templates, inputs, checks and domain examples.', 'prompt-reference.pdf'],
  ['HTML', 'Standalone prompt reference', 'Printable reference you can save and use separately from the course.', 'prompt-reference.html'],
  ['MARKDOWN', 'Editable prompt reference', 'All prompts and adaptation guidance in plain text for your own knowledge base.', 'prompt-reference.md'],
  ['PDF', 'Course slide deck', 'All 48 lesson slides across the six modules, with the trainer notes under each slide.', 'course-slides.pdf'],
  ['PDF', 'One-page course PRD', 'A compact SkillForge Academy product definition covering the course, LMS scope, targets and validation gates.', 'course-prd.pdf'],
  ['PDF', 'Worked academic business case', 'Course PRD, market evidence, learner personas, curriculum, LMS design, roadmap, ten stories, priorities and revenue model.', 'academic-case-study.pdf'],
  ['MARKDOWN', 'Editable academic business case', 'The full SkillForge Academy case with linked sources and explicit assumptions.', 'academic-case-study.md'],
  ['PDF', 'Trainer speaker notes', 'Step-by-step teaching scripts for every slide, prompt, worked case and practice activity.', 'trainer-notes.pdf'],
  ['MARKDOWN', 'Editable trainer scripts', 'All trainer transcripts in text form, matching the website narration.', 'trainer-notes.md'],
  ['CSV', 'Practice dataset', 'Fictional Jan–Mar 2026 course cohorts: acquisition, activation, capstone completion, refunds and tuition.', 'sample-course-funnel.csv']
];
function resources() {
  return `<div class="page-head"><div><div class="eyebrow">KEEP LEARNING, OFFLINE TOO</div><h1>Your course materials.</h1><p>A slide deck, a separate prompt handbook, the worked case, trainer notes and exports of the work you create along the way.</p></div></div>${window.Trainer.panel('resources')}${communityPanel(true)}<div class="download-grid">${DOWNLOADS.map(([type, title, desc, file]) => `<article class="download-card"><span class="file-badge">${type}</span><h3>${title}</h3><p>${desc}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="button secondary small" href="${file}" download>Download ↓</a>${type === 'HTML' || type === 'PDF' ? `<a class="button secondary small" href="${file}" target="_blank" rel="noopener">Open ↗</a>` : ''}</div></article>`).join('')}</div><div class="panel" style="margin-top:22px"><h3>Your learning portfolio</h3><p>Export your product context, module reflections, quiz results, practice decisions and capstone review. Progress is stored on this browser and device; it does not sync between devices.</p><button type="button" class="button" data-action="export-notes">Export my portfolio ↓</button></div><section class="panel"><h3>Sources &amp; references</h3>${course.resources.map(r => `<a class="resource-link" href="${h(r.url)}" target="_blank" rel="noopener">${h(r.title)} ↗<span>${h(r.note)}</span></a>`).join('')}<p style="margin-top:20px">The academic case uses the linked employer-skills research, BLS occupation outlook, Coursera learning reports and official course/LMS pages. Sources were checked on 18 Oct 2026. Public evidence informs hypotheses; learner demand, price and acquisition cost still require direct validation.</p></section><section class="panel"><h3>About this course</h3><p>${h(course.provenance)}</p><p>Course order follows a six-module curriculum. Course-case prompts apply each workflow to academic course development; reusable templates add evidence, scope and validation checks. Generated personas and interview transcripts are treated as hypotheses or training material. Tool comparisons and unsourced numerical claims are not taught as permanent facts.</p><p>No original report PDFs, customer interviews or proprietary templates are included. Practice examples are fictional. This site customizes prompts and provides local exercises; it does not connect to an AI model or execute prompts.</p></section>`;
}

/* ---------- worked case ---------- */
function caseTable(t) {
  return '<div class="table-wrap"><table><thead><tr>' + t.headers.map(x => '<th>' + h(x) + '</th>').join('') + '</tr></thead><tbody>' + t.rows.map(r => '<tr>' + r.map(c => '<td>' + h(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}
const riceOf = st => st.reach * st.impact * (st.confidence / 100) / st.effort;
function casePage() {
  const c = course.caseStudy;
  return `<div class="page-head"><div><div class="eyebrow">WORKED PRODUCT JOURNEY / EDUCATION + REVENUE</div><h1>${h(c.name)}</h1><p>${h(c.tagline)}</p></div><a class="button secondary" href="academic-case-study.pdf" download>Download full case ↓</a></div><div class="source-notice">${h(c.status)}. Sources reviewed ${h(c.reviewed)}. Prices, personas, targets, RICE inputs and financial results are explicitly illustrative.</div><div class="case-overview"><div class="panel"><div class="eyebrow">THE PRODUCT</div><h2>Data Science + Generative AI</h2><p>${h(c.summary)}</p><div class="rubric"><span>8 weeks · part-time</span><span>Basic Python + SQL</span><span>30-seat pilot hypothesis</span><span>$299 price hypothesis</span></div><a class="button small" href="#lms" style="margin-top:18px">Try the LMS learner journey →</a></div><div class="panel"><div class="eyebrow">FOLLOW ALL THE STEPS</div><p>PRD → market evidence → learner research → curriculum → LMS design → roadmap → stories → priorities → analytics → revenue experiment.</p><p>Use the examples to learn the method, then replace assumptions with your own evidence. A growing category is a reason to investigate, not a promise of profit.</p><a class="button secondary small" href="#practice">Open calculators and practice →</a></div></div><div class="case-toc">${c.sections.map((s, i) => `<a href="#case-step-${i}" data-case-anchor="${i}">${pad(i + 1)} ${h(s.title.split(' / ')[1])}</a>`).join('')}</div>${c.sections.map((s, i) => `<section class="panel case-section" id="case-step-${i}" data-stage="${s.stage}"><div class="eyebrow">MODULE ${pad(s.stage)} / ${h(s.status)}</div><h2>${h(s.title)}</h2>${s.intro ? '<p>' + h(s.intro) + '</p>' : ''}${window.Trainer.panel('case-' + i)}${s.points ? '<ul class="lab-steps">' + s.points.map(p => '<li>' + h(p) + '</li>').join('') + '</ul>' : ''}${s.table ? caseTable(s.table) : ''}${i === 7 ? c.stories.map(st => `<details class="worked-story"><summary>${h(st.id)} · ${h(st.title)}</summary><p>${h(st.story)}</p><p><strong>Business value:</strong> ${h(st.value)}</p><ol class="lab-steps">${st.criteria.map(p => '<li>' + h(p) + '</li>').join('')}</ol><p><strong>Dependencies:</strong> ${h(st.dependencies)}</p></details>`).join('') : ''}${i === 8 ? caseTable({headers: ['Story', 'Reach', 'Impact', 'Confidence', 'Effort PM', 'RICE'], rows: [...c.stories].sort((a, b) => riceOf(b) - riceOf(a)).map(st => [st.id + ' · ' + st.title, st.reach, st.impact, st.confidence + '%', st.effort, riceOf(st).toFixed(1)])}) : ''}${s.sourceIndexes ? '<p class="small-note">Sources: ' + s.sourceIndexes.map(j => `<a href="${h(course.resources[j].url)}" target="_blank" rel="noopener">${h(course.resources[j].title)} ↗</a>`).join(' · ') + '</p>' : ''}<div class="check-note"><strong>Decision / next validation:</strong> ${h(s.decision)}</div><a class="subtle-link" href="#module/${s.stage}/prompts">Use the module ${s.stage} prompts →</a></section>`).join('')}<section class="panel"><h3>Market sources and method references</h3>${course.resources.map(r => `<a class="resource-link" href="${h(r.url)}" target="_blank" rel="noopener">${h(r.title)} ↗<span>${h(r.note)}</span></a>`).join('')}</section>`;
}

/* ---------- revenue model ---------- */
function revenueMath(v = state.revenue) {
  const leads = v.visitors * v.leadRate / 100, raw = leads * v.paidRate / 100;
  const seats = Math.min(v.capacity, Math.max(0, Math.floor(raw + 1e-9)));
  const gross = seats * v.price, refunds = gross * v.refundRate / 100, net = gross - refunds;
  const processing = gross * v.processing / 100, delivery = seats * v.variable;
  const contribution = net - processing - delivery - v.marketing - v.fixed;
  const unit = v.price * (1 - v.refundRate / 100 - v.processing / 100) - v.variable;
  return {leads, raw, seats, gross, refunds, net, processing, delivery, contribution, unit, breakEven: unit > 0 ? Math.ceil((v.marketing + v.fixed) / unit) : null};
}
function revenueLab() {
  const fields = [['visitors', 'Qualified visitors'], ['leadRate', 'Visitor → lead %'], ['paidRate', 'Lead → paid %'], ['price', 'Price / seat USD'], ['refundRate', 'Full-refund rate %'], ['capacity', 'Delivery capacity / seats'], ['variable', 'Delivery cost / seat USD'], ['processing', 'Processing on gross %'], ['marketing', 'Acquisition spend USD'], ['fixed', 'Fixed campaign/content cost USD']];
  return `<div class="source-notice">Illustrative 90-day campaign model. No price, conversion or cost has been validated. Expected refunds may be fractional; projected paid seats are rounded down and capped by delivery capacity.</div><div class="two-col"><div class="panel"><h2>Can the course make money?</h2><p>Change the funnel and cost assumptions. Higher interest may not produce profit, and more demand cannot exceed delivery capacity.</p><div class="profile-grid">${fields.map(([k, label]) => `<label class="field">${label}<input type="number" min="0" ${/Rate|processing/.test(k) ? 'max="100"' : ''} step="${/Rate|processing/.test(k) ? '.5' : '1'}" data-revenue="${k}" value="${state.revenue[k]}"></label>`).join('')}</div><p class="small-note">No taxes, founder salary, ongoing overhead, chargebacks or later content investment are included unless you add them to the cost inputs. Marketing spend is held constant when conversion changes; review whether that is realistic.</p></div><div class="panel" id="revenue-results">${revenueResults()}</div></div><div class="panel"><h3>What must you validate before launch?</h3><label class="field">Price, conversion and cost evidence<textarea data-note="revenue">${h(state.notes.revenue || '')}</textarea></label><a class="button secondary small" href="#case/step/10" style="margin-top:15px">Read the worked campaign scenarios →</a></div>`;
}
function revenueResults() {
  const r = revenueMath(), v = state.revenue;
  const capped = r.raw > v.capacity;
  return `<div class="eyebrow">ILLUSTRATIVE INCREMENTAL CONTRIBUTION</div><div class="scenario-number" style="font-size:40px">${money(r.contribution)}</div><p>${r.seats} projected paid seats from ${r.leads.toFixed(0)} leads. ${capped ? `Capacity limits the result: demand of about ${Math.floor(r.raw)} seats is capped at ${v.capacity}, which is why the worked Accelerated scenario earns the same as Central.` : 'No capacity cap reached.'}</p>${caseTable({headers: ['Measure', 'USD / seats'], rows: [['Gross tuition', money(r.gross)], ['Expected full refunds', '−' + money(r.refunds)], ['Net tuition', money(r.net)], ['Processing fees', '−' + money(r.processing)], ['Variable delivery', '−' + money(r.delivery)], ['Acquisition spend', '−' + money(v.marketing)], ['Fixed campaign/content', '−' + money(v.fixed)], ['Incremental contribution', money(r.contribution)], ['Break-even paid seats', r.breakEven === null ? 'Not attainable with non-positive unit contribution' : r.breakEven + (r.breakEven > v.capacity ? ' (exceeds capacity)' : '')]]})}<p class="small-note">Contribution is not accounting profit. Estimated per-seat contribution before acquisition/fixed cost: ${money(r.unit)}.</p>`;
}

/* ---------- LMS prototype ---------- */
function lmsPage() {
  return `<div class="page-head"><div><div class="eyebrow">SKILLFORGE ACADEMY / CLICKABLE LMS DEMONSTRATION</div><h1>Learn through a real product journey.</h1><p>Inspect course outcomes, simulate enrollment and continue into the learner workspace.</p></div><a class="button secondary" href="#case/step/5">Read the UX rationale →</a></div><div class="source-notice">Fictional prototype. No payment, authentication, real enrollment, mentor service or file upload is connected. Demo state and project links stay on this device.</div>${window.Trainer.panel(lmsView === 'catalog' ? 'lms-catalog' : 'lms-learn')}<div class="practice-tabs" role="group" aria-label="LMS views"><button type="button" data-action="lms-view" data-view="catalog" class="${lmsView === 'catalog' ? 'active' : ''}" aria-pressed="${lmsView === 'catalog'}">Course discovery</button><button type="button" data-action="lms-view" data-view="learn" class="${lmsView === 'learn' ? 'active' : ''}" aria-pressed="${lmsView === 'learn'}">My learning</button></div>${lmsView === 'catalog' ? lmsCatalog() : lmsLearn()}`;
}
function lmsCatalog() {
  return `<div class="panel"><div class="eyebrow">A FOCUSED PATH FOR WORKING ANALYSTS</div><h2>Data Science + Generative AI</h2><p>Turn a data question into a reproducible analysis, evaluate a model, and build a small grounded GenAI workflow with a reviewable project.</p><label class="field" style="max-width:330px">Find a learning outcome<input id="lms-search" type="search" placeholder="Try evaluation, SQL or project…"></label><div id="lms-syllabus">${lmsSyllabus('')}</div><div class="two-col"><div><h3>Before you enroll</h3><ul class="lab-steps"><li>Basic Python and SQL are prerequisites.</li><li>Eight weeks, approximately 5–7 hours per week.</li><li>Assessments and a proposed capstone pass threshold of 70/100.</li><li>Proposed $299 pilot fee. Price and refund terms need validation before a real sale.</li><li>No guaranteed job, external accreditation or production AI deployment is promised.</li></ul></div><div class="case-callout" style="display:block"><h3>Study the sample before deciding.</h3><p>Explore a sample lesson and quiz without enrolling. The simulated enrollment button grants demo access only.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="button secondary small" data-action="lms-view" data-view="learn">Preview sample lesson →</button><button type="button" class="button small" data-action="lms-enroll">${state.lms.enrolled ? 'Demo enrollment active ✓' : 'Simulate enrollment (no charge)'}</button></div></div></div></div>`;
}
function lmsLearn() {
  const lessonState = state.lms.lessonDone ? 'Lesson marked complete' : 'Lesson not yet complete';
  return `<div class="two-col"><div class="panel"><div class="eyebrow">WEEK 4 / SAMPLE LESSON</div><h2>Evaluate before you celebrate.</h2><p>A model can look accurate when information from the test set leaks into training. Keep a genuinely held-out evaluation set and compare against a simple baseline.</p><div class="rubric"><span>${state.lms.enrolled ? 'Demo access active' : 'Free sample preview'}</span><span>${lessonState}</span></div><h3 style="margin-top:24px">Worked example</h3><p>If a churn model uses a field written only after cancellation, the field may reveal the answer. Remove it from the training features and check whether the model still improves on the baseline.</p><p><strong>Practice:</strong> list which fields would be available at prediction time and choose a time-based split if the real use case predicts future behavior.</p><button type="button" class="button secondary small" data-action="lms-lesson">${state.lms.lessonDone ? 'Lesson complete ✓' : 'Mark lesson complete'}</button><fieldset class="question"><legend>Which evaluation is more credible?</legend><label class="answer"><input type="radio" name="lmsQuiz" value="leak">Evaluate on rows used for training.</label><label class="answer"><input type="radio" name="lmsQuiz" value="holdout">Use held-out data representative of future decisions.</label><button type="button" class="button small" data-action="lms-quiz">Check answer</button><p id="lms-feedback" role="status">${state.lms.quizPassed ? 'Correct: held-out evaluation reduces optimistic bias. Passing this check alone does not prove the full learning outcome.' : ''}</p></fieldset></div><div class="panel"><div class="eyebrow">CAPSTONE / SUBMISSION DEMO</div><h2>Make your learning visible.</h2><p>Rubric: problem/data reasoning 25%, method/evaluation 30%, responsible AI/reproducibility 25%, communication 20%. Proposed pass: 70/100.</p><label class="field">Project repository or notebook link<input id="lms-project" type="url" placeholder="https://example.com/my-project" value="${h(state.lms.project || '')}"></label><button type="button" class="button small" data-action="lms-project" style="margin-top:12px">Save demo submission</button><p id="lms-project-status" role="status">${state.lms.project ? 'Saved on this device. No mentor has received or graded it.' : ''}</p><div class="check-note">A real LMS needs access control, submission receipts, reviewer permissions and staffed feedback. No certificate or learning grade is issued by this simulation.</div></div></div>`;
}
function lmsSyllabus(query) {
  const rows = course.caseStudy.sections[4].table.rows.filter(r => r.join(' ').toLowerCase().includes(query.toLowerCase()));
  return rows.length ? caseTable({headers: course.caseStudy.sections[4].table.headers, rows}) : '<p class="empty">No matching outcome. Try “data”, “evaluation” or “project”.</p>';
}

/* ---------- router ---------- */
const TITLES = {prompts: 'Prompt reference', practice: 'Practice lab', resources: 'Course materials', case: 'Course business case', lms: 'LMS prototype'};
function render() {
  const parts = location.hash.slice(1).split('/');
  route = ['home', 'module', 'prompts', 'practice', 'resources', 'case', 'lms'].includes(parts[0]) ? parts[0] : 'home';
  moduleId = Math.max(1, Math.min(6, parseInt(parts[1], 10) || 1));
  $('#main').innerHTML = route === 'module' ? modulePage(course.modules[moduleId - 1]) : route === 'prompts' ? library() : route === 'practice' ? practice() : route === 'resources' ? resources() : route === 'case' ? casePage() : route === 'lms' ? lmsPage() : home();
  progress();
  if (route === 'prompts') renderPromptResults();
  const page = route === 'module' ? `Module ${moduleId}: ${course.modules[moduleId - 1].title}` : TITLES[route];
  document.title = (page ? page + ' · ' : '') + COURSE_NAME + ' · AAA Academy';
  const scrollTo = el => requestAnimationFrame(() => el ? el.scrollIntoView({block: 'start'}) : window.scrollTo(0, 0));
  if (route === 'case' && parts[1] === 'step') scrollTo(document.getElementById('case-step-' + (parseInt(parts[2], 10) || 0)));
  else if (route === 'case' && parts[1]) scrollTo(document.querySelector('[data-stage="' + moduleId + '"]'));
  else if (route === 'module' && parts[2]) scrollTo(document.getElementById(parts[2]));
  else window.scrollTo(0, 0);
  window.Trainer.pageChanged();
}
function setSlide(index) {
  const m = course.modules[moduleId - 1], last = m.slides.length - 1, i = Math.max(0, Math.min(last, index));
  state.slides[moduleId] = i; save();
  if ($('#slide-area')) {
    $('#slide-area').innerHTML = slideMarkup(m, i);
    $('#trainer-slide').innerHTML = window.Trainer.panel(`slide-${m.id}-${i}`, true);
    $$('[data-action="slide"]').forEach(b => {
      const on = Number(b.dataset.index) === i;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    $('[data-action="prev-slide"]').disabled = i === 0;
    $('[data-action="next-slide"]').disabled = i === last;
  }
  if ($('#slide-dialog').open) {
    $('#dialog-slide').innerHTML = slideMarkup(m, i) + window.Trainer.panel(`slide-${m.id}-${i}`);
    $('#dialog-count').textContent = `${i + 1} / ${m.slides.length}`;
    $('#dialog-prev').disabled = i === 0;
    $('#dialog-next').disabled = i === last;
  }
  window.Trainer.slideChanged(moduleId, i);
}

/* ---------- utilities ---------- */
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Prompt copied. Run it in your chosen AI tool.'); }
  catch {
    const t = document.createElement('textarea');
    t.value = text; t.style.position = 'fixed'; t.style.left = '-9999px';
    document.body.appendChild(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    t.remove(); toast(ok ? 'Prompt copied.' : 'Copy unavailable. Select the prompt text and copy it manually.');
  }
}
function download(name, text, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], {type})), a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function exportNotes() {
  let t = `# ${course.title}\nAAA Academy · learning portfolio\n\n## My product context\n${Object.entries(state.profile).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\n`;
  course.modules.forEach(m => { t += `## ${m.id}. ${m.title}\nCompleted: ${state.completed.includes(m.id) ? 'yes' : 'no'}\nQuiz: ${state.scores[m.id] === undefined ? 'not taken' : state.scores[m.id] + '/3'}\n\n${state.notes[m.id] || 'No reflection yet.'}\n\n`; });
  t += '## Practice decisions\n';
  ['rice', 'data', 'revenue', 'scenario', 'capstone'].forEach(k => { t += `### ${k}\n${state.notes[k] || 'No notes yet.'}\n\n`; });
  t += '## RICE inputs (illustrative unless replaced with your evidence)\n' + state.rice.map(r => `${r.name}: reach=${r.reach}, impact=${r.impact}, confidence=${r.confidence}%, effort=${r.effort}, score=${score(r)?.toFixed(1) || 'TBD'}`).join('\n');
  t += '\n\n## Capstone self-assessment\n' + rubricItems.map(([n], i) => `${n}: ${state.rubric[i] ?? 'not reviewed'}/2`).join('\n');
  download('my-product-learning-portfolio.md', t);
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  if (e.target.closest('#theme')) {
    const cur = document.documentElement.getAttribute('data-theme');
    const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
    try { localStorage.setItem('aaa-academy-theme', dark ? 'light' : 'dark'); } catch {}
    return;
  }
  const anchor = e.target.closest('[data-case-anchor]');
  if (anchor) { e.preventDefault(); document.getElementById('case-step-' + anchor.dataset.caseAnchor)?.scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
  const b = e.target.closest('[data-action]'); if (!b || !course) return;
  const action = b.dataset.action, i = state.slides[moduleId] || 0;
  if (action === 'slide') setSlide(Number(b.dataset.index));
  if (action === 'prev-slide') setSlide(i - 1);
  if (action === 'next-slide') setSlide(i + 1);
  if (action === 'present') { lastFocused = b; $('#slide-dialog').showModal(); setSlide(i); }
  if (action === 'prompt-mode') {
    const p = course.prompts.find(p => p.id === b.dataset.id);
    promptMode[p.id] = b.dataset.mode;
    b.closest('.prompt-card').outerHTML = promptCard(p, true);
    window.Trainer.update();
  }
  if (action === 'copy-prompt') { const p = course.prompts.find(p => p.id === b.dataset.id); copy(promptMode[p.id] === 'original' ? p.original : substitute(p.adapted)); }
  if (action === 'complete') {
    state.completed = state.completed.includes(moduleId) ? state.completed.filter(n => n !== moduleId) : [...state.completed, moduleId];
    save(); progress();
    const done = state.completed.includes(moduleId);
    b.textContent = done ? 'Completed ✓ · Mark incomplete' : 'Mark module complete ✓';
    b.classList.toggle('secondary', done);
    toast(done ? 'Module complete. Keep building.' : 'Module marked incomplete.');
  }
  if (action === 'lab-tab') { labTab = b.dataset.tab; $('#main').innerHTML = practice(); window.Trainer.pageChanged(); }
  if (action === 'add-rice') { state.rice.push({name: 'New initiative', reach: '', impact: '', confidence: '', effort: ''}); save(); $('#lab-content').innerHTML = labContent(); }
  if (action === 'remove-rice') { state.rice.splice(Number(b.dataset.index), 1); save(); $('#lab-content').innerHTML = labContent(); }
  if (action === 'reset-rice') { state.rice = structuredClone(baseState.rice); save(); $('#lab-content').innerHTML = labContent(); toast('RICE table reset to the worked example.'); }
  if (action === 'export-rice') {
    const cell = x => '"' + String(x).replace(/"/g, '""') + '"';
    download('rice-priorities.csv', 'initiative,reach_learners_per_90_days,impact,confidence_percent,effort_person_months,score\n' + state.rice.map(r => [r.name, r.reach, r.impact, r.confidence, r.effort, score(r)?.toFixed(2) ?? 'TBD'].map(cell).join(',')).join('\n'), 'text/csv;charset=utf-8');
  }
  if (action === 'export-notes') exportNotes();
  if (action === 'lms-view') { lmsView = b.dataset.view; $('#main').innerHTML = lmsPage(); window.Trainer.pageChanged(); }
  if (action === 'lms-enroll') { state.lms.enrolled = true; save(); lmsView = 'learn'; $('#main').innerHTML = lmsPage(); toast('Demo enrollment active. No payment was taken.'); }
  if (action === 'lms-lesson') { state.lms.lessonDone = true; save(); $('#main').innerHTML = lmsPage(); }
  if (action === 'lms-quiz') {
    const choice = $('input[name="lmsQuiz"]:checked');
    if (!choice) { $('#lms-feedback').textContent = 'Choose an answer first.'; return; }
    state.lms.quizPassed = choice.value === 'holdout'; save();
    $('#lms-feedback').textContent = state.lms.quizPassed ? 'Correct: held-out data gives a more credible estimate. Consider representativeness and leakage too.' : 'Try again: training-set performance is usually optimistic. Keep evaluation data separate.';
  }
  if (action === 'lms-project') {
    const input = $('#lms-project'); let valid = false;
    try { valid = ['https:', 'http:'].includes(new URL(input.value).protocol); } catch {}
    if (!valid) { $('#lms-project-status').textContent = 'Enter a valid http or https project link.'; return; }
    state.lms.project = input.value; save();
    $('#lms-project-status').textContent = 'Saved on this device. No mentor has received or graded it.';
  }
});
document.addEventListener('input', e => {
  const el = e.target; if (!course) return;
  if (el.dataset.note) { state.notes[el.dataset.note] = el.value; save(); }
  if (el.dataset.profile && el.dataset.profile !== 'domain') {
    state.profile[el.dataset.profile] = el.value; save();
    $$('[data-text]').forEach(t => { const p = course.prompts.find(p => p.id === t.dataset.text); if (promptMode[p.id] !== 'original') t.textContent = substitute(p.adapted); });
  }
  if (el.id === 'prompt-search') renderPromptResults();
  if (el.dataset.rice !== undefined) {
    const r = state.rice[Number(el.dataset.rice)], k = el.dataset.key;
    r[k] = k === 'name' ? el.value : el.value === '' ? '' : Number(el.value); save();
    $(`#rice-score-${el.dataset.rice}`).textContent = score(r) === null ? 'TBD' : score(r).toFixed(1);
    $('#rice-ranking').innerHTML = riceRanking();
  }
  if (el.dataset.scenario) {
    state.scenario[el.dataset.scenario] = Number(el.value); save();
    const units = {baseline: '%', ceiling: '%', rate: '% / year', years: ' years'};
    $('#scenario-label-' + el.dataset.scenario).textContent = el.value + units[el.dataset.scenario];
    $('#scenario-result').innerHTML = scenarioResult();
  }
  if (el.id === 'lms-search') $('#lms-syllabus').innerHTML = lmsSyllabus(el.value);
  if (el.dataset.revenue) {
    const n = Number(el.value), pct = ['leadRate', 'paidRate', 'refundRate', 'processing'].includes(el.dataset.revenue);
    if (el.value === '' || !Number.isFinite(n) || n < 0 || (pct && n > 100)) { $('#revenue-results').innerHTML = '<p role="status">Enter non-negative values, with percentages between 0 and 100.</p>'; return; }
    state.revenue[el.dataset.revenue] = n; save();
    $('#revenue-results').innerHTML = revenueResults();
  }
});
document.addEventListener('change', e => {
  const el = e.target; if (!course) return;
  if (el.id === 'picker-select') { location.hash = el.value; return; }
  if (el.dataset.profile === 'domain') {
    const d = course.domainExamples.find(d => d.domain === el.value);
    state.profile = d ? {...d} : {...state.profile, domain: 'Custom'}; save();
    el.closest('.profile').outerHTML = profileMarkup();
    $('.profile').open = true;
    $$('[data-text]').forEach(t => { const p = course.prompts.find(p => p.id === t.dataset.text); if (promptMode[p.id] !== 'original') t.textContent = substitute(p.adapted); });
  }
  if (el.id === 'prompt-filter') renderPromptResults();
  if (el.dataset.answer !== undefined) { state.answers[moduleId] ||= {}; state.answers[moduleId][el.dataset.answer] = Number(el.value); save(); }
  if (el.id === 'data-region') $('#data-chart').innerHTML = dataChart(el.value);
  if (el.dataset.rubric !== undefined) { state.rubric[el.dataset.rubric] = el.value; save(); $('#capstone-score').innerHTML = capstoneScore(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'quiz-form') return;
  e.preventDefault();
  const m = course.modules[moduleId - 1], a = state.answers[moduleId] || {};
  if (m.quiz.some((q, i) => a[i] === undefined)) { toast('Choose an answer for all three questions first.'); return; }
  state.scores[moduleId] = m.quiz.reduce((n, q, i) => n + (a[i] === q.answer ? 1 : 0), 0); save();
  $('#quiz-area').innerHTML = quizMarkup(m, true);
  window.Trainer.update();
  toast(`You scored ${state.scores[moduleId]} / 3. Review the explanations below.`);
});
$('#close-slides').addEventListener('click', () => $('#slide-dialog').close());
$('#slide-dialog').addEventListener('close', () => { lastFocused?.focus(); window.Trainer.pageChanged(); });
$('#dialog-prev').addEventListener('click', () => setSlide((state.slides[moduleId] || 0) - 1));
$('#dialog-next').addEventListener('click', () => setSlide((state.slides[moduleId] || 0) + 1));
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (route === 'module' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    e.preventDefault(); setSlide((state.slides[moduleId] || 0) + (e.key === 'ArrowRight' ? 1 : -1));
  }
});
window.addEventListener('hashchange', () => { if (course) render(); });

fetch('course-data.json').then(r => { if (!r.ok) throw Error('Course data unavailable'); return r.json(); }).then(data => {
  course = data;
  window.Trainer.configure(course, {
    current: () => ({route, moduleId, labTab, lmsView}), setSlide,
    go: hash => { location.hash = hash; },
    showLab: tab => { labTab = tab; $('#main').innerHTML = practice(); },
    showLms: view => { lmsView = view; $('#main').innerHTML = lmsPage(); }
  });
  state.completed = state.completed.filter(id => course.modules.some(m => m.id === id));
  render();
}).catch(() => {
  $('#main').innerHTML = '<div class="panel"><h1>The course could not load.</h1><p>Refresh this page. If you opened a local HTML file, serve this folder with a local web server so the course data can load.</p><button class="button" onclick="location.reload()">Try again</button></div>';
});
