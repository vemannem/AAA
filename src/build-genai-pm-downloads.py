#!/usr/bin/env python3
"""Rebuild every download for the Generative AI in Product Management course from course-data.json.

Run from the repo root:  python3 src/build-genai-pm-downloads.py
Needs reportlab (PDFs, QR code) and python-pptx (slide deck).
"""
import csv, html, json, os, re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gen-ai-product-management')
DATA = json.load(open(os.path.join(ROOT, 'course-data.json'), encoding='utf-8'))
SITE = 'https://aaa-learning.vercel.app/gen-ai-product-management/'
COMMUNITY = 'https://chat.whatsapp.com/IA5P0yMb7c9AuLn22ND2t4'
TITLE = 'Generative AI in Product Management'
ACCENT = colors.HexColor('#1f56c9')
INK = colors.HexColor('#151a24')
MUTED = colors.HexColor('#5b6475')
LINE = colors.HexColor('#d9dee8')
SOFT = colors.HexColor('#f2f5fb')
CASE = DATA['caseStudy']
MODS = DATA['modules']
PROMPTS = DATA['prompts']


def out(name):
    return os.path.join(ROOT, name)


def pad(n):
    return f'{n:02d}'

# ---------------------------------------------------------------- fonts & styles
FONT_DIR = '/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('Sans', FONT_DIR + 'DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Sans-Bold', FONT_DIR + 'DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Mono', FONT_DIR + 'DejaVuSansMono.ttf'))
pdfmetrics.registerFontFamily('Sans', normal='Sans', bold='Sans-Bold', italic='Sans', boldItalic='Sans-Bold')

S = {
    'title': ParagraphStyle('title', fontName='Sans-Bold', fontSize=24, leading=29, textColor=INK, spaceAfter=8),
    'eyebrow': ParagraphStyle('eyebrow', fontName='Sans-Bold', fontSize=8, leading=11, textColor=ACCENT, spaceAfter=4),
    'h1': ParagraphStyle('h1', fontName='Sans-Bold', fontSize=17, leading=21, textColor=INK, spaceBefore=6, spaceAfter=6),
    'h2': ParagraphStyle('h2', fontName='Sans-Bold', fontSize=12.5, leading=16, textColor=INK, spaceBefore=8, spaceAfter=4),
    'h3': ParagraphStyle('h3', fontName='Sans-Bold', fontSize=10, leading=13, textColor=INK, spaceBefore=6, spaceAfter=2),
    'body': ParagraphStyle('body', fontName='Sans', fontSize=9.3, leading=13.2, textColor=INK, spaceAfter=5, alignment=TA_LEFT),
    'small': ParagraphStyle('small', fontName='Sans', fontSize=8, leading=11, textColor=MUTED, spaceAfter=4),
    'bullet': ParagraphStyle('bullet', fontName='Sans', fontSize=9.3, leading=13, textColor=INK, leftIndent=12, bulletIndent=2, spaceAfter=2),
    'mono': ParagraphStyle('mono', fontName='Mono', fontSize=8, leading=11, textColor=INK, backColor=SOFT, borderPadding=6, spaceBefore=4, spaceAfter=8),
    'cell': ParagraphStyle('cell', fontName='Sans', fontSize=8, leading=10.5, textColor=INK),
    'cellh': ParagraphStyle('cellh', fontName='Sans-Bold', fontSize=8, leading=10.5, textColor=INK),
}


def P(text, style='body'):
    return Paragraph(escape(str(text)), S[style])


def PB(label, text, style='body'):
    return Paragraph(f'<b>{escape(label)}</b> {escape(str(text))}', S[style])


def bullets(items, style='bullet'):
    return [Paragraph(escape(str(i)), S[style], bulletText='•') for i in items]


def numbered(items):
    return [Paragraph(escape(str(i)), S['bullet'], bulletText=f'{n}.') for n, i in enumerate(items, 1)]


