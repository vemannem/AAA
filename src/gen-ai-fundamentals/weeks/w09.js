W({
n: 9, title: "Retrieval-Augmented Generation", short: "RAG", hours: "6–8 hours",
goal: "Give a model knowledge it was never trained on: parse and chunk documents, index them for keyword and vector search, and generate grounded answers with citations that you can evaluate.",
builds: "A document parser and chunker, keyword, vector and hybrid indexes with exact and approximate search, and a cited customer support chatbot with a RAG evaluation.",
outcomes: [
  "Explain when RAG beats fine-tuning or a bigger context window, and draw the ingest, index, retrieve and generate pipeline.",
  "Parse documents with rules or layout-aware models, and choose a chunking strategy and chunk size for a given corpus.",
  "Build BM25, vector and hybrid (reciprocal rank fusion) search, and measure them with recall@k on a golden set.",
  "Compare exact nearest-neighbour search with IVF, HNSW and product quantization in terms of recall, speed and memory.",
  "Generate cited answers with Claude document blocks, explain RAFT, and evaluate context relevance, faithfulness and answer correctness."
],
lessons: [
{
id: "9.1", title: "RAG overview, document parsing and chunking", mins: 60, kicker: "why RAG, the pipeline, rule-based vs AI parsing, chunking strategies, metadata",
focus: "choosing a chunking strategy and chunk size for a help center versus a set of long legal contracts",
pip: [],
body: `<p>A language model only knows what was in its training data, frozen at a cutoff date. It has never seen your store's return policy, last week's price change or a patient's intake form. <b>Retrieval-augmented generation (RAG)</b> fixes this at answer time: find the passages that matter, put them in the prompt, and ask the model to answer from them.</p>
<h4>Why RAG</h4>
<ul><li><b>Fresh and private knowledge:</b> update a document and the next answer uses it. No retraining.</li>
<li><b>Citations:</b> every claim can point to the passage it came from, so users and reviewers can check it.</li>
<li><b>Less hallucination:</b> a model told "answer only from these passages, or say you don't know" invents far less than one answering from memory.</li>
<li><b>Access control:</b> retrieve only what this user may see. Fine-tuned weights can't forget selectively.</li></ul>
<p>Fine-tuning (week 8) is better for teaching a style, a format or a skill. RAG is better for facts that change or must be cited. Many products use both.</p>
<h4>The pipeline</h4>
<ol><li><b>Ingest:</b> collect documents, parse them into clean text with structure, split them into chunks, attach metadata.</li>
<li><b>Index:</b> build a keyword index and an embedding (vector) index over the chunks (lesson 9.2).</li>
<li><b>Retrieve:</b> at question time, search the indexes and keep the top k chunks.</li>
<li><b>Generate:</b> send the chunks plus the question to the model with grounding instructions, and return a cited answer (lesson 9.3).</li></ol>
<h4>Parsing: getting clean text out of messy files</h4>
<p><b>Rule-based parsing</b> uses the structure the file already has. Markdown and HTML have headings and paragraphs; you keep those and drop navigation bars, scripts and footers. Regular expressions pull out fields such as order numbers or dates. PDF text extractors read the text layer of digital PDFs. Rules are fast, cheap and predictable, and they're the right first choice whenever the source is born-digital.</p>
<p><b>AI-based parsing</b> handles what rules can't: scanned pages, photos of receipts, multi-column layouts and tables. Layout models detect regions (title, paragraph, table, figure) and their reading order; OCR turns pixels into text; a vision-capable LLM can read a page image and return clean markdown with the table rebuilt. It costs more and can make mistakes, so keep the page image and the parsed text side by side for spot checks.</p>
<h4>Chunking strategies</h4>
<div class="tablewrap"><table><thead><tr><th>Strategy</th><th>How it works</th><th>Watch out for</th></tr></thead><tbody>
<tr><td>Fixed-size with overlap</td><td>Windows of N words or tokens; each repeats the last few of the previous one</td><td>Cuts sentences and tables in half</td></tr>
<tr><td>Sentence or recursive</td><td>Split at the biggest natural boundary that fits: paragraph, then sentence, then clause, then word</td><td>Very short or very long sections</td></tr>
<tr><td>Heading-aware</td><td>One chunk per section, keeping the heading path as context</td><td>Long sections still need a second split</td></tr>
<tr><td>Semantic</td><td>Start a new chunk where neighbouring sentences stop being similar (by embedding)</td><td>Needs an embedding per sentence; tune the threshold</td></tr></tbody></table></div>
<h4>Chunk size is a trade-off</h4>
<p>Small chunks (a sentence or two) give precise retrieval, but a single chunk may lack the context needed to answer ("it costs 39 dollars": what does?). Large chunks carry context but dilute the embedding and waste prompt tokens on irrelevant text. A common starting point is 200 to 500 tokens with 10 to 20 percent overlap, then measure with a golden set (lesson 9.2) rather than guessing.</p>
<h4>Metadata</h4>
<p>Store each chunk with its source document, heading path, URL, date and access level. Metadata lets you filter ("only current policies", "only this customer's region"), show citations with titles, and prepend a <b>contextual header</b> such as "Shipping costs &gt; Express and oversized fees:" so the chunk makes sense on its own.</p>`,
example: ["The sofa freight fee", `A furniture store's help center says, under "Shipping costs", that oversized items add a 39 dollar freight fee "even when the order qualifies for free standard shipping". With 40-word fixed chunks, that sentence was split across two chunks, and the bot told a customer shipping on a sofa was free. Switching to heading-aware chunks with the article title and heading prepended kept the sentence and its context together, and the wrong answer disappeared from their weekly review.`],
diagram: {title: "The RAG pipeline", caption: "Ingest and index run ahead of time. At question time the retriever finds the best chunks and the model answers from them, with citations back to the source.",
  lanes: ["sources", "ingest", "index", "query time", "answer"],
  cols: [[["docs", "Help center", "markdown, PDF, HTML", "ext"]], [["parse", "Parse", "rules or layout AI", "core"], ["chunk", "Chunk", "sections + metadata", "core"]], [["idx", "Indexes", "keyword + vector", "store"]], [["user", "Customer", "asks a question", "user"], ["ret", "Retrieve", "top-k chunks", "core"]], [["gen", "Generate", "grounded, cited", "core"]]],
  edges: [["docs", "parse"], ["parse", "chunk"], ["chunk", "idx"], ["user", "ret", "question"], ["idx", "ret"], ["ret", "gen", "passages", "hot"], ["gen", "user", "cited answer", "dash"]]},
demo: {file: "week9/chunking.py", run: "python -m week9.chunking", what: "Parses an embedded help center for a fictional online store (8 short articles about orders, shipping, returns and refunds), shows rule-based HTML parsing, and compares fixed-size, sentence, semantic and heading-aware chunkers, including whether a key sentence survives each split.",
code: String.raw`
"""Demo: parse a small help center and compare chunking strategies.

The help center belongs to a fictional online store, Lumen Market. Week 9 builds a
customer support chatbot on top of it: this file parses and chunks, search.py indexes,
support_bot.py answers with citations.
"""
import re
from collections import Counter
from html.parser import HTMLParser

HELP_CENTER = """
# Tracking your order
## Where to find tracking
Every order gets a tracking number by email as soon as it leaves our warehouse. You can also open Account > Orders and press Track package. Tracking links work for 90 days.
## Tracking is not updating
Carriers often scan a parcel only when it reaches the next hub, so tracking can stay still for up to 48 hours. If nothing changes for 5 business days, contact support and we will open a trace with the carrier.

# Shipping options and delivery times
## Standard shipping
Standard shipping takes 3 to 5 business days within the United States. Orders placed before 2 pm Eastern ship the same business day.
## Express shipping
Express shipping arrives in 1 to 2 business days. It is not available for furniture or other oversized items.
## International shipping
We ship to Canada, the United Kingdom and the European Union. International delivery takes 7 to 14 business days, and customs duties are paid by the customer on delivery.

# Shipping costs
## Free shipping threshold
Standard shipping is free on orders of 50 dollars or more after discounts. Below 50 dollars, standard shipping costs 5.99 dollars.
## Express and oversized fees
Express shipping costs 14.99 dollars per order. Oversized items such as sofas add a 39 dollar freight fee, even when the order qualifies for free standard shipping.

# Returns policy
## Return window
You can return most items within 30 days of delivery. Items must be unused and in their original packaging. Lumen Plus members get a 60 day return window.
## Items that cannot be returned
Gift cards, personalized items, opened cosmetics and final sale items cannot be returned. Mattresses can be returned only within 100 nights and must be donated, not shipped back.

# How to start a return
## Request a return label
Open Account > Orders, choose the order and press Return items. Pick a reason for each item and we email a prepaid return label within a few minutes.
## Drop off your parcel
Print the label, attach it to the box and drop it at any carrier location within 14 days. Keep the drop-off receipt until your refund arrives.

# Refunds
## Refund timing
We inspect returns within 3 business days of receiving them. After approval, the refund goes back to your original payment method and usually appears in 5 to 7 business days.
## Store credit and return shipping
You can choose store credit instead of a refund and get an extra 10 percent. Return shipping is free for defective items; for other returns we deduct a 4.99 dollar label fee from the refund.

# Cancelling or changing an order
## Cancel within one hour
You can cancel an order yourself within 1 hour of placing it from Account > Orders. After that, the warehouse may already be packing it.
## Change an address or item
To change the shipping address or swap an item, contact support before the order ships. Once it has shipped, refuse the delivery or start a return instead.

# Damaged or missing items
## Report a problem
Report damaged, wrong or missing items within 48 hours of delivery. Attach photos of the item and the box so we can file a claim with the carrier.
## Replacement or refund
For damaged or missing items we send a free replacement, or a full refund including shipping if the item is out of stock. You do not need to return a damaged item unless we ask.
"""


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


# ---------- parsing: rule-based ----------

def parse_markdown(md):
    """Split markdown into articles and sections using its # and ## structure."""
    docs, doc, section = [], None, None
    for line in md.strip().splitlines():
        line = line.strip()
        if line.startswith("# "):
            doc = {"id": slug(line[2:]), "title": line[2:], "sections": []}
            docs.append(doc)
        elif line.startswith("## "):
            section = {"heading": line[3:], "text": ""}
            doc["sections"].append(section)
        elif line:
            section["text"] = (section["text"] + " " + line).strip()
    return docs


class TextExtractor(HTMLParser):
    """Rule-based HTML parsing: keep headings and paragraphs, drop nav, scripts and footers."""
    SKIP = {"nav", "script", "style", "footer"}

    def __init__(self):
        super().__init__()
        self.out, self.stack = [], []

    def handle_starttag(self, tag, attrs):
        self.stack.append(tag)

    def handle_endtag(self, tag):
        if self.stack:
            self.stack.pop()

    def handle_data(self, data):
        if data.strip() and not any(t in self.SKIP for t in self.stack):
            tag = self.stack[-1] if self.stack else ""
            prefix = {"h1": "# ", "h2": "## "}.get(tag, "")
            self.out.append(prefix + data.strip())


def html_to_markdown(html):
    p = TextExtractor()
    p.feed(html)
    return "\n".join(p.out)


# ---------- chunking strategies ----------

def sentences(text):
    return [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]


def full_text(docs):
    return "\n".join(d["title"] + ". " + " ".join(s["heading"] + ". " + s["text"] for s in d["sections"]) for d in docs)


def fixed_chunks(text, size=40, overlap=10):
    """Fixed-size windows of words; each window repeats the last overlap words of the previous one."""
    words = text.split()
    step = size - overlap
    return [" ".join(words[i:i + size]) for i in range(0, max(1, len(words) - overlap), step)]


def sentence_chunks(text, max_words=40):
    """Pack whole sentences into chunks of at most max_words words."""
    chunks, cur = [], []
    for s in sentences(text):
        if cur and len(" ".join(cur + [s]).split()) > max_words:
            chunks.append(" ".join(cur))
            cur = []
        cur.append(s)
    if cur:
        chunks.append(" ".join(cur))
    return chunks


def heading_chunks(docs):
    """One chunk per section, with metadata and the article title kept as context."""
    out = []
    for d in docs:
        for s in d["sections"]:
            out.append({"id": d["id"] + "#" + slug(s["heading"]), "doc": d["title"], "heading": s["heading"],
                        "text": s["text"], "words": len(s["text"].split())})
    return out


def bow(text):
    return Counter(re.findall(r"[a-z0-9]+", text.lower()))


def cosine(a, b):
    num = sum(a[k] * b.get(k, 0) for k in a)
    den = (sum(v * v for v in a.values()) ** 0.5) * (sum(v * v for v in b.values()) ** 0.5)
    return num / den if den else 0.0


def semantic_chunks(text, threshold=0.12, min_words=12, max_words=60):
    """Start a new chunk where neighbouring sentences stop sharing vocabulary.

    Real systems compare sentence embeddings; bag-of-words cosine keeps this demo dependency free.
    min_words stops tiny chunks (a lone heading); max_words caps very long ones.
    """
    sents = sentences(text)
    chunks, cur = [], [sents[0]]
    for prev, s in zip(sents, sents[1:]):
        size = len(" ".join(cur).split())
        topic_shift = cosine(bow(prev), bow(s)) < threshold
        if (topic_shift and size >= min_words) or size + len(s.split()) > max_words:
            chunks.append(" ".join(cur))
            cur = []
        cur.append(s)
    chunks.append(" ".join(cur))
    return chunks


def stats(name, chunks):
    lens = [len(c.split()) for c in chunks]
    print(f"{name:<16} chunks {len(chunks):3d}   words/chunk min {min(lens):3d}  mean {sum(lens) / len(lens):5.1f}  max {max(lens):3d}")


def load_chunks():
    """Used by search.py and support_bot.py: the heading-aware chunks of the help center."""
    return heading_chunks(parse_markdown(HELP_CENTER))


if __name__ == "__main__":
    page = "<html><nav>Home | Cart | Login</nav><h1>Gift cards</h1><p>Gift cards never expire.</p><footer>(c) Lumen Market</footer></html>"
    print("HTML page parsed by rules:\n" + html_to_markdown(page) + "\n")

    docs = parse_markdown(HELP_CENTER)
    print(f"parsed {len(docs)} articles, {sum(len(d['sections']) for d in docs)} sections\n")
    text = full_text(docs)
    stats("fixed 40/10", fixed_chunks(text, 40, 10))
    stats("sentence <=40", sentence_chunks(text, 40))
    stats("semantic", semantic_chunks(text))
    chunks = heading_chunks(docs)
    stats("heading-aware", [c["text"] for c in chunks])

    probe = "Oversized items such as sofas add a 39 dollar freight fee, even when the order qualifies for free standard shipping."
    print("\nWhere does the sentence about the oversized freight fee land?")
    for name, cs in [("fixed 40/10", fixed_chunks(text, 40, 10)), ("heading-aware", [c["doc"] + " > " + c["heading"] + ": " + c["text"] for c in chunks])]:
        hit = next(c for c in cs if "Oversized items" in c)
        print(f"  {name}: ...{hit[-150:]}")
        print(f"     whole sentence kept: {probe in hit}")
    print("\nfirst heading-aware chunk with metadata:", chunks[0])
`},
lab: {file: "week9/lab_chunking.py", run: "python -m week9.lab_chunking",
task: "Write a recursive chunker that splits at the largest natural boundary that fits, add contextual headers, and measure which chunkers keep every fact sentence whole.",
steps: ["Run the script. The table shows 0% coverage and a single 566-word chunk until you fill in the TODOs.", "Complete <code>coverage</code> so it returns the share of fact sentences found whole inside at least one chunk.", "Complete <code>recursive_split</code>: split on the first separator, keep separators, pack pieces greedily, and recurse with the next separator for pieces that are still too long.", "Complete <code>with_header</code> so every chunk starts with 'Article &gt; Heading: '.", "Answer TODO 4 in a comment: which chunk size would you ship, and why?"],
done: "the asserts pass: recursive chunks at 40 words are never longer than 40 words, keep 100% of fact sentences whole, and fixed-size chunking visibly loses some.",
code: String.raw`
"""Lab: write a recursive chunker and measure which chunker keeps facts whole."""
from week9.chunking import HELP_CENTER, fixed_chunks, full_text, parse_markdown, semantic_chunks, sentence_chunks, sentences

SEPARATORS = ["\n", ". ", ", ", " "]   # try the biggest natural boundary first


def recursive_split(text, max_words=40, seps=SEPARATORS):
    """Split text into chunks of at most max_words words, cutting at the largest boundary that works."""
    if len(text.split()) <= max_words or not seps:
        return [text.strip()]
    # TODO 1: split text on seps[0], keeping the separator at the end of each piece
    #         (e.g. "a. b. c" with ". " -> ["a. ", "b. ", "c"]). Then pack pieces greedily into
    #         chunks of at most max_words words. A piece that is still too long on its own is
    #         split again with recursive_split(piece, max_words, seps[1:]).
    return [text.strip()]


def with_header(docs, max_words=40):
    """Chunk each section and prefix every chunk with 'Article > Heading: ' (a contextual header)."""
    out = []
    for d in docs:
        for s in d["sections"]:
            for piece in recursive_split(s["text"], max_words):
                # TODO 2: append a dict with keys doc, heading, text (header + piece) and words
                pass
    return out


def coverage(chunks, facts):
    # TODO 3: return the fraction of fact sentences that appear WHOLE inside at least one chunk
    return 0.0


if __name__ == "__main__":
    docs = parse_markdown(HELP_CENTER)
    text = full_text(docs)
    facts = [s for d in docs for sec in d["sections"] for s in sentences(sec["text"])]
    print(f"{len(facts)} fact sentences in the help center\n")
    print("chunker           chunks  max words  facts kept whole")
    for name, chunks in [("fixed 40/10", fixed_chunks(text, 40, 10)), ("fixed 25/5", fixed_chunks(text, 25, 5)),
                         ("sentence <=40", sentence_chunks(text, 40)), ("semantic", semantic_chunks(text)),
                         ("recursive <=40", recursive_split(text, 40)), ("recursive <=20", recursive_split(text, 20))]:
        biggest = max(len(c.split()) for c in chunks)
        print(f"{name:<16} {len(chunks):6d}  {biggest:9d}  {coverage(chunks, facts):15.0%}")

    headed = with_header(docs)
    if headed:
        print("\nexample chunk with a contextual header:\n ", headed[5]["text"])
    rec = recursive_split(text, 40)
    assert max(len(c.split()) for c in rec) <= 40, "TODO 1: recursive_split still returns chunks over 40 words"
    assert coverage(rec, facts) == 1.0, "TODO 3: every fact sentence should survive recursive splitting at 40 words"
    assert headed and all(c["words"] <= 50 for c in headed), "TODO 2: build headed chunks"
    print("\nall checks passed")
    # TODO 4: in a comment, say which chunk size you would ship for this help center and why
    #         (think: what a good answer needs in one chunk vs. how precise retrieval is).
`},
takeaways: ["RAG adds fresh, private, citable knowledge at answer time without retraining the model.", "The pipeline is ingest (parse, chunk, metadata), index, retrieve and generate.", "Use rule-based parsing for born-digital files and layout or vision models for scans and complex tables.", "Chunk at natural boundaries (headings, paragraphs, sentences); fixed windows cut facts in half.", "Chunk size trades retrieval precision against context; attach metadata and a contextual header to every chunk."],
mcq: [
{q: "A 1,000-word article is split into fixed 200-word chunks with 50 words of overlap. About how many chunks do you get?", a: ["5", "6", "7", "10"], c: 2, why: "Each chunk starts 150 words (200 minus 50) after the previous one: at 0, 150, 300, 450, 600, 750 and 900, so 7 chunks."},
{q: "You must index thousands of scanned supplier invoices with line-item tables. Which parsing approach fits best?", a: ["Layout-aware or vision-model parsing that rebuilds the table structure", "Regular expressions over the raw PDF bytes", "A plain PDF text-layer extractor", "Index only the file names"], c: 0, why: "Scans have no text layer and tables need layout; OCR plus layout or vision models recover rows and columns."},
{q: "Why store the article title and heading as metadata on every chunk?", a: ["It makes embeddings smaller", "It lets you filter, show citations and give the chunk context its own text lacks", "BM25 cannot run without it", "It removes the need for any overlap"], c: 1, why: "Metadata powers filters and citations, and a contextual header makes a chunk understandable on its own."}
]
},
{
id: "9.2", title: "Indexing and search: keyword, vector, hybrid and approximate", mins: 75, kicker: "inverted index, BM25, knowledge graphs, embeddings, exact vs ANN, IVF, HNSW, PQ, RRF, recall@k",
focus: "deciding between keyword, vector and hybrid search, and when an approximate index is worth its lost recall",
pip: [],
deps: ["9.1"],
runNote: "Runs in about 10 seconds on a CPU. If sentence-transformers is installed (Colab has it), the demo downloads a small embedding model once; set EMBEDDER=hash to use the numpy embedder only.",
body: `<p>Retrieval decides the ceiling of a RAG system: if the right passage isn't in the top k, the best model in the world can't cite it. There are three families of index, and production systems usually combine two of them.</p>
<h4>Keyword search: the inverted index and BM25</h4>
<p>An <b>inverted index</b> maps every term to the chunks that contain it, like the index at the back of a book. A query only touches the chunks that share a term with it, so search stays fast on millions of documents. <b>BM25</b> scores each matching chunk:</p>
<div class="math">score(q, d) = sum over query terms t of  idf(t) * tf * (k1 + 1) / (tf + k1 * (1 - b + b * |d| / avgdl))
idf(t) = log(1 + (N - n_t + 0.5) / (n_t + 0.5))</div>
<p>Here <code>tf</code> is how often term t appears in chunk d, <code>|d|</code> is the chunk's length and <code>avgdl</code> the average length, <code>N</code> is the number of chunks and <code>n_t</code> how many contain t. Rare terms get a high <code>idf</code>; <code>k1</code> (about 1.2 to 2) makes repeated terms count less and less; <code>b</code> (about 0.75) stops long chunks from winning just by being long. BM25 is unbeatable for exact strings: error codes, SKUs, names.</p>
<h4>Knowledge-based indexing</h4>
<p>A <b>knowledge graph</b> stores facts as (entity, relation, entity) triples, such as (express shipping, not available for, oversized items) and (oversized items, include, sofas). Following edges answers multi-hop questions ("can I get my sofa by express?") that no single chunk states. Graphs are costly to build and maintain, so most teams start with text indexes and add a graph for well-structured domains like product catalogs or drug interactions.</p>
<h4>Vector search</h4>
<p>An <b>embedding model</b> (week 2) maps each chunk to a vector so that similar meanings land close together. Store the vectors, embed the query the same way, and return the chunks with the highest cosine similarity. Vector search finds "my vase arrived broken" when the article says "damaged". The demo defaults to a hashed TF-IDF embedder written in numpy, which is lexical (it matches word pieces, not meaning) but always runs; with sentence-transformers installed it uses a real embedding model.</p>
<h4>Exact versus approximate nearest neighbours</h4>
<p><b>Exact search</b> compares the query with every vector: perfect recall, cost proportional to the corpus. That's fine up to roughly a million vectors. Beyond that, <b>approximate nearest neighbour (ANN)</b> indexes trade a little recall for a lot of speed:</p>
<ul><li><b>IVF (inverted file):</b> cluster the vectors with k-means; search only the <code>nprobe</code> clusters whose centroids are closest to the query. The demo shows recall rising from about 0.7 to 0.99 as nprobe goes from 1 to 16 while scanning only 1 to 15 percent of the vectors.</li>
<li><b>HNSW:</b> a layered graph where each vector links to near neighbours; search greedily walks from a coarse top layer down to the fine bottom one. Very fast and high recall, but memory-hungry.</li>
<li><b>Product quantization (PQ):</b> split each vector into sub-vectors and store each as the id of its nearest centroid, often 1 byte per sub-vector. A 64-number float vector shrinks from 256 bytes to 8. You build PQ in the lab.</li></ul>
<p><b>Vector databases</b> (for example pgvector, Qdrant, Weaviate, Milvus, or FAISS as a library) package these indexes with storage, metadata filters, updates and replication.</p>
<h4>Hybrid search with reciprocal rank fusion</h4>
<p>Keyword and vector search fail differently, so run both and fuse the ranked lists. <b>Reciprocal rank fusion (RRF)</b> ignores raw scores, which live on different scales, and uses ranks only:</p>
<div class="math">RRF(d) = sum over result lists of 1 / (k + rank of d in that list),   k is usually 60</div>
<h4>Measure it: recall@k on a golden set</h4>
<p>Write 30 to 100 real questions, each labelled with the chunk that answers it. <b>Recall@k</b> is the share of questions whose answer chunk appears in the top k. Track it for every change of chunker, embedder or fusion. On the demo's tiny 12-question set the winner depends on the embedder, which is exactly why you measure instead of assuming.</p>`,
example: ["Error codes and synonyms", `An electronics retailer's support search used embeddings only. Customers who typed "E-4012 at checkout" got generic payment articles, because a general embedding model has no idea what E-4012 means; BM25 found the exact article instantly. Customers who typed "my card keeps getting rejected" were the opposite: BM25 missed it, embeddings found the "payment declined" article. Hybrid search with RRF fixed both, and recall@5 on their 80-question golden set went from 0.71 to 0.89.`],
diagram: {title: "Hybrid retrieval", caption: "The query goes to a keyword index and a vector index in parallel. Reciprocal rank fusion merges the two ranked lists into one top-k list for the generator.",
  cols: [[["q", "Query", "customer question", "user"]], [["bm", "BM25 scorer", "terms, idf, tf", "core"], ["emb", "Embed query", "same model as docs", "core"]], [["inv", "Inverted index", "term -> chunks", "store"], ["ann", "Vector index", "exact, IVF, HNSW, PQ", "store"]], [["rrf", "RRF fusion", "1 / (60 + rank)", "core"]], [["top", "Top-k chunks", "to the generator", "core"]]],
  edges: [["q", "bm"], ["q", "emb"], ["bm", "inv", "terms"], ["emb", "ann", "vector"], ["inv", "rrf", "ranked list"], ["ann", "rrf", "ranked list"], ["rrf", "top", "", "hot"]]},
demo: {file: "week9/search.py", run: "python -m week9.search", what: "Builds an inverted index with BM25 in pure Python, a vector index with embeddings, and hybrid search with reciprocal rank fusion over the help-center chunks; prints recall@1 and recall@3 on a golden set, a two-hop knowledge-graph lookup, and an exact versus IVF benchmark on 60,000 vectors showing recall against the share of vectors scanned.",
code: String.raw`
"""Demo: keyword (BM25), vector and hybrid search over the help center, plus exact vs approximate search.

Embeddings: a pure-numpy hashed TF-IDF embedder by default, so this always runs.
If sentence-transformers is installed (Colab has it), a real embedding model is used instead;
set EMBEDDER=hash to force the numpy one.
"""
import math
import os
import re
import time
import zlib
from collections import Counter, defaultdict

# One BLAS thread: for the small per-query matrix products below, thread start-up costs more
# than it saves and makes the timings noisy. Must be set before numpy is imported.
for _var in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_var, "1")

import numpy as np

from week9.chunking import load_chunks

STOP = set("a an the and or of to in on for is are be it you your we our i my me do does can how what when with this that at by if not".split())


def tokenize(text):
    return [w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOP]


# ---------- keyword search: inverted index + BM25 ----------

class BM25:
    def __init__(self, texts, k1=1.5, b=0.75):
        self.k1, self.b = k1, b
        self.docs = [tokenize(t) for t in texts]
        self.len = np.array([len(d) for d in self.docs], dtype=float)
        self.avg = self.len.mean()
        self.index = defaultdict(dict)          # inverted index: term -> {doc id: term frequency}
        for i, d in enumerate(self.docs):
            for term, tf in Counter(d).items():
                self.index[term][i] = tf
        n = len(texts)
        self.idf = {t: math.log(1 + (n - len(p) + 0.5) / (len(p) + 0.5)) for t, p in self.index.items()}

    def scores(self, query):
        s = np.zeros(len(self.docs))
        for term in tokenize(query):
            for i, tf in self.index.get(term, {}).items():   # only docs that contain the term are touched
                norm = tf + self.k1 * (1 - self.b + self.b * self.len[i] / self.avg)
                s[i] += self.idf[term] * tf * (self.k1 + 1) / norm
        return s


# ---------- vector search: embeddings + exact nearest neighbours ----------

class HashEmbedder:
    """Hashed TF-IDF over words and character 4-grams, L2-normalised. Character grams let
    'refunded' match 'refund'. It is still lexical: it cannot know that Germany is in the EU."""
    name = "hashed tf-idf (numpy)"

    def __init__(self, dim=1024):
        self.dim, self.idf = dim, np.ones(dim)

    def _features(self, text):
        words = tokenize(text)
        grams = [w[i:i + 4] for w in words for i in range(max(1, len(w) - 3))]
        return words + grams

    def _counts(self, text):
        v = np.zeros(self.dim)
        for f in self._features(text):
            v[zlib.crc32(f.encode()) % self.dim] += 1
        return np.log1p(v)

    def fit(self, texts):
        df = sum((self._counts(t) > 0).astype(float) for t in texts)
        self.idf = np.log((1 + len(texts)) / (1 + df)) + 1
        return self

    def encode(self, texts):
        m = np.stack([self._counts(t) * self.idf for t in texts])
        return m / (np.linalg.norm(m, axis=1, keepdims=True) + 1e-9)


class STEmbedder:
    name = "sentence-transformers all-MiniLM-L6-v2"

    def __init__(self):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def fit(self, texts):
        return self

    def encode(self, texts):
        return np.asarray(self.model.encode(list(texts), normalize_embeddings=True))


def make_embedder(texts):
    if os.getenv("EMBEDDER", "auto") != "hash":
        try:
            return STEmbedder().fit(texts)
        except Exception:          # not installed, or no internet to download the model
            pass
    return HashEmbedder().fit(texts)


# ---------- the retriever used by the support bot ----------

class Retriever:
    def __init__(self, chunks=None):
        self.chunks = chunks or load_chunks()
        texts = [c["doc"] + ". " + c["heading"] + ". " + c["text"] for c in self.chunks]
        self.bm25 = BM25(texts)
        self.emb = make_embedder(texts)
        self.vecs = self.emb.encode(texts)          # one row per chunk, unit length

    def rank(self, query, mode):
        if mode == "bm25":
            return list(np.argsort(-self.bm25.scores(query)))
        sims = self.vecs @ self.emb.encode([query])[0]     # cosine similarity = dot product of unit vectors
        if mode == "vector":
            return list(np.argsort(-sims))
        return rrf([self.rank(query, "bm25"), list(np.argsort(-sims))])

    def search(self, query, k=3, mode="hybrid"):
        return [self.chunks[i] for i in self.rank(query, mode)[:k]]

    def keyword_strength(self, query):
        """Top BM25 score: a cheap signal that the knowledge base mentions the query at all."""
        return float(self.bm25.scores(query).max())


def rrf(rankings, k=60):
    """Reciprocal rank fusion: each list adds 1 / (k + rank) for every item it ranks."""
    score = defaultdict(float)
    for ranking in rankings:
        for r, i in enumerate(ranking):
            score[i] += 1.0 / (k + r + 1)
    return sorted(score, key=lambda i: -score[i])


GOLDEN = [
    ("How long does standard delivery take?", "shipping-options-and-delivery-times#standard-shipping"),
    ("My tracking number has not changed in days, what should I do?", "tracking-your-order#tracking-is-not-updating"),
    ("Is shipping free if I spend 60 dollars?", "shipping-costs#free-shipping-threshold"),
    ("Can I send back a personalized mug?", "returns-policy#items-that-cannot-be-returned"),
    ("How do I get a prepaid label to return something?", "how-to-start-a-return#request-a-return-label"),
    ("When will my money be refunded?", "refunds#refund-timing"),
    ("I ordered by mistake, can I cancel it?", "cancelling-or-changing-an-order#cancel-within-one-hour"),
    ("My vase arrived broken, what do I do?", "damaged-or-missing-items#report-a-problem"),
    ("Do you deliver to Germany?", "shipping-options-and-delivery-times#international-shipping"),
    ("How much is express shipping?", "shipping-costs#express-and-oversized-fees"),
    ("Is there a fee for returning items?", "refunds#store-credit-and-return-shipping"),
    ("Can I change my delivery address?", "cancelling-or-changing-an-order#change-an-address-or-item"),
]


def recall_at_k(retriever, mode, k):
    hits = [gold in [c["id"] for c in retriever.search(q, k, mode)] for q, gold in GOLDEN]
    return sum(hits) / len(hits)


# ---------- exact vs approximate nearest neighbours (IVF) ----------

def kmeans(x, k, iters=10, seed=0):
    rng = np.random.default_rng(seed)
    c = x[rng.choice(len(x), k, replace=False)].copy()
    for _ in range(iters):
        # squared distance to every centroid: |x|^2 - 2 x.c + |c|^2 (the |x|^2 term does not change the argmin)
        assign = np.argmin(-2 * x @ c.T + (c * c).sum(1), axis=1)
        for j in range(k):
            members = x[assign == j]
            if len(members):
                c[j] = members.mean(0)
    return c, assign


def top_k(sims, k):
    """Indices of the k largest values, best first. argpartition avoids sorting everything."""
    k = min(k, len(sims))
    idx = np.argpartition(-sims, k - 1)[:k]
    return idx[np.argsort(-sims[idx])]


class IVFIndex:
    """Inverted file index: cluster the vectors, then search only the nprobe closest clusters."""

    def __init__(self, x, nlist=100):
        self.x = x
        self.centroids, assign = kmeans(x, nlist)
        self.lists = [np.where(assign == j)[0] for j in range(nlist)]

    def search(self, q, k=10, nprobe=4):
        near = np.argsort(-(self.centroids @ q))[:nprobe]
        cand = np.concatenate([self.lists[j] for j in near])
        return cand[top_k(self.x[cand] @ q, k)], len(cand)


def synthetic_vectors(n=60000, dim=64, clusters=50, seed=1):
    """Clustered unit vectors, standing in for a real corpus of document embeddings."""
    rng = np.random.default_rng(seed)
    centers = rng.normal(size=(clusters, dim))
    x = centers[rng.integers(0, clusters, n)] + 1.5 * rng.normal(size=(n, dim))
    x = (x / np.linalg.norm(x, axis=1, keepdims=True)).astype(np.float32)
    q = x[rng.choice(n, 100, replace=False)] + 0.05 * rng.normal(size=(100, dim)).astype(np.float32)
    return x, (q / np.linalg.norm(q, axis=1, keepdims=True)).astype(np.float32)


def ann_benchmark():
    x, queries = synthetic_vectors()
    t = time.perf_counter()
    exact = [top_k(x @ q, 10) for q in queries]
    t_exact = (time.perf_counter() - t) / len(queries) * 1000
    t = time.perf_counter()
    ivf = IVFIndex(x, nlist=100)
    print(f"\n{len(x)} vectors, dim {x.shape[1]}. IVF build (k-means, 100 lists): {time.perf_counter() - t:.1f} s")
    print(f"exact search: {t_exact:.2f} ms/query, scans 100% of vectors, recall@10 = 1.00")
    for nprobe in (1, 2, 4, 8, 16):
        t = time.perf_counter()
        res = [ivf.search(q, 10, nprobe) for q in queries]
        ms = (time.perf_counter() - t) / len(queries) * 1000
        recall = np.mean([len(set(r[0]) & set(e)) / 10 for r, e in zip(res, exact)])
        scanned = np.mean([r[1] for r in res]) / len(x)
        print(f"IVF nprobe={nprobe:2d}: {ms:.2f} ms/query, scans {scanned:5.1%}, recall@10 = {recall:.2f}")
    print("timings vary by machine; the share of vectors scanned is the machine-independent cost")


if __name__ == "__main__":
    r = Retriever()
    print("embedder:", r.emb.name, "| chunks:", len(r.chunks))
    print("inverted index: %d terms; 'refund' appears in chunks %s" % (len(r.bm25.index), sorted(r.bm25.index["refund"])))

    q = "Do you deliver to Germany?"
    for mode in ("bm25", "vector", "hybrid"):
        print(f"\n{mode:>6} top 3 for {q!r}:")
        for c in r.search(q, 3, mode):
            print("    ", c["id"])

    print("\nrecall on a golden set of", len(GOLDEN), "questions")
    print("mode     recall@1  recall@3")
    for mode in ("bm25", "vector", "hybrid"):
        print(f"{mode:<8} {recall_at_k(r, mode, 1):8.2f}  {recall_at_k(r, mode, 3):8.2f}")
    print("(numbers depend on the embedder; with a weak keyword signal, fusion can trail pure vector search)")

    # knowledge-based indexing in miniature: facts stored as (entity, relation, entity) triples
    triples = [("express shipping", "not available for", "oversized items"), ("oversized items", "include", "sofas"),
               ("oversized items", "add fee", "39 dollars"), ("mattresses", "return window", "100 nights")]
    hop1 = [t for t in triples if t[0] == "express shipping"]
    hop2 = [t for _, _, o in hop1 for t in triples if t[0] == o]
    print("\nknowledge graph, 2 hops from 'express shipping':", hop1 + hop2)

    ann_benchmark()
`},
lab: {file: "week9/lab_pq.py", run: "python -m week9.lab_pq",
task: "Implement product quantization: learn a codebook per subspace, encode 60,000 vectors to 8 bytes each, score queries with lookup tables, and recover recall by re-ranking a shortlist exactly.",
steps: ["Run the script. It stops at the first assert because the codebooks are empty.", "Complete <code>train_pq</code>: one k-means with 256 centroids per 8-dimension subspace.", "Complete <code>encode</code>: store the nearest centroid id in each subspace as a uint8.", "Complete <code>adc_scores</code>: build an (m, 256) lookup table from the query, then sum table entries using the codes.", "Compare recall for PQ only and PQ plus re-ranking of 100 and 500 candidates, and answer TODO 4."],
done: "the memory line reports about 32x compression, PQ plus re-ranking 500 candidates reaches recall@10 of at least 0.9, and the final assert passes.",
code: String.raw`
"""Lab: product quantization (PQ). Compress every vector to 8 bytes and still find its neighbours."""
import time

import numpy as np

from week9.search import kmeans, synthetic_vectors, top_k

M = 8      # number of subspaces: a 64-dim vector becomes 8 sub-vectors of 8 dims
KS = 256   # centroids per subspace, so each sub-vector is stored as one byte (0..255)


def train_pq(x, m=M, ks=KS):
    """Return codebooks with shape (m, ks, d/m): one small k-means per subspace."""
    d = x.shape[1] // m
    books = np.zeros((m, ks, d), dtype=np.float32)
    # TODO 1: for each subspace j, run kmeans(x[:, j*d:(j+1)*d], ks, iters=8) and store the centroids in books[j]
    return books


def encode(x, books):
    """Return uint8 codes with shape (n, m): the nearest centroid id in every subspace."""
    m, ks, d = books.shape
    codes = np.zeros((len(x), m), dtype=np.uint8)
    # TODO 2: for each subspace, codes[:, j] = index of the closest centroid in books[j] (squared L2 distance)
    return codes


def adc_scores(q, books, codes):
    """Asymmetric distance computation: approximate q . x for every stored vector from its codes."""
    m, ks, d = books.shape
    scores = np.zeros(len(codes), dtype=np.float32)
    # TODO 3: build a lookup table table[j] = books[j] @ q[j*d:(j+1)*d]  (shape (m, ks)),
    #         then scores = sum over j of table[j][codes[:, j]]. No vector is decompressed.
    return scores


def recall(found, truth):
    return np.mean([len(set(f) & set(t)) / len(t) for f, t in zip(found, truth)])


if __name__ == "__main__":
    x, queries = synthetic_vectors()
    truth = [top_k(x @ q, 10) for q in queries]

    t = time.perf_counter()
    books = train_pq(x[:10000])      # codebooks are learned from a sample, then every vector is encoded
    codes = encode(x, books)
    print(f"trained and encoded {len(x)} vectors in {time.perf_counter() - t:.1f} s")
    ratio = x.nbytes / codes.nbytes
    print(f"memory: float32 {x.nbytes / 1e6:.1f} MB -> codes {codes.nbytes / 1e6:.2f} MB ({ratio:.0f}x smaller)")

    pq_only = [top_k(adc_scores(q, books, codes), 10) for q in queries]
    print(f"PQ only            recall@10 = {recall(pq_only, truth):.2f}")
    for shortlist in (100, 500):
        found = []
        for q in queries:
            cand = top_k(adc_scores(q, books, codes), shortlist)     # cheap approximate shortlist
            found.append(cand[top_k(x[cand] @ q, 10)])               # exact re-rank of the shortlist
        print(f"PQ + rerank {shortlist:3d}    recall@10 = {recall(found, truth):.2f}")

    assert np.abs(books).sum() > 0, "TODO 1: train the codebooks"
    assert ratio >= 30 and recall(found, truth) >= 0.9, "TODO 2/3: encode and score with lookup tables"
    print("done: PQ with re-ranking keeps recall high at a fraction of the memory")
    # TODO 4: in a comment, explain why vector databases often combine IVF (fewer lists to scan)
    #         with PQ (smaller vectors), and what the re-rank step costs you.
`},
takeaways: ["An inverted index plus BM25 is fast and exact for rare terms such as codes, SKUs and names.", "Embeddings match meaning; a knowledge graph answers multi-hop questions over structured facts.", "Exact search is fine up to about a million vectors; IVF, HNSW and PQ trade a little recall for speed or memory.", "Hybrid search fuses keyword and vector rankings with RRF, which uses ranks, not incomparable scores.", "Measure retrieval with recall@k on a labelled golden set before and after every change."],
mcq: [
{q: "With RRF and k = 60, a chunk is ranked 1st by BM25 and 3rd by vector search. What is its fused score?", a: ["0.5", "1.33", "0.0164", "0.0323"], c: 3, why: "1/(60+1) + 1/(60+3) = 0.0164 + 0.0159 = 0.0323."},
{q: "An IVF index has 100 roughly equal clusters and you search with nprobe = 4. About what share of vectors is scanned?", a: ["4%", "40%", "100%", "0.4%"], c: 0, why: "Only the 4 nearest clusters of 100 are searched, about 4% of the vectors (plus the 100 centroid comparisons)."},
{q: "Customers search for 'error E-4012 at checkout'. Which retriever most reliably finds the article with that exact code?", a: ["Vector search with a general embedding model", "BM25 keyword search", "Random sampling of chunks", "A knowledge graph of product categories"], c: 1, why: "A rare exact token gets a high idf in BM25; a general embedding model has no learned meaning for an internal code."}
]
},
{
id: "9.3", title: "Generation with citations, RAFT and RAG evaluation", mins: 75, kicker: "grounding prompts, Claude document citations, RAFT, faithfulness, LLM judges, system design",
focus: "deciding what a support bot should do when retrieval is weak, and how to prove its answers are grounded",
pip: [],
deps: ["9.1", "9.2"],
runNote: "Offline it answers extractively from the top passages. With an API key it calls Claude with document citations and a fast model as judge.",
body: `<p>Retrieval hands you a few passages. Generation turns them into an answer a customer can trust, and evaluation tells you whether it actually is.</p>
<h4>Prompting for RAG</h4>
<ul><li><b>Ground:</b> "Answer only from the documents provided." Put the documents before the question.</li>
<li><b>Allow "I don't know":</b> give the exact words to use when the documents don't contain the answer, and what to suggest instead (contact support).</li>
<li><b>Quote or cite:</b> ask for exact numbers and for a source on each claim. Quoting first and answering second reduces drift.</li>
<li><b>Never invent policies:</b> name the risky categories (prices, dates, eligibility) explicitly.</li></ul>
<h4>Claude document citations</h4>
<p>Instead of pasting passages as plain text, send each one as a <b>document content block</b> with citations enabled. The model's answer then comes back as text blocks with <code>citations</code> attached, each giving the document title and the exact <code>cited_text</code>, so your UI can show precise sources without asking the model to format them.</p>
<pre class="code" style="border-radius:10px"><code>doc = {"type": "document",
       "source": {"type": "text", "media_type": "text/plain", "data": chunk_text},
       "title": "Refunds &gt; Refund timing",
       "citations": {"enabled": True}}
ask([doc, other_doc, {"type": "text", "text": question}])        # text only
resp = create([{"role": "user", "content": [doc, other_doc, {"type": "text", "text": question}]}])
for block in resp.content:                                       # citations live on text blocks
    for c in (block.citations or []): print(c.document_title, c.cited_text)</code></pre>
<p>Use <code>ask</code> when you only need the text; use <code>create</code>, as the demo does, to read the citation objects.</p>
<h4>RAFT: training a model to use retrieved documents well</h4>
<p>Retrieval-augmented fine-tuning (<b>RAFT</b>) prepares a model for "open-book exams" in one domain. Each training example has a question, the <b>oracle</b> document that answers it, several <b>distractor</b> documents that look relevant but aren't, and a target answer written as chain-of-thought that quotes the oracle (for example between <code>##begin_quote##</code> markers) before concluding. In a share of examples, often around 20 percent, the oracle is left out, so the model learns not to over-trust whatever was retrieved. RAFT helps most when you serve an open-weight model on a specialised corpus; with a strong assistant model, good prompting and citations usually come first. The lab builds RAFT examples from the help center.</p>
<h4>Evaluating a RAG system</h4>
<div class="tablewrap"><table><thead><tr><th>Metric</th><th>Question it answers</th><th>How to measure</th></tr></thead><tbody>
<tr><td>Context relevance</td><td>Did retrieval find the passage that answers the question?</td><td>Golden chunk in the top k (recall@k), or an LLM judge rating each passage</td></tr>
<tr><td>Faithfulness (groundedness)</td><td>Is every claim in the answer supported by the retrieved passages?</td><td>LLM judge with the passages and answer; lexical overlap as a cheap first check</td></tr>
<tr><td>Answer correctness</td><td>Is the answer right and complete?</td><td>Key facts from a reference answer present; LLM judge against the reference</td></tr></tbody></table></div>
<p>The three metrics separate failures. Low relevance means fix retrieval. High relevance but low faithfulness means the model is adding things: tighten the prompt. High faithfulness but low correctness means the answer is grounded in the wrong sentence, which the demo's offline extractive bot shows clearly. Use a fast, cheap model (here <code>FAST_MODEL</code>) as the judge, ask for JSON, and spot-check its verdicts against your own.</p>
<h4>Putting it together</h4>
<p>A production RAG service adds a <b>weak-retrieval gate</b> (refuse or escalate when nothing relevant was found), access filters on metadata, caching of frequent questions, logging of every question, passage and answer, and a nightly evaluation over the golden set so a changed document or prompt can't silently break answers.</p>`,
example: ["The refund-timing ticket spike", `An online pharmacy's support bot started telling customers refunds took "3 business days". The help center said returns are inspected within 3 days and refunds appear 5 to 7 business days after approval. Retrieval was fine (context relevance 100%) and the answer was faithful to a real sentence, but the wrong one: correctness on refund questions was 40%. Adding "include every timing the documents give, and say which step it refers to" to the prompt, plus three refund questions to the golden set, brought correctness back to 100% and the ticket spike stopped.`],
diagram: {title: "A RAG service end to end", caption: "The retriever reads the index, a gate refuses when retrieval is weak, the model answers with citations, and an evaluator scores relevance, faithfulness and correctness on a golden set and on sampled live traffic.",
  cols: [[["user", "Customer", "question", "user"]], [["ret", "Hybrid retriever", "BM25 + vectors", "core"], ["kb", "Help-center index", "chunks + metadata", "store"]], [["gate", "Weak-retrieval gate", "else: I don't know", "guard"]], [["gen", "Claude", "document citations", "core"]], [["ev", "Evaluator", "relevance, faithfulness", "guard"], ["gold", "Golden set + logs", "nightly regression", "store"]]],
  edges: [["user", "ret", "question"], ["kb", "ret"], ["ret", "gate", "top-k"], ["gate", "gen", "passages", "hot"], ["gen", "ev"], ["ev", "gold"], ["gen", "user", "cited answer", "dash"]]},
demo: {file: "week9/support_bot.py", run: "python -m week9.support_bot", what: "The customer support chatbot end to end: hybrid retrieval over the help center, an answer with Claude document citations (or an extractive cited answer offline), a refusal when retrieval is weak, and an evaluation table with context relevance, lexical support, an LLM judge verdict and answer correctness.",
code: String.raw`
"""Demo: a cited customer support chatbot (retrieve -> generate with citations -> evaluate).

With ANTHROPIC_API_KEY set, Claude answers from the retrieved help-center passages using
document citations, and a fast model judges faithfulness. Offline, the bot answers
extractively: it returns the best-matching sentence of the top passage and cites it.
"""
import json
import re

from common.llm import FAST_MODEL, OFFLINE, create, text_of
from week9.search import Retriever, tokenize

SYSTEM = """You are the support assistant for Lumen Market, an online store.
Answer ONLY from the help-center documents in the user's message.
- Keep the answer to 2-4 sentences and include the exact numbers (days, dollars) the documents give.
- If the documents do not contain the answer, say "I don't know based on our help center" and suggest contacting support.
- Never invent policies, prices or dates."""

DONT_KNOW = "I don't know based on our help center. Please contact support and a person will help."
MIN_KEYWORD_SCORE = 2.0   # below this top BM25 score, treat retrieval as too weak to answer


def as_documents(chunks):
    """One citable document content block per retrieved chunk."""
    return [{"type": "document",
             "source": {"type": "text", "media_type": "text/plain", "data": c["text"]},
             "title": c["doc"] + " > " + c["heading"],
             "citations": {"enabled": True}} for c in chunks]


def render_citations(resp):
    """Join text blocks, adding [n] markers after cited spans. Returns (answer, sources)."""
    out, sources = [], []
    for b in resp.content:
        if b.type != "text":
            continue
        out.append(b.text)
        for c in (getattr(b, "citations", None) or []):
            title = getattr(c, "document_title", None) or "document %d" % (getattr(c, "document_index", 0) + 1)
            key = (title, c.cited_text.strip())
            if key not in sources:
                sources.append(key)
            out.append(f" [{sources.index(key) + 1}]")
    return "".join(out).strip(), sources


def best_sentence(question, chunks):
    """Extractive answer: the retrieved sentence sharing the most words with the question.
    Ties go to the higher-ranked chunk. Returns (chunk, sentence)."""
    q = set(tokenize(question))
    scored = []
    for rank, c in enumerate(chunks):
        for s in re.split(r"(?<=[.!?])\s+", c["text"]):
            scored.append((len(q & set(tokenize(s))) - 0.1 * rank, c, s))
    best = max(scored, key=lambda t: t[0])
    return best[1], best[2]


def answer(question, retriever, k=3):
    """Return (answer text, sources, retrieved chunks)."""
    chunks = retriever.search(question, k)
    if OFFLINE:
        if retriever.keyword_strength(question) < MIN_KEYWORD_SCORE:
            return DONT_KNOW, [], chunks
        top, s = best_sentence(question, chunks)
        return s + " [1]", [(top["doc"] + " > " + top["heading"], s)], chunks
    content = as_documents(chunks) + [{"type": "text", "text": question}]
    resp = create([{"role": "user", "content": content}], system=SYSTEM, max_tokens=1500, effort="low")
    text, sources = render_citations(resp)
    return text, sources, chunks


# ---------- evaluation ----------

EVAL = [  # (question, id of the chunk that holds the answer, facts a correct answer must contain)
    ("How long does standard shipping take?", "shipping-options-and-delivery-times#standard-shipping", ["3 to 5"]),
    ("Is shipping free on a 60 dollar order?", "shipping-costs#free-shipping-threshold", ["50"]),
    ("Can I return a gift card?", "returns-policy#items-that-cannot-be-returned", ["gift card"]),
    ("How many days until a refund appears?", "refunds#refund-timing", ["5 to 7"]),
    ("Until when can I cancel an order myself?", "cancelling-or-changing-an-order#cancel-within-one-hour", ["1 hour"]),
    ("How soon must I report a damaged item?", "damaged-or-missing-items#report-a-problem", ["48 hours"]),
    ("What does express shipping cost?", "shipping-costs#express-and-oversized-fees", ["14.99"]),
    ("Do you sell electric bikes?", None, []),
    ("Can I pay with cryptocurrency?", None, []),
]


def lexical_support(answer_text, chunks):
    """Share of the answer's content words that appear in the retrieved context (a cheap faithfulness proxy)."""
    if answer_text.startswith(DONT_KNOW[:20]):
        return 1.0          # a refusal makes no claims, so it cannot be unfaithful
    words = [w for w in tokenize(re.sub(r"\[\d+\]", "", answer_text)) if len(w) > 2]
    context = set(tokenize(" ".join(c["text"] for c in chunks)))
    return sum(w in context for w in words) / max(1, len(words))


def llm_judge(question, answer_text, chunks):
    """Ask a fast model whether every claim in the answer is supported by the context."""
    context = "\n".join("- " + c["text"] for c in chunks)
    prompt = ("Context:\n" + context + "\n\nQuestion: " + question + "\nAnswer: " + answer_text +
              '\n\nIs every factual claim in the answer supported by the context? A refusal counts as supported. '
              'Reply with JSON only: {"supported": true or false, "reason": "one short sentence"}')
    resp = create([{"role": "user", "content": prompt}], model=FAST_MODEL, max_tokens=300, effort="low")
    m = re.search(r"\{.*\}", text_of(resp), re.S)
    return json.loads(m.group(0)) if m else {"supported": None, "reason": "unparseable"}


def evaluate(retriever):
    rows = []
    for q, gold, facts in EVAL:
        ans, sources, chunks = answer(q, retriever)
        relevant = "n/a" if gold is None else gold in [c["id"] for c in chunks]
        if gold is None:
            correct = "don't know" in ans.lower()
        else:
            correct = all(f.lower() in ans.lower() for f in facts)
        faithful = lexical_support(ans, chunks)
        judge = None if OFFLINE else llm_judge(q, ans, chunks).get("supported")
        rows.append((q, relevant, faithful, judge, correct))
    return rows


if __name__ == "__main__":
    r = Retriever()
    print("mode:", "OFFLINE extractive fallback" if OFFLINE else "Claude with document citations", "| embedder:", r.emb.name)
    for q in ["My parcel arrived damaged. What should I do?", "Do you sell electric bikes?"]:
        ans, sources, chunks = answer(q, r)
        print("\nQ:", q)
        print("retrieved:", [c["id"] for c in chunks])
        print("A:", ans)
        for i, (title, quote) in enumerate(sources, 1):
            print(f"   [{i}] {title}: \"{quote[:90]}\"")

    print("\nRAG evaluation")
    print(f"{'question':<44} ctx-relevant  lexical-support  judge  correct")
    rows = evaluate(r)
    for q, rel, faith, judge, ok in rows:
        print(f"{q[:43]:<44} {str(rel):>12}  {faith:15.2f}  {'-' if judge is None else str(judge):>5}  {str(ok):>7}")
    n = len(rows)
    answerable = [r for r in rows if r[1] != "n/a"]
    print(f"\ncontext relevance {sum(r[1] for r in answerable) / len(answerable):.0%} | mean lexical support {sum(r[2] for r in rows) / n:.2f}"
          f" | answer correctness {sum(r[4] for r in rows) / n:.0%}")
    if OFFLINE:
        print("Offline answers copy a retrieved sentence, so they are always faithful, but the word-overlap pick is\n"
              "sometimes the wrong sentence. That is why correctness is measured separately from faithfulness.")
`},
lab: {file: "week9/lab_rag_eval.py", run: "python -m week9.lab_rag_eval",
task: "Tune the weak-retrieval threshold that decides when the bot says \"I don't know\", then generate RAFT-style training examples with oracle and distractor documents and cited chain-of-thought targets.",
steps: ["Run the script and read the BM25 scores of answerable and unanswerable questions.", "Complete <code>best_threshold</code>: try each observed score as a threshold and keep the one with the most correct decisions.", "Complete <code>raft_example</code>: add the oracle to the distractors about 80% of the time, shuffle, and write a target that quotes the oracle sentence between <code>##begin_quote##</code> and <code>##end_quote##</code>.", "Open <code>raft_train.jsonl</code> and read two examples.", "Answer TODO 4: which mistake is worse for a support bot, and which way would you move the threshold?"],
done: "the threshold gets at least 10 of 12 decisions right, raft_train.jsonl has 21 examples with the oracle present in between 50% and 100% of them, every target contains a quote, and the final line says all checks passed.",
code: String.raw`
"""Lab: tune when the bot says "I don't know", and build RAFT-style training examples."""
import json
import random

from week9.search import Retriever
from week9.support_bot import EVAL, best_sentence

UNANSWERABLE = ["Do you sell electric bikes?", "Can I pay with cryptocurrency?", "Do you price match?",
                "What are your store opening hours?", "Do you offer gift wrapping?"]


def best_threshold(retriever, answerable, unanswerable):
    """Return the BM25 threshold that best separates answerable from unanswerable questions."""
    pos = [retriever.keyword_strength(q) for q in answerable]
    neg = [retriever.keyword_strength(q) for q in unanswerable]
    print("top BM25 score, answerable:  ", sorted(round(s, 2) for s in pos))
    print("top BM25 score, unanswerable:", sorted(round(s, 2) for s in neg))
    # TODO 1: try every candidate threshold t (use the observed scores) and return the t with the most
    #         correct decisions: answerable questions need score >= t, unanswerable ones score < t.
    return 0.0


def raft_example(question, oracle, all_chunks, n_distractors=3, p_oracle=0.8, rng=random):
    """One RAFT training example: the question, shuffled documents, and a cited chain-of-thought answer."""
    others = [c for c in all_chunks if c["id"] != oracle["id"]]
    docs = rng.sample(others, n_distractors)
    # TODO 2: with probability p_oracle, add the oracle chunk to docs (RAFT also keeps some examples
    #         WITHOUT the oracle so the model learns not to over-trust whatever is retrieved). Shuffle docs.
    # TODO 3: build the target answer with best_sentence(question, [oracle]):
    #         "Reasoning: the document '<heading>' says ##begin_quote##<sentence>##end_quote##. Answer: <sentence>"
    target = ""
    return {"question": question, "documents": [d["text"] for d in docs],
            "oracle_in_context": any(d["id"] == oracle["id"] for d in docs), "target": target}


if __name__ == "__main__":
    r = Retriever()
    answerable = [q for q, gold, _ in EVAL if gold]
    t = best_threshold(r, answerable, UNANSWERABLE)
    refused = [q for q in UNANSWERABLE if r.keyword_strength(q) < t]
    answered = [q for q in answerable if r.keyword_strength(q) >= t]
    print(f"\nthreshold {t:.2f}: refuses {len(refused)}/{len(UNANSWERABLE)} unanswerable, answers {len(answered)}/{len(answerable)} answerable")
    correct = len(refused) + len(answered)
    print(f"correct decisions: {correct}/{len(UNANSWERABLE) + len(answerable)}")
    # A keyword threshold alone cannot separate every case: some unanswerable questions share words with
    # the help center. Production bots add a second check (the model itself, or a relevance judge).
    # TODO 4: which mistake is worse for a support bot, refusing an answerable question or answering an
    #         unanswerable one? Would you move the threshold up or down? Answer in a comment.

    rng = random.Random(0)
    by_id = {c["id"]: c for c in r.chunks}
    examples = [raft_example(q, by_id[gold], r.chunks, rng=rng) for q, gold, _ in EVAL if gold for _ in range(3)]
    with open("raft_train.jsonl", "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")
    share = sum(e["oracle_in_context"] for e in examples) / len(examples)
    print(f"\nwrote {len(examples)} RAFT examples to raft_train.jsonl, oracle present in {share:.0%}")
    print("example target:", examples[0]["target"][:160])

    assert t > 0 and correct >= 10, "TODO 1: pick a threshold that gets at least 10 of 12 decisions right"
    assert all(len(e["documents"]) in (3, 4) for e in examples) and 0.5 < share < 1.0, "TODO 2: add the oracle most of the time"
    assert all("##begin_quote##" in e["target"] for e in examples), "TODO 3: write cited targets"
    print("all checks passed")
`},
takeaways: ["Ground the model: documents first, answer only from them, exact words for \"I don't know\", no invented policies.", "Claude document blocks with citations enabled return the exact cited text and document for each claim.", "RAFT fine-tunes on questions with oracle plus distractor documents and quoted chain-of-thought answers, sometimes without the oracle.", "Context relevance, faithfulness and answer correctness separate retrieval, grounding and reasoning failures.", "A production RAG service adds a weak-retrieval gate, metadata filters, logging and a nightly golden-set evaluation."],
mcq: [
{q: "An answer cites the right passage but states a fee that appears nowhere in it. Which metric flags this?", a: ["Context relevance", "Recall@k", "Faithfulness (groundedness)", "Perplexity"], c: 2, why: "Faithfulness checks that every claim is supported by the retrieved passages; the invented fee is not."},
{q: "Why does RAFT include distractor documents, and leave out the oracle in some examples?", a: ["So the model learns to ignore irrelevant passages and not over-trust retrieval", "To cut token costs during training", "Because the oracle is unknown at training time", "To train the BM25 index"], c: 0, why: "Training with distractors and occasional missing oracles teaches the model to pick the right evidence and to rely on its own knowledge when the evidence is absent."},
{q: "Your bot confidently answers questions the help center does not cover. What is the cheapest first fix?", a: ["Fine-tune a larger model", "Increase chunk overlap", "Raise max_tokens", "A \"say you don't know\" instruction plus a weak-retrieval gate"], c: 3, why: "A refusal instruction and a gate on retrieval strength stop most unsupported answers at almost no cost."}
]
}
],
quiz: [
{q: "What is the main reason to use RAG rather than fine-tuning for a store's help center?", a: ["Help-center facts change often and answers should cite their source", "RAG makes the model better at arithmetic", "Fine-tuning cannot change a model's behaviour", "RAG removes the need for a prompt"], c: 0, why: "RAG picks up document changes immediately and supports citations; fine-tuning bakes facts into weights."},
{q: "Why does heading-aware chunking often beat fixed-size windows on documentation?", a: ["It always produces fewer tokens", "It removes the need for embeddings", "Chunks follow the document's own topics and keep the heading as context", "It works without parsing"], c: 2, why: "Sections are natural units of meaning, and the heading path tells the reader what the chunk is about."},
{q: "In BM25, what does the parameter b control?", a: ["How many results are returned", "How strongly long chunks are normalised by their length", "The embedding dimension", "The learning rate"], c: 1, why: "b = 0 ignores length; b = 1 fully normalises term frequency by chunk length relative to the average."},
{q: "When is exact (brute-force) vector search a sensible choice?", a: ["Never, approximate search is always better", "Only with knowledge graphs", "Only for keyword queries", "For up to roughly a million vectors when a full scan fits the latency budget"], c: 3, why: "Exact search has perfect recall, and a matrix product over a modest corpus is fast enough; ANN pays off at larger scale."},
{q: "How does product quantization save memory?", a: ["It deletes rare vectors", "It stores each sub-vector as the id of its nearest centroid", "It converts vectors to text", "It reduces the number of chunks"], c: 1, why: "With 256 centroids per subspace, each sub-vector costs one byte instead of several floats."},
{q: "Why does reciprocal rank fusion use ranks instead of raw scores?", a: ["BM25 and cosine scores are on different scales, but ranks are comparable", "Ranks are faster to store", "Scores are always negative", "Ranks remove the need for a golden set"], c: 0, why: "A BM25 score of 8 and a cosine of 0.6 can't be added meaningfully; positions in each list can."},
{q: "With document blocks and citations enabled, what does Claude return?", a: ["A BibTeX bibliography", "Embeddings of each document", "Text blocks whose citations name the document and the exact cited text", "A guarantee that the answer is correct"], c: 2, why: "Each cited span carries a citation object, so the application can show precise sources."},
{q: "Context relevance and faithfulness are high, but answer correctness is low. What is the most likely problem?", a: ["The retriever missed the right chunk", "The index is out of date", "The model invented facts not in the passages", "The answer is grounded in a real but wrong sentence from the right context"], c: 3, why: "Relevance says the right passage was retrieved and faithfulness says nothing was invented, so the answer used the wrong supported fact."}
],
checkpoint: `Your chunker keeps every fact sentence whole, your hybrid retriever reports recall@k on a golden set, your PQ index compresses vectors 32x and still reaches recall@10 of 0.9 with re-ranking, and your support bot answers with citations, refuses when retrieval is weak and prints an evaluation table. Keep <code>week9/</code>: in week 10 you hand tools to an agent, and in the capstone the same retrieval and citation code powers a deep-research assistant.`
});
