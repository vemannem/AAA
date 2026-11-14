// Assemble the course page: node src/gen-ai-fundamentals/build.js [hubUrl] [outFile]
// Defaults: hub link "../", output gen-ai-fundamentals/index.html at the repo root.
const fs = require("fs"), path = require("path");
const dir = __dirname;
const hub = process.argv[2] || "../";
const outFile = process.argv[3] || path.join(dir, "..", "..", "gen-ai-fundamentals", "index.html");
const shell = require("../shell.js");
const read = f => fs.readFileSync(path.join(dir, f), "utf8");
const weeks = fs.readdirSync(path.join(dir, "weeks")).filter(f => /^w\d\d\.js$/.test(f)).sort();
let course = read("course.js").replace('hubUrl: "",', `hubUrl: ${JSON.stringify(hub)},`);
const extras = fs.readdirSync(path.join(dir, "weeks")).filter(f => /^x.*\.js$/.test(f)).sort();
const mergeJs = `
(window.COURSE_EXTRA_LESSONS || []).forEach(x => {
  const w = window.COURSE.weeks.find(w => w.n === x.week);
  if (!w) throw new Error("extra lesson for missing week " + x.week);
  w.lessons.push(x.lesson); (x.quiz || []).forEach(q => w.quiz.push(q));
});
window.COURSE.weeks.sort((a, b) => a.n - b.n);`;
let data = course + "\n" + read("capstone.js") + "\n" + weeks.map(f => read("weeks/" + f)).join("\n") + "\n" + extras.map(f => read("weeks/" + f)).join("\n") + "\n" + mergeJs;
// Deterministic shuffle of every MCQ's options so the right answer isn't always in the same slot.
const shuffleJs = `
(function(){
  function h(s){ let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x; }
  function mix(q){
    const order = q.a.map((_, i) => i);
    let seed = h(q.q);
    for (let i = order.length - 1; i > 0; i--) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; const j = seed % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    q.a = order.map(i => q.a[i]); q.c = order.indexOf(q.c);
  }
  window.COURSE.weeks.forEach(w => { (w.quiz || []).forEach(mix); w.lessons.forEach(l => (l.mcq || []).forEach(mix)); });
})();`;
const html = shell.open("en") + read("head.html").replace(/\s*$/, "") + "\n" +
  `<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>\n<script>\n` +
  data + "\n" + shuffleJs + "\n" +
  "/* Gen AI Fundamentals course app: hash routing, diagrams, progress, quizzes, notebooks, tutor prompts. */\n" +
  read("app.js") + "\n</script>\n" + shell.close;
fs.mkdirSync(path.dirname(outFile), {recursive: true});
fs.writeFileSync(outFile, html);
console.log("wrote", (html.length / 1024).toFixed(0) + " KB,", weeks.length, "week files");
