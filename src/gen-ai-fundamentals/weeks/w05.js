W({
n: 5, title: "Decoding and Text Generation", short: "Decoding", hours: "6–8 hours",
goal: "Learn how a model's next-token probabilities become text: deterministic search, controlled randomness, and the caching tricks that make generation fast, then put it all in a playground on a real LLM API.",
builds: "Greedy and beam search over a toy model, temperature, top-k, top-p and min-p samplers with penalties, a KV cache with a speed benchmark, and an LLM playground CLI on the Claude API with streaming, effort levels, stop sequences and token usage.",
outcomes: [
  "Turn logits into probabilities and implement greedy decoding, beam search, length normalization and stopping rules.",
  "Implement temperature, top-k, top-p (nucleus), min-p and repetition penalties, and explain what each does to the distribution and its entropy.",
  "Choose decoding settings for a task (extraction, support replies, brainstorming, translation) and make results reproducible with seeds.",
  "Explain the KV cache, compute its memory cost, and tell prefill from decode, time to first token from tokens per second.",
  "Build a multi-turn, streaming LLM playground on the Claude API and steer it with prompts, effort, max_tokens and stop sequences."
],
lessons: [
{
id: "5.1", title: "Greedy decoding and beam search", mins: 55, kicker: "logits to probabilities, greedy, beam width, length normalization, stopping criteria",
focus: "why picking the most likely token at every step does not give the most likely sentence, and when beam search fixes it",
pip: [],
runNote: "Pure numpy and a fixed probability table: runs instantly.",
body: `<p>At every step a language model outputs <b>logits</b>: one raw score per vocabulary token. Softmax turns them into probabilities: <code>p_i = exp(z_i) / Σ_j exp(z_j)</code>, where z_i is token i's logit and the sum runs over the whole vocabulary. The <b>decoding strategy</b> decides which token to append. The model itself is unchanged; only this choice differs, yet it changes the output a lot.</p>
<h4>Greedy decoding</h4>
<p>Greedy takes the single most likely token every time. It's fast, deterministic and often right for short, factual outputs. It has two well-known problems:</p>
<ul><li><b>Short-sighted.</b> The best next token can lead to a weak continuation. If "the" has probability 0.5 but is followed by a flat choice, while "a" (0.4) is almost always followed by "cat" (0.9), then "a cat" (0.36) beats "the cat" (0.15). Greedy never finds it, because it never looks back.</li>
<li><b>Repetitive and bland.</b> Greedy can fall into loops ("the cat sat on the cat sat on...") because once a cycle of locally likely tokens starts, nothing breaks it. Small and mid-sized models show this clearly; it is also why greedy answers can feel generic.</li></ul>
<h4>Beam search</h4>
<p>Beam search keeps the <b>B best partial sequences</b> (B is the <b>beam width</b>) instead of one. At each step it extends every beam by every possible next token, scores each candidate by its total log-probability (the sum of log P of each chosen token), and keeps the top B. Sequences that produce the end-of-sequence token move to a "finished" list. With B = 1 beam search is exactly greedy; larger B explores more but costs B times the compute.</p>
<div class="math">score(y1..yn) = Σ_t log P(y_t | y_1..y_(t−1))       (always ≤ 0; closer to 0 is better)</div>
<h4>Length normalization</h4>
<p>Every extra token adds a negative log-probability, so raw scores favor <i>short</i> outputs: beam search happily stops after three words. The fix is to divide by length raised to a power α (alpha): <code>score / n^α</code>. With α = 0 nothing changes; with α = 1 you rank by average log-probability per token; values around 0.6 to 1.0 are common. The demo shows a beam that picks "the mat ." on raw score, and the lab shows α = 1 picking a full sentence instead.</p>
<h4>When beam search is good, and when it's bad</h4>
<div class="tablewrap"><table><thead><tr><th>Good fit</th><th>Poor fit</th></tr></thead><tbody>
<tr><td>Translation, speech recognition, summarizing into a fixed format: there is roughly one right answer and you want the most probable one.</td><td>Open-ended chat, stories, brainstorming: the most probable text is often dull and repetitive, and human-written text is <i>not</i> the most probable text.</td></tr>
<tr><td>Constrained outputs: codes, labels, structured fields, where you can also restrict the allowed tokens.</td><td>Large chat models at scale: B beams multiply serving cost, and sampling (lesson 5.2) gives more natural replies.</td></tr></tbody></table></div>
<h4>Stopping criteria</h4>
<p>Generation must end somehow. There are three standard rules, and real systems use all of them:</p>
<ol><li><b>End-of-sequence token.</b> The model emits a special token it learned marks the end of a reply (week 1's chat templates).</li>
<li><b>Max tokens.</b> A hard cap on new tokens protects cost and latency. If a reply stops because of it, the output is cut mid-thought, so APIs report the stop reason (for Claude, <code>stop_reason</code> is <code>"max_tokens"</code>).</li>
<li><b>Stop sequences.</b> Strings such as <code>"\\nUser:"</code> or <code>"###"</code> that end generation as soon as they appear, and are trimmed from the output. They're handy when you ask for a single item from a pattern, or when a model might start writing the other side of a conversation.</li></ol>
<p>A simple fix for loops, used in the lab, is <b>n-gram blocking</b>: forbid any token that would repeat a pair (or triple) of tokens already generated.</p>`,
example: ["Translating airline notices", `An airline translates gate-change notices into eight languages. Greedy decoding sometimes produced "Your flight flight has been moved" or dropped the final clause. Switching the translation model to beam search with width 4 and α = 0.8 picked the full, fluent sentence, and the team added the stop sequence "\\n\\n" so the model never runs on into a second notice. Their customer chat assistant, by contrast, keeps sampling: beam search there made every reply sound the same.`],
diagram: {title: "Beam search with width 2", caption: "Each step expands every kept beam by every next token and keeps only the two best totals. Greedy keeps one. Finished beams wait in a list and are ranked at the end, usually with length normalization.",
  lanes: ["step 1", "step 2", "step 3", "rank"],
  cols: [[["the", "the", "logP −0.69", "core"], ["a", "a", "logP −0.92", "core"]], [["acat", "a cat", "−1.02 kept", "core"], ["thecat", "the cat", "−1.90 kept", "core"], ["thedog", "the dog / mat...", "dropped", "guard"]], [["acatsat", "a cat sat", "−1.53", "core"], ["acatran", "a cat ran", "−1.94", "core"]], [["fin", "Finished list", "score / len^α", "store"]]],
  edges: [["a", "acat", "", "hot"], ["the", "thecat"], ["the", "thedog", "", "dash"], ["acat", "acatsat", "", "hot"], ["acat", "acatran"], ["acatsat", "fin"], ["acatran", "fin"]]},
demo: {file: "week5/beam_search.py", run: "python -m week5.beam_search", what: "Greedy decoding and beam search over a hand-written next-token table. Greedy loops until the token limit; beam search finds a 3-token prefix more than twice as likely as greedy's, and the script lists every finished hypothesis with its total and per-token log-probability.",
code: String.raw`
"""Demo: greedy decoding vs beam search over a fixed toy "model".

The model is a hand-written table P(next token | previous token), so every
probability is visible. A real LLM produces the same kind of distribution from
its logits at every step; the decoding algorithms are exactly the same.
"""
import math

import numpy as np

VOCAB = ["<eos>", "the", "a", "cat", "dog", "sat", "ran", "on", "mat", "."]
IDX = {w: i for i, w in enumerate(VOCAB)}
TABLE = {   # previous token -> probabilities of the next token
    "<bos>": {"the": 0.5, "a": 0.4, "cat": 0.05, "dog": 0.05},
    "the": {"cat": 0.3, "dog": 0.3, "mat": 0.25, "a": 0.15},
    "a": {"cat": 0.9, "dog": 0.1},
    "cat": {"sat": 0.6, "ran": 0.4},
    "dog": {"sat": 0.5, "ran": 0.5},
    "sat": {"on": 0.7, ".": 0.3},
    "ran": {".": 0.6, "on": 0.4},
    "on": {"the": 0.9, "a": 0.1},
    "mat": {".": 0.8, "<eos>": 0.2},
    ".": {"<eos>": 0.6, "the": 0.4},
}


def logits_for(prev):
    """Turn the table row into logits (log-probabilities), -inf for impossible tokens."""
    row = np.full(len(VOCAB), -np.inf)
    for w, p in TABLE[prev].items():
        row[IDX[w]] = math.log(p)
    return row


def softmax(logits):
    z = np.exp(logits - logits.max())
    return z / z.sum()


def greedy(max_tokens=20, blocked=None):
    """Always take the single most likely token. blocked(seq) may return token ids to forbid."""
    seq, logp = [], 0.0
    while len(seq) < max_tokens:
        lg = logits_for(seq[-1] if seq else "<bos>").copy()
        if blocked:
            for t in blocked(seq):
                lg[t] = -np.inf
        probs = softmax(lg)
        t = int(np.argmax(probs))
        seq.append(VOCAB[t])
        logp += math.log(probs[t])
        if VOCAB[t] == "<eos>":
            return seq, logp, "eos"
    return seq, logp, "max_tokens"


def raw_score(seq, logp):
    return logp


def beam_search(width=3, max_tokens=12, score_fn=raw_score):
    """Keep the width best partial sequences at every step; finished ones wait in a list."""
    alive, finished = [([], 0.0)], []
    for _ in range(max_tokens):
        candidates = []
        for seq, lp in alive:
            probs = softmax(logits_for(seq[-1] if seq else "<bos>"))
            for t in np.nonzero(probs)[0]:
                candidates.append((seq + [VOCAB[t]], lp + math.log(probs[t])))
        candidates.sort(key=lambda c: -c[1])
        alive = []
        for seq, lp in candidates[:width]:
            (finished if seq[-1] == "<eos>" else alive).append((seq, lp))
        if len(finished) >= width or not alive:
            break
    pool = finished or alive
    return sorted(pool, key=lambda c: -score_fn(*c))


def show(seq, logp):
    return f"{' '.join(seq):42s} logP {logp:6.2f}  P {math.exp(logp):.4f}"


if __name__ == "__main__":
    print("1) Greedy decoding, max 20 tokens:")
    seq, lp, why = greedy()
    print("   ", " ".join(seq))
    print(f"    stopped by: {why}. Greedy keeps choosing 'sat -> on -> the -> cat' and loops.")

    print("\n2) The first 3 tokens: greedy vs the best 3-token prefix")
    g3, g3lp, _ = greedy(max_tokens=3)
    b3 = beam_search(width=2, max_tokens=3)[0]
    print("    greedy:   ", show(g3, g3lp))
    print("    beam w=2: ", show(*b3))
    print("    greedy grabbed 'the' (0.5) and then faced a flat choice; beam kept 'a' (0.4) alive, and 'a cat' is 0.36.")

    print("\n3) Full beam search, ranked by total log-probability:")
    for w in (1, 2, 3, 5):
        best = beam_search(width=w)[0]
        print(f"    width {w}: {show(*best)}")

    print("\n4) All finished hypotheses for width 5 (shorter ones win on raw log-probability):")
    for seq, lp in beam_search(width=5):
        print("    ", show(seq, lp), f" len {len(seq)}  avg logP/token {lp / len(seq):.2f}")
`},
lab: {file: "week5/lab_beam.py", run: "python -m week5.lab_beam",
task: "Add length normalization to beam search, implement stop sequences, and stop greedy decoding from looping with bigram blocking.",
steps: ["Run the script. All alpha values pick the same short sentence, then the stop-sequence assert fails.", "TODO 1: complete <code>length_normalized</code> so the score is logP / len ** alpha.", "TODO 2: complete <code>apply_stop</code> so it cuts at the earliest stop sequence.", "TODO 3: complete <code>no_repeat_bigram</code>; greedy should now reach <code>&lt;eos&gt;</code>.", "TODO 4: write when you'd use beam search (and which alpha) versus sampling."],
done: "alpha 0 picks \"the mat . &lt;eos&gt;\" while alpha 1 picks the 8-token sentence, the stop assert passes, greedy with bigram blocking stops by eos instead of max_tokens, and your comment gives one task for each method.",
code: String.raw`
"""Lab: length normalization, stop sequences and a fix for greedy repetition."""
from week5.beam_search import IDX, beam_search, greedy, show


def length_normalized(alpha):
    """Return a score function for beam_search: logP / len(seq) ** alpha."""
    def score(seq, logp):
        # TODO 1: divide logp by len(seq) ** alpha. alpha = 0 is the raw score, alpha = 1 the average.
        return logp
    return score


def apply_stop(text, stops):
    """Cut text at the FIRST stop sequence found. Return (text_before_stop, stop_found_or_None)."""
    # TODO 2: find the earliest position of any stop string in text; return the text before it
    # and the stop string. If none occurs, return (text, None).
    return text, None


def no_repeat_bigram(seq):
    """Token ids that would repeat a bigram (pair of adjacent tokens) already in seq."""
    banned = []
    # TODO 3: if seq is not empty, for every earlier position i where seq[i] == seq[-1],
    # ban the token that followed it (seq[i + 1]) by adding IDX[seq[i + 1]] to banned.
    return banned


if __name__ == "__main__":
    print("1) Length normalization (beam width 5):")
    for alpha in (0.0, 0.5, 1.0):
        best = beam_search(width=5, score_fn=length_normalized(alpha))[0]
        print(f"   alpha {alpha:.1f}: {show(*best)}")

    print("\n2) Stop sequences:")
    out = "Answer: 42\nUser: and what about 43?"
    text, stop = apply_stop(out, ["\nUser:", "###"])
    print(f"   {text!r}  stopped at {stop!r}")
    assert text == "Answer: 42" and stop == "\nUser:", "TODO 2: apply_stop should cut before the first stop sequence"

    print("\n3) Greedy with no repeated bigrams:")
    seq, lp, why = greedy(max_tokens=20, blocked=no_repeat_bigram)
    print("  ", " ".join(seq), f"(stopped by {why})")
    # TODO 4: in a comment, say when you would use beam search (and which alpha) and when you
    # would use sampling instead, with one example task for each.
`},
takeaways: ["Softmax turns logits into probabilities; the decoding strategy, not the model, decides which token is appended.", "Greedy is fast and deterministic but short-sighted and prone to loops.", "Beam search keeps the B best partial sequences; B = 1 is greedy.", "Raw log-probability favors short outputs, so rank finished beams with logP / length^α.", "Generation stops on an end token, a max-token cap or a stop sequence; check the stop reason."],
mcq: [
{q: "Beam search with width 1 is the same as...", a: ["Top-k sampling with k = 1 and temperature 2", "Random sampling", "Greedy decoding", "Length normalization"], c: 2, why: "Keeping only the single best partial sequence at each step is exactly greedy."},
{q: "Without length normalization, beam search tends to prefer...", a: ["Short outputs, because every extra token adds a negative log-probability", "Long outputs", "Outputs with rare words", "Outputs that repeat the prompt"], c: 0, why: "Log-probabilities are negative, so longer sequences have lower raw totals."},
{q: "For which task is beam search usually a better choice than sampling?", a: ["Writing a bedtime story", "Brainstorming 20 product names", "A casual chat reply", "Translating a legal notice into French"], c: 3, why: "Translation has roughly one best answer, so searching for the most probable output helps; creative tasks want variety."}
]
},
{
id: "5.2", title: "Sampling: temperature, top-k, top-p and penalties", mins: 60, kicker: "temperature, entropy, top-k, nucleus sampling, min-p, repetition and frequency penalties, seeds",
focus: "how each sampling knob reshapes the next-token distribution, and how to pick settings for a task",
pip: [],
runNote: "Pure numpy. With matplotlib installed the demo also saves week5/samplers.png.",
body: `<p>Instead of always taking the top token, <b>sampling</b> draws the next token at random in proportion to its probability. Replies become varied and more human-like, and loops are rarer. But sampling straight from the full distribution sometimes picks a very unlikely token ("For dessert we ordered the <i>chair</i>"), and one bad token can derail everything after it. Each knob below fixes a different part of that problem.</p>
<h4>Temperature</h4>
<div class="math">p_i = exp(z_i / T) / Σ_j exp(z_j / T)</div>
<p>Divide every logit z_i by the temperature T before the softmax. T &lt; 1 sharpens the distribution (the top token grows, the tail shrinks); T &gt; 1 flattens it; T → 0 becomes greedy. You can measure the effect with <b>entropy</b>, <code>H = −Σ p_i log2 p_i</code>: the average uncertainty in bits. In the demo, T = 0.2 gives 0.79 bits (almost certain), and T = 1.5 gives 2.87 bits, close to the 3.32 bits of a uniform choice among 10 words.</p>
<h4>Truncation: top-k, top-p, min-p</h4>
<ul><li><b>Top-k</b> keeps only the k most likely tokens and renormalizes. Simple, but k is fixed: k = 40 is too many when the model is sure and too few when many words fit.</li>
<li><b>Top-p (nucleus sampling)</b> sorts tokens by probability and keeps the smallest set whose probabilities add up to at least p (say 0.9). When the model is confident the nucleus is tiny; when it's unsure it grows. This adapts to the situation, which is why it became the most common default.</li>
<li><b>Min-p</b> keeps tokens whose probability is at least a fraction of the <i>top</i> token's probability (for example 0.1 x the top). It cuts the tail more aggressively when the model is confident and is popular in open-model tools, especially at higher temperatures.</li></ul>
<h4>Penalties against repetition</h4>
<ul><li><b>Repetition penalty</b> (multiplicative): for tokens already used, divide positive logits (or multiply negative ones) by a factor such as 1.1 to 1.3.</li>
<li><b>Frequency and presence penalties</b> (additive): subtract <code>freq x count</code> (how many times the token was used) and <code>presence x [used at all]</code> from the logit. Frequency discourages repeating the same word many times; presence nudges the model towards new topics.</li></ul>
<p>Order matters. A typical pipeline is: penalties, then temperature, then top-k / top-p / min-p filtering, then the random draw.</p>
<h4>Seeds and reproducibility</h4>
<p>Sampling uses a random number generator. Fix its <b>seed</b> and the same model, prompt and settings give the same text, which you need for tests, debugging and fair comparisons. In production, exact reproducibility is harder: batching, hardware and floating-point order can change results slightly, so evaluate on many samples rather than one.</p>
<h4>Choosing settings per task</h4>
<div class="tablewrap"><table><thead><tr><th>Task</th><th>Typical settings</th><th>Why</th></tr></thead><tbody>
<tr><td>Extract a field, classify, write SQL</td><td>Greedy or T ≈ 0 to 0.2</td><td>One right answer; variety is a bug.</td></tr>
<tr><td>Support replies, summaries</td><td>T ≈ 0.5 to 0.8, top-p 0.9</td><td>Natural wording, low risk of odd tokens.</td></tr>
<tr><td>Brainstorming, fiction</td><td>T ≈ 0.9 to 1.2, top-p 0.95 or min-p 0.05, small frequency penalty</td><td>Variety matters; truncation keeps it on topic.</td></tr></tbody></table></div>
<h4>What this means with Claude</h4>
<p>Current Claude models do <b>not</b> accept <code>temperature</code>, <code>top_p</code> or <code>top_k</code>: the API manages sampling and returns an error if you send them. You steer outputs with the prompt (examples, format rules, "give five different options"), the <b>effort</b> level, <code>max_tokens</code> and stop sequences. That's why this lesson implements every sampler on our own distributions: you'll use them directly on open-weight models (week 12) and on the tiny GPT from week 4, and understanding them explains how hosted models behave.</p>`,
example: ["Subject lines vs order numbers", `A marketing team and a billing team use the same open-weight model. Marketing wants 20 email subject lines for a spring sale, so they sample at temperature 1.1 with min-p 0.05 and a small frequency penalty, and get lines that differ in tone and wording. Billing extracts invoice numbers from scanned emails and uses greedy decoding: at temperature 1.0 the model once wrote "INV-20391" as "INV-20319" in one of 500 runs, which is unacceptable for payments. Both teams fix a seed in their test suites so a change in output always means a change in the model or prompt.`],
diagram: {title: "A sampling pipeline", caption: "Logits are adjusted for repetition, scaled by temperature, truncated to a sensible set of candidates, renormalized, and finally drawn with a seeded random generator.",
  lanes: ["model", "adjust", "scale", "truncate", "draw"],
  cols: [[["lg", "Logits", "one per token", "core"]], [["pen", "Penalties", "repetition, freq", "guard"]], [["temp", "Temperature", "z / T", "core"]], [["trunc", "Top-k / top-p", "or min-p", "guard"], ["norm", "Softmax", "renormalize", "core"]], [["rng", "Seeded draw", "one token id", "user"]]],
  edges: [["lg", "pen"], ["pen", "temp"], ["temp", "trunc"], ["trunc", "norm"], ["norm", "rng", "", "hot"], ["rng", "lg", "append, repeat", "dash"]]},
demo: {file: "week5/samplers.py", run: "python -m week5.samplers", what: "Every sampler as a small numpy function, applied to one next-token distribution after \"For dessert we ordered the\". It prints entropy at four temperatures, which tokens top-k, top-p and min-p keep, text histograms of 2,000 draws per setting, the effect of repetition and frequency penalties, and shows that a fixed seed repeats exactly.",
code: String.raw`
"""Demo: temperature, top-k, top-p (nucleus), min-p and repetition penalties on one distribution.

The logits below are what a model might output after "For dessert we ordered the".
Every sampler is a small function that reshapes these numbers before we draw a token.
"""
import numpy as np

WORDS = ["cake", "pie", "ice cream", "tiramisu", "fruit", "cheesecake", "pudding", "soup", "bill", "chair"]
LOGITS = np.array([3.0, 2.6, 2.4, 1.8, 1.5, 1.4, 1.0, -0.5, -1.0, -3.0])


def softmax(logits, temperature=1.0):
    """Divide logits by the temperature, then normalize. T < 1 sharpens, T > 1 flattens."""
    z = np.asarray(logits, dtype=float) / temperature
    z = z - z[np.isfinite(z)].max()
    e = np.exp(z)
    return e / e.sum()


def entropy(p):
    """Uncertainty in bits: 0 = certain, log2(n) = uniform over n tokens."""
    p = p[p > 0]
    return float(-(p * np.log2(p)).sum())


def top_k(logits, k):
    """Keep the k highest logits, set the rest to -inf."""
    out = np.full_like(logits, -np.inf, dtype=float)
    keep = np.argsort(-logits)[:k]
    out[keep] = logits[keep]
    return out


def top_p(logits, p, temperature=1.0):
    """Keep the smallest set of top tokens whose probabilities add up to at least p."""
    probs = softmax(logits, temperature)
    order = np.argsort(-probs)
    cum = np.cumsum(probs[order])
    n_keep = int(np.searchsorted(cum, p) + 1)          # include the token that crosses p
    out = np.full_like(logits, -np.inf, dtype=float)
    out[order[:n_keep]] = logits[order[:n_keep]]
    return out


def min_p(logits, ratio):
    """Keep tokens whose probability is at least ratio x the top token's probability."""
    probs = softmax(logits)
    return np.where(probs >= ratio * probs.max(), logits, -np.inf)


def repetition_penalty(logits, previous_ids, penalty=1.3):
    """Make already-used tokens less likely: divide positive logits, multiply negative ones."""
    out = logits.astype(float).copy()
    for i in set(previous_ids):
        out[i] = out[i] / penalty if out[i] > 0 else out[i] * penalty
    return out


def frequency_presence_penalty(logits, previous_ids, freq=0.5, presence=0.3):
    """Subtract freq x (times used) + presence x (used at all) from each token's logit."""
    out = logits.astype(float).copy()
    counts = np.bincount(previous_ids, minlength=len(logits))
    return out - freq * counts - presence * (counts > 0)


def sample(logits, n, temperature=1.0, seed=0):
    rng = np.random.default_rng(seed)
    return rng.choice(len(logits), size=n, p=softmax(logits, temperature))


def histogram(ids, n=10, width=36):
    counts = np.bincount(ids, minlength=n) / len(ids)
    for w, c in zip(WORDS, counts):
        if c > 0:
            print(f"      {w:11s} {'#' * int(round(c * width)):{width}s} {c:5.1%}")


if __name__ == "__main__":
    print("1) Temperature reshapes the distribution (entropy in bits; uniform over 10 = 3.32)")
    for T in (0.2, 0.7, 1.0, 1.5):
        p = softmax(LOGITS, T)
        print(f"   T={T:3.1f}  entropy {entropy(p):4.2f}  top token {WORDS[int(p.argmax())]} at {p.max():5.1%}"
              f"  P(chair) {p[-1]:.4f}")

    print("\n2) How many tokens each filter keeps:")
    for name, lg in [("top-k k=3", top_k(LOGITS, 3)), ("top-p p=0.9", top_p(LOGITS, 0.9)),
                     ("min-p 0.1", min_p(LOGITS, 0.1))]:
        kept = [WORDS[i] for i in np.nonzero(np.isfinite(lg))[0]]
        print(f"   {name:12s} keeps {len(kept)}: {', '.join(kept)}")

    print("\n3) 2000 draws per setting:")
    settings = [("T=0.3", LOGITS, 0.3), ("T=1.0", LOGITS, 1.0), ("T=1.0 + top-p 0.9", top_p(LOGITS, 0.9), 1.0)]
    draws = {}
    for name, lg, T in settings:
        ids = sample(lg, 2000, T, seed=42)
        draws[name] = ids
        print(f"   {name}:")
        histogram(ids)

    print("\n4) Penalties after the model already said 'cake' twice and 'pie' once:")
    prev = [0, 0, 1]
    for name, lg in [("none", LOGITS), ("repetition 1.3", repetition_penalty(LOGITS, prev)),
                     ("freq 0.5 + presence 0.3", frequency_presence_penalty(LOGITS, prev))]:
        p = softmax(lg)
        print(f"   {name:24s} P(cake) {p[0]:5.1%}  P(pie) {p[1]:5.1%}  P(ice cream) {p[2]:5.1%}")

    a, b, c = sample(LOGITS, 5, seed=7), sample(LOGITS, 5, seed=7), sample(LOGITS, 5, seed=8)
    print("\n5) Seeds: seed 7 ->", [WORDS[i] for i in a])
    print("           seed 7 ->", [WORDS[i] for i in b], "(same)")
    print("           seed 8 ->", [WORDS[i] for i in c], "(different)")

    try:
        import matplotlib.pyplot as plt
        fig, axes = plt.subplots(1, 3, figsize=(12, 3), sharey=True)
        for ax, (name, ids) in zip(axes, draws.items()):
            ax.bar(range(10), np.bincount(ids, minlength=10) / len(ids))
            ax.set_xticks(range(10), WORDS, rotation=60, fontsize=8)
            ax.set_title(name)
        plt.tight_layout()
        plt.savefig("week5/samplers.png", dpi=120)
        print("\nsaved week5/samplers.png")
        plt.show()
    except ImportError:
        print("\n(matplotlib not installed: skipping the chart)")
`},
lab: {file: "week5/lab_sampling.py", run: "python -m week5.lab_sampling",
task: "Combine the samplers into one pipeline, run it on a small word-level model of support emails, and design presets for three tasks using diversity and likelihood measurements.",
steps: ["Run the script. Every row is identical, because <code>sample_next</code> is still greedy.", "TODO 1: implement the pipeline: frequency penalty, greedy when temperature is 0, then top-k, top-p and min-p, then a draw.", "Rerun and read the table: distinct-2 measures variety, avg logP measures how typical the text is.", "TODO 2: add presets for a support reply and for brainstorming, with a comment justifying each.", "TODO 3: explain the trade-off you see, and how you steer Claude instead."],
done: "distinct-2 rises from greedy to T=1.5 while avg logP falls, your two presets appear in the table, the seed check prints True, and your comment explains the trade-off and names the Claude-side controls (prompt, effort, max_tokens, stop sequences).",
code: String.raw`
"""Lab: build one sampling pipeline, then pick settings per task and measure diversity."""
from collections import Counter, defaultdict

import numpy as np

from week5.samplers import frequency_presence_penalty, min_p, softmax, top_k, top_p

TEXT = """thank you for your order . your order has shipped and will arrive on monday .
your refund has been approved and will arrive in five days . thank you for your patience .
we are sorry your order arrived late . we have sent a new order and it will arrive on friday .
your account has been updated . thank you for being a loyal customer . we are happy to help .
please reply to this message if you have any questions about your order or your refund ."""

WORDS = TEXT.split()
VOCAB = sorted(set(WORDS))
ID = {w: i for i, w in enumerate(VOCAB)}
COUNTS = defaultdict(Counter)
for a, b in zip(WORDS, WORDS[1:]):
    COUNTS[a][b] += 1


def logits_after(word):
    """A word-bigram 'model': log of smoothed counts of what followed this word."""
    c = np.full(len(VOCAB), 0.05)
    for w, n in COUNTS[word].items():
        c[ID[w]] += n
    return np.log(c)


def sample_next(logits, cfg, history, rng):
    """Apply the settings in cfg in a sensible order and draw one token id.

    cfg keys (all optional): temperature, top_k, top_p, min_p, freq (frequency penalty).
    """
    lg = np.asarray(logits, dtype=float)
    # TODO 1: (a) if cfg has "freq", apply frequency_presence_penalty(lg, history, freq=cfg["freq"], presence=0)
    #         (b) if temperature is 0, return the argmax (greedy)
    #         (c) apply top_k, then top_p (pass the temperature), then min_p when they are in cfg
    #         (d) return rng.choice(len(lg), p=softmax(lg, temperature))
    return int(np.argmax(lg))


def generate(cfg, n=25, seed=0, start="your"):
    rng = np.random.default_rng(seed)
    out, history = [start], [ID[start]]
    for _ in range(n):
        t = sample_next(logits_after(out[-1]), cfg, history, rng)
        out.append(VOCAB[t])
        history.append(t)
    return out


def distinct2(seqs):
    """Share of unique word pairs across samples: higher = more varied output."""
    pairs = [tuple(s[i:i + 2]) for s in seqs for i in range(len(s) - 1)]
    return len(set(pairs)) / len(pairs)


def avg_logp(seq):
    """Average log-probability per word under the model: higher = more 'typical' text."""
    lps = [np.log(softmax(logits_after(a))[ID[b]]) for a, b in zip(seq, seq[1:])]
    return float(np.mean(lps))


PRESETS = {
    "extract an order number": {"temperature": 0},
    # TODO 2: add a preset for "draft a friendly support reply" and one for "brainstorm subject lines".
    # Choose temperature / top_p / min_p / freq for each and justify the choice in a comment.
}


if __name__ == "__main__":
    print("setting                                 distinct-2  avg logP  sample")
    grid = [("greedy", {"temperature": 0}),
            ("T=0.7", {"temperature": 0.7}),
            ("T=1.0", {"temperature": 1.0}),
            ("T=1.5", {"temperature": 1.5}),
            ("T=1.0 top-p 0.9", {"temperature": 1.0, "top_p": 0.9}),
            ("T=1.0 min-p 0.1", {"temperature": 1.0, "min_p": 0.1}),
            ("T=1.0 freq 0.8", {"temperature": 1.0, "freq": 0.8})]
    for name, cfg in grid + [("preset: " + k, v) for k, v in PRESETS.items()]:
        seqs = [generate(cfg, seed=s) for s in range(8)]
        lp = np.mean([avg_logp(s) for s in seqs])
        print(f"{name:40s} {distinct2(seqs):9.2f}  {lp:8.2f}  {' '.join(seqs[0][:12])}")

    same = generate({"temperature": 1.0}, seed=3) == generate({"temperature": 1.0}, seed=3)
    print("\nsame seed gives the same text:", same)
    # TODO 3: in a comment, explain the trade-off the table shows between distinct-2 and avg logP,
    # and why you cannot set these knobs on current Claude models (what do you use instead?).
`},
takeaways: ["Temperature divides the logits: below 1 sharpens (lower entropy), above 1 flattens, near 0 is greedy.", "Top-k keeps a fixed number of tokens; top-p keeps the smallest set reaching probability p; min-p keeps tokens near the top token's probability.", "Repetition, frequency and presence penalties lower the logits of tokens already used.", "Fix a seed for reproducible tests, and pick settings per task: near-greedy for extraction, moderate for replies, higher for brainstorming.", "Current Claude models reject temperature, top_p and top_k; steer them with prompts, effort, max_tokens and stop sequences."],
mcq: [
{q: "What happens to the next-token distribution when you lower the temperature from 1.0 to 0.3?", a: ["It becomes uniform", "The top tokens get more probability and entropy falls", "Unlikely tokens become more likely", "Nothing; temperature only affects speed"], c: 1, why: "Dividing logits by a small T stretches the gaps between them, concentrating probability on the top tokens."},
{q: "The model is very confident: the top token has probability 0.97. How many tokens does top-p with p = 0.9 keep?", a: ["Exactly 1", "Exactly 10", "All tokens", "It depends on k"], c: 0, why: "The single top token already covers 0.97 ≥ 0.9, so the nucleus is just that token."},
{q: "You send temperature=0.2 to a current Claude model to make answers consistent. What happens, and what should you do?", a: ["It works and answers become deterministic", "The API ignores it silently", "The request fails; use clear instructions, examples and an appropriate effort level instead", "It is converted to top_p automatically"], c: 2, why: "Current Claude models reject sampling parameters; steer with the prompt, effort, max_tokens and stop sequences."}
]
},
{
id: "5.3", title: "The KV cache, serving speed and an LLM playground", mins: 70, kicker: "KV cache, memory formula, prefill vs decode, TTFT, tokens per second, speculative decoding, streaming",
focus: "why generation needs a key-value cache and what it costs in memory, then driving a real LLM with streaming, effort, max_tokens and stop sequences",
pip: [],
runNote: "The KV-cache benchmark takes about 5 to 15 seconds on a CPU. The playground calls Claude when ANTHROPIC_API_KEY is set and runs an offline stub otherwise; add --chat to type your own messages.",
body: `<p>A decoder-only model generates one token per forward pass. In each layer, attention for the newest token needs the <b>keys and values of every earlier token</b>. Without a cache, each step re-runs the model over the whole sequence and recomputes all of them, even though the keys and values of old tokens never change (causal attention means a token's K and V depend only on itself and the tokens before it).</p>
<h4>The KV cache</h4>
<p>Keep each layer's K and V tensors after computing them. For a new token, compute only its own query, key and value, append the key and value to the cache, and attend over the cached ones. Work per new token drops from "the whole sequence through every layer" to "one token through every layer", plus attention reads that grow with length. In the demo, 200 new tokens after a 200-token prompt run several times faster with a cache (about 9x on our test laptop), with identical output.</p>
<h4>What the cache costs: memory</h4>
<div class="math">KV bytes = 2 x layers x kv_heads x d_head x tokens x bytes_per_number (x batch)</div>
<p>The 2 is one K and one V; layers is the number of blocks; kv_heads x d_head is the width of the keys; tokens is the context length so far; and bytes_per_number is 2 for 16-bit floats. A 7B-class model with 32 layers, 32 heads of size 128 and a 4,096-token context needs about 2.1 GB <i>per sequence</i>. That's why long contexts and many concurrent users are limited by memory, and why most modern models use <b>grouped-query attention</b> (several query heads share one K/V head, for example 8 KV heads instead of 32, cutting the cache by 4x). Serving systems also store the cache in fixed-size pages (the idea behind vLLM's PagedAttention) and reuse the cache of a shared prompt prefix across requests (prompt caching).</p>
<h4>Prefill and decode</h4>
<ul><li><b>Prefill:</b> the whole prompt goes through the model in one parallel pass, filling the cache. It's compute-heavy and fast per token. Its duration sets the <b>time to first token (TTFT)</b>.</li>
<li><b>Decode:</b> one token per pass, reading the entire cache and all weights each time. It's limited by memory bandwidth, and its speed is <b>tokens per second</b> (or time per output token).</li></ul>
<p>A long prompt with a short answer is prefill-bound (slow TTFT); a short prompt with a long answer is decode-bound. Users perceive TTFT as responsiveness, which is why chat apps <b>stream</b> tokens as they are generated.</p>
<h4>Speculative decoding, briefly</h4>
<p>A small, fast <i>draft</i> model proposes several tokens ahead, and the large model checks all of them in a single parallel pass, keeping the longest prefix it agrees with (plus one token of its own). The output has the same distribution as the large model alone, but when the draft is usually right you get 2 to 3 tokens per large-model pass.</p>
<h4>The LLM playground</h4>
<p>The lab builds a terminal playground on <code>common/llm.py</code>'s client. Each feature maps to a request field:</p>
<div class="tablewrap"><table><thead><tr><th>Feature</th><th>How</th></tr></thead><tbody>
<tr><td>System prompt</td><td><code>system=</code>: role, rules and tone for the whole conversation</td></tr>
<tr><td>Multi-turn history</td><td>The API is stateless: resend every earlier user and assistant turn in <code>messages</code>. That's also why input tokens grow each turn.</td></tr>
<tr><td>Streaming</td><td><code>client().messages.stream(...)</code> and print each piece of <code>text_stream</code> as it arrives</td></tr>
<tr><td>Effort</td><td><code>output_config={"effort": ...}</code>: low, medium, high, xhigh or max. Higher effort lets the model think more before answering: better on hard questions, slower and more tokens.</td></tr>
<tr><td>Length and stops</td><td><code>max_tokens</code> (thinking counts toward it) and <code>stop_sequences</code>; read <code>stop_reason</code> and <code>stop_sequence</code> on the final message</td></tr>
<tr><td>Usage</td><td><code>usage.input_tokens</code> and <code>usage.output_tokens</code> on the final message: the numbers you are billed for</td></tr></tbody></table></div>
<p>Notice what is missing: temperature, top-p and top-k. On current Claude models sampling is managed by the API, so the playground steers with prompt, effort, length and stops, and the samplers from lesson 5.2 stay on your own models.</p>`,
example: ["Why the support bot felt slow", `A help-desk chatbot took 4 seconds before showing anything, then wrote quickly. Measuring showed the problem was prefill: every request carried a 9,000-token knowledge-base excerpt. The team moved the fixed instructions to the start of the prompt so the provider's prompt cache could reuse that prefix, trimmed retrieved passages, and turned on streaming. Time to first token dropped to under a second, and they set max_tokens and a stop sequence so replies could not run on into a second, invented customer turn.`],
diagram: {title: "Prefill, decode and the KV cache", caption: "Prefill runs the whole prompt in one pass and fills each layer's cache. Each decode step runs only the newest token, appends its key and value to the cache, and attends over everything stored. Tokens stream out as they are produced.",
  lanes: ["input", "phase", "cache", "output"],
  cols: [[["prompt", "Prompt tokens", "system + history", "user"]], [["pre", "Prefill", "all tokens, 1 pass", "core"], ["dec", "Decode step", "1 new token / pass", "core"]], [["kv", "KV cache", "K, V per layer", "store"]], [["first", "First token", "sets TTFT", "core"], ["strm", "Streamed tokens", "tokens per second", "user"]]],
  edges: [["prompt", "pre"], ["pre", "kv", "fill"], ["pre", "first"], ["dec", "kv", "append + read", "hot"], ["dec", "strm"], ["strm", "dec", "next token", "dash"]]},
demo: {file: "week5/kv_cache.py", run: "python -m week5.kv_cache", what: "A tiny random decoder-only model in PyTorch with an optional per-layer KV cache. It generates 200 tokens with and without the cache, prints time to first token, total time, tokens per second and the speed-up, checks that both produce identical tokens, shows the cache's tensor shape, and computes KV-cache memory for real model sizes with and without grouped-query attention.",
code: String.raw`
"""Demo: why a KV cache makes generation fast, measured on a tiny random decoder-only model.

Without a cache, every new token re-runs the model over the WHOLE sequence.
With a cache, each layer stores the keys and values of past tokens, so a new
token only computes its own query, key and value and attends to the stored ones.
"""
import math
import time

import torch
import torch.nn as nn


class Attention(nn.Module):
    def __init__(self, d, n_heads):
        super().__init__()
        self.h, self.dh = n_heads, d // n_heads
        self.qkv, self.proj = nn.Linear(d, 3 * d), nn.Linear(d, d)

    def forward(self, x, cache=None):
        """x: (B, T_new, d). cache: dict with "k", "v" of shape (B, h, T_past, dh), or None."""
        B, T, d = x.shape
        q, k, v = self.qkv(x).split(d, dim=2)
        q, k, v = (m.view(B, T, self.h, self.dh).transpose(1, 2) for m in (q, k, v))
        if cache is not None:
            if "k" in cache:                                  # append the new keys/values to the past ones
                k = torch.cat([cache["k"], k], dim=2)
                v = torch.cat([cache["v"], v], dim=2)
            cache["k"], cache["v"] = k, v
        T_all = k.shape[2]
        att = q @ k.transpose(-2, -1) / math.sqrt(self.dh)    # (B, h, T_new, T_all)
        # causal mask: new token i (at absolute position T_all - T + i) may see keys up to itself
        rows = torch.arange(T_all - T, T_all).unsqueeze(1)
        att = att.masked_fill(torch.arange(T_all).unsqueeze(0) > rows, float("-inf"))
        return self.proj((att.softmax(-1) @ v).transpose(1, 2).reshape(B, T, d))


class Block(nn.Module):
    def __init__(self, d, n_heads):
        super().__init__()
        self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.attn = Attention(d, n_heads)
        self.ffn = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d))

    def forward(self, x, cache=None):
        x = x + self.attn(self.ln1(x), cache)
        return x + self.ffn(self.ln2(x))


class TinyLM(nn.Module):
    def __init__(self, vocab=1000, d=256, n_layers=4, n_heads=8, max_len=1024):
        super().__init__()
        self.tok, self.pos = nn.Embedding(vocab, d), nn.Embedding(max_len, d)
        self.blocks = nn.ModuleList(Block(d, n_heads) for _ in range(n_layers))
        self.ln, self.head = nn.LayerNorm(d), nn.Linear(d, vocab)

    def forward(self, ids, caches=None, start=0):
        x = self.tok(ids) + self.pos(torch.arange(start, start + ids.shape[1]))
        for i, b in enumerate(self.blocks):
            x = b(x, None if caches is None else caches[i])
        return self.head(self.ln(x))


@torch.no_grad()
def generate_no_cache(model, prompt, n_new):
    ids, t_first = prompt, None
    t0 = time.perf_counter()
    for _ in range(n_new):
        logits = model(ids)                                  # the whole sequence, every step
        ids = torch.cat([ids, logits[:, -1:].argmax(-1)], dim=1)
        t_first = t_first or time.perf_counter() - t0
    return ids, t_first, time.perf_counter() - t0


@torch.no_grad()
def generate_cached(model, prompt, n_new):
    caches = [dict() for _ in model.blocks]
    t0 = time.perf_counter()
    logits = model(prompt, caches)                           # PREFILL: all prompt tokens in one pass
    ids = torch.cat([prompt, logits[:, -1:].argmax(-1)], dim=1)
    t_first = time.perf_counter() - t0                       # time to first token
    for _ in range(n_new - 1):                               # DECODE: one new token per pass
        logits = model(ids[:, -1:], caches, start=ids.shape[1] - 1)
        ids = torch.cat([ids, logits[:, -1:].argmax(-1)], dim=1)
    return ids, t_first, time.perf_counter() - t0


def kv_bytes(layers, kv_heads, d_head, tokens, bytes_per=2, batch=1):
    """2 (K and V) x layers x heads x d_head x tokens x bytes per number x batch."""
    return 2 * layers * kv_heads * d_head * tokens * bytes_per * batch


if __name__ == "__main__":
    torch.manual_seed(0)
    model = TinyLM().eval()
    prompt = torch.randint(0, 1000, (1, 200))
    n_new = 200
    print(f"tiny model: 4 layers, d_model 256, prompt {prompt.shape[1]} tokens, generate {n_new}\n")

    a, ttft_a, total_a = generate_no_cache(model, prompt, n_new)
    b, ttft_b, total_b = generate_cached(model, prompt, n_new)
    same = torch.equal(a, b)
    print(f"{'':12s}{'time to 1st token':>19s}{'total':>9s}{'tokens/s':>10s}")
    print(f"{'no cache':12s}{ttft_a * 1000:16.1f} ms{total_a:8.2f}s{n_new / total_a:10.0f}")
    print(f"{'KV cache':12s}{ttft_b * 1000:16.1f} ms{total_b:8.2f}s{n_new / total_b:10.0f}")
    print(f"speed-up {total_a / total_b:.1f}x, identical tokens: {same}")
    if not same:
        print("(tiny float rounding differences can flip a near-tie between two tokens; the math is the same)")

    caches = [dict() for _ in model.blocks]
    model(prompt, caches)
    k = caches[0]["k"]
    print(f"\ncache per layer after prefill: K and V each {tuple(k.shape)} (batch, heads, tokens, d_head)")

    print("\nKV cache memory = 2 x layers x kv_heads x d_head x tokens x bytes (fp16 = 2 bytes)")
    configs = [("this tiny model, 400 tokens, fp32", 4, 8, 32, 400, 4),
               ("7B-class, 32 heads, 4k tokens", 32, 32, 128, 4096, 2),
               ("7B-class, 8 KV heads (GQA), 4k", 32, 8, 128, 4096, 2),
               ("70B-class, 8 KV heads, 128k", 80, 8, 128, 131072, 2)]
    for name, L, H, dh, T, by in configs:
        gb = kv_bytes(L, H, dh, T, by) / 1e9
        print(f"   {name:36s} {gb:9.3f} GB per sequence")
`},
lab: {file: "week5/lab_playground.py", run: "python -m week5.lab_playground",
task: "Finish a streaming, multi-turn LLM playground on the Claude API: keep the conversation history, report token usage and stop reasons, and add an effort switch.",
steps: ["Run the script (no key needed). In the scripted session, the second answer sees 0 earlier turns and <code>/effort</code> is an unknown command.", "TODO 1: append each assistant reply to the history; the second turn should now see 1 earlier turn.", "TODO 2: print a usage line with input and output tokens, the stop reason (and stop sequence) and a running total.", "TODO 3: add the <code>/effort</code> command with validation against <code>EFFORTS</code>.", "With an API key, run <code>python -m week5.lab_playground --chat</code>, ask the same hard question at effort low and high, and compare answers and output tokens."],
done: "the scripted run shows the second turn using the first turn's context, input tokens growing between turns, a stop_sequence stop on \"###\", effort switching to low, a non-zero session total, and /history listing alternating user and assistant turns.",
code: String.raw`
"""Lab: an LLM playground in the terminal, built on common/llm.py.

Features: system prompt, multi-turn history, streaming, effort level, max_tokens,
stop sequences and token usage. Runs a scripted session by default; pass --chat
to type your own messages:   python -m week5.lab_playground --chat

Commands:  /system TEXT   /effort low|medium|high|xhigh|max   /max N   /stop TEXT
           /clear (forget history)   /history   /quit
Sampling knobs (temperature, top_p, top_k) are NOT sent: current Claude models reject them.
"""
import sys
import time

from common.llm import MODEL, OFFLINE, client, count_tokens

EFFORTS = ("low", "medium", "high", "xhigh", "max")

SCRIPT = [
    "/system You are a patient tutor for a course on how LLMs work. Answer in at most three sentences.",
    "What does a KV cache store, and why does it speed up generation?",
    "/effort low",
    "/max 300",
    "/stop ###",
    "Give me a one-line analogy for what you just explained, then write ### and a quiz question.",
    "/history",
]


def fake_stream(system, messages, max_tokens, stops):
    """Offline stand-in: a canned reply that shows what the model would 'see'."""
    turns = sum(1 for m in messages if m["role"] == "assistant")
    last = messages[-1]["content"]
    reply = (f"(offline) I see a system prompt of {len(system.split())} words and {turns} earlier "
             f"assistant turn(s). You asked: '{last[:60]}'. A KV cache keeps each layer's keys and "
             f"values so new tokens reuse them. ### Quiz: what grows with context length?")
    text, out_tokens = "", 0
    for word in reply.split():
        piece = word + " "
        if out_tokens >= max_tokens:
            return text, out_tokens, "max_tokens", None
        if any(s in (text + piece) for s in stops):
            stop = next(s for s in stops if s in text + piece)
            text = (text + piece).split(stop)[0]
            print(piece.split(stop)[0], end="", flush=True)
            return text, out_tokens, "stop_sequence", stop
        print(piece, end="", flush=True)
        text += piece
        out_tokens += max(1, len(piece) // 4)
        time.sleep(0.02)
    return text, out_tokens, "end_turn", None


def stream_reply(state):
    """Stream one assistant turn. Returns (text, usage_dict, stop_reason, stop_sequence)."""
    if OFFLINE:
        in_tokens = count_tokens(state["system"] + " ".join(m["content"] for m in state["history"]))
        text, out_tokens, reason, stop = fake_stream(state["system"], state["history"], state["max_tokens"], state["stops"])
        print()
        return text, {"input_tokens": in_tokens, "output_tokens": out_tokens}, reason, stop
    params = dict(model=MODEL, max_tokens=state["max_tokens"], system=state["system"],
                  messages=state["history"], output_config={"effort": state["effort"]})
    if state["stops"]:
        params["stop_sequences"] = state["stops"]
    with client().messages.stream(**params) as s:
        for piece in s.text_stream:
            print(piece, end="", flush=True)
        final = s.get_final_message()
    print()
    text = "".join(b.text for b in final.content if b.type == "text")
    usage = {"input_tokens": final.usage.input_tokens, "output_tokens": final.usage.output_tokens}
    return text, usage, final.stop_reason, final.stop_sequence


def handle_command(line, state):
    cmd, _, arg = line.partition(" ")
    if cmd == "/system":
        state["system"] = arg
        print(f"[system prompt set: {len(arg.split())} words]")
    elif cmd == "/max":
        state["max_tokens"] = int(arg)
        print(f"[max_tokens = {state['max_tokens']}]  (thinking tokens count toward this limit)")
    elif cmd == "/stop":
        state["stops"].append(arg)
        print(f"[stop sequences: {state['stops']}]")
    elif cmd == "/clear":
        state["history"].clear()
        print("[history cleared]")
    elif cmd == "/history":
        for m in state["history"]:
            print(f"   {m['role']:9s} {m['content'][:70]!r}")
    # TODO 3: add an /effort command. Accept only values in EFFORTS, store it in state["effort"],
    # and print the new level; print a helpful message for anything else.
    else:
        print(f"[unknown command {cmd}]")


def send(user_text, state):
    state["history"].append({"role": "user", "content": user_text})
    print(f"\nyou> {user_text}\nclaude ({state['effort']})> ", end="", flush=True)
    text, usage, reason, stop = stream_reply(state)
    # TODO 1: append the assistant's reply to state["history"] so the next turn has the context.
    # Without it, the second question ("what you just explained") has nothing to refer to.
    # Skip the append if text is empty (the API rejects an empty assistant message).
    # TODO 2: print one usage line: input tokens, output tokens, the stop reason and, if a stop
    # sequence fired, which one. Keep a running total in state["total_tokens"] and print it too.


def main(interactive):
    state = {"system": "You are a helpful assistant.", "history": [], "effort": "medium",
             "max_tokens": 1000, "stops": [], "total_tokens": 0}
    print(f"LLM playground  model={MODEL}  {'OFFLINE stub' if OFFLINE else 'live API'}")
    lines = SCRIPT if not interactive else iter(lambda: input("\n> ").strip(), "/quit")
    for line in lines:
        if not line:
            continue
        if line.startswith("/"):
            if not interactive:
                print(f"\n> {line}")
            handle_command(line, state)
        else:
            send(line, state)
    print(f"\nsession total tokens: {state['total_tokens']}")


if __name__ == "__main__":
    main(interactive="--chat" in sys.argv)
`},
takeaways: ["Without a cache, every new token recomputes keys and values for the whole sequence; the KV cache stores them per layer and reuses them.", "KV memory = 2 x layers x kv_heads x d_head x tokens x bytes, per sequence; grouped-query attention and paging keep it manageable.", "Prefill processes the prompt in parallel and sets time to first token; decode adds one token per pass and sets tokens per second.", "Speculative decoding lets a small draft model propose tokens that the big model verifies in one pass.", "A chat app resends the full history each turn and streams the reply; with Claude you steer with system prompt, effort, max_tokens and stop sequences, and read usage and stop_reason."],
mcq: [
{q: "A model has 40 layers, 8 KV heads of size 128, and runs a 10,000-token context in 16-bit floats. About how big is the KV cache for one sequence?", a: ["About 160 MB", "About 1.6 GB", "About 16 GB", "About 16 MB"], c: 1, why: "2 x 40 x 8 x 128 x 10,000 x 2 bytes = 1.64 billion bytes, about 1.6 GB."},
{q: "Users complain that a chatbot takes long to show its first word, but then types fast. Which phase is the bottleneck?", a: ["Decode", "Tokenization of the output", "Sampling", "Prefill of a long prompt"], c: 3, why: "Time to first token is set by prefill; fast typing afterwards means decode is fine."},
{q: "Why must the playground resend earlier turns on every request?", a: ["The Messages API is stateless: the model only sees what is in the current request", "To make streaming work", "Because stop sequences require it", "To reduce input tokens"], c: 0, why: "Each call stands alone, so the conversation so far must be sent again, which is also why input tokens grow each turn."}
]
}
],
quiz: [
{q: "A model's logits for three tokens are [2, 1, 0]. Which token does greedy decoding pick?", a: ["The second", "A random one", "The third", "The first"], c: 3, why: "Greedy takes the highest logit, which is also the highest probability after softmax."},
{q: "Greedy decoding keeps producing \"I think that I think that I think...\". Which fix targets this directly?", a: ["Raise max_tokens", "Block repeated n-grams or add a repetition/frequency penalty", "Use a larger beam with no length penalty", "Remove the end-of-sequence token"], c: 1, why: "N-gram blocking and repetition penalties lower the chance of repeating recent tokens."},
{q: "With length normalization alpha = 1, beam search ranks finished hypotheses by...", a: ["Average log-probability per token", "Total probability", "Number of tokens", "The first token's probability"], c: 0, why: "Dividing total log-probability by length gives the per-token average."},
{q: "What does top-p = 0.9 keep?", a: ["The 90 most likely tokens", "Tokens with probability above 0.9", "The smallest set of top tokens whose probabilities sum to at least 0.9", "90% of the vocabulary at random"], c: 2, why: "Nucleus sampling keeps the minimal high-probability set covering p of the mass."},
{q: "Temperature T = 2.0 applied to a distribution will usually...", a: ["Make it greedy", "Increase its entropy and give the tail more probability", "Remove the least likely tokens", "Leave it unchanged"], c: 1, why: "Dividing logits by T > 1 shrinks the gaps between them, flattening the distribution."},
{q: "Which statement about current Claude models is correct?", a: ["They accept temperature but not top_k", "Sampling is managed by the API; you steer with prompts, effort, max_tokens and stop sequences", "They only support greedy decoding", "They require a seed parameter"], c: 1, why: "temperature, top_p and top_k are rejected; the supported controls are prompt, effort, length and stop sequences."},
{q: "Grouped-query attention mainly reduces...", a: ["The number of parameters in the FFN", "The vocabulary size", "Time to first token only", "The size of the KV cache, by sharing key/value heads across query heads"], c: 3, why: "Fewer KV heads means proportionally less cache memory per token."},
{q: "What does speculative decoding change about the output?", a: ["Nothing about its distribution; it only makes generation faster when the draft model is often right", "It makes outputs shorter", "It replaces the large model's answers with the draft model's", "It disables the KV cache"], c: 0, why: "The large model verifies every proposed token, so the output matches what it would have produced alone."}
],
checkpoint: `You can explain why greedy loops and beam search prefers short outputs, implement temperature, top-k, top-p and min-p and choose settings per task, show a KV cache speeding up generation and compute its memory, and run a streaming multi-turn playground on Claude that reports usage and stop reasons. Keep <code>week5/</code>: in week 6 you'll use these decoding tools to sample responses for preference data and evaluation.`
});