def table(headers, rows, widths=None):
    data = [[Paragraph(escape(str(h)), S['cellh']) for h in headers]] + [[Paragraph(escape(str(c)), S['cell']) for c in r] for r in rows]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SOFT), ('GRID', (0, 0), (-1, -1), 0.5, LINE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    return t


def doc(name, story, title, pagesize=A4):
    def footer(canvas, d):
        canvas.saveState()
        canvas.setFont('Sans', 7.5)
        canvas.setFillColor(MUTED)
        w, _ = pagesize
        canvas.drawString(18 * mm, 10 * mm, f'AAA Academy · {TITLE} · {title}')
        canvas.drawRightString(w - 18 * mm, 10 * mm, f'{d.page}')
        canvas.restoreState()
    d = SimpleDocTemplate(out(name), pagesize=pagesize, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm,
                          title=f'{title} · {TITLE}', author='AAA Academy', subject=TITLE)
    d.build(story, onFirstPage=footer, onLaterPages=footer)


def cover(eyebrow, title, intro):
    return [P(eyebrow, 'eyebrow'), P(title, 'title'), P(intro), P(f'Course site: {SITE}', 'small'), Spacer(1, 8)]


def rice(st):
    return st['reach'] * st['impact'] * (st['confidence'] / 100) / st['effort']

# ---------------------------------------------------------------- prompt reference
def prompt_md():
    own = [p for p in PROMPTS if not p['extension']]
    ext = [p for p in PROMPTS if p['extension']]
    lines = [f'# {TITLE}: prompt reference', '', f'AAA Academy · {len(own)} course workflows and {len(ext)} additional practice templates.', '',
             f'Course site: {SITE}', '',
             'How to use: choose the task you need, replace the bracketed context with your own product, attach approved source files and run the prompt in your chosen AI tool. Review every output against the checks before you rely on it.', '']
    for m in MODS:
        lines += [f'## Module {pad(m["id"])}: {m["title"]}', '', m['subtitle'], '']
        for p in [p for p in PROMPTS if p['module'] == m['id']]:
            kind = 'Practice template' if p['extension'] else 'Course workflow'
            lines += [f'### {p["id"]} · {p["title"]}', '', f'*{kind}*', '', f'**When to use:** {p["when"]}', '', f'**What to attach:** {p["inputs"]}', '',
                      '**Reusable prompt (replace the {{fields}} with your context):**', '', '```text', p['adapted'], '```', '']
            if p.get('original'):
                lines += ['**Course case prompt (SkillForge Academy):**', '', '```text', p['original'], '```', '']
            lines += [f'**Output:** {p["output"]}', '', f'**Review before using:** {p["checks"]}', '', f'**In practice:** {p["example"]}', '']
    lines += ['---', '', 'Reusable fields: {{domain}}, {{product}}, {{audience}}, {{goal}}, {{constraint}}. On the course site, these fill in from your product context.', '']
    return '\n'.join(lines)


def prompt_html():
    def block(p):
        kind = 'Practice template' if p['extension'] else 'Course workflow'
        orig = f'<h4>Course case prompt (SkillForge Academy)</h4><pre>{html.escape(p["original"])}</pre>' if p.get('original') else ''
        return (f'<article class="prompt"><div class="pid">{p["id"]} · {kind}</div><h3>{html.escape(p["title"])}</h3>'
                f'<p><b>When to use:</b> {html.escape(p["when"])}</p><p><b>What to attach:</b> {html.escape(p["inputs"])}</p>'
                f'<h4>Reusable prompt</h4><pre>{html.escape(p["adapted"])}</pre>{orig}'
                f'<p><b>Output:</b> {html.escape(p["output"])}</p><p class="check"><b>Review before using:</b> {html.escape(p["checks"])}</p>'
                f'<p class="muted"><b>In practice:</b> {html.escape(p["example"])}</p></article>')
    body = ''.join(f'<section><h2>Module {pad(m["id"])}: {html.escape(m["title"])}</h2><p class="muted">{html.escape(m["subtitle"])}</p>'
                   + ''.join(block(p) for p in PROMPTS if p['module'] == m['id']) + '</section>' for m in MODS)
    toc = ''.join(f'<li><a href="#p{p["id"]}">{p["id"]} · {html.escape(p["title"])}</a></li>' for p in PROMPTS)
    body = re.sub(r'<article class="prompt"><div class="pid">(\w+)', r'<article class="prompt" id="p\1"><div class="pid">\1', body)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prompt reference · {TITLE} · AAA Academy</title>
<style>
:root{{--bg:#f6f7fb;--panel:#fff;--ink:#151a24;--muted:#5b6475;--line:#d9dee8;--accent:#1f56c9;--soft:#eef2fa}}
@media (prefers-color-scheme:dark){{:root{{--bg:#0f131b;--panel:#171c27;--ink:#e8ecf4;--muted:#a3acbd;--line:#2a3142;--accent:#6f9bff;--soft:#1d2433}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}}
main{{max-width:880px;margin:0 auto;padding:32px 16px 64px}}a{{color:var(--accent)}}
.eyebrow{{color:var(--accent);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}}
h1{{font-size:clamp(28px,5vw,40px);line-height:1.15;margin:6px 0 12px}}h2{{margin:42px 0 4px;font-size:24px}}h3{{margin:4px 0 10px}}h4{{margin:14px 0 6px;font-size:14px}}
.prompt{{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:16px 0}}
.pid{{font-size:12px;color:var(--muted);font-weight:700;letter-spacing:.04em}}
pre{{white-space:pre-wrap;background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font:13px/1.55 ui-monospace,Menlo,Consolas,monospace}}
.muted{{color:var(--muted)}}.check{{border-left:3px solid var(--accent);padding-left:10px}}
details{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin:18px 0}}summary{{cursor:pointer;font-weight:700}}
ol{{columns:2;column-gap:28px;font-size:14px}}@media (max-width:640px){{ol{{columns:1}}}}
@media print{{body{{background:#fff;color:#000}}details{{display:none}}.prompt{{break-inside:avoid}}}}
</style></head><body><main>
<div class="eyebrow">AAA Academy · {TITLE}</div><h1>Your prompt reference.</h1>
<p>{sum(1 for p in PROMPTS if not p["extension"])} course workflows and {sum(1 for p in PROMPTS if p["extension"])} additional practice templates. Replace the <code>{{{{fields}}}}</code> with your own product context, attach approved source files, run the prompt in your chosen AI tool, and review the output before you rely on it.</p>
<p class="muted">Course site: <a href="{SITE}">{SITE}</a> · Community: <a href="{COMMUNITY}">AAA Academy on WhatsApp</a></p>
<details><summary>All 28 prompts</summary><ol>{toc}</ol></details>
{body}
</main></body></html>'''


def prompt_pdf():
    st = cover('AAA ACADEMY · PROMPT HANDBOOK', 'Your prompt reference.',
               f'{sum(1 for p in PROMPTS if not p["extension"])} course workflows and {sum(1 for p in PROMPTS if p["extension"])} additional practice templates for product managers and product owners. Replace the {{{{fields}}}} with your own product context, run the prompt in your chosen AI tool and review the output before using it.')
    for m in MODS:
        st += [P(f'MODULE {pad(m["id"])}', 'eyebrow'), P(m['title'], 'h1'), P(m['subtitle'], 'small')]
        for p in [p for p in PROMPTS if p['module'] == m['id']]:
            kind = 'Practice template' if p['extension'] else 'Course workflow'
            st += [P(f'{p["id"]} · {p["title"]}  ({kind})', 'h2'), PB('When to use:', p['when']), PB('What to attach:', p['inputs']),
                   P('Reusable prompt', 'h3'), Paragraph(escape(p['adapted']).replace('\n', '<br/>'), S['mono'])]
            if p.get('original'):
                st += [P('Course case prompt (SkillForge Academy)', 'h3'), Paragraph(escape(p['original']).replace('\n', '<br/>'), S['mono'])]
            st += [PB('Output:', p['output']), PB('Review before using:', p['checks']), PB('In practice:', p['example'], 'small'), Spacer(1, 6)]
        st.append(PageBreak())
    doc('prompt-reference.pdf', st[:-1], 'Prompt reference')

# ---------------------------------------------------------------- business case
def case_md():
    c = CASE
    pr = c['program']
    L = [f'# {c["name"]}', '', c['tagline'], '', f'*{c["status"]}. Sources reviewed {c["reviewed"]}. Prices, personas, targets, RICE inputs and financial results are illustrative.*', '',
         '## The product', '', c['summary'], '',
         f'- Duration: {pr["duration"]}', f'- Workload: {pr["workload"]}', f'- Pilot capacity: {pr["capacity"]} seats', f'- Price hypothesis: {pr["price"]} {pr["currency"]}', f'- Prerequisites: {pr["prerequisites"]}', '']
    for i, s in enumerate(c['sections']):
        L += [f'## {s["title"]}', '', f'*Module {s["stage"]} · {s["status"]}*', '']
        if s.get('intro'):
            L += [s['intro'], '']
        L += [f'- {p}' for p in s.get('points', [])] + ([''] if s.get('points') else [])
        if s.get('table'):
            t = s['table']
            L += ['| ' + ' | '.join(t['headers']) + ' |', '|' + '---|' * len(t['headers'])] + ['| ' + ' | '.join(str(x).replace('|', '/') for x in r) + ' |' for r in t['rows']] + ['']
        if i == 7:
            for st in c['stories']:
                L += [f'### {st["id"]} · {st["title"]}', '', st['story'], '', f'**Business value:** {st["value"]}', '', 'Acceptance criteria:', ''] + [f'{n}. {x}' for n, x in enumerate(st['criteria'], 1)] + ['', f'**Dependencies:** {st["dependencies"]}', '']
        if i == 8:
            L += ['| Story | Reach | Impact | Confidence | Effort (person-months) | RICE |', '|---|---|---|---|---|---|']
            L += [f'| {st["id"]} · {st["title"]} | {st["reach"]} | {st["impact"]} | {st["confidence"]}% | {st["effort"]} | {rice(st):.1f} |' for st in sorted(c['stories'], key=rice, reverse=True)] + ['']
        L += [f'**Decision / next validation:** {s["decision"]}', '']
    L += ['## Sources', ''] + [f'- [{r["title"]}]({r["url"]}): {r["note"]}' for r in DATA['resources']] + ['', f'AAA Academy · {SITE}#case', '']
    return '\n'.join(L)


def case_pdf():
    c = CASE
    pr = c['program']
    st = cover('AAA ACADEMY · WORKED PRODUCT JOURNEY', c['name'], c['tagline'])
    st += [P(f'{c["status"]}. Sources reviewed {c["reviewed"]}. Prices, personas, targets, RICE inputs and financial results are illustrative.', 'small'),
           P('The product', 'h1'), P(c['summary']),
           table(['Duration', 'Workload', 'Pilot capacity', 'Price hypothesis', 'Prerequisites'], [[pr['duration'], pr['workload'], f'{pr["capacity"]} seats', f'{pr["price"]} {pr["currency"]}', pr['prerequisites']]])]
    W = 174 * mm
    for i, s in enumerate(c['sections']):
        st += [Spacer(1, 10), P(f'MODULE {pad(s["stage"])} · {s["status"].upper()}', 'eyebrow'), P(s['title'], 'h1')]
        if s.get('intro'):
            st.append(P(s['intro']))
        st += bullets(s.get('points', []))
        if s.get('table'):
            t = s['table']
            st += [Spacer(1, 4), table(t['headers'], t['rows'], [W / len(t['headers'])] * len(t['headers']))]
        if i == 7:
            for x in c['stories']:
                st.append(KeepTogether([P(f'{x["id"]} · {x["title"]}', 'h3'), P(x['story']), PB('Business value:', x['value'])] + numbered(x['criteria']) + [PB('Dependencies:', x['dependencies'], 'small')]))
        if i == 8:
            st += [Spacer(1, 4), table(['Story', 'Reach', 'Impact', 'Confidence', 'Effort PM', 'RICE'],
                                       [[f'{x["id"]} · {x["title"]}', x['reach'], x['impact'], f'{x["confidence"]}%', x['effort'], f'{rice(x):.1f}'] for x in sorted(c['stories'], key=rice, reverse=True)],
                                       [W * .44, W * .1, W * .1, W * .13, W * .11, W * .12])]
        st += [Spacer(1, 4), PB('Decision / next validation:', s['decision'])]
    st += [PageBreak(), P('Sources', 'h1')] + [Paragraph(f'<b>{escape(r["title"])}</b>: {escape(r["note"])}<br/><font color="#1f56c9">{escape(r["url"])}</font>', S['body']) for r in DATA['resources']]
    doc('academic-case-study.pdf', st, 'Worked academic business case')


def prd_pdf():
    c, s, pr = CASE, CASE['sections'][0], CASE['program']
    st = [P('AAA ACADEMY · ONE-PAGE COURSE PRD', 'eyebrow'), P('SkillForge Academy: Data Science + Generative AI', 'h1'),
          P(f'{s["status"]}. Every target below is a hypothesis to validate, not an observed result.', 'small'),
          table(['Duration', 'Workload', 'Pilot capacity', 'Price hypothesis', 'Prerequisites'], [[pr['duration'], pr['workload'], f'{pr["capacity"]} seats', f'{pr["price"]} {pr["currency"]}', pr['prerequisites']]]),
          P('Problem', 'h2'), P(s['intro']), P('Scope', 'h2')] + bullets(s['points'])
    t = s['table']
    st += [P('Success measures', 'h2'), table(t['headers'], t['rows'], [32 * mm, 52 * mm, 90 * mm]), P('Next validation', 'h2'), P(s['decision']),
           P(f'Full worked case: {SITE}#case', 'small')]
    doc('course-prd.pdf', st, 'One-page course PRD')

# ---------------------------------------------------------------- trainer notes
def trainer_items():
    g = DATA['trainerGuides']
    yield 'Course overview', g['overview']
    for m in MODS:
        yield f'Module {pad(m["id"])}: {m["title"]}', None
        for i, sl in enumerate(m['slides'], 1):
            yield f'Slide {i}: {sl["title"]}', sl['trainer']
        yield f'Practice: {m["lab"]["title"]}', m['lab']['trainer']
        yield f'Knowledge check: {m["short"]}', m['quizTrainer']
        for p in [p for p in PROMPTS if p['module'] == m['id']]:
            yield f'Prompt {p["id"]}: {p["title"]}', p['trainer']
    yield 'Worked business case', None
    for s in CASE['sections']:
        yield s['title'], s['trainer']
    yield 'Practice lab, LMS prototype and resources', None
    for k, label in [('library', 'Prompt reference'), ('rice', 'RICE prioritization'), ('data', 'Course analytics'), ('revenue', 'Revenue model'), ('scenario', 'Scenario explorer'),
                     ('capstone', 'Capstone review'), ('lmsCatalog', 'LMS: course discovery'), ('lmsLearning', 'LMS: learner workspace'), ('resources', 'Course materials')]:
        yield label, g[k]


def trainer_md():
    L = [f'# {TITLE}: trainer speaker notes', '', 'AAA Academy · the same scripts the course site reads aloud with "Listen to trainer".', '', f'Course site: {SITE}', '']
    for title, t in trainer_items():
        if t is None:
            L += [f'## {title}', '']
        else:
            L += [f'### {title}', ''] + [p + '\n' for p in t['paragraphs']]
    return '\n'.join(L)


def trainer_pdf():
    st = cover('AAA ACADEMY · TRAINER SPEAKER NOTES', 'Trainer scripts for every step.',
               'The same scripts the course site reads aloud with "Listen to trainer": each slide, prompt, practice activity, knowledge check, business-case step and lab.')
    first = True
    for title, t in trainer_items():
        if t is None:
            if not first:
                st.append(PageBreak())
            st.append(P(title, 'h1'))
            first = False
        else:
            st.append(KeepTogether([P(title, 'h3')] + [P(p) for p in t['paragraphs'][:1]]))
            st += [P(p) for p in t['paragraphs'][1:]]
    doc('trainer-notes.pdf', st, 'Trainer speaker notes')

# ---------------------------------------------------------------- slides
def slides_pdf():
    from reportlab.pdfgen import canvas
    W, H = landscape(A4)
    cv = canvas.Canvas(out('course-slides.pdf'), pagesize=(W, H))
    cv.setTitle(f'Course slides · {TITLE}')
    cv.setAuthor('AAA Academy')
    hexes = ['#1f56c9', '#0f8b8d', '#b4541f', '#7a4cc2', '#2f7d3b', '#b0306a']

    def wrap(text, font, size, width):
        words, lines, cur = text.split(), [], ''
        for w in words:
            t = (cur + ' ' + w).strip()
            if pdfmetrics.stringWidth(t, font, size) <= width:
                cur = t
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines

    def frame(color, left, right):
        cv.setFillColor(colors.white)
        cv.rect(0, 0, W, H, stroke=0, fill=1)
        cv.setFillColor(colors.HexColor(color))
        cv.rect(0, H - 8, W, 8, stroke=0, fill=1)
        cv.setFont('Sans-Bold', 8)
        cv.setFillColor(MUTED)
        cv.drawString(40, 26, left)
        cv.drawRightString(W - 40, 26, right)

    def text_block(lines, x, y, font, size, lead, color=INK):
        cv.setFont(font, size)
        cv.setFillColor(color)
        for ln in lines:
            cv.drawString(x, y, ln)
            y -= lead
        return y

    total = sum(len(m['slides']) for m in MODS)
    frame('#1f56c9', 'AAA ACADEMY', 'aaa-learning.vercel.app')
    cv.setFont('Sans-Bold', 11); cv.setFillColor(ACCENT); cv.drawString(60, H - 120, 'AAA ACADEMY · COURSE 3')
    y = text_block([TITLE], 60, H - 170, 'Sans-Bold', 38, 46)
    text_block(['Better product decisions. With AI in the loop.'], 60, y - 10, 'Sans', 20, 26, MUTED)
    text_block([f'6 modules · {total} lesson slides · {len(PROMPTS)} practical prompts · self-paced, about 4½ hours'], 60, 120, 'Sans', 12, 16, MUTED)
    cv.showPage()
    frame('#1f56c9', 'AAA ACADEMY', 'COURSE MAP')
    text_block(['One product journey. Six useful skills.'], 60, H - 90, 'Sans-Bold', 26, 32)
    for i, m in enumerate(MODS):
        x, yy = 60 + (i % 3) * 250, H - 170 - (i // 3) * 170
        cv.setFillColor(colors.HexColor(hexes[i])); cv.rect(x, yy + 8, 4, 100, stroke=0, fill=1)
        cv.setFont('Sans-Bold', 9); cv.drawString(x + 14, yy + 96, f'MODULE {pad(m["id"])} · {m["minutes"]} MIN')
        y2 = text_block(wrap(m['title'], 'Sans-Bold', 14, 210), x + 14, yy + 76, 'Sans-Bold', 14, 18)
        text_block(wrap(m['subtitle'], 'Sans', 10, 210)[:4], x + 14, y2 - 2, 'Sans', 10, 13, MUTED)
    cv.showPage()
    for mi, m in enumerate(MODS):
        col = hexes[mi]
        for i, sl in enumerate(m['slides']):
            frame(col, 'AAA ACADEMY', f'MODULE {pad(m["id"])} · {pad(i + 1)} / {pad(len(m["slides"]))}')
            cv.setFont('Sans-Bold', 10); cv.setFillColor(colors.HexColor(col)); cv.drawString(60, H - 70, f'MODULE {pad(m["id"])} / {m["short"].upper()}')
            y = text_block(wrap(sl['title'], 'Sans-Bold', 30, W - 120), 60, H - 115, 'Sans-Bold', 30, 36)
            y = text_block(wrap(sl['takeaway'], 'Sans', 16, W - 120), 60, y - 6, 'Sans', 16, 21, MUTED)
            y -= 18
            for pt in sl['points']:
                cv.setFillColor(colors.HexColor(col)); cv.circle(66, y + 4, 3.2, stroke=0, fill=1)
                y = text_block(wrap(pt, 'Sans', 14, W - 150), 80, y, 'Sans', 14, 19) - 8
            if sl.get('note'):
                cv.setStrokeColor(LINE); cv.line(60, 92, W - 60, 92)
                text_block(wrap('Note: ' + sl['note'], 'Sans', 9, W - 120)[:3], 60, 76, 'Sans', 9, 12, MUTED)
            cv.showPage()
    frame('#1f56c9', 'AAA ACADEMY', 'KEEP LEARNING')
    y = text_block(['Make it work in your world.'], 60, H - 150, 'Sans-Bold', 30, 36)
    text_block(['Adapt every prompt to your domain, practice in the labs and review your portfolio.', f'Course: {SITE}', 'Community: AAA Academy on WhatsApp'], 60, y - 10, 'Sans', 14, 22, MUTED)
    cv.showPage()
    cv.save()
    return total + 3


def slides_pptx():
    from pptx import Presentation
    from pptx.dml.color import RGBColor
    from pptx.util import Inches, Pt
    hexes = ['1f56c9', '0f8b8d', 'b4541f', '7a4cc2', '2f7d3b', 'b0306a']
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    blank = prs.slide_layouts[6]

    def box(sl, x, y, w, h, text, size, bold=False, color='151a24'):
        tb = sl.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        tf = tb.text_frame
        tf.word_wrap = True
        lines = text if isinstance(text, list) else [text]
        for n, ln in enumerate(lines):
            para = tf.paragraphs[0] if n == 0 else tf.add_paragraph()
            para.text = ln
            para.font.size = Pt(size); para.font.bold = bold; para.font.color.rgb = RGBColor.from_string(color)
            para.space_after = Pt(8)
        return tb

    def bar(sl, col):
        s = sl.shapes.add_shape(1, 0, 0, prs.slide_width, Inches(0.12))
        s.fill.solid(); s.fill.fore_color.rgb = RGBColor.from_string(col); s.line.fill.background()

    def notes(sl, paras):
        sl.notes_slide.notes_text_frame.text = '\n\n'.join(paras)

    sl = prs.slides.add_slide(blank); bar(sl, hexes[0])
    box(sl, .8, 1.4, 11.5, .4, 'AAA ACADEMY · COURSE 3', 13, True, hexes[0])
    box(sl, .8, 2.0, 11.5, 1.6, TITLE, 44, True)
    box(sl, .8, 3.7, 11.5, .8, 'Better product decisions. With AI in the loop.', 22, False, '5b6475')
    notes(sl, DATA['trainerGuides']['overview']['paragraphs'])
    sl = prs.slides.add_slide(blank); bar(sl, hexes[0])
    box(sl, .8, .6, 11.5, .9, 'One product journey. Six useful skills.', 30, True)
    box(sl, .8, 1.7, 11.5, 5, [f'{pad(m["id"])}  {m["title"]}: {m["subtitle"]}' for m in MODS], 16)
    for mi, m in enumerate(MODS):
        for i, s in enumerate(m['slides']):
            sl = prs.slides.add_slide(blank); bar(sl, hexes[mi])
            box(sl, .8, .5, 9, .4, f'MODULE {pad(m["id"])} / {m["short"].upper()}', 12, True, hexes[mi])
            box(sl, 10.3, .5, 2.3, .4, f'{pad(i + 1)} / {pad(len(m["slides"]))}', 12, False, '5b6475')
            box(sl, .8, 1.0, 11.7, 1.3, s['title'], 34, True)
            box(sl, .8, 2.35, 11.7, .8, s['takeaway'], 19, False, '5b6475')
            box(sl, .8, 3.3, 11.7, 3, ['•  ' + p for p in s['points']], 18)
            if s.get('note'):
                box(sl, .8, 6.5, 11.7, .7, 'Note: ' + s['note'], 10, False, '5b6475')
            notes(sl, s['trainer']['paragraphs'])
    sl = prs.slides.add_slide(blank); bar(sl, hexes[0])
    box(sl, .8, 2.0, 11.5, 1.0, 'Make it work in your world.', 36, True)
    box(sl, .8, 3.2, 11.5, 2, ['Adapt every prompt to your domain, practice in the labs and review your portfolio.', f'Course: {SITE}', 'Community: AAA Academy on WhatsApp'], 18, False, '5b6475')
    prs.save(out('course-slides.pptx'))

# ---------------------------------------------------------------- csv, qr
def funnel_csv():
    keys = ['month', 'channel', 'visitors', 'leads', 'paid', 'activated', 'completed', 'refunded', 'price', 'marketing', 'provenance']
    with open(out('sample-course-funnel.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['month', 'channel', 'visitors', 'leads', 'paid_seats', 'activated', 'completed_capstone', 'full_refunds', 'price_usd', 'acquisition_spend_usd', 'provenance'])
        for r in DATA['practiceData']:
            w.writerow([r[k] for k in keys])


def qr_svg():
    from reportlab.graphics import renderSVG
    from reportlab.graphics.barcode.qr import QrCodeWidget
    from reportlab.graphics.shapes import Drawing, Rect
    wdg = QrCodeWidget(COMMUNITY, barLevel='M')
    x1, y1, x2, y2 = wdg.getBounds()
    size = 220
    d = Drawing(size, size)
    d.add(Rect(0, 0, size, size, fillColor=colors.white, strokeColor=None))
    wdg.barWidth = wdg.barHeight = size
    wdg.barFillColor = colors.HexColor('#111111')
    d.add(wdg)
    os.makedirs(out('assets'), exist_ok=True)
    renderSVG.drawToFile(d, out('assets/aaa-community-qr.svg'))


if __name__ == '__main__':
    open(out('prompt-reference.md'), 'w', encoding='utf-8').write(prompt_md())
    open(out('prompt-reference.html'), 'w', encoding='utf-8').write(prompt_html())
    open(out('academic-case-study.md'), 'w', encoding='utf-8').write(case_md())
    open(out('trainer-notes.md'), 'w', encoding='utf-8').write(trainer_md())
    prompt_pdf(); case_pdf(); prd_pdf(); trainer_pdf()
    n = slides_pdf(); slides_pptx(); funnel_csv(); qr_svg()
    print('built downloads; slide pages:', n)
