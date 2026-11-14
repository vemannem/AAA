/* Trainer: a spoken walkthrough for every page, slide, prompt, lab and quiz.
   Uses the browser's built-in speech (no server, no AI model). Scripts come from course-data.json. */
(function(){
  'use strict';
  let course = null, api = null, speaking = null, queue = [], voice = null;
  const synth = window.speechSynthesis;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Prefer an on-device English voice. Network voices (e.g. "Google US English" in Chrome) often stop
  // after about 15 seconds or stay silent, so they are only used when nothing local is available.
  function pickVoice(){
    if (!synth) return null;
    const all = synth.getVoices(), en = all.filter(v => /^en(-|_|$)/i.test(v.lang));
    const local = en.filter(v => v.localService);
    const nice = /natural|neural|samantha|daniel|serena|karen|moira|aria|jenny|guy|zira|david|mark/i;
    return local.find(v => nice.test(v.name)) || local.find(v => /en-(US|GB)/i.test(v.lang)) || local[0] || en.find(v => v.default) || en[0] || null;
  }
  if (synth) {
    voice = pickVoice();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', () => { voice = pickVoice(); });
    else synth.onvoiceschanged = () => { voice = pickVoice(); };
  }

  // Short chunks keep every browser speaking: long utterances are cut off or never start on some engines.
  function chunks(text){
    const out = [];
    (text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text]).forEach(sentence => {
      let t = sentence.trim();
      while (t.length > 220) {
        let cut = t.lastIndexOf(', ', 200); if (cut < 80) cut = t.lastIndexOf(' ', 200); if (cut < 40) cut = 200;
        out.push(t.slice(0, cut + 1).trim()); t = t.slice(cut + 1).trim();
      }
      if (t) out.push(t);
    });
    return out;
  }

  // Find the script for a key: page scripts, then module, slide, prompt, lab and quiz scripts.
  function script(key){
    if (!course) return null;
    const pages = course.trainerGuides || {};
    const alias = {'lab-rice': 'rice', 'lab-data': 'data', 'lab-revenue': 'revenue', 'lab-scenario': 'scenario', 'lab-capstone': 'capstone', 'lms-catalog': 'lmsCatalog', 'lms-learn': 'lmsLearning'};
    const page = pages[alias[key] || key];
    if (page) return page;
    let m;
    if ((m = key.match(/^slide-(\d+)-(\d+)$/))) {
      const mod = course.modules[+m[1] - 1], s = mod && mod.slides[+m[2]];
      if (s && s.trainer) return {title: s.title, paragraphs: s.trainer.paragraphs};
    }
    if ((m = key.match(/^prompt-(\w+)$/))) {
      const p = course.prompts.find(p => p.id === m[1]);
      if (p && p.trainer) return {title: 'Prompt ' + p.id + ': ' + p.title, paragraphs: p.trainer.paragraphs};
    }
    if ((m = key.match(/^practice-(\d+)$/))) {
      const mod = course.modules[+m[1] - 1];
      if (mod && mod.lab.trainer) return {title: mod.lab.title, paragraphs: mod.lab.trainer.paragraphs};
    }
    if ((m = key.match(/^quiz-(\d+)$/))) {
      const mod = course.modules[+m[1] - 1];
      if (mod && mod.quizTrainer) return {title: 'Check your understanding: ' + mod.short, paragraphs: mod.quizTrainer.paragraphs};
    }
    if ((m = key.match(/^case-(\d+)$/))) {
      const s = course.caseStudy && course.caseStudy.sections[+m[1]];
      if (s && s.trainer) return {title: s.title, paragraphs: s.trainer.paragraphs};
    }
    return null;
  }

  function minutes(paras){
    const words = paras.join(' ').split(/\s+/).length;
    return Math.max(1, Math.round(words / 150));
  }

  function panel(key, compact){
    const s = script(key);
    if (!s || !s.paragraphs || !s.paragraphs.length) return '';
    return `<section class="trainer${compact ? ' compact' : ''}" data-trainer-key="${esc(key)}" aria-label="Trainer explanation: ${esc(s.title)}">
      <div class="trainer-head"><div><span class="eyebrow" style="margin:0">Your trainer</span><h3>${esc(s.title)}</h3><p>Explain → example → reflect → next action · about ${minutes(s.paragraphs)} min</p></div>
      <div class="trainer-actions"><button type="button" data-trainer="listen">${speaking === key ? 'Pause' : 'Listen to trainer'}</button><button type="button" data-trainer="replay">Replay</button><button type="button" data-trainer="stop">Stop</button><button type="button" data-trainer="check">Sound check</button></div></div>
      <p class="status" role="status"></p>
      <details><summary>Speaker notes · full trainer transcript</summary><div class="script">${s.paragraphs.map((p, i) => `<p data-para="${i}">${esc(p)}</p>`).join('')}</div></details>
    </section>`;
  }

  function setStatus(key, text){
    document.querySelectorAll(`.trainer[data-trainer-key="${CSS.escape(key)}"] .status`).forEach(el => { el.textContent = text; });
  }
  function mark(key, i){
    document.querySelectorAll('.trainer .script p.speaking').forEach(p => p.classList.remove('speaking'));
    if (i === null) return;
    document.querySelectorAll(`.trainer[data-trainer-key="${CSS.escape(key)}"] .script p[data-para="${i}"]`).forEach(p => p.classList.add('speaking'));
  }
  function refreshButtons(){
    document.querySelectorAll('.trainer').forEach(t => {
      const b = t.querySelector('[data-trainer="listen"]');
      if (b) b.textContent = speaking === t.dataset.trainerKey ? (synth && synth.paused ? 'Resume' : 'Pause') : 'Listen to trainer';
    });
  }

  let run = 0, watchdog = null, live = [];
  function stop(){
    run++; clearTimeout(watchdog);
    const was = speaking; speaking = null; queue = []; live = [];
    if (synth && (synth.speaking || synth.pending || synth.paused)) { synth.cancel(); if (synth.paused) synth.resume(); }
    mark(null, null); refreshButtons();
    if (was) setStatus(was, 'Stopped.');
  }

  function utter(text){
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = (voice && voice.lang) || 'en-US';
    u.rate = 1; u.pitch = 1; u.volume = 1;
    live.push(u); // keep a reference so the browser does not drop the utterance mid-way
    return u;
  }

  function noAudio(key){
    setStatus(key, 'No sound started. Check that your device is not muted, then try Sound check. If it stays silent, open the speaker notes below to read along.');
  }

  function speak(key, from){
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { setStatus(key, 'Speech is not available in this browser. Open the speaker notes to read the transcript.'); return; }
    const s = script(key); if (!s) return;
    const busy = synth.speaking || synth.pending || synth.paused;
    stop();
    const id = run;
    speaking = key;
    queue = [];
    s.paragraphs.forEach((p, i) => { if (i >= (from || 0)) chunks(p).forEach(t => queue.push({t, i})); });
    let started = false;
    const next = () => {
      if (id !== run || speaking !== key) return;
      const item = queue.shift();
      if (!item) { speaking = null; mark(null, null); refreshButtons(); setStatus(key, 'Finished. Replay any time.'); return; }
      const u = utter(item.t);
      u.onstart = () => { if (id !== run) return; started = true; clearTimeout(watchdog); mark(key, item.i); setStatus(key, `Speaking part ${item.i + 1} of ${s.paragraphs.length}`); };
      u.onend = () => { if (id === run) next(); };
      u.onerror = e => {
        if (id !== run) return; // an older, cancelled utterance
        if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
        if (e && e.error === 'not-allowed') { speaking = null; refreshButtons(); setStatus(key, 'Your browser blocked the audio. Tap Listen to trainer again to allow it.'); return; }
        next(); // skip a chunk the engine could not say and carry on
      };
      synth.speak(u);
      if (synth.paused) synth.resume();
    };
    refreshButtons();
    setStatus(key, 'Starting the trainer…');
    // Chrome drops a speak() issued straight after cancel(), so wait a moment only when something was playing.
    if (busy) setTimeout(() => { if (id === run) next(); }, 120); else next();
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (id !== run || started) return;
      if (synth.speaking) return; // engine is working but gave no start event
      voice = null; // retry once with the browser's default voice
      const retryKey = key; stop();
      speaking = retryKey; const id2 = run; refreshButtons();
      const u = utter('Starting the trainer.');
      u.onstart = () => { if (id2 === run) { speaking = null; speak(retryKey, from); } };
      u.onerror = () => { if (id2 === run) { speaking = null; refreshButtons(); noAudio(retryKey); } };
      synth.speak(u);
      watchdog = setTimeout(() => { if (id2 === run && !synth.speaking) { speaking = null; refreshButtons(); noAudio(retryKey); } }, 3000);
    }, 2500);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-trainer]'); if (!b) return;
    const box = b.closest('.trainer'), key = box && box.dataset.trainerKey; if (!key) return;
    const act = b.dataset.trainer;
    if (act === 'listen') {
      if (speaking === key && synth && (synth.speaking || synth.paused)) {
        if (synth.paused) { synth.resume(); setStatus(key, 'Resumed.'); } else { synth.pause(); setStatus(key, 'Paused.'); }
        refreshButtons(); return;
      }
      speak(key, 0);
    }
    if (act === 'replay') speak(key, 0);
    if (act === 'stop') stop();
    if (act === 'check') {
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { setStatus(key, 'Speech is not available in this browser.'); return; }
      stop();
      const id = run, u = utter('Sound check. If you can hear this, your trainer audio is working.');
      let ok = false;
      u.onstart = () => { ok = true; setStatus(key, 'Playing a short sound check…'); };
      u.onend = () => { if (id === run) setStatus(key, 'Sound check finished. If you heard nothing, check your volume or device output.'); };
      u.onerror = e => { if (id === run && !(e && /interrupted|canceled/.test(e.error))) noAudio(key); };
      setStatus(key, 'Playing a short sound check…');
      synth.speak(u);
      watchdog = setTimeout(() => { if (id === run && !ok && !synth.speaking) noAudio(key); }, 3000);
    }
  });

  window.Trainer = {
    configure(c, a){ course = c; api = a; },
    panel,
    pageChanged(){ stop(); },
    slideChanged(){ if (speaking && /^slide-/.test(speaking)) stop(); },
    update(){ refreshButtons(); }
  };
  window.addEventListener('pagehide', stop);
})();
