W({
n: 1, title: "LLM Foundations and Pre-Training Data", short: "LLM foundations", hours: "6–8 hours",
goal: "See what a language model actually predicts, how a chatbot is assembled around it, and how raw web text becomes clean training tokens.",
builds: "A next-token predictor you train on a tiny corpus, a web-text cleaning pipeline with deduplication, and a byte-pair encoding (BPE) tokenizer written from scratch.",
outcomes: [
  "Explain an LLM as a next-token probability machine and compute perplexity for a toy model.",
  "Describe the stages from pre-training to a deployed chatbot, and what each stage adds.",
  "Name the main model families and the design choices that set them apart.",
  "Build a data-cleaning pipeline with quality filters, exact deduplication and near-duplicate detection.",
  "Train a BPE tokenizer, encode and decode text with it, and reason about token counts and cost."
],
lessons: [
{
id: "1.1", title: "What an LLM is, and how a chatbot is built around it", mins: 60, kicker: "next-token prediction, perplexity, model families, chatbot design",
focus: "why a model that only predicts the next token can still answer questions, and what the chat layer adds",
pip: [],
body: `<p>A large language model (LLM) does one thing: given some text, it outputs a probability for every possible next token. Generating an answer is just repeating that step: pick a token, append it, predict again. Everything else, from answering questions to writing code, emerges because predicting the next token well across trillions of tokens forces the model to learn grammar, facts and reasoning patterns.</p>
<div class="math">P("Paris" | "The capital of France is") = 0.91
P("a"     | "The capital of France is") = 0.03
...one probability for every token in the vocabulary, summing to 1</div>
<h4>Measuring a language model: loss and perplexity</h4>
<p>Training minimizes <b>cross-entropy loss</b>: the average of <code>-log P(correct next token)</code>. If the model gives the true next token probability 0.5, that token costs 0.69; if it gives 0.01, it costs 4.6. <b>Perplexity</b> is <code>exp(loss)</code>: roughly "how many tokens the model is choosing between". A perplexity of 20 means the model is as unsure as if it picked uniformly from 20 options. Lower is better.</p>
<h4>From a raw model to a chatbot</h4>
<ol><li><b>Pre-training:</b> next-token prediction on a huge, cleaned text corpus. The result is a <i>base model</i>: it continues text, but it doesn't follow instructions reliably.</li>
<li><b>Post-training:</b> supervised fine-tuning on example conversations, then reinforcement learning from human or automated feedback (week 6). The result is an <i>assistant model</i>.</li>
<li><b>Serving:</b> a chat application wraps the model with a system prompt, the conversation history, tools, retrieval, safety filters and a decoding strategy (week 5).</li></ol>
<h4>Model families you'll hear about</h4>
<div class="tablewrap"><table><thead><tr><th>Family</th><th>What stands out</th></tr></thead><tbody>
<tr><td>GPT series</td><td>Popularized decoder-only transformers trained at scale; showed that scale plus instruction tuning gives general assistants.</td></tr>
<tr><td>Claude</td><td>Assistant models trained with a strong focus on helpfulness, honesty and safety; long context, tool use and agentic coding.</td></tr>
<tr><td>Llama, Qwen, Gemma, Mistral</td><td>Open-weight models you can download and run yourself (week 12); many sizes from 1B to hundreds of billions of parameters.</td></tr>
<tr><td>DeepSeek</td><td>Open models known for mixture-of-experts efficiency and openly described reasoning training (week 12).</td></tr></tbody></table></div>
<p>Nearly all of them share the same core: a decoder-only transformer (weeks 3 and 4). They differ in data, size, tokenizer, attention variants, training recipe and post-training.</p>`,
example: ["Phone keyboard to chatbot", `Your phone keyboard's next-word suggestion is a tiny language model trained on typing data. A chatbot is the same idea scaled up by about a million times, trained on far more text, then post-trained to hold a conversation. When a support chatbot answers "Your order ships in 2 days", it's still predicting one token at a time; the chat layer added the system prompt ("You are a support assistant for…"), retrieved the order record, and stopped generating at the end-of-turn token.`],
diagram: {title: "From raw text to a chatbot", caption: "Pre-training gives a base model that continues text. Post-training turns it into an assistant. The chat application adds the system prompt, history, tools, retrieval and safety around every call.",
  lanes: ["data", "pre-train", "post-train", "serve", "people"],
  cols: [[["web", "Web + books + code", "cleaned corpus", "store"]], [["base", "Base model", "next-token predictor", "core"]], [["sft", "SFT + RL", "follows instructions", "core"]], [["app", "Chat application", "prompt, history, tools", "core"], ["safe", "Safety filters", "input + output", "guard"]], [["user", "User", "asks a question", "user"]]],
  edges: [["web", "base", "trillions of tokens"], ["base", "sft"], ["sft", "app"], ["user", "app", "message", "hot"], ["app", "safe"]]},
demo: {file: "week1/next_token.py", run: "python -m week1.next_token", what: "A bigram language model built from counts: it learns P(next word | current word) from a tiny corpus, generates text one word at a time, and reports loss and perplexity on held-out sentences.",
code: String.raw`
"""Demo: the smallest possible language model.

A bigram model predicts the next word from the current word only, using counts.
Real LLMs predict the next *token* from the whole context with a transformer,
but the training objective (maximize P(next)) and the metrics are the same.
"""
import math
import random
from collections import Counter, defaultdict

CORPUS = """
the cat sat on the mat . the dog sat on the rug . the cat chased the dog .
the dog chased the ball . a cat likes the sun . a dog likes the ball .
the sun is warm . the mat is warm . the cat is on the mat .
""".split()

HELD_OUT = "the dog sat on the mat . the cat likes the ball .".split()


def train_bigram(tokens, alpha=0.1):
    """Count word pairs, then turn counts into probabilities with add-alpha smoothing."""
    vocab = sorted(set(tokens))
    counts = defaultdict(Counter)
    for cur, nxt in zip(tokens, tokens[1:]):
        counts[cur][nxt] += 1
    probs = {}
    for cur in vocab:
        total = sum(counts[cur].values()) + alpha * len(vocab)
        probs[cur] = {w: (counts[cur][w] + alpha) / total for w in vocab}
    return probs


def generate(probs, start="the", n=12, seed=0):
    rng = random.Random(seed)
    out = [start]
    for _ in range(n):
        dist = probs[out[-1]]
        words, weights = zip(*dist.items())
        out.append(rng.choices(words, weights=weights)[0])
    return " ".join(out)


def perplexity(probs, tokens):
    """exp(average negative log-likelihood of each next token)."""
    nll = [-math.log(probs[c].get(n, 1e-9)) for c, n in zip(tokens, tokens[1:])]
    loss = sum(nll) / len(nll)
    return loss, math.exp(loss)


if __name__ == "__main__":
    model = train_bigram(CORPUS)
    print("vocabulary size:", len(model))
    top = sorted(model["the"].items(), key=lambda kv: -kv[1])[:4]
    print("P(next | 'the') top 4:", [(w, round(p, 3)) for w, p in top])
    print("sample:", generate(model, seed=1))
    loss, ppl = perplexity(model, HELD_OUT)
    print(f"held-out loss {loss:.3f}  perplexity {ppl:.2f}  (uniform guess would be {len(model)})")
`},
lab: {file: "week1/lab_trigram.py", run: "python -m week1.lab_trigram",
task: "Upgrade the bigram model to a trigram model that predicts the next word from the previous <b>two</b> words, and show whether more context lowers perplexity.",
steps: ["Run the script. It prints the bigram perplexity as a baseline.", "Complete <code>train_trigram</code> so it counts (w1, w2) → w3 with add-alpha smoothing.", "Complete <code>trigram_perplexity</code>, falling back to the bigram model when a pair was never seen.", "Try <code>alpha</code> values 0.01, 0.1 and 1.0 and write in a comment which works best and why."],
done: "the script prints both perplexities, the trigram one is lower than the bigram one on the held-out text, and your comment explains the effect of alpha.",
code: String.raw`
"""Lab: does more context help? Bigram vs trigram perplexity."""
import math
from collections import Counter, defaultdict

from week1.next_token import CORPUS, HELD_OUT, perplexity, train_bigram


def train_trigram(tokens, alpha=0.1):
    vocab = sorted(set(tokens))
    counts = defaultdict(Counter)
    # TODO 1: for every (w1, w2, w3) in the corpus, add 1 to counts[(w1, w2)][w3]
    probs = {}
    for pair, nxt_counts in counts.items():
        total = sum(nxt_counts.values()) + alpha * len(vocab)
        probs[pair] = {w: (nxt_counts[w] + alpha) / total for w in vocab}
    return probs


def trigram_perplexity(tri, bi, tokens):
    nll = []
    for w1, w2, w3 in zip(tokens, tokens[1:], tokens[2:]):
        # TODO 2: use tri[(w1, w2)] if that pair was seen, otherwise fall back to bi[w2]
        p = 1e-9
        nll.append(-math.log(p))
    loss = sum(nll) / len(nll)
    return loss, math.exp(loss)


if __name__ == "__main__":
    bi = train_bigram(CORPUS)
    print("bigram  perplexity: %.2f" % perplexity(bi, HELD_OUT)[1])
    tri = train_trigram(CORPUS)
    print("trigram perplexity: %.2f" % trigram_perplexity(tri, bi, HELD_OUT)[1])
    # TODO 3: compare alpha = 0.01, 0.1, 1.0 and explain the result here
`},
takeaways: ["An LLM outputs a probability for every next token; generation repeats that one step.", "Cross-entropy loss is the average -log P(correct next token); perplexity is exp(loss).", "Pre-training makes a base model, post-training makes an assistant, and the chat app adds prompt, history, tools and safety.", "Most model families share the decoder-only transformer and differ in data, scale, tokenizer and training recipe."],
mcq: [
{q: "A model assigns probability 0.25 to the correct next token at every step. What is its perplexity?", a: ["0.25", "4", "25", "1.39"], c: 1, why: "Loss is -ln(0.25) = 1.386, and perplexity is exp(1.386) = 4: as unsure as choosing among 4 options."},
{q: "A base model (pre-trained only) is given 'Write a haiku about rain.' What is it most likely to do?", a: ["Write a perfect haiku", "Continue the text as if it were part of a document, perhaps listing more writing prompts", "Refuse", "Ask a clarifying question"], c: 1, why: "Base models continue text. Following instructions reliably comes from post-training."},
{q: "Which part of a chatbot is NOT inside the model weights?", a: ["Grammar knowledge", "The system prompt and conversation history sent with each request", "Facts learned during pre-training", "Instruction-following behavior from post-training"], c: 1, why: "The application assembles the system prompt and history and sends them on every call."}
]
},
{
id: "1.2", title: "Pre-training data: collection, cleaning and deduplication", mins: 60, kicker: "crawling, extraction, quality filters, dedup, PII, data mixtures",
focus: "designing a cleaning pipeline that removes junk and duplicates without throwing away good, diverse text",
pip: [],
body: `<p>A model can only be as good as the text it learns from. Pre-training corpora contain trillions of tokens, and most of the engineering effort goes into collecting and cleaning that text, not into the model code.</p>
<h4>Collection</h4>
<ul><li><b>Web crawls:</b> crawlers follow links and save pages, respecting <code>robots.txt</code>. Public crawl archives such as Common Crawl publish billions of pages a month, as raw HTML (WARC files) and extracted text (WET files).</li>
<li><b>Curated sources:</b> books, encyclopedias, scientific papers, government documents, and code repositories with permissive licenses.</li>
<li><b>Manual and licensed data:</b> targeted crawls of high-value sites and licensed datasets. Teams track the license and source of every document.</li></ul>
<h4>Cleaning: from raw HTML to training text</h4>
<ol><li><b>Text extraction:</b> strip HTML, menus, cookie banners and boilerplate; keep the main content.</li>
<li><b>Language identification:</b> a small classifier tags each document's language, so the data mixture can be controlled.</li>
<li><b>Quality filters:</b> cheap heuristics remove junk: too short, too many symbols, lines that don't end in punctuation, repeated lines, "lorem ipsum". Many teams add a small classifier trained to recognize high-quality, educational text.</li>
<li><b>Deduplication:</b> the web is full of copies. Exact dedup hashes each document; <b>near-duplicate</b> detection uses MinHash to estimate how many word sequences (shingles) two documents share. Duplicates waste compute and make models memorize.</li>
<li><b>Safety and privacy:</b> remove personal data such as emails and phone numbers, and filter toxic or harmful content.</li>
<li><b>Mixing:</b> decide the share of web, code, math, books and languages. The mixture strongly shapes what the model is good at.</li></ol>
<p>Open datasets built this way (for example FineWeb, Dolma and RefinedWeb) publish their filters, which is the best place to see these steps at full scale.</p>
<h4>MinHash in one paragraph</h4>
<p>Turn each document into a set of shingles (say, every 3-word sequence). The Jaccard similarity of two sets is |A ∩ B| / |A ∪ B|. Computing it for every pair of billions of documents is impossible, so MinHash hashes each set with many random hash functions and keeps the minimum value for each. The fraction of matching minimums estimates the Jaccard similarity, and documents with similar signatures can be bucketed and compared cheaply.</p>`,
example: ["The recipe-site problem", `Thousands of recipe sites copy the same recipe with different ads and headers. Without near-duplicate detection, a model sees "preheat the oven to 180°C and grease a 9-inch pan" tens of thousands of times and starts reproducing whole pages word for word. Exact hashing misses these copies because the headers differ; MinHash over word shingles catches them because the body text is 90% identical.`],
diagram: {title: "Pre-training data pipeline", caption: "Each stage removes text. A typical crawl keeps only a small fraction of its raw pages after extraction, filtering and deduplication.",
  cols: [[["crawl", "Crawl archive", "raw HTML", "ext"]], [["ext", "Extract text", "drop boilerplate", "core"], ["lang", "Language ID", "tag + route", "core"]], [["qf", "Quality filters", "heuristics + classifier", "guard"]], [["dd", "Deduplicate", "exact + MinHash", "guard"], ["pii", "PII + safety", "redact, filter", "guard"]], [["mix", "Data mixture", "web, code, math, books", "store"]]],
  edges: [["crawl", "ext"], ["ext", "lang"], ["lang", "qf"], ["qf", "dd"], ["dd", "pii"], ["pii", "mix", "", "hot"]]},
demo: {file: "week1/clean_corpus.py", run: "python -m week1.clean_corpus", what: "A miniature cleaning pipeline: heuristic quality filters, exact deduplication with hashes, and near-duplicate detection with MinHash, printed as a report of what was kept and why each document was dropped.",
code: String.raw`
"""Demo: clean a tiny 'web crawl' the way pre-training pipelines do."""
import hashlib
import random
import re

DOCS = [
    "Transformers process all tokens in parallel. Each layer mixes information between tokens using attention.",
    "Transformers process all tokens in parallel. Each layer mixes information between tokens using attention.",
    "BUY NOW!!! $$$ best price $$$ click here click here click here",
    "Home | About | Contact | Login",
    "Preheat the oven to 180 degrees and grease a nine inch pan. Mix flour, sugar and eggs until smooth.",
    "Best Recipes Daily: Preheat the oven to 180 degrees and grease a nine inch pan. Mix flour, sugar and eggs until smooth.",
    "Photosynthesis turns light, water and carbon dioxide into sugar and oxygen. It happens in chloroplasts.",
    "lorem ipsum dolor sit amet lorem ipsum dolor sit amet",
]


def quality_reason(doc):
    """Return why a document fails the heuristics, or None if it passes."""
    words = doc.split()
    if len(words) < 8:
        return "too short"
    symbols = sum(not c.isalnum() and not c.isspace() for c in doc) / len(doc)
    if symbols > 0.1:
        return f"too many symbols ({symbols:.0%})"
    if len(set(words)) / len(words) < 0.5:
        return "too repetitive"
    if "lorem ipsum" in doc.lower():
        return "placeholder text"
    if not re.search(r"[.!?]\s*$", doc):
        return "does not end like a sentence"
    return None


def shingles(doc, k=3):
    w = re.findall(r"\w+", doc.lower())
    return {" ".join(w[i:i + k]) for i in range(len(w) - k + 1)}


def minhash(sh, num_perm=64, seed=7):
    rng = random.Random(seed)
    salts = [rng.getrandbits(32) for _ in range(num_perm)]
    return [min(int(hashlib.md5(f"{s}:{x}".encode()).hexdigest()[:8], 16) for x in sh) for s in salts]


def est_jaccard(a, b):
    return sum(x == y for x, y in zip(a, b)) / len(a)


if __name__ == "__main__":
    kept, seen_hashes, signatures = [], set(), []
    for i, doc in enumerate(DOCS):
        why = quality_reason(doc)
        if why:
            print(f"doc {i}: DROP quality -> {why}")
            continue
        h = hashlib.sha256(doc.encode()).hexdigest()
        if h in seen_hashes:
            print(f"doc {i}: DROP exact duplicate")
            continue
        sig = minhash(shingles(doc))
        near = [(j, est_jaccard(sig, s)) for j, s in signatures if est_jaccard(sig, s) >= 0.7]
        if near:
            print(f"doc {i}: DROP near-duplicate of doc {near[0][0]} (est. Jaccard {near[0][1]:.2f})")
            continue
        seen_hashes.add(h)
        signatures.append((i, sig))
        kept.append(doc)
        print(f"doc {i}: KEEP")
    print(f"\nkept {len(kept)} of {len(DOCS)} documents")
`},
lab: {file: "week1/lab_cleaning.py", run: "python -m week1.lab_cleaning",
task: "Extend the pipeline with a PII redaction step and measure how the near-duplicate threshold changes what you keep.",
steps: ["Run the script and read the threshold sweep table.", "Complete <code>redact_pii</code> to replace email addresses and phone numbers with <code>[EMAIL]</code> and <code>[PHONE]</code>.", "Complete <code>true_jaccard</code> and compare it with the MinHash estimate for the two recipe documents.", "Pick a threshold and justify it in a comment: what goes wrong if it's too low, and too high?"],
done: "redaction passes the asserts, the true and estimated Jaccard values are printed within about 0.1 of each other, and your comment justifies a threshold.",
code: String.raw`
"""Lab: add PII redaction and tune the near-duplicate threshold."""
import re

from week1.clean_corpus import DOCS, est_jaccard, minhash, shingles


def redact_pii(text):
    # TODO 1: replace emails with [EMAIL] and phone numbers like 555-123-4567 or (555) 123 4567 with [PHONE]
    return text


def true_jaccard(a, b):
    # TODO 2: exact Jaccard similarity |A & B| / |A | B| of two shingle sets
    return 0.0


if __name__ == "__main__":
    sample = "Contact jane.doe@example.com or call 555-123-4567 for the dataset."
    out = redact_pii(sample)
    print(out)
    assert "[EMAIL]" in out and "[PHONE]" in out, "redaction incomplete"

    a, b = shingles(DOCS[4]), shingles(DOCS[5])
    print("true Jaccard:", round(true_jaccard(a, b), 2), " MinHash estimate:", round(est_jaccard(minhash(a), minhash(b)), 2))

    sigs = [minhash(shingles(d)) for d in DOCS]
    print("\nthreshold  near-duplicate pairs")
    for t in (0.3, 0.5, 0.7, 0.9):
        pairs = [(i, j) for i in range(len(DOCS)) for j in range(i + 1, len(DOCS)) if est_jaccard(sigs[i], sigs[j]) >= t]
        print(f"   {t:.1f}      {pairs}")
    # TODO 3: which threshold would you ship, and why?
`},
takeaways: ["Most pre-training effort goes into data: collection, extraction, filtering, dedup and mixing.", "Cheap heuristics remove most junk; a small quality classifier refines what's left.", "Exact hashing catches copies; MinHash over shingles catches near-duplicates at web scale.", "Removing PII and tracking each document's source and license is part of the pipeline, not an afterthought.", "The data mixture (web, code, math, books, languages) shapes what the model is good at."],
mcq: [
{q: "Two pages share the same article but have different headers and ads. Which step removes the copy?", a: ["Exact SHA-256 deduplication", "Near-duplicate detection with MinHash over shingles", "Language identification", "Tokenization"], c: 1, why: "The bytes differ, so exact hashes differ; MinHash estimates the high overlap of their word shingles."},
{q: "Why deduplicate pre-training data at all?", a: ["It makes the tokenizer faster", "Duplicates waste compute and push the model to memorize repeated text", "Legal teams require exactly one copy", "It increases the vocabulary size"], c: 1, why: "Repeated text adds little new signal and increases verbatim memorization."},
{q: "Sets A and B share 30 shingles, and their union has 50. What is their Jaccard similarity?", a: ["0.3", "0.6", "0.8", "1.67"], c: 1, why: "Jaccard = |A ∩ B| / |A ∪ B| = 30 / 50 = 0.6."}
]
},
{
id: "1.3", title: "Tokenization and byte-pair encoding from scratch", mins: 70, kicker: "characters vs words vs subwords, BPE, special tokens, token costs",
focus: "why subword tokenizers beat word and character tokenizers, and how token counts affect cost and context",
pip: [],
body: `<p>Models don't read characters or words; they read <b>tokens</b>, integers that each stand for a piece of text. The tokenizer is trained once, before the model, and fixed forever after. It decides the vocabulary size, how long every text is in tokens, and how well the model handles rare words, code and other languages.</p>
<h4>Three ways to split text</h4>
<div class="tablewrap"><table><thead><tr><th>Approach</th><th>Upside</th><th>Downside</th></tr></thead><tbody>
<tr><td>Characters</td><td>Tiny vocabulary, never sees an unknown word</td><td>Very long sequences; the model must learn spelling first</td></tr>
<tr><td>Words</td><td>Short sequences</td><td>Huge vocabulary, and new words become "unknown"</td></tr>
<tr><td>Subwords (BPE, WordPiece, Unigram)</td><td>Common words are one token, rare words split into pieces</td><td>Token boundaries can be surprising, for example in numbers</td></tr></tbody></table></div>
<h4>Byte-pair encoding (BPE) in four steps</h4>
<ol><li>Start with every word split into characters (byte-level BPE starts from the 256 byte values, so any text can be encoded).</li>
<li>Count every pair of adjacent symbols across the corpus.</li>
<li>Merge the most frequent pair into a new symbol, and record the merge.</li>
<li>Repeat until the vocabulary reaches the target size (modern models use roughly 30,000 to 250,000 tokens).</li></ol>
<p>To encode new text, apply the recorded merges in the same order. To decode, look up each token's text and join them.</p>
<h4>Special tokens and chat templates</h4>
<p>Tokenizers also reserve special tokens such as beginning-of-text, end-of-text and markers for "a user turn starts here". Chat models are trained on conversations wrapped in these markers, which is how the model knows when its turn ends.</p>
<h4>Why you should care about token counts</h4>
<ul><li><b>Cost and speed:</b> APIs bill per input and output token, and generation time grows with output tokens.</li>
<li><b>Context limits:</b> the context window is measured in tokens, not words.</li>
<li><b>Fairness across languages:</b> a tokenizer trained mostly on English may need several times more tokens for the same sentence in another language.</li>
<li><b>Quirks:</b> numbers split into odd chunks can make arithmetic and character counting harder for a model.</li></ul>
<p>A rough English rule of thumb is about 4 characters or 0.75 words per token. For exact counts, ask the tokenizer: with Claude, use the token-counting endpoint, as the lab does.</p>`,
example: ["The same sentence, different bills", `A support team translated its help center into Hindi and Tamil and saw API costs per article rise by about 2 to 3 times, even though the articles said the same thing. The text was longer in tokens because the tokenizer's merges were learned mostly from English. They now count tokens per language before setting budgets, and they trim boilerplate from retrieved passages before sending them to the model.`],
diagram: {title: "Training and using a BPE tokenizer", caption: "Training learns an ordered list of merges from a corpus. Encoding applies the same merges to new text; decoding maps token ids back to text.",
  lanes: ["corpus", "train", "artifact", "use", "model"],
  cols: [[["c", "Training text", "words → chars", "store"]], [["cnt", "Count pairs", "adjacent symbols", "core"], ["mrg", "Merge top pair", "repeat N times", "core"]], [["voc", "Merges + vocab", "fixed forever", "store"]], [["enc", "Encode", "text → ids", "core"], ["dec", "Decode", "ids → text", "core"]], [["m", "Model", "sees only ids", "ext"]]],
  edges: [["c", "cnt"], ["cnt", "mrg"], ["mrg", "cnt", "", "dash"], ["mrg", "voc"], ["voc", "enc"], ["voc", "dec"], ["enc", "m", "token ids", "hot"]]},
demo: {file: "week1/bpe.py", run: "python -m week1.bpe", what: "A byte-pair encoding tokenizer in about 60 lines: it learns merges from a small corpus, prints the first merges it found, then encodes and decodes a sentence it has never seen.",
code: String.raw`
"""Demo: train a tiny BPE tokenizer from scratch."""
from collections import Counter

END = "</w>"   # marks the end of a word, so "low" at a word's end differs from "low" inside "lower"


def word_counts(text):
    return Counter(text.lower().split())


def to_symbols(word):
    return tuple(word) + (END,)


def pair_counts(vocab):
    pairs = Counter()
    for symbols, freq in vocab.items():
        for a, b in zip(symbols, symbols[1:]):
            pairs[(a, b)] += freq
    return pairs


def merge_pair(symbols, pair):
    out, i = [], 0
    while i < len(symbols):
        if i < len(symbols) - 1 and (symbols[i], symbols[i + 1]) == pair:
            out.append(symbols[i] + symbols[i + 1])
            i += 2
        else:
            out.append(symbols[i])
            i += 1
    return tuple(out)


def train_bpe(text, num_merges=40):
    vocab = {to_symbols(w): c for w, c in word_counts(text).items()}
    merges = []
    for _ in range(num_merges):
        pairs = pair_counts(vocab)
        if not pairs:
            break
        best = max(pairs, key=pairs.get)
        merges.append(best)
        vocab = {merge_pair(s, best): c for s, c in vocab.items()}
    # vocabulary = every base character + every merged symbol, in a stable order
    tokens = sorted({ch for w in word_counts(text) for ch in w} | {END}) + ["".join(m) for m in merges]
    return merges, {t: i for i, t in enumerate(tokens)}


def encode_word(word, merges):
    symbols = to_symbols(word)
    for pair in merges:            # apply merges in the order they were learned
        symbols = merge_pair(symbols, pair)
    return list(symbols)


def encode(text, merges, token_to_id):
    pieces = [p for w in text.lower().split() for p in encode_word(w, merges)]
    return pieces, [token_to_id.get(p, -1) for p in pieces]


def decode(pieces):
    return "".join(pieces).replace(END, " ").strip()


CORPUS = """low lower lowest newer newest wider widest slow slower slowest
the newest model is the lowest cost model and the widest model is the slowest
lower cost and newer models are wider and faster than older slower models"""

if __name__ == "__main__":
    merges, token_to_id = train_bpe(CORPUS, num_merges=40)
    print("first 10 merges:", ["".join(m) for m in merges[:10]])
    print("vocabulary size:", len(token_to_id))
    pieces, ids = encode("the slowest newer widget", merges, token_to_id)
    print("pieces:", pieces)
    print("ids:   ", ids, "(-1 = piece not in this tiny vocab)")
    print("decoded:", decode(pieces))
`},
lab: {file: "week1/lab_tokens.py", run: "python -m week1.lab_tokens",
task: "Measure how the number of merges changes sequence length, check that decoding is lossless, and compare your toy tokenizer with Claude's real token counts.",
steps: ["Run the script and read the merges-versus-length table.", "Complete <code>compression</code>: characters per token for a text.", "Complete the round-trip check so it fails loudly if <code>decode(encode(x))</code> differs from <code>x</code>.", "With an API key set, compare your tokenizer's count with <code>count_tokens</code> for an English and a non-English sentence, and note the ratio in a comment."],
done: "the table shows sequences getting shorter as merges grow, the round-trip assert passes, and you've recorded the token counts for two languages.",
code: String.raw`
"""Lab: merges vs sequence length, lossless round trips, and real token counts."""
from common.llm import OFFLINE, count_tokens
from week1.bpe import CORPUS, decode, encode, train_bpe

TEST = "the newest and slowest models are lower cost"


def compression(text, pieces):
    # TODO 1: return characters per token (ignore spaces in the character count)
    return 0.0


if __name__ == "__main__":
    print("merges  tokens  chars/token")
    for n in (0, 10, 25, 50, 100):
        merges, vocab = train_bpe(CORPUS, num_merges=n)
        pieces, _ = encode(TEST, merges, vocab)
        print(f"{n:6d}  {len(pieces):6d}  {compression(TEST, pieces):11.2f}")

    merges, vocab = train_bpe(CORPUS, num_merges=50)
    pieces, _ = encode(TEST, merges, vocab)
    # TODO 2: assert that decode(pieces) equals TEST exactly
    print("round trip ok")

    english = "The model predicts the next token."
    other = "मॉडल अगले टोकन की भविष्यवाणी करता है।"   # same sentence in Hindi; try your own language
    for s in (english, other):
        print(f"{'(offline estimate) ' if OFFLINE else ''}Claude tokens: {count_tokens(s):3d}   chars: {len(s)}   text: {s}")
    # TODO 3: how many times more tokens does the second sentence need? Why?
`},
takeaways: ["Models see integer token ids; the tokenizer is trained first and then fixed.", "Subword tokenizers balance vocabulary size against sequence length and never hit an unknown word.", "BPE learns an ordered list of merges; encoding replays them, decoding joins the pieces.", "Special tokens and chat templates tell the model where turns begin and end.", "Token counts drive cost, speed and context limits, and they vary a lot across languages."],
mcq: [
{q: "In BPE training, which pair is merged at each step?", a: ["A random pair", "The most frequent adjacent pair of symbols in the corpus", "The longest pair", "The pair that appears in the most different words, regardless of frequency"], c: 1, why: "BPE greedily merges the most frequent adjacent pair, then recounts."},
{q: "Why do byte-level BPE tokenizers never produce an 'unknown' token?", a: ["They have an infinite vocabulary", "They start from all 256 byte values, so any text can fall back to bytes", "They skip unknown characters", "They translate text to English first"], c: 1, why: "Every string is a sequence of bytes, and every byte is in the base vocabulary."},
{q: "Your prompt is 3,000 English words. Roughly how many tokens is that?", a: ["About 750", "About 4,000", "About 12,000", "Exactly 3,000"], c: 1, why: "With about 0.75 words per token, 3,000 words is roughly 4,000 tokens; count exactly when it matters."}
]
}
],
quiz: [
{q: "What does an LLM output at each generation step?", a: ["The full answer", "A probability for every token in its vocabulary", "A single word chosen by rules", "An embedding of the whole prompt"], c: 1, why: "Each step is a probability distribution over the vocabulary; decoding picks one token."},
{q: "Model A has held-out perplexity 12; model B has 30. Which statement is right?", a: ["B is better", "A is less uncertain about the next token on that data", "They are equal", "Perplexity can't compare models"], c: 1, why: "Lower perplexity means higher probability on the true next tokens."},
{q: "Which stage turns a base model into one that follows instructions?", a: ["Tokenization", "Post-training (SFT and RL)", "Deduplication", "Decoding"], c: 1, why: "Supervised fine-tuning and reinforcement learning teach the assistant behavior."},
{q: "Which is a cheap heuristic quality filter?", a: ["Training a 70B model on each document", "Dropping documents with a very high share of symbols", "Asking humans to read every page", "Tokenizing each page twice"], c: 1, why: "Simple statistics such as symbol ratio, length and repetition remove much of the junk."},
{q: "Why does MinHash use many hash functions?", a: ["To encrypt documents", "Each gives one matching-or-not sample, and more samples give a better Jaccard estimate", "To make documents shorter", "To translate text"], c: 1, why: "The fraction of matching minimums estimates Jaccard; more hashes reduce the error."},
{q: "Compared with a character tokenizer, a subword tokenizer usually gives…", a: ["Longer sequences", "Shorter sequences and a larger vocabulary", "No special tokens", "Unknown-word errors"], c: 1, why: "Merging frequent pieces shortens sequences at the cost of more vocabulary entries."},
{q: "A chat model knows its reply is finished because…", a: ["It counts words", "It generates an end-of-turn special token it learned from chat-formatted training data", "The API cuts it off at random", "The user presses stop"], c: 1, why: "Chat templates wrap turns in special tokens; generating the end marker stops the reply."},
{q: "The same paragraph costs 2.5 times more tokens in Tamil than in English. The most likely cause is…", a: ["Tamil is a longer language", "The tokenizer's merges were learned mostly from English text", "The API charges more for Tamil", "Unicode is slower"], c: 1, why: "A tokenizer trained mostly on English has fewer merges for other scripts, so text splits into more pieces."}
],
checkpoint: `You can generate text from your bigram and trigram models and explain their perplexities, your cleaning pipeline drops junk, exact and near duplicates and redacts PII, and your BPE tokenizer round-trips text losslessly. Keep <code>week1/</code>: in week 4 you'll train a tiny GPT and compare a character tokenizer with the BPE one you built here.`
});
