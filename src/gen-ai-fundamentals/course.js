window.COURSE = {
name: "Gen AI Fundamentals",
hubUrl: "",
tagline: "Learn how large language models really work, then build with them. Python and engineering foundations, then tokens, embeddings and attention from scratch, a tiny GPT you train yourself, decoding, post-training, prompt engineering, LoRA, RAG, agents, multi-agent systems, reasoning models and the main agent frameworks. Fourteen self-paced weeks (week 0 to week 13), every lesson with a diagram, a demo, a lab you can run in Google Colab or on your own machine, a quick check and a tutor prompt.",
weeks: [],
footer: "Gen AI Fundamentals · AAA Academy, Applied Agentic AI. Your progress is saved in this browser only; clearing site data resets it. <a href=\"https://chat.whatsapp.com/IA5P0yMb7c9AuLn22ND2t4\" target=\"_blank\" rel=\"noopener\"><svg class=\"wa-ic\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"#25D366\" d=\"M12 1.5a10.5 10.5 0 0 0-9.06 15.8L1.5 22.5l5.36-1.4A10.5 10.5 0 1 0 12 1.5z\"/><path fill=\"#fff\" transform=\"translate(6.6 6.6) scale(.45)\" d=\"M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z\"/></svg>Join our WhatsApp community</a> to ask questions and learn with other members.",
method: [
  ["1. Read", "A short explanation, the math in plain words, and a real-world example. 10 to 15 minutes."],
  ["2. See it", "Study the diagram, then run the demo script and read what it prints."],
  ["3. Build it", "Do the practice lab in Colab or locally. Each lab has TODOs and a clear 'done when'."],
  ["4. Check it", "Answer the lesson's 3-question quick check, then paste the tutor prompt into Claude."],
  ["5. Prove it", "Pass the weekly quiz (70%+) and the tutor levels before moving on."]
],
audience: `<p>This course is for developers, analysts, students and career-switchers who can write basic Python and want to understand generative AI from the inside, not just call an API. You don't need a GPU or a math degree: every equation is explained in words and then in about ten lines of numpy or PyTorch.</p>
<ul><li><b>You should know:</b> Python functions, lists and dicts, loops, and how to run a script or a notebook.</li>
<li><b>Helpful but not required:</b> high-school algebra, what a matrix is, and a little numpy. Week 1 has a 10-minute numpy warm-up in the setup page.</li>
<li><b>Two halves:</b> weeks 1 to 6 open up the model (tokens, embeddings, attention, the transformer, decoding, training and evaluation). Weeks 8 to 12 build on it (prompting, LoRA, RAG, agents, multi-agent systems, reasoning models and local deployment).</li>
<li><b>Where labs run:</b> every lab runs in Google Colab for free, or locally in a Python virtual environment. Model internals use numpy and PyTorch on a CPU. LLM and agent labs call Claude through the Anthropic SDK and fall back to an offline stub when no API key is set.</li></ul>`,
setup: {
html: `<h3>Option A: Google Colab (nothing to install)</h3>
<ol><li>Open any lesson, go to the <b>Run it</b> tab and press <b>Download lesson files</b>. You get a small <code>.zip</code> with a <code>.ipynb</code> notebook built for that lesson plus its demo and lab scripts. Unzip it first.</li>
<li>Go to <a href="https://colab.research.google.com/" target="_blank" rel="noopener">colab.research.google.com</a>, choose <b>File → Upload notebook</b> and pick the file.</li>
<li>For lessons that call Claude, open the key icon (<b>Secrets</b>) in Colab's left bar, add a secret named <code>ANTHROPIC_API_KEY</code> and turn on notebook access. The notebook's second cell reads it. No key? Those cells run in offline stub mode.</li>
<li>Run the cells top to bottom with <b>Shift+Enter</b>. The first cell installs packages; Colab already has numpy, PyTorch and matplotlib.</li>
<li>Each notebook writes its scripts into folders such as <code>week3/</code>, exactly like the local layout, so the same code works in both places.</li></ol>
<h3>Option B: your own machine</h3>
<p>Make one folder for the whole course. Each lesson's scripts go in <code>weekN/</code>, and LLM lessons import the shared helper in <code>common/llm.py</code>. Always run scripts from the workspace root with <code>python -m</code>, so imports between files work.</p>
<pre class="code" style="border-radius:10px"><code>mkdir genai && cd genai
python3 -m venv .venv && source .venv/bin/activate      # Windows: .venv\\Scripts\\activate
pip install numpy matplotlib "anthropic>=1.0" jupyter
pip install torch --index-url https://download.pytorch.org/whl/cpu   # CPU build is enough
mkdir common week0 week1 week2 week3 week4 week5 week6 week7 week8 week9 week10 week11 week12 week13 capstone
export ANTHROPIC_API_KEY="sk-ant-..."     # optional: LLM labs run offline without it
python -m week1.next_token                # example: run a lesson script</code></pre>
<p>Prefer notebooks locally? Run <code>jupyter notebook</code> in the same folder and open the <code>.ipynb</code> from the zip: it works the same as in Colab. Some lessons list extra packages (for example <code>sentence-transformers</code> or <code>rank-bm25</code>); install them when the lesson's Run it tab says so. Week 13 uses agent frameworks whose dependencies clash (the OpenAI Agents SDK and CrewAI need different versions of the same library), so give each framework lesson its own virtual environment locally; in Colab every notebook is already a fresh runtime.</p>
<h3>The shared Claude helper</h3>
<p>Save this as <code>common/llm.py</code>. Colab notebooks write it for you. It sets the defaults once: the model id, an effort level, automatic refusal fallbacks, token counts, and an offline stub when no key is set.</p>`,
helper: {file: "common/llm.py", code: String.raw`
"""Shared Claude helper for every Gen AI Fundamentals lab.

- one model id, overridable with the CLAUDE_MODEL env var
- a cheaper FAST_MODEL for bulk work such as judges and workers
- an explicit effort level (Claude Opus 5.5 defaults to "medium")
- server-side refusal fallbacks on the main model
- an offline stub when ANTHROPIC_API_KEY is not set, so labs still run
"""
import os
import time

MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-5-5")
FAST_MODEL = os.getenv("CLAUDE_FAST_MODEL", "claude-haiku-5-5")
OFFLINE = not os.getenv("ANTHROPIC_API_KEY")

_client = None


def client():
    """The Anthropic client, created once. None when offline."""
    global _client
    if _client is None and not OFFLINE:
        import anthropic
        _client = anthropic.Anthropic(max_retries=2, timeout=120.0)
    return _client


def create(messages, system=None, model=None, max_tokens=4000, effort="medium", **extra):
    """One Messages API call. Returns the full response (use it for tool loops).

    extra is passed straight to the API (tools, documents...). Current Claude models
    reject temperature, top_p and top_k: steer style with the prompt and effort.
    """
    model = model or MODEL
    params = dict(model=model, max_tokens=max_tokens, messages=messages,
                  output_config={"effort": effort})
    if system:
        params["system"] = system
    params.update(extra)
    if model != FAST_MODEL:
        # Refusal fallbacks are not available on Haiku, so only add them for the main model.
        params["betas"] = ["server-side-fallback-2026-07-01"]
        params["fallbacks"] = "default"
    resp = client().beta.messages.create(**params)
    if resp.stop_reason == "refusal":
        raise RuntimeError("Model declined the request (" + str(resp.stop_details) + ")")
    return resp


def text_of(resp):
    """Join the text blocks of a response (thinking blocks are skipped)."""
    return "".join(b.text for b in resp.content if b.type == "text")


def ask(prompt, system=None, model=None, max_tokens=4000, effort="medium", **extra):
    """Send one user message and return the reply text."""
    if OFFLINE:
        return "[offline stub] I would answer: " + str(prompt)[:160]
    content = prompt if isinstance(prompt, list) else [{"type": "text", "text": prompt}]
    resp = create([{"role": "user", "content": content}], system=system, model=model,
                  max_tokens=max_tokens, effort=effort, **extra)
    return text_of(resp)


def stream(prompt, system=None, model=None, max_tokens=4000, effort="low"):
    """Print the reply as it is generated and return the full text."""
    if OFFLINE:
        out = "[offline stub] streaming would print tokens here."
        for word in out.split():
            print(word, end=" ", flush=True)
            time.sleep(0.05)
        print()
        return out
    params = dict(model=model or MODEL, max_tokens=max_tokens,
                  messages=[{"role": "user", "content": prompt}],
                  output_config={"effort": effort})
    if system:
        params["system"] = system
    with client().messages.stream(**params) as s:
        for piece in s.text_stream:
            print(piece, end="", flush=True)
        final = s.get_final_message()
    print()
    return text_of(final)


def count_tokens(text, model=None):
    """Exact token count from the API, or a rough 4-characters-per-token guess offline."""
    if OFFLINE:
        return max(1, len(text) // 4)
    r = client().messages.count_tokens(model=model or MODEL,
                                       messages=[{"role": "user", "content": text}])
    return r.input_tokens


if __name__ == "__main__":
    print(ask("In one sentence: what does a large language model actually predict?"))
    print("tokens in a short sentence:", count_tokens("Attention is all you need."))
`},
after: `<p>Run <code>python -m common.llm</code>. With a key you get a real answer and an exact token count. Without one you get the offline stub, which is enough for every model-internals lab because those run on numpy and PyTorch alone.</p>
<h3>Numpy warm-up (10 minutes)</h3>
<p>Transformer math is mostly three operations. If these lines make sense, you're ready.</p>
<pre class="code" style="border-radius:10px"><code>import numpy as np
X = np.random.randn(4, 8)          # 4 tokens, each an 8-number vector
W = np.random.randn(8, 3)          # a learned weight matrix
Y = X @ W                          # matrix multiply: (4, 8) @ (8, 3) -> (4, 3)
S = X @ X.T                        # similarity of every token with every token: (4, 4)
P = np.exp(S) / np.exp(S).sum(axis=1, keepdims=True)   # softmax per row: each row sums to 1
print(Y.shape, S.shape, P.sum(axis=1))</code></pre>
<h3>How to use the tutor prompts</h3>
<ul><li>Open a new Claude chat for each check, paste the prompt and answer from memory first.</li>
<li>Say "I don't know" rather than guess. The tutor adapts the next question.</li>
<li>Keep a <code>notes.md</code> per week with the weakest point each tutor names, and redo that check two days later.</li></ul>
<h3>Pace</h3>
<p>Plan 6 to 8 hours a week: about 3 hours of reading and demos, 3 hours of labs, and 1 hour of quick checks, quiz and tutor. Weeks 3 and 4 (attention and the full transformer) are the hardest; give them extra time, because everything after builds on them.</p>`,
planPrompt: `I'm starting a 14-week self-paced course called "Gen AI Fundamentals".
Weeks: 0 Python and software engineering for AI engineers, 1 LLM foundations and pre-training data, 2 Embeddings and positional encoding, 3 Self-attention from scratch, 4 The full transformer, 5 Decoding and text generation, 6 Post-training and evaluation, 7 Prompt engineering and LLM APIs, 8 Adapting LLMs: LoRA and choosing a strategy, 9 Retrieval-augmented generation, 10 Agents, workflows and tools, 11 Multi-agent systems, memory, evaluation and safety, 12 Reasoning models, deep research and local deployment, 13 Agent frameworks (LangChain, LangGraph, OpenAI Agents SDK, CrewAI), then a capstone.

Interview me first, one question at a time (max 6 questions): my background, my Python and math comfort, what I've already done with AI, my hours per week, whether I'll use Colab or my own machine, and my goal (job, project, or curiosity).

Then give me:
1. A personal weekly schedule (which days, how long).
2. The 2 weeks I should spend extra time on, and why.
3. One capstone idea that fits my goal.
Keep it to one screen.`
},
capstone: {}
};
function W(o){ window.COURSE.weeks.push(o); }
