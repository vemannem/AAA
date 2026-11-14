// Usage: node tools.js validate [weekfile...]   -> schema check
//        node tools.js extract <outdir> [weekfile...] -> write every demo/lab file into outdir (course layout)
const fs = require("fs"), path = require("path");
const dir = __dirname;
global.window = {};
eval(fs.readFileSync(path.join(dir, "course.js"), "utf8").replace("function W(o)", "global.W = function(o)"));
const [cmd, ...rest] = process.argv.slice(2);
let out = null;
if (cmd === "extract") out = rest.shift();
let files = rest.length ? rest : fs.readdirSync(path.join(dir, "weeks")).filter(f => f.endsWith(".js")).sort().map(f => path.join(dir, "weeks", f));
for (const f of files) { try { eval(fs.readFileSync(f, "utf8")); } catch (e) { console.error("SYNTAX/EVAL ERROR in", f, e.message); process.exitCode = 1; } }
if (fs.existsSync(path.join(dir, "capstone.js")) && !rest.length) eval(fs.readFileSync(path.join(dir, "capstone.js"), "utf8"));
const C = window.COURSE;
// Optional private list of terms that must never appear in course text, one per line.
// Keep it in src/gen-ai-fundamentals/.banned-terms (git-ignored).
const bannedFile = path.join(dir, ".banned-terms");
const BANNED = fs.existsSync(bannedFile) ? fs.readFileSync(bannedFile, "utf8").split("\n").map(s => s.trim().toLowerCase()).filter(Boolean) : [];
const errs = [];
const need = (o, k, where) => { if (o[k] === undefined || o[k] === null || o[k] === "") errs.push(`${where}: missing ${k}`); };
const ids = new Set();
C.weeks.forEach(w => {
  ["n", "title", "short", "hours", "goal", "builds", "outcomes", "lessons", "quiz", "checkpoint"].forEach(k => need(w, k, "week " + w.n));
  (w.lessons || []).forEach(l => {
    const where = `lesson ${l.id}`;
    if (ids.has(l.id)) errs.push(where + ": duplicate id"); ids.add(l.id);
    if (!String(l.id).startsWith(w.n + ".")) errs.push(where + ": id should start with week number");
    ["id", "title", "mins", "kicker", "focus", "body", "example", "diagram", "demo", "lab", "takeaways", "mcq"].forEach(k => need(l, k, where));
    if (l.demo) ["file", "run", "what", "code"].forEach(k => need(l.demo, k, where + " demo"));
    if (l.lab) ["file", "run", "task", "steps", "done", "code"].forEach(k => need(l.lab, k, where + " lab"));
    [l.demo, l.lab].forEach(x => { if (x && x.run && x.file) { const mod = x.file.replace(/\.py$/, "").replace(/\//g, "."); if (x.run !== "python -m " + mod) errs.push(`${where}: run should be "python -m ${mod}" but is "${x.run}"`); } });
    (l.mcq || []).forEach((q, i) => { if (!(q.a && q.a.length >= 3 && q.c >= 0 && q.c < q.a.length && q.why)) errs.push(`${where} mcq ${i}: bad shape`); });
    if (l.diagram) { const nodes = new Set(); (l.diagram.cols || []).forEach(c => c.forEach(n => nodes.add(n[0]))); (l.diagram.edges || []).forEach(e => { if (!nodes.has(e[0]) || !nodes.has(e[1])) errs.push(`${where} diagram: edge ${e[0]}->${e[1]} unknown node`); }); }
    (l.deps || []).forEach(d => { if (!C.weeks.some(ww => ww.lessons.some(x => x.id === d))) errs.push(`${where}: dep ${d} not found (yet)`); });
    if (out) {
      [[l.demo.file, l.demo.code], [l.lab.file, l.lab.code]].forEach(([fn, code]) => {
        const p = path.join(out, fn); fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, code.replace(/^\n/, ""));
      });
    }
  });
  (w.quiz || []).forEach((q, i) => { if (!(q.a && q.a.length >= 3 && q.c >= 0 && q.c < q.a.length && q.why)) errs.push(`week ${w.n} quiz ${i}: bad shape`); });
  const blob = JSON.stringify(w).toLowerCase();
  BANNED.forEach(t => { if (blob.includes(t)) errs.push(`week ${w.n}: mentions a banned term`); });
});
if (out) { const p = path.join(out, C.setup.helper.file); fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, C.setup.helper.code.replace(/^\n/, "")); }
const nL = C.weeks.reduce((a, w) => a + (w.lessons || []).length, 0);
console.log(`weeks ${C.weeks.length}, lessons ${nL}, errors ${errs.length}`);
errs.forEach(e => console.log("  " + e));
if (errs.length) process.exitCode = 1;
