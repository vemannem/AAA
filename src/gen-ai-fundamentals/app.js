(function(){
"use strict";
const C = window.COURSE;
const $ = (s, el=document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- storage (per learner, this browser only) ---------- */
const KEY = "genai-fundamentals-progress-v1";
let S = {done:{}, quiz:{}, cap:{}, lq:{}, last:""};
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch(e) {}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} updateProgress(); }

/* ---------- progress math ---------- */
function weekUnits(w){
  const ids = [];
  w.lessons.forEach(l => { ids.push("L" + l.id); if (l.mcq && l.mcq.length) ids.push("K" + l.id); });
  if (w.quiz && w.quiz.length) ids.push("Q" + w.n);
  return ids;
}
function unitDone(u){
  if (u[0] === "L") return !!S.done[u.slice(1)];
  if (u[0] === "Q") { const q = S.quiz[u.slice(1)]; return !!(q && q.passed); }
  if (u[0] === "C") return !!S.cap[u.slice(1)];
  if (u[0] === "K") { const k = S.lq[u.slice(1)]; return !!(k && k.passed); }
  return false;
}
function allUnits(){
  const u = [];
  C.weeks.forEach(w => u.push(...weekUnits(w)));
  C.capstone.milestones.forEach((m, i) => u.push("C" + i));
  return u;
}
function pct(units){ if (!units.length) return 0; return Math.round(100 * units.filter(unitDone).length / units.length); }
function weekPct(w){ return pct(weekUnits(w)); }
function updateProgress(){
  const p = pct(allUnits());
  const tb = $("#topbar-fill"); if (tb) tb.style.width = p + "%";
  const tt = $("#topbar-pct"); if (tt) tt.textContent = p + "% complete";
  document.querySelectorAll("[data-wk-mini]").forEach(el => {
    const w = C.weeks.find(x => x.n == el.dataset.wkMini);
    el.style.width = (w ? weekPct(w) : capPct()) + "%";
  });
}
function capPct(){ return pct(C.capstone.milestones.map((m, i) => "C" + i)); }

/* ---------- diagrams ---------- */
let dgCount = 0;
function diagram(spec){
  const id = "ah" + (++dgCount);
  const NW = spec.w || 156, NH = 58, CG = spec.gap || 54, RG = 18, PAD = 14;
  const cols = spec.cols;
  const colH = cols.map(c => c.length * NH + (c.length - 1) * RG);
  const H0 = Math.max(...colH);
  const pos = {};
  cols.forEach((col, ci) => {
    const off = (H0 - colH[ci]) / 2;
    col.forEach((n, ri) => { pos[n[0]] = {x: PAD + ci * (NW + CG), y: PAD + 18 + off + ri * (NH + RG), n}; });
  });
  const hasBack = (spec.edges || []).some(e => { const a = pos[e[0]], b = pos[e[1]]; return a && b && b.x < a.x; });
  const W = PAD * 2 + cols.length * NW + (cols.length - 1) * CG;
  const H = PAD * 2 + 18 + H0 + (hasBack ? 46 : 0);
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.title || "Diagram")}" xmlns="http://www.w3.org/2000/svg">`;
  out += `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="ah" d="M0,0 L10,5 L0,10 z"/></marker>`;
  out += `<marker id="${id}h" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="ah hot" d="M0,0 L10,5 L0,10 z"/></marker></defs>`;
  if (spec.lanes) spec.lanes.forEach((t, i) => {
    out += `<text class="ns" x="${PAD + i * (NW + CG) + NW / 2}" y="${PAD + 6}" text-anchor="middle" style="font-weight:600;letter-spacing:.06em">${esc(t.toUpperCase())}</text>`;
  });
  const labels = [];
  (spec.edges || []).forEach(e => {
    const a = pos[e[0]], b = pos[e[1]]; if (!a || !b) return;
    const style = e[3] || "";
    const cls = "e" + (style.includes("dash") ? " dash" : "") + (style.includes("hot") ? " hot" : "");
    const mk = style.includes("hot") ? id + "h" : id;
    let d, lx, ly;
    if (b.x > a.x) {
      const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x - 2, y2 = b.y + NH / 2, mx = (x1 + x2) / 2;
      d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`; lx = mx; ly = (y1 + y2) / 2 - 6;
    } else if (b.x === a.x) {
      const down = b.y > a.y;
      const x = a.x + NW / 2, y1 = down ? a.y + NH : a.y, y2 = down ? b.y - 2 : b.y + NH + 2;
      d = `M${x},${y1} L${x},${y2}`; lx = x + 6; ly = (y1 + y2) / 2 + 4;
    } else {
      const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y + NH + 2, yb = PAD + 18 + H0 + 30;
      d = `M${x1},${y1} L${x1},${yb - 8} Q${x1},${yb} ${x1 - 8},${yb} L${x2 + 8},${yb} Q${x2},${yb} ${x2},${yb - 8} L${x2},${y2}`;
      lx = (x1 + x2) / 2; ly = yb - 5;
    }
    out += `<path class="${cls}" d="${d}" marker-end="url(#${mk})"/>`;
    if (e[2]) labels.push([lx, ly, e[2], b.x === a.x ? "start" : "middle"]);
  });
  Object.values(pos).forEach(p => {
    const [ , label, sub, kind] = p.n;
    const big = label.length > 18;
    out += `<rect class="n-${kind || "core"}" x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="9" stroke-width="1.5"/>`;
    out += `<text class="nl" x="${p.x + NW / 2}" y="${p.y + (sub ? 25 : 34)}" text-anchor="middle"${big ? ' style="font-size:11.5px"' : ""}>${esc(label)}</text>`;
    if (sub) out += `<text class="ns" x="${p.x + NW / 2}" y="${p.y + 42}" text-anchor="middle"${sub.length > 24 ? ' style="font-size:10px"' : ""}>${esc(sub)}</text>`;
  });
  labels.forEach(([x, y, t, anchor]) => {
    const w = t.length * 5.6 + 8;
    const rx = anchor === "start" ? x - 3 : x - w / 2;
    out += `<rect class="elb" x="${rx}" y="${y - 10}" width="${w}" height="14" rx="3"/>`;
    out += `<text class="el" x="${anchor === "start" ? x + 1 : x}" y="${y}" text-anchor="${anchor}">${esc(t)}</text>`;
  });
  out += `</svg>`;
  return out;
}
const LEGEND = `<div class="legend"><span><i style="background:var(--d-core);border-color:var(--d-core-s)"></i>Service / logic</span><span><i style="background:var(--d-store);border-color:var(--d-store-s)"></i>Data / storage</span><span><i style="background:var(--d-guard);border-color:var(--d-guard-s)"></i>Gate / guard</span><span><i style="background:var(--d-ext);border-color:var(--d-ext-s)"></i>External</span><span><i style="background:var(--d-user);border-color:var(--d-user-s)"></i>People</span></div>`;

/* ---------- tutor prompts ---------- */
function lessonPrompt(w, l){
  return `You are my tutor for the AAA Academy course "Gen AI Fundamentals".
Week ${w.n}: ${w.title}. Lesson ${l.id}: ${l.title}.

What I should now understand:
${l.takeaways.map(t => "- " + t).join("\n")}

Assess me one step at a time:
1. Ask me to explain the core idea of this lesson in my own words. Wait for my answer.
2. Ask 3 questions that get harder: recall, then apply (include a small numeric or code question where it fits), then a real-world trade-off. Ask one at a time and wait.${l.focus ? "\n   Make the last question about: " + l.focus : ""}
3. After each answer, say what was right, what was missing, and give a short correction.
4. Finish with a score out of 10, my weakest point, and one 15-minute exercise to fix it.
Do not give me the answers before I try. Keep each message short.`;
}
function levelPrompt(w, level){
  const out = w.outcomes.map(t => "- " + t).join("\n");
  const head = `You are my tutor for the AAA Academy course "Gen AI Fundamentals", week ${w.n}: ${w.title}.
By the end of this week I should be able to:
${out}
`;
  if (level === "Foundation") return head + `
Run a FOUNDATION check (am I ready to move on?):
- Ask 6 short questions, one at a time, covering the definitions and the "why" behind each outcome.
- Mix formats: explain-in-one-sentence, spot-the-mistake, and pick-the-better-option.
- After each answer, mark it correct / partly / wrong with a one-line reason.
- At the end, give me a readiness verdict (Ready / Review first) and list the lessons to revisit.`;
  if (level === "Practitioner") return head + `
Run a PRACTITIONER check (can I apply it?):
- Give me a realistic scenario from a team building with generative AI (pick education, e-commerce, healthcare admin or customer support).
- Ask me to make 3 concrete decisions for that scenario, one at a time, and to justify each with numbers or trade-offs.
- Push back once on each answer like a senior reviewer would. Then grade me 1-5 per decision.
- End with the single most important habit I should practice this week.`;
  return head + `
Run an EXPERT check (could I lead this in production?):
- Act as a senior AI engineer interviewing me for an applied AI engineer role.
- Give me one open-ended design problem that uses every outcome above. Let me drive.
- Probe the internals (why it works), failure modes, cost and latency. Ask follow-ups based on my answers.
- After 6-8 exchanges, score me on: design clarity, trade-offs, operability, and communication (1-5 each), with one sentence of evidence per score.`;
}

/* ---------- code blocks ---------- */
function codeBlock(file, code, lang){
  return `<div><div class="codehead"><span class="fn">${esc(file)}</span><button class="copy" data-copy>Copy</button></div><pre class="code"><code class="language-${lang || "python"}">${esc(code.replace(/^\n/, "").replace(/\s+$/, ""))}</code></pre></div>`;
}
function tutorBox(title, text, sub){
  return `<div class="tutor"><div class="tutor-h"><div><b>${esc(title)}</b>${sub ? `<div class="muted" style="font-size:12.5px">${esc(sub)}</div>` : ""}</div><button class="copy2" data-copy-pre>Copy prompt</button></div><pre>${esc(text)}</pre></div>`;
}

/* ---------- views ---------- */
function railHTML(active){
  let h = C.hubUrl ? `<a href="${esc(C.hubUrl)}" target="_top"><span class="wk">←</span><span>AAA Academy courses</span></a>` : "";
  h += `<a href="#home" class="${active === "home" ? "on" : ""}"><span class="wk">⌂</span><span>Course home</span></a>`;
  h += `<a href="#setup" class="${active === "setup" ? "on" : ""}"><span class="wk">00</span><span>Start here: setup</span></a><hr>`;
  C.weeks.forEach(w => {
    h += `<a href="#week-${w.n}" class="${active === "week-" + w.n ? "on" : ""}"><span class="wk">W${w.n}</span><span>${esc(w.short || w.title)}<span class="mini"><i data-wk-mini="${w.n}"></i></span></span></a>`;
  });
  h += `<a href="#capstone" class="${active === "capstone" ? "on" : ""}"><span class="wk">CP</span><span>Capstone project<span class="mini"><i data-wk-mini="cap"></i></span></span></a>`;
  return h;
}
function pickerHTML(active){
  const opts = [["home","Course home"],["setup","Start here: setup"]]
    .concat(C.weeks.map(w => ["week-" + w.n, `Week ${w.n}: ${w.title}`]))
    .concat([["capstone", "Capstone project"]]);
  return `<label class="eyebrow" for="pick">Go to</label><select id="pick">${opts.map(o => `<option value="${o[0]}"${o[0] === active ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
}

function homeView(){
  const p = pct(allUnits());
  const totalL = C.weeks.reduce((a, w) => a + w.lessons.length, 0);
  const totalQ = C.weeks.reduce((a, w) => a + w.quiz.length, 0);
  const totalK = C.weeks.reduce((a, w) => a + w.lessons.reduce((b, l) => b + (l.mcq ? l.mcq.length : 0), 0), 0);
  const next = nextStep();
  const R = 52, CIRC = 2 * Math.PI * R;
  let h = `<section class="hero"><div>
    <div class="eyebrow">AAA Academy · Applied Agentic AI</div>
    <h1 style="margin-top:8px">${esc(C.name)}</h1>
    <p class="lead">${esc(C.tagline)}</p>
    <div class="actions"><a class="btn primary" href="#${next.hash}">${esc(next.label)}</a><a class="btn" href="#setup">Setup: Colab or local</a>${C.hubUrl ? `<a class="btn" href="${esc(C.hubUrl)}" target="_top">All AAA Academy courses</a>` : ""}</div>
    <div class="stats"><span><b>${C.weeks.length}</b> weeks + capstone</span><span><b>${totalL}</b> lessons</span><span><b>${totalL}</b> Colab notebooks</span><span><b>${totalQ + totalK}</b> MCQs</span><span><b>6–8 h</b> per week</span></div>
  </div>
  <div class="ring" aria-label="Overall progress ${p}%"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="10"/><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC * (1 - p / 100)}"/></svg><div class="v"><div>${p}%<small>complete</small></div></div></div>
  </section>`;

  h += `<section class="section"><div><div class="eyebrow">How each week works</div><h2 style="margin-top:6px">Learn, build, check, then move on</h2></div>
  <div class="steps">${C.method.map(m => `<div><b>${esc(m[0])}</b>${esc(m[1])}</div>`).join("")}</div></section>`;

  h += `<section class="section"><div><div class="eyebrow">Roadmap</div><h2 style="margin-top:6px">Week by week</h2></div><div class="road">`;
  C.weeks.forEach(w => {
    const wp = weekPct(w);
    h += `<a class="wcard" href="#week-${w.n}"><span class="n">WEEK ${w.n}</span><h3>${esc(w.title)}</h3><p>${esc(w.goal)}</p><div class="foot"><div class="bar"><i style="width:${wp}%"></i></div><span>${wp}%</span></div></a>`;
  });
  const cp = capPct();
  h += `<a class="wcard" href="#capstone"><span class="n"><span class="tag">Capstone</span></span><h3>${esc(C.capstone.title)}</h3><p>${esc(C.capstone.pitch)}</p><div class="foot"><div class="bar"><i style="width:${cp}%"></i></div><span>${cp}%</span></div></a>`;
  h += `</div></section>`;

  h += `<section class="section"><div><div class="eyebrow">Who it's for</div><h2 style="margin-top:6px">Before you start</h2></div><div class="prose">${C.audience}</div></section>`;
  h += `<p class="foot-credit">${C.footer}</p>`;
  return h;
}

function nextStep(){
  for (const w of C.weeks) {
    for (const l of w.lessons) if (!S.done[l.id] || (l.mcq && l.mcq.length && !(S.lq[l.id] && S.lq[l.id].passed))) return {hash: "week-" + w.n, label: (Object.keys(S.done).length ? "Continue: " : "Start: ") + "Lesson " + l.id};
    if (!(S.quiz[w.n] && S.quiz[w.n].passed)) return {hash: "week-" + w.n, label: `Take the week ${w.n} quiz`};
  }
  return {hash: "capstone", label: "Build the capstone"};
}

function setupView(){
  return `<div class="whead"><div class="eyebrow">Start here</div><h1>Setup and how to learn</h1><p class="muted" style="font-size:16px">Pick Colab for zero setup, or your own machine for a real project layout. Every lab works in both.</p></div>
  <div class="prose">${C.setup.html}</div>
  ${codeBlock(C.setup.helper.file, C.setup.helper.code)}
  <div class="prose">${C.setup.after}</div>
  ${tutorBox("Tutor prompt: personal study plan", C.setup.planPrompt, "Paste into Claude once before week 1.")}`;
}

/* ---------- notebooks (built in the browser for Colab or local Jupyter) ---------- */
function plain(html){ const d = document.createElement("div"); d.innerHTML = html; return d.textContent.replace(/\s+\n/g, "\n").trim(); }
function nbLines(s){ const parts = s.replace(/^\n/, "").replace(/\s+$/, "").split("\n"); return parts.map((x, i) => i < parts.length - 1 ? x + "\n" : x); }
function findLesson(id){ for (const w of C.weeks) for (const l of w.lessons) if (l.id === id) return [w, l]; return [null, null]; }
function usesLLM(l){ const all = [l.demo.code, l.lab.code].concat((l.deps || []).map(id => { const x = findLesson(id)[1]; return x ? x.demo.code : ""; })).join("\n"); return /common\.llm|from common import llm/.test(all); }
function buildNotebook(w, l){
  const cells = [];
  const md = s => ({cell_type: "markdown", metadata: {}, source: nbLines(s)});
  const code = s => ({cell_type: "code", metadata: {}, execution_count: null, outputs: [], source: nbLines(s)});
  const folders = new Set(["week" + w.n]);
  [l.demo.file, l.lab.file].concat((l.deps || []).map(id => { const x = findLesson(id)[1]; return x ? x.demo.file : ""; })).forEach(f => { if (f && f.includes("/")) folders.add(f.split("/")[0]); });
  const llm = usesLLM(l);
  if (llm) folders.add("common");
  cells.push(md(`# Gen AI Fundamentals · Lesson ${l.id}: ${l.title}\n\n**AAA Academy · Week ${w.n}: ${w.title}**\n\n${plain(l.demo.what)}\n\nRun the cells from top to bottom with Shift+Enter. The notebook writes each script into the same folders as the local course layout, then runs it.`));
  const pip = (l.pip || []).join(" ");
  cells.push(code(`# Step 1: install packages and create the course folders.\n# Colab already has numpy, torch and matplotlib.\n${pip ? "%pip install -q " + pip : "# Nothing extra to install for this lesson."}\n!mkdir -p ${[...folders].join(" ")}`));
  if (llm) {
    cells.push(code(`# Step 2: API key. In Colab, add a secret named ANTHROPIC_API_KEY (key icon on the left).\n# Locally, export ANTHROPIC_API_KEY in your shell before starting Jupyter.\nimport os\ntry:\n    from google.colab import userdata\n    os.environ["ANTHROPIC_API_KEY"] = userdata.get("ANTHROPIC_API_KEY")\nexcept Exception:\n    pass\nprint("API key found" if os.getenv("ANTHROPIC_API_KEY") else "No key: Claude calls use the offline stub")`));
    cells.push(code("%%writefile " + C.setup.helper.file + "\n" + C.setup.helper.code.replace(/^\n/, "")));
  }
  (l.deps || []).forEach(id => {
    const x = findLesson(id)[1]; if (!x) return;
    cells.push(md(`Supporting file from lesson ${id}, used by this lesson.`));
    cells.push(code("%%writefile " + x.demo.file + "\n" + x.demo.code.replace(/^\n/, "")));
  });
  cells.push(md(`## Demo: ${l.demo.file}\n\n${plain(l.demo.what)}`));
  cells.push(code("%%writefile " + l.demo.file + "\n" + l.demo.code.replace(/^\n/, "")));
  cells.push(code("%run " + l.demo.file));
  cells.push(md(`## Practice lab: ${l.lab.file}\n\n**Your task:** ${plain(l.lab.task)}\n\n${l.lab.steps.map((s, i) => (i + 1) + ". " + plain(s)).join("\n")}\n\n**Done when:** ${plain(l.lab.done)}\n\nEdit the next cell, then run it and the one after it. Re-run both after every change.`));
  cells.push(code("%%writefile " + l.lab.file + "\n" + l.lab.code.replace(/^\n/, "")));
  cells.push(code("%run " + l.lab.file));
  cells.push(md(`## Check yourself\n\nAnswer the quick check on the course page, then paste this tutor prompt into Claude:\n\n\`\`\`\n${lessonPrompt(w, l)}\n\`\`\``));
  return {cells, metadata: {kernelspec: {display_name: "Python 3", language: "python", name: "python3"}, language_info: {name: "python"}, colab: {provenance: []}}, nbformat: 4, nbformat_minor: 5};
}
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b){ let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files){
  // files: [{name, text}] -> Uint8Array of a stored (uncompressed) zip
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
    const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
    const local = new Uint8Array([...u32(0x04034b50), ...common]);
    parts.push(local, name, data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
    off += local.length + name.length + data.length;
  }
  const csize = central.reduce((s, a) => s + a.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(csize), ...u32(off), ...u16(0)]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((s, a) => s + a.length, 0)); let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}
function lessonZip(w, l){
  const base = `genai_w${w.n}_lesson_${l.id.replace(".", "_")}`;
  const nb = JSON.stringify(buildNotebook(w, l), null, 1);
  return {filename: base + ".zip", data: makeZip([
    {name: base + ".ipynb", text: nb},
    {name: l.demo.file, text: l.demo.code.replace(/^\n/, "")},
    {name: l.lab.file, text: l.lab.code.replace(/^\n/, "")}
  ])};
}
let DL = null; const dlReady = (window.claude && window.claude.use) ? window.claude.use("downloads").then(d => { DL = d; }, () => {}) : Promise.resolve();
async function downloadNotebook(id, btn){
  const [w, l] = findLesson(id); if (!l) return;
  const file = lessonZip(w, l);
  await dlReady;
  if (DL) {
    try { await DL.save(file); } catch (e) {
      if (e && e.code === "declined") return;
      const note = btn && btn.nextElementSibling;
      if (note) note.textContent = e && e.code === "rate_limited" ? "Too many downloads at once. Wait a moment and press the button again." : "The download could not start here. Copy the demo and lab code from the tabs above into files instead.";
    }
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([file.data], {type: "application/zip"}));
  a.download = file.filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

function runHTML(w, l){
  const pip = (l.pip || []).join(" ");
  const llm = usesLLM(l);
  const deps = (l.deps || []).map(id => findLesson(id)[1]).filter(Boolean);
  return `<div class="runbox"><div><h4>Google Colab</h4><ol><li>Press <b>Download lesson files</b> below and unzip the file.</li><li>In Colab choose <b>File → Upload notebook</b> and pick the <code>.ipynb</code> inside.</li>${llm ? "<li>Add the <code>ANTHROPIC_API_KEY</code> secret (key icon), or run offline.</li>" : ""}<li>Run every cell top to bottom. Edit the lab cell, then re-run it.</li></ol><button class="btn primary" type="button" data-nb="${l.id}">Download lesson files (.zip)</button><p class="muted" style="font-size:12.5px">The zip holds the Colab notebook plus the demo and lab scripts. The notebook also opens in local Jupyter or VS Code.</p></div>
  <div><h4>Your machine</h4><ol><li>Activate the course venv from the setup page.</li>${pip ? `<li>Install this lesson's extras: <code>pip install ${esc(pip)}</code></li>` : ""}${llm ? "<li>Make sure <code>common/llm.py</code> exists (setup page).</li>" : ""}${deps.length ? `<li>Keep ${deps.map(d => `<code>${esc(d.demo.file)}</code>`).join(", ")} from lesson ${deps.map(d => d.id).join(", ")}.</li>` : ""}<li>Save the demo as <code>${esc(l.demo.file)}</code> and the lab as <code>${esc(l.lab.file)}</code>.</li><li>From the workspace root: <code>${esc(l.demo.run)}</code> then <code>${esc(l.lab.run)}</code></li></ol>${l.runNote ? `<p class="muted" style="font-size:12.5px">${l.runNote}</p>` : ""}</div></div>`;
}

function lessonQuizHTML(l){
  const st = S.lq[l.id];
  let h = `<form class="lq" data-lq="${l.id}"><div><span class="eyebrow">Quick check · lesson ${l.id}</span><p class="muted" style="font-size:13px;margin-top:4px">${l.mcq.length} questions. Get ${Math.ceil(l.mcq.length * 2 / 3)} right to pass.</p></div>`;
  l.mcq.forEach((q, qi) => {
    h += `<div class="q"><div class="qt">${qi + 1}. ${esc(q.q)}</div><div class="opts">`;
    q.a.forEach((a, ai) => {
      const chk = st && st.answers && st.answers[qi] === ai ? " checked" : "";
      h += `<label><input type="radio" name="k${l.id}-${qi}" value="${ai}"${chk}><span>${esc(a)}</span></label>`;
    });
    h += `</div><div class="why" hidden>${esc(q.why)}</div></div>`;
  });
  h += `<div class="qbar"><button class="btn primary" type="submit">Check</button><span class="score" data-lqscore="${l.id}">${st ? `Best: ${st.best}/${l.mcq.length}${st.passed ? " · Passed" : ""}` : ""}</span></div></form>`;
  return h;
}

function lessonHTML(w, l, open){
  const done = !!S.done[l.id];
  let h = `<details class="lesson" id="lesson-${l.id.replace(".", "-")}"${open ? " open" : ""}><summary><span class="lid">${l.id}</span><span class="lsum"><h3>${esc(l.title)}</h3><span class="muted">${l.mins} min · ${esc(l.kicker)}</span></span><span class="done-pill${done ? " yes" : ""}" data-pill="${l.id}">${done ? "Done" : "To do"}</span></summary><div class="lbody">`;
  h += `<div class="prose">${l.body}</div>`;
  if (l.example) h += `<div class="callout ex"><span class="eyebrow">Real-world example · ${esc(l.example[0])}</span><div>${l.example[1]}</div></div>`;
  if (l.diagram) h += `<figure class="dg"><div class="dgwrap">${diagram(l.diagram)}</div>${LEGEND}<figcaption>${esc(l.diagram.caption || "")}</figcaption></figure>`;
  const tid = "t" + l.id.replace(".", "-");
  h += `<div><div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="${tid}-demo">Demo script</button><button role="tab" aria-selected="false" data-tab="${tid}-lab">Practice lab</button><button role="tab" aria-selected="false" data-tab="${tid}-run">Run it: Colab or local</button></div>`;
  h += `<div class="tabpanel" id="${tid}-demo"><p class="runline">Run: <b>${esc(l.demo.run)}</b></p><p style="font-size:14px">${l.demo.what}</p>${codeBlock(l.demo.file, l.demo.code, l.demo.lang)}</div>`;
  h += `<div class="tabpanel" id="${tid}-lab" hidden><div class="callout cp"><span class="eyebrow">Your task</span><div>${l.lab.task}</div></div><ol class="prose" style="padding-left:20px;margin:0">${l.lab.steps.map(s => `<li>${s}</li>`).join("")}</ol><p class="runline">Run: <b>${esc(l.lab.run)}</b></p>${codeBlock(l.lab.file, l.lab.code, l.lab.lang)}<p style="font-size:13.5px" class="muted"><b style="color:var(--ink)">Done when:</b> ${l.lab.done}</p></div>`;
  h += `<div class="tabpanel" id="${tid}-run" hidden>${runHTML(w, l)}</div></div>`;
  h += `<div class="prose"><h4>Key takeaways</h4><ul class="takeaways">${l.takeaways.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`;
  if (l.mcq && l.mcq.length) h += lessonQuizHTML(l);
  h += tutorBox("Tutor prompt: check my understanding", lessonPrompt(w, l), "Paste into Claude after the lab. Answer honestly before reading ahead.");
  h += `<label class="complete"><input type="checkbox" data-done="${l.id}"${done ? " checked" : ""}> I finished the reading, the demo and the lab for ${l.id}</label>`;
  h += `</div></details>`;
  return h;
}

function quizHTML(w){
  const st = S.quiz[w.n];
  let h = `<section class="section" id="quiz-${w.n}"><div><div class="eyebrow">Checkpoint</div><h2 style="margin-top:6px">Week ${w.n} quiz</h2><p class="muted" style="margin-top:6px">${w.quiz.length} questions. Score 70% or more to mark the week's checkpoint as passed. Explanations appear after you submit.</p></div><form class="quiz" data-quiz="${w.n}">`;
  w.quiz.forEach((q, qi) => {
    h += `<div class="q"><div class="qt">${qi + 1}. ${esc(q.q)}</div><div class="opts">`;
    q.a.forEach((a, ai) => {
      const chk = st && st.answers && st.answers[qi] === ai ? " checked" : "";
      h += `<label><input type="radio" id="q${w.n}-${qi}-${ai}" name="q${w.n}-${qi}" value="${ai}"${chk}><span>${esc(a)}</span></label>`;
    });
    h += `</div><div class="why" hidden>${esc(q.why)}</div></div>`;
  });
  h += `<div class="qbar"><button class="btn primary" type="submit">Check my answers</button><button class="btn" type="button" data-reset="${w.n}">Reset</button><span class="score" data-score="${w.n}">${st ? `Best: ${st.best}/${w.quiz.length}${st.passed ? " · Passed" : ""}` : ""}</span></div></form></section>`;
  return h;
}

function weekView(n){
  const w = C.weeks.find(x => x.n === n);
  if (!w) return homeView();
  const firstOpen = w.lessons.findIndex(l => !S.done[l.id]);
  let h = `<div class="whead"><div class="eyebrow">Week ${w.n} · weeks ${C.weeks[0].n} to ${C.weeks[C.weeks.length - 1].n}</div><h1>${esc(w.title)}</h1><p style="font-size:16.5px" class="muted">${esc(w.goal)}</p>
  <div class="meta"><span>${w.lessons.length} lessons</span><span>${esc(w.hours)}</span><span>${w.quiz.length}-question quiz</span><span>${weekPct(w)}% complete</span></div></div>`;
  h += `<div class="prose"><h3>By the end of this week you can</h3><ul class="outcomes">${w.outcomes.map(o => `<li>${esc(o)}</li>`).join("")}</ul></div>`;
  h += `<div class="srcbox"><b>What you'll build:</b> ${esc(w.builds)}</div>`;
  h += `<section class="section"><div class="eyebrow">Lessons</div>${w.lessons.map((l, i) => lessonHTML(w, l, i === (firstOpen < 0 ? 0 : firstOpen))).join("")}</section>`;
  h += quizHTML(w);
  h += `<section class="section"><div><div class="eyebrow">Tutor check-ins</div><h2 style="margin-top:6px">Assess yourself at three levels</h2><p class="muted" style="margin-top:6px">Start with Foundation. Move up only when Claude says you're ready.</p></div><div class="levels">
    ${tutorBox("Level 1 · Foundation", levelPrompt(w, "Foundation"), "Do this right after the quiz.")}
    ${tutorBox("Level 2 · Practitioner", levelPrompt(w, "Practitioner"), "Scenario decisions with pushback.")}
    ${tutorBox("Level 3 · Expert", levelPrompt(w, "Expert"), "A senior design interview.")}</div></section>`;
  h += `<div class="callout cp"><span class="eyebrow">Week ${w.n} build checkpoint</span><div>${w.checkpoint}</div></div>`;
  const nx = C.weeks.find(x => x.n === n + 1);
  h += `<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">${C.weeks.some(x => x.n === n - 1) ? `<a class="btn" href="#week-${n - 1}">← Week ${n - 1}</a>` : `<a class="btn" href="#setup">← Setup</a>`}${nx ? `<a class="btn primary" href="#week-${n + 1}">Week ${n + 1}: ${esc(nx.short || nx.title)} →</a>` : `<a class="btn primary" href="#capstone">Capstone →</a>`}</div>`;
  return h;
}

function capstoneView(){
  const K = C.capstone;
  let h = `<div class="whead"><div class="eyebrow">Capstone project</div><h1>${esc(K.title)}</h1><p style="font-size:16.5px" class="muted">${esc(K.pitch)}</p><div class="meta"><span>${esc(K.hours)}</span><span>${capPct()}% complete</span></div></div>`;
  h += `<div class="prose">${K.brief}</div>`;
  if (K.diagram) h += `<figure class="dg"><div class="dgwrap">${diagram(K.diagram)}</div>${LEGEND}<figcaption>${esc(K.diagram.caption)}</figcaption></figure>`;
  h += `<section class="section"><div class="eyebrow">Milestones</div><div style="display:grid;gap:10px">`;
  K.milestones.forEach((m, i) => {
    h += `<div class="q"><div class="qt">M${i + 1}. ${esc(m[0])}</div><div style="font-size:14px">${m[1]}</div><label class="complete" style="margin-top:4px"><input type="checkbox" data-cap="${i}"${S.cap[i] ? " checked" : ""}> Milestone ${i + 1} done</label></div>`;
  });
  h += `</div></section>`;
  h += `<section class="section"><div class="eyebrow">Starter code</div>${codeBlock(K.starter.file, K.starter.code)}</section>`;
  h += `<section class="section"><div class="eyebrow">Grading rubric (100 points)</div><div class="tablewrap prose"><table class="rubric"><thead><tr><th>Area</th><th>What great looks like</th><th>Points</th></tr></thead><tbody>${K.rubric.map(r => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div></section>`;
  h += `<section class="section"><div class="eyebrow">Tutor reviews</div><div class="levels">${K.prompts.map(p => tutorBox(p[0], p[1], p[2])).join("")}</div></section>`;
  h += `<div class="callout cp"><span class="eyebrow">Graduation</span><div>${K.graduate}</div></div>`;
  return h;
}

/* ---------- render + events ---------- */
function route(){
  const hsh = (location.hash || "#home").slice(1);
  let html, active = hsh;
  if (hsh.startsWith("week-")) html = weekView(parseInt(hsh.slice(5), 10));
  else if (hsh === "setup") html = setupView();
  else if (hsh === "capstone") html = capstoneView();
  else { html = homeView(); active = "home"; }
  $("#rail").innerHTML = railHTML(active);
  $("#picker").innerHTML = pickerHTML(active);
  $("#page").innerHTML = html;
  if (active !== "home") { S.last = active; save(); } else updateProgress();
  if (window.hljs) document.querySelectorAll("pre.code code").forEach(el => { try { window.hljs.highlightElement(el); } catch(e) {} });
  window.scrollTo(0, 0);
}

function copyText(txt, btn){
  const ok = () => { const t = btn.textContent; btn.textContent = "Copied"; setTimeout(() => btn.textContent = t, 1400); };
  try {
    navigator.clipboard.writeText(txt).then(ok, () => fallback());
  } catch(e) { fallback(); }
  function fallback(){
    const pre = btn.closest(".tutor, div").querySelector("pre");
    if (pre) { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "Selected: press Ctrl/Cmd+C"; }
  }
}

document.addEventListener("click", e => {
  const c = e.target.closest("[data-copy]");
  if (c) { const pre = c.parentElement.nextElementSibling; copyText(pre.textContent, c); return; }
  const c2 = e.target.closest("[data-copy-pre]");
  if (c2) { copyText(c2.closest(".tutor").querySelector("pre").textContent, c2); return; }
  const nb = e.target.closest("[data-nb]");
  if (nb) { downloadNotebook(nb.dataset.nb, nb); return; }
  const t = e.target.closest("[data-tab]");
  if (t) {
    const bar = t.parentElement;
    bar.querySelectorAll("[data-tab]").forEach(b => { b.setAttribute("aria-selected", b === t ? "true" : "false"); document.getElementById(b.dataset.tab).hidden = b !== t; });
    return;
  }
  const r = e.target.closest("[data-reset]");
  if (r) {
    const n = r.dataset.reset, form = r.closest("form");
    form.reset(); form.querySelectorAll("label").forEach(l => l.classList.remove("right", "wrong")); form.querySelectorAll(".why").forEach(x => x.hidden = true);
    if (S.quiz[n]) { S.quiz[n].answers = []; save(); }
  }
  const th = e.target.closest("#theme");
  if (th) {
    const cur = document.documentElement.getAttribute("data-theme");
    const dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
    try { localStorage.setItem("aaa-academy-theme", dark ? "light" : "dark"); } catch(err) {}
  }
});
document.addEventListener("change", e => {
  const d = e.target.closest("[data-done]");
  if (d) {
    const id = d.dataset.done; S.done[id] = d.checked; if (!d.checked) delete S.done[id];
    const pill = document.querySelector(`[data-pill="${id}"]`); if (pill) { pill.textContent = d.checked ? "Done" : "To do"; pill.classList.toggle("yes", d.checked); }
    save(); return;
  }
  const cp = e.target.closest("[data-cap]");
  if (cp) { const i = cp.dataset.cap; if (cp.checked) S.cap[i] = true; else delete S.cap[i]; save(); return; }
  if (e.target.id === "pick") location.hash = e.target.value;
});
document.addEventListener("submit", e => {
  const lf = e.target.closest("[data-lq]");
  if (lf) {
    e.preventDefault();
    const id = lf.dataset.lq, l = findLesson(id)[1];
    let score = 0; const answers = [];
    l.mcq.forEach((q, qi) => {
      const inputs = lf.querySelectorAll(`input[name="k${id}-${qi}"]`);
      const sel = lf.querySelector(`input[name="k${id}-${qi}"]:checked`);
      const v = sel ? parseInt(sel.value, 10) : -1; answers.push(v);
      inputs.forEach((inp, ai) => { const lab = inp.closest("label"); lab.classList.remove("right", "wrong"); if (ai === q.c) lab.classList.add("right"); else if (ai === v) lab.classList.add("wrong"); });
      inputs[0].closest(".q").querySelector(".why").hidden = false;
      if (v === q.c) score++;
    });
    const prev = S.lq[id] || {best: 0};
    const best = Math.max(prev.best || 0, score);
    const passed = !!prev.passed || score >= Math.ceil(l.mcq.length * 2 / 3);
    S.lq[id] = {best, passed, answers};
    lf.querySelector(`[data-lqscore="${id}"]`).textContent = `This try: ${score}/${l.mcq.length} · Best: ${best}/${l.mcq.length}${passed ? " · Passed" : ""}`;
    save(); return;
  }
  const f = e.target.closest("[data-quiz]"); if (!f) return;
  e.preventDefault();
  const n = parseInt(f.dataset.quiz, 10), w = C.weeks.find(x => x.n === n);
  let score = 0; const answers = [];
  w.quiz.forEach((q, qi) => {
    const sel = f.querySelector(`input[name="q${n}-${qi}"]:checked`);
    const v = sel ? parseInt(sel.value, 10) : -1; answers.push(v);
    const labels = f.querySelectorAll(`input[name="q${n}-${qi}"]`);
    labels.forEach((inp, ai) => { const lab = inp.closest("label"); lab.classList.remove("right", "wrong"); if (ai === q.c) lab.classList.add("right"); else if (ai === v) lab.classList.add("wrong"); });
    labels[0].closest(".q").querySelector(".why").hidden = false;
    if (v === q.c) score++;
  });
  const prev = S.quiz[n] || {best: 0};
  const best = Math.max(prev.best || 0, score);
  const passed = !!prev.passed || score / w.quiz.length >= 0.7;
  S.quiz[n] = {best, passed, answers};
  f.querySelector(`[data-score="${n}"]`).textContent = `This try: ${score}/${w.quiz.length} · Best: ${best}/${w.quiz.length}${passed ? " · Passed" : " · 70% needed to pass"}`;
  save();
});

try { const t = localStorage.getItem("aaa-academy-theme"); if (t) document.documentElement.setAttribute("data-theme", t); } catch(e) {}
window.addEventListener("hashchange", route);
if (!location.hash && S.last) { /* stay on home; the hero button resumes */ }
route();
})();
