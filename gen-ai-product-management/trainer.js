/* Trainer: a spoken walkthrough for every page, slide, prompt, lab and quiz.
   Uses the browser's built-in speech (no server, no AI model). Scripts come from course-data.json. */
(function(){
  'use strict';
  let course = null, api = null, speaking = null, queue = [], voice = null;
  const synth = window.speechSynthesis;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function pickVoice(){
    if (!synth) return null;
    const vs = synth.getVoices().filter(v => /^en/i.test(v.lang));
    return vs.find(v => /natural|neural|google|samantha|daniel|serena/i.test(v.name)) || vs[0] || null;
  }
  if (synth) { voice = pickVoice(); synth.onvoiceschanged = () => { voice = pickVoice(); }; }

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

  function stop(){
    if (synth) synth.cancel();
    const was = speaking; speaking = null; queue = [];
    mark(null, null); refreshButtons();
    if (was) setStatus(was, 'Stopped.');
  }

  function speak(key, from){
    if (!synth) { setStatus(key, 'Speech is not available in this browser. Open the speaker notes to read the transcript.'); return; }
    const s = script(key); if (!s) return;
    stop();
    speaking = key;
    queue = s.paragraphs.map((p, i) => ({p, i})).slice(from || 0);
    const next = () => {
      if (speaking !== key) return;
      const item = queue.shift();
      if (!item) { speaking = null; mark(null, null); refreshButtons(); setStatus(key, 'Finished. Replay any time.'); return; }
      const u = new SpeechSynthesisUtterance(item.p);
      if (voice) u.voice = voice;
      u.rate = 1; u.pitch = 1;
      u.onstart = () => { mark(key, item.i); setStatus(key, `Speaking ${item.i + 1} of ${s.paragraphs.length}`); };
      u.onend = next;
      u.onerror = () => { if (speaking === key) { setStatus(key, 'Playback stopped. Try Sound check, or read the speaker notes.'); speaking = null; refreshButtons(); } };
      synth.speak(u);
    };
    refreshButtons();
    next();
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-trainer]'); if (!b) return;
    const box = b.closest('.trainer'), key = box && box.dataset.trainerKey; if (!key) return;
    const act = b.dataset.trainer;
    if (act === 'listen') {
      if (speaking === key && synth) {
        if (synth.paused) { synth.resume(); setStatus(key, 'Resumed.'); } else { synth.pause(); setStatus(key, 'Paused.'); }
        refreshButtons(); return;
      }
      speak(key, 0);
    }
    if (act === 'replay') speak(key, 0);
    if (act === 'stop') stop();
    if (act === 'check') {
      if (!synth) { setStatus(key, 'Speech is not available in this browser.'); return; }
      stop();
      const u = new SpeechSynthesisUtterance('Sound check. If you can hear this, your trainer audio is working.');
      if (voice) u.voice = voice;
      u.onend = () => setStatus(key, 'Sound check finished. If you heard nothing, check your volume or device output.');
      setStatus(key, 'Playing a short sound check…');
      synth.speak(u);
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
