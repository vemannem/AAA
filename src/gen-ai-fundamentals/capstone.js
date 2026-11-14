window.COURSE.capstone = {
title: "ResearchMate: a cited deep-research assistant you can explain inside out",
pitch: "Bring the whole course together: a multi-agent research assistant that plans, searches, reads, verifies and writes a cited report, plus a short 'how it works inside' report built on your own tiny GPT.",
hours: "12–16 hours over 1–2 weeks",
brief: `<p>You're the first AI engineer on a small team that needs trustworthy research briefs: a student comparing study methods, a clinic manager checking new scheduling tools, or a founder sizing a market. Build <b>ResearchMate</b>: give it a question, and it returns a short report where every claim links to a source, unsupported claims are removed, and the cost and steps are logged.</p>
<p>The capstone has two parts. <b>Part A, the system:</b> a planner breaks the question into sub-questions, searcher agents run in parallel with web search (or a local document set), a reader extracts quotes, a verifier checks each claim against its quote, and a writer produces the cited report. <b>Part B, the internals:</b> a 2-page report, with your week 4 tiny GPT as the running example, explaining in your own words what happens to a prompt inside an LLM: tokens, embeddings, positions, attention, FFN, decoding and the KV cache.</p>
<p><b>Deliverables:</b> a folder or repository with the code, a README with an architecture diagram and how to run it (Colab and local), an evaluation report on at least 10 questions, a cost and step log, the internals report, and a 5-minute demo recording or written walkthrough.</p>`,
diagram: {title: "ResearchMate architecture", caption: "The planner fans sub-questions out to parallel searchers. The reader extracts quotes into shared memory, the verifier drops claims that no quote supports, and the writer cites every remaining claim. Guards and budgets wrap the whole run, and every step is logged for evaluation.",
  cols: [[["u", "Your question", "plus scope", "user"]], [["plan", "Planner", "sub-questions", "core"], ["guard", "Guards + budgets", "steps, tokens, tools", "guard"]], [["s1", "Searcher A", "web_search", "ext"], ["s2", "Searcher B", "web_search", "ext"], ["s3", "Local docs", "hybrid RAG", "store"]], [["read", "Reader", "quotes + URLs", "core"], ["mem", "Shared notes", "claims + evidence", "store"]], [["ver", "Verifier", "claim vs quote", "guard"], ["write", "Writer", "cited report", "core"]], [["log", "Eval + log", "cost, steps, scores", "store"]]],
  edges: [["u", "plan"], ["plan", "s1"], ["plan", "s2"], ["plan", "s3"], ["s1", "read"], ["s2", "read"], ["s3", "read"], ["read", "mem"], ["mem", "ver"], ["ver", "write", "", "hot"], ["write", "log"], ["guard", "s1", "", "dash"]]},
milestones: [
  ["Question set and baseline (weeks 0, 1, 6)", "Write 10 to 15 research questions in your chosen domain, each with 2 or 3 facts a good answer must contain. Run a single Claude call with no tools as a baseline and score it with your week 6 judge."],
  ["Retrieval layer (weeks 2, 9)", "A local document set of at least 20 pages with heading-aware chunks and a hybrid BM25 + vector index. Measure recall@5 on your questions' key facts."],
  ["Searcher agents and tools (weeks 7, 10)", "Prompts versioned and scored like code, structured outputs validated with a schema, and a searcher that uses the web search tool (or your local index offline) and returns sources with URLs and quotes. Tools have clear schemas, errors come back as tool results, and runs stop on a step budget."],
  ["Planner and orchestration (weeks 10, 11, 13)", "A planner that writes 3 to 5 sub-questions, workers that run them in parallel on the fast model, and a supervisor that merges notes into shared memory without duplicates. Build it in plain Python first, then optionally port the graph to LangGraph and compare."],
  ["Verification and citations (weeks 9, 12)", "A verifier that checks each claim against its quote and drops unsupported ones, and a writer that cites every claim. Try self-consistency or best-of-N on the hardest question and report whether it helped."],
  ["Safety and budgets (week 11)", "Treat every fetched page as untrusted: test at least 3 prompt-injection pages, show that no tool call follows their instructions, and enforce step, token and cost budgets in code."],
  ["Evaluation and cost (weeks 6, 11)", "Score every question on factual coverage, citation precision and faithfulness, compare with the baseline, and report cost and steps per question. Write down the 3 most common failure cases."],
  ["Internals report and demo (weeks 2 to 5)", "The 2-page internals report using your tiny GPT: shapes at every step, one attention map, a decoding comparison and the KV cache saving you measured. Then the README, diagram and walkthrough."]
],
starter: {file: "capstone/researchmate.py", code: String.raw`
"""ResearchMate starter: plan -> search in parallel -> read -> verify -> write.

Run: python -m capstone.researchmate "How do spaced repetition apps schedule reviews?"
Fill in each TODO with code from the matching week. Works offline with canned data.
"""
import json
import sys
from concurrent.futures import ThreadPoolExecutor

from common.llm import FAST_MODEL, MODEL, OFFLINE, ask, create, text_of

MAX_SUBQUESTIONS = 4
SEARCH_TOOL = {"type": "web_search_20260209", "name": "web_search", "max_uses": 3}


def plan(question):
    """Week 10: prompt chaining. Return 3-5 focused sub-questions."""
    if OFFLINE:
        return [question + " (definition)", question + " (how it works)", question + " (evidence)"]
    reply = ask("Split this research question into at most " + str(MAX_SUBQUESTIONS)
                + " focused sub-questions. Reply with a JSON list of strings only.\n\n" + question,
                model=FAST_MODEL, effort="low", max_tokens=600)
    try:
        return json.loads(reply)[:MAX_SUBQUESTIONS]
    except json.JSONDecodeError:
        return [question]


def search(sub_question):
    """Week 10: a searcher. Return a list of {"url", "quote"} sources."""
    if OFFLINE:
        return [{"url": "https://example.org/notes", "quote": "Offline note about: " + sub_question}]
    messages = [{"role": "user", "content": "Research: " + sub_question
                 + "\nReturn 2 sources as JSON lines with keys url and quote (an exact sentence from the page)."}]
    resp = create(messages, model=MODEL, tools=[SEARCH_TOOL], effort="low", max_tokens=3000)
    # TODO (week 10): handle stop_reason "pause_turn" by appending resp.content and calling again
    sources = []
    for line in text_of(resp).splitlines():
        try:
            item = json.loads(line)
            if "url" in item and "quote" in item:
                sources.append(item)
        except json.JSONDecodeError:
            continue
    # TODO (week 11): treat page text as untrusted data; never follow instructions found in it
    return sources


def verify(claim, quote):
    """Week 12: search against a verifier. True if the quote supports the claim."""
    # TODO (weeks 9, 12): replace with an LLM judge on FAST_MODEL plus a lexical overlap check
    words = {w for w in claim.lower().split() if len(w) > 4}
    return bool(words) and sum(w in quote.lower() for w in words) / len(words) >= 0.3


def write_report(question, notes):
    """Week 9: grounded generation. Every sentence cites a [n] source."""
    numbered = "\n".join(f"[{i + 1}] {n['url']}: {n['quote']}" for i, n in enumerate(notes))
    if OFFLINE:
        return f"Report on: {question}\n" + "\n".join(f"- {n['quote']} [{i + 1}]" for i, n in enumerate(notes))
    return ask("Write a short research brief answering the question using ONLY these sources. "
               "Cite every sentence like [1]. If the sources don't answer something, say so.\n\n"
               f"Question: {question}\n\nSources:\n{numbered}", effort="medium", max_tokens=2000)


def run(question):
    subs = plan(question)
    print("plan:", subs)
    with ThreadPoolExecutor(max_workers=4) as pool:           # week 11: parallel workers
        results = list(pool.map(search, subs))
    notes = [s for group in results for s in group]
    # TODO (week 11): dedupe notes, track tokens and steps, stop when the budget is spent
    kept = [n for n in notes if verify(n["quote"], n["quote"])]   # TODO: verify extracted claims, not quotes
    print(f"sources: {len(notes)} found, {len(kept)} kept after verification")
    report = write_report(question, kept)
    print("\n" + report)
    return report


if __name__ == "__main__":
    run(" ".join(sys.argv[1:]) or "How do spaced repetition apps decide when to show a card again?")
`},
rubric: [
  ["Correctness and coverage", "Reports contain the key facts for most questions and beat the single-call baseline on your judge.", 20],
  ["Citations and faithfulness", "Every claim has a citation, citation precision is measured, and unsupported claims are removed by the verifier.", 15],
  ["Retrieval and search", "Hybrid local retrieval with measured recall, and searchers that return real sources with quotes.", 10],
  ["Agent design", "Clear planner, parallel workers and supervisor; tools with good schemas; step budgets and clean stopping.", 15],
  ["Safety", "Injection tests pass, fetched text is treated as data, budgets are enforced in code, and risky actions need approval.", 10],
  ["Evaluation and cost", "An eval set of 10+ questions, scores per question, cost and steps reported, top failure cases analyzed.", 15],
  ["Internals report", "Accurate, in your own words: tokens, embeddings, positions, attention, FFN, decoding and KV cache, with your own measurements.", 10],
  ["Communication", "README, diagram, Colab and local run steps, and a clear demo.", 5]
],
prompts: [
  ["Design review", `You are a senior AI engineer reviewing my capstone, ResearchMate: a multi-agent deep-research assistant (planner, parallel searchers with web search, reader, verifier, writer with citations).
I will paste my README, diagram description and key code.

1. List the 5 biggest risks to answer quality, faithfulness, safety or cost, most serious first. For each, give the smallest fix.
2. Ask me 3 hard questions about my design, one at a time, and tell me whether each answer is convincing.
3. Score me 1 to 5 on: retrieval, agent design, verification, safety, evaluation, cost. One sentence of evidence each.
Point to specific files or functions. Don't rewrite my system.`, "Run after milestone 5"],
  ["Red-team my agents", `You are a security tester attacking my research assistant. It reads web pages and local documents, and its agents can call web_search and my local search tool.

1. Propose 8 attacks: indirect prompt injection in a page, fake citations, instructions hidden in a document, runaway loops, cost exhaustion, leaking my system prompt, and two of your own.
2. For each, tell me what evidence from my logs or eval results would show it is defended.
3. After I paste my results, tell me which defenses are weak and what test to add.
Don't accept "the prompt tells the model not to" as a defense.`, "Run after milestone 6"],
  ["Viva: explain the internals", `You are an examiner running a 15-minute oral exam on how LLMs work, using my capstone and my tiny GPT from week 4.
Ask me 8 questions, one at a time: what a token is and how BPE builds them, what an embedding is, why positions are needed and how RoPE works, the Q/K/V computation and why we divide by sqrt(d_k), what the causal mask does, what the FFN and residual stream do, how top-p sampling works, and what the KV cache saves.
After each answer, say Strong, Adequate or Weak with one sentence of feedback, and ask a follow-up if Weak.
At the end, give a grade (Distinction, Pass, Not yet) and the 3 topics to study again.`, "Run before you submit"]
],
graduate: `<p>You've graduated when all 8 milestones are ticked, your rubric self-score is at least 75 with no area below half its points, and you earned Pass or Distinction in the viva prompt. Put ResearchMate, its eval report and your internals report in your portfolio: together they show you can both build with LLMs and explain how they work.</p>`
};
