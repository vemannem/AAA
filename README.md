# AAA Academy: Applied Agentic AI

Self-paced, week-by-week AI courses. Every lesson has a diagram, a runnable demo, a hands-on lab (Google Colab or your own machine), a quick check, a weekly quiz and a tutor prompt. Learner progress is saved in the browser (localStorage), so the site is fully static: no server, database or sign-in.

## Courses

| Path | Course | Length |
|---|---|---|
| `/` | AAA Academy home page, listing every course | |
| `/gen-ai-fundamentals/` | Gen AI Fundamentals: how LLMs work inside, from tokens and attention to agents and agent frameworks. Capstone: ResearchMate | 14 weeks (week 0 to 13) |
| `/shipgrade-ai/` | ShipGrade AI: taking AI from a notebook demo to a production-grade system. Capstone: HelpDesk Pilot | 6 weeks |
| `/gen-ai-product-management/` | Generative AI in Product Management: AI-assisted product decisions for PMs and product owners, with a worked business case, LMS prototype, practice labs, 28 prompts and spoken trainer notes. Capstone: portfolio review | 6 modules (about 4½ hours) |

## Repository layout

```
index.html                      Home page (built from src/hub.html)
gen-ai-fundamentals/index.html  Gen AI Fundamentals (built from src/gen-ai-fundamentals/)
shipgrade-ai/index.html         ShipGrade AI (single self-contained page, edit it directly)
gen-ai-product-management/      Generative AI in Product Management: index.html, styles.css, app.js, trainer.js and
                                course-data.json (all course content). Downloads (PDF, PPTX, MD, HTML, CSV, QR) are
                                rebuilt with: python3 src/build-genai-pm-downloads.py (needs reportlab, python-pptx)
src/
  shell.js                      Shared page skeleton (doctype, charset, viewport)
  hub.html                      Home page content
  build-hub.js                  Builds index.html
  gen-ai-fundamentals/
    course.js                   Course settings, setup page, planning prompt
    capstone.js                 Capstone project
    weeks/w00.js ... w13.js     One file per week: lessons, labs, quizzes
    weeks/x09_4.js              Extra lesson 9.4, merged into week 9 at build time
    head.html                   Styles and page frame
    app.js                      Rendering, routing, progress, quizzes, notebook downloads
    build.js                    Assembles gen-ai-fundamentals/index.html
    tools.js                    Content checks and lab-file export
    nbrun.py                    Runs exported lesson notebooks end to end
vercel.json                     Static hosting settings
```

## Preview locally

The pages are plain HTML, so any static server works:

```
npx serve .
```

Then open http://localhost:3000. (`python3 -m http.server` works too.)

## Edit and rebuild

Gen AI Fundamentals is generated from the files in `src/gen-ai-fundamentals/`. After changing a week, the capstone or the app:

```
node src/gen-ai-fundamentals/tools.js validate
node src/gen-ai-fundamentals/build.js
node src/build-hub.js
```

`validate` must report 0 errors. `build.js` writes `gen-ai-fundamentals/index.html`; `build-hub.js` writes `index.html`. Commit the rebuilt HTML together with the source change, because the site is served straight from the committed files.

Optional: put words that must never appear in course text, one per line, in `src/gen-ai-fundamentals/.banned-terms` (git-ignored) and `validate` will flag them.

To export every demo and lab script into a folder (course workspace layout):

```
node src/gen-ai-fundamentals/tools.js extract ./labs-out
```

ShipGrade AI is one self-contained page. Edit `shipgrade-ai/index.html` directly.

## Adding a course

1. Put the new course page at `<course-slug>/index.html`.
2. Add a card for it in `src/hub.html` with `href="<course-slug>/"`, then run `node src/build-hub.js`.
3. Commit and push. Vercel redeploys automatically.

## Deploy on Vercel

1. Sign in at vercel.com with GitHub and choose **Add New… → Project**.
2. Import this repository.
3. Framework preset: **Other**. Leave Build Command and Install Command empty, and set Output Directory to `.` (the repository root).
4. Press **Deploy**.

Every push to `main` then redeploys the site, and every other branch or pull request gets its own preview URL. A custom domain can be added under the project's **Settings → Domains**.

## Notes

- Lesson downloads (.zip with the Colab notebook plus demo and lab scripts) are generated in the browser; nothing is uploaded anywhere.
- LLM labs call the Claude API when `ANTHROPIC_API_KEY` is set and fall back to an offline stub when it isn't.
- Progress lives in each learner's browser. Clearing site data, or switching browser or device, starts them from zero.
