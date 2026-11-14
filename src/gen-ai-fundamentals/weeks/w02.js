W({
n: 2, title: "Embeddings and Positional Encoding", short: "Embeddings + positions", hours: "6–8 hours",
goal: "Turn token ids into vectors that carry meaning, give those vectors a sense of order, and use sentence embeddings to search text by meaning.",
builds: "An embedding table and similarity explorer trained with a word2vec-style skip-gram in numpy, sinusoidal and rotary position encodings with a check that RoPE depends only on relative offset, and a small semantic search engine over help-center sentences.",
outcomes: [
  "Explain the embedding matrix as a lookup table and show that one-hot times matrix equals reading a row.",
  "Measure similarity with cosine and dot product, solve analogies, and train embeddings from co-occurrence.",
  "Explain why attention is order-blind and compare learned, sinusoidal, rotary (RoPE) and ALiBi position schemes.",
  "Implement RoPE and verify that the query-key score depends only on the distance between tokens.",
  "Build and evaluate a semantic search engine, and reason about embedding dimensions, normalization and cost."
],
lessons: [
{
id: "2.1", title: "Token embeddings: from ids to meaningful vectors", mins: 60, kicker: "one-hot vs dense, the embedding matrix, cosine similarity, skip-gram, weight tying",
focus: "why a learned lookup table ends up placing similar words close together, and how the same matrix can serve as the output layer",
pip: [],
body: `<p>Last week ended with token ids: integers like 464 or 3290. An id is just a name tag. The number 464 is not "closer" to 465 than to 9000 in any useful sense, so the model needs a richer representation. That representation is the <b>embedding</b>: a list of a few hundred or a few thousand real numbers for every token in the vocabulary.</p>
<h4>From one-hot to dense</h4>
<p>The simplest way to feed an id to a neural network is a <b>one-hot vector</b>: as long as the vocabulary, all zeros except a 1 at the token's position. With a 50,000-token vocabulary that's 50,000 numbers per token, and every pair of different tokens is equally far apart. Multiplying a one-hot vector by a weight matrix <code>E</code> of shape <code>(vocab_size, d_model)</code> picks out exactly one row of <code>E</code>. So frameworks skip the multiplication and simply index the row. That's all an embedding layer is: a trainable table with one row per token.</p>
<div class="math">x = one_hot(id) · E  =  E[id]
E has shape (vocab_size, d_model), for example (50,000, 768)</div>
<p>Here <code>vocab_size</code> is the number of tokens the tokenizer knows, and <code>d_model</code> is the width of every vector inside the model. The table starts random and is updated by gradient descent like every other weight.</p>
<h4>Geometry: what "close" means</h4>
<ul><li><b>Dot product</b> <code>a · b</code>: multiply matching entries and add them up. Large when the vectors point the same way and are long.</li>
<li><b>Cosine similarity</b> <code>(a · b) / (|a| |b|)</code>: the dot product divided by both lengths, so only the direction counts. It ranges from -1 (opposite) through 0 (unrelated) to 1 (same direction).</li>
<li><b>Analogies</b>: if directions encode features, then <code>king - man + woman</code> lands near <code>queen</code>, because subtracting "man" removes a male direction and adding "woman" adds a female one. Real embeddings only approximately behave this way, but it shows that directions can carry meaning.</li></ul>
<h4>How embeddings are learned</h4>
<p>No one labels dimensions as "royal" or "edible". The meaning comes from the training objective. In a full LLM, the embedding rows receive gradients from the next-token loss, so tokens that play similar roles get pushed toward similar vectors. The classic, smaller demonstration is <b>word2vec skip-gram</b>: for each word, predict the words around it within a small window. Words that appear in the same contexts ("the ___ eats grass", "the farmer feeds the ___") must produce similar predictions, so their vectors drift together. This is the distributional idea: a word is known by the company it keeps.</p>
<p>The demo trains skip-gram with plain numpy. Only the rows that were looked up get a gradient on each step, which is why embedding tables are often updated with sparse operations in large systems.</p>
<h4>Input embeddings, output embeddings and weight tying</h4>
<p>At the very end of a language model, the final hidden vector <code>h</code> (length <code>d_model</code>) must become one score per vocabulary token. That's another matrix of shape <code>(vocab_size, d_model)</code>, often called the <b>unembedding</b> or LM head: <code>logits = h · U<sup>T</sup></code>. <b>Weight tying</b> uses the input embedding matrix for this too (<code>U = E</code>). It saves <code>vocab_size × d_model</code> parameters (38 million for a 50,000 × 768 table) and often helps small models, because a token's input meaning and output meaning are related. Many large models untie them to gain flexibility.</p>
<div class="tablewrap"><table><thead><tr><th>Piece</th><th>Shape</th><th>Job</th></tr></thead><tbody>
<tr><td>Embedding table E</td><td>(vocab_size, d_model)</td><td>id → vector at the input</td></tr>
<tr><td>Unembedding U</td><td>(vocab_size, d_model)</td><td>vector → one score per token at the output</td></tr>
<tr><td>Tied model</td><td>U = E</td><td>one matrix, used at both ends</td></tr></tbody></table></div>`,
example: ["Product search that understands 'sneakers'", `An online shoe store logs which items shoppers view in the same session. Training a skip-gram model on those sessions (treating each product id as a "word") gives every product an embedding. "Running sneakers" and "trail runners" end up close because shoppers browse them together, even though their titles share no words. The store uses cosine similarity between product vectors for its "customers also viewed" row, the same math you'll use on words in this lesson.`],
diagram: {title: "From token id to vector and back to scores", caption: "The embedding table turns an id into a vector at the input. The transformer layers transform it. The unembedding turns the last vector into one score per token; with weight tying it is the same matrix.",
  lanes: ["tokenizer", "lookup", "model", "output", "next token"],
  cols: [[["ids", "Token ids", "e.g. [464, 3290]", "ext"]], [["E", "Embedding table E", "vocab x d_model", "store"]], [["blocks", "Transformer layers", "weeks 3 and 4", "core"]], [["U", "Unembedding", "h times E transposed", "core"]], [["probs", "Next-token scores", "softmax over vocab", "user"]]],
  edges: [["ids", "E", "row lookup", "hot"], ["E", "blocks", "vectors"], ["blocks", "U"], ["U", "probs"], ["U", "E", "weight tying", "dash"]]},
demo: {file: "week2/embeddings.py", run: "python -m week2.embeddings", what: "Shows that a one-hot vector times the embedding matrix equals a row lookup, measures cosine similarity and solves an analogy on hand-made vectors, trains a skip-gram model with numpy so animals, fruits and vehicles cluster, and counts the parameters weight tying saves.",
code: String.raw`
"""Demo: token embeddings as a lookup table, and learning them with skip-gram.

1. A one-hot vector times the embedding matrix is the same as reading one row.
2. Cosine similarity and analogies on a tiny hand-made embedding.
3. A word2vec-style skip-gram model trained with numpy: words that share
   contexts end up with similar vectors.
4. Weight tying: the output layer can reuse the input embedding matrix.
"""
import random

import numpy as np

GROUPS = {
    "animal": ["cat", "dog", "horse", "cow"],
    "fruit": ["apple", "banana", "mango", "orange"],
    "vehicle": ["car", "bus", "truck", "train"],
}
TEMPLATES = {
    "animal": ["the {} eats grass in the field", "a {} sleeps in the barn at night", "the farmer feeds the {} every morning"],
    "fruit": ["she ate a ripe {} for lunch", "the {} is sweet and juicy", "buy a fresh {} at the market"],
    "vehicle": ["he drove the {} to work", "the {} stopped at the station", "the {} needs fuel and new tires"],
}


def make_corpus(n=600, seed=0):
    """Sentences where words of the same group appear in the same kinds of context."""
    rng = random.Random(seed)
    sents = []
    for _ in range(n):
        g = rng.choice(list(GROUPS))
        sents.append(rng.choice(TEMPLATES[g]).format(rng.choice(GROUPS[g])).split())
    return sents


def build_vocab(sents):
    words = sorted({w for s in sents for w in s})
    return words, {w: i for i, w in enumerate(words)}


def skipgram_pairs(sents, w2i, window=2):
    """(center, context) id pairs: every word predicts its neighbors within the window."""
    pairs = []
    for s in sents:
        ids = [w2i[w] for w in s]
        for i, c in enumerate(ids):
            for j in range(max(0, i - window), min(len(ids), i + window + 1)):
                if j != i:
                    pairs.append((c, ids[j]))
    return np.array(pairs)


def softmax(z):
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def train_skipgram(sents, dim=16, epochs=150, lr=0.5, seed=0):
    """Full-softmax skip-gram: P(context | center) = softmax(E_in[center] @ E_out.T)."""
    words, w2i = build_vocab(sents)
    pairs = skipgram_pairs(sents, w2i)
    V = len(words)
    rng = np.random.default_rng(seed)
    E_in = rng.normal(0, 0.1, (V, dim))     # the embedding table we keep
    E_out = rng.normal(0, 0.1, (V, dim))    # output vectors, used only for training
    centers, contexts = pairs[:, 0], pairs[:, 1]
    N = len(pairs)
    losses = []
    for ep in range(epochs):
        h = E_in[centers]                    # (N, dim): lookup = embedding
        probs = softmax(h @ E_out.T)         # (N, V)
        losses.append(-np.log(probs[np.arange(N), contexts] + 1e-12).mean())
        grad_logits = probs
        grad_logits[np.arange(N), contexts] -= 1.0
        grad_logits /= N
        grad_E_out = grad_logits.T @ h                       # (V, dim)
        grad_h = grad_logits @ E_out                         # (N, dim)
        grad_E_in = np.zeros_like(E_in)
        np.add.at(grad_E_in, centers, grad_h)                # only looked-up rows get gradient
        E_in -= lr * grad_E_in * V / 4
        E_out -= lr * grad_E_out * V / 4
    return E_in, words, w2i, losses


def cosine_matrix(E):
    En = E / np.linalg.norm(E, axis=1, keepdims=True)
    return En @ En.T


def neighbors(E, words, w2i, word, k=3):
    sims = cosine_matrix(E)[w2i[word]]
    order = [i for i in np.argsort(-sims) if i != w2i[word]]
    return [(words[i], round(float(sims[i]), 2)) for i in order[:k]]


# A hand-made embedding with interpretable dimensions: [royal, male, female, person, food]
TOY = {
    "king": [0.9, 0.9, 0.0, 1.0, 0.0], "queen": [0.9, 0.0, 0.9, 1.0, 0.0],
    "man": [0.0, 0.9, 0.0, 1.0, 0.0], "woman": [0.0, 0.0, 0.9, 1.0, 0.0],
    "prince": [0.7, 0.9, 0.0, 0.9, 0.0], "apple": [0.0, 0.0, 0.0, 0.1, 1.0],
}
TOY = {w: np.array(v) for w, v in TOY.items()}


if __name__ == "__main__":
    # 1. lookup = one-hot times matrix
    V, d = 6, 4
    E = np.arange(V * d, dtype=float).reshape(V, d) / 10
    one_hot = np.zeros(V)
    one_hot[2] = 1
    print("embedding matrix shape (vocab_size, d_model):", E.shape)
    print("one_hot @ E :", one_hot @ E)
    print("E[2]        :", E[2], " -> identical, so frameworks just index the row")

    # 2. geometry on hand-made vectors
    def cos(a, b):
        return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))
    print("\ncos(king, queen) = %.2f   cos(king, apple) = %.2f" % (cos(TOY["king"], TOY["queen"]), cos(TOY["king"], TOY["apple"])))
    target = TOY["king"] - TOY["man"] + TOY["woman"]
    best = max((w for w in TOY if w not in ("king", "man", "woman")), key=lambda w: cos(target, TOY[w]))
    print("king - man + woman is closest to:", best)

    # 3. learn embeddings from co-occurrence
    sents = make_corpus()
    E_in, words, w2i, losses = train_skipgram(sents)
    print("\ntrained skip-gram on %d sentences, vocab %d, loss %.3f -> %.3f" % (len(sents), len(words), losses[0], losses[-1]))
    for w in ("cat", "mango", "bus"):
        print(f"  nearest to {w:6s}: {neighbors(E_in, words, w2i, w)}")
    S = cosine_matrix(E_in)
    print("  cos(cat, dog) = %.2f   cos(cat, mango) = %.2f   cos(cat, bus) = %.2f" % (
        S[w2i["cat"], w2i["dog"]], S[w2i["cat"], w2i["mango"]], S[w2i["cat"], w2i["bus"]]))

    # 4. weight tying: output logits = hidden @ E.T, so one matrix serves both ends
    vocab, d_model = 50_000, 768
    print("\nembedding params: %.1fM; untied input+output: %.1fM; tied: %.1fM" % (vocab * d_model / 1e6, 2 * vocab * d_model / 1e6, vocab * d_model / 1e6))
    h = E_in[w2i["the"]]
    logits = h @ E_in.T                       # tied unembedding, just to show the shape
    print("tied logits shape for one hidden vector:", logits.shape)
`},
lab: {file: "week2/lab_embeddings.py", run: "python -m week2.lab_embeddings",
task: "Build your own similarity explorer (cosine, nearest neighbors, analogies) and measure how embedding size changes how well words cluster by meaning.",
steps: ["Run the script. It stops at the first assert because <code>cosine</code> is not written yet.", "Complete <code>cosine</code>, then <code>most_similar</code>, which returns the k closest words with their scores.", "Complete <code>analogy</code> so that <code>man : king :: woman : ?</code> returns <code>queen</code>.", "Read the table of embedding size versus group purity, then answer TODO 4 in a comment."],
done: "all asserts pass, the table shows group purity of at least 0.9 at dim 16, the nearest neighbors of <code>horse</code> are other animals, and your comment explains the effect of dimension.",
code: String.raw`
"""Lab: build your own similarity explorer, and test how embedding size matters."""
import numpy as np

from week2.embeddings import GROUPS, TOY, make_corpus, train_skipgram


def cosine(a, b):
    # TODO 1: return the cosine similarity of vectors a and b: (a . b) / (|a| |b|)
    return 0.0


def most_similar(E, words, w2i, word, k=3):
    # TODO 2: return the k words (not the word itself) with the highest cosine similarity to word,
    #         as a list of (word, similarity) pairs, best first. Use your cosine().
    return []


def analogy(vecs, a, b, c):
    """a is to b as c is to ?  ->  the word closest to vecs[b] - vecs[a] + vecs[c]."""
    # TODO 3: compute the target vector and return the closest word that is not a, b or c
    return None


def group_purity(E, words, w2i, k=3):
    """Share of each group word's top-k neighbors that belong to the same group."""
    hits, total = 0, 0
    for group, members in GROUPS.items():
        for w in members:
            for n, _ in most_similar(E, words, w2i, w, k):
                hits += n in members
                total += 1
    return hits / max(total, 1)


if __name__ == "__main__":
    a, b = np.array([1.0, 2.0, 0.0]), np.array([2.0, 4.0, 0.0])
    print("cosine of parallel vectors:", cosine(a, b))
    assert abs(cosine(a, b) - 1.0) < 1e-9, "TODO 1: cosine of parallel vectors should be 1"

    ans = analogy(TOY, "man", "king", "woman")
    print("man : king :: woman :", ans)
    assert ans == "queen", "TODO 3: expected queen"

    sents = make_corpus()
    print("\ndim  final loss  group purity")
    for dim in (2, 4, 16):
        E, words, w2i, losses = train_skipgram(sents, dim=dim)
        print(f"{dim:3d}  {losses[-1]:10.3f}  {group_purity(E, words, w2i):12.2f}")
    E, words, w2i, _ = train_skipgram(sents, dim=16)
    print("nearest to horse:", most_similar(E, words, w2i, "horse"))
    # TODO 4: in a comment, explain why dim=2 gives lower purity than dim=16,
    #         and what you would expect at dim=512 on this tiny corpus.
`},
takeaways: ["An embedding layer is a trainable table: one-hot times the matrix is the same as reading one row.", "Cosine similarity compares directions; the dot product also rewards length.", "Embeddings learn meaning from context: words used in similar places get similar vectors.", "The unembedding maps the last hidden vector to one score per token; weight tying reuses the embedding matrix there.", "More dimensions give room for more distinctions, but a tiny corpus can't fill a huge space."],
mcq: [
{q: "A vocabulary has 32,000 tokens and d_model is 1,024. How many numbers does the embedding table hold?", a: ["1,056", "32 million", "About 32.8 million", "1 billion"], c: 2, why: "32,000 × 1,024 = 32,768,000, about 32.8 million parameters."},
{q: "Vectors a and b point in exactly the same direction, but b is three times longer. What is their cosine similarity?", a: ["1", "3", "1/3", "0"], c: 0, why: "Cosine divides by both lengths, so only direction matters: it is 1."},
{q: "In skip-gram training, why do 'cat' and 'dog' end up with similar vectors?", a: ["Their spellings are similar", "Someone labeled them both as animals", "They appear in similar contexts, so similar vectors predict their neighbors well", "They have adjacent token ids"], c: 2, why: "The objective rewards predicting the surrounding words; shared contexts pull their vectors together."}
]
},
{
id: "2.2", title: "Positional encoding: giving attention a sense of order", mins: 70, kicker: "permutation, learned and sinusoidal positions, relative positions, RoPE, ALiBi, longer contexts",
focus: "why rotating queries and keys makes attention scores depend on the distance between tokens rather than their absolute positions",
pip: [],
runNote: "The sinusoidal heatmap needs matplotlib (already in Colab); without it the script still prints everything.",
body: `<p>"Dog bites man" and "man bites dog" contain the same three tokens. If a model only sees the set of token vectors, it can't tell them apart. Attention, the core operation of a transformer (week 3), compares every token with every other token and takes weighted averages. Nothing in that recipe knows which token came first. Shuffle the inputs and the outputs come back shuffled in the same way: attention is <b>permutation-equivariant</b>. The demo proves it numerically. To understand language, the model needs position information added somewhere.</p>
<h4>Absolute learned positions</h4>
<p>The simplest fix: keep a second table <code>P</code> with one learned vector per position (0, 1, 2, ... up to a maximum length) and add it to the token embedding: <code>x = E[id] + P[pos]</code>. Early GPT and BERT models did this. It works well, but there is no row for position 5,000 if training only went to 2,048, so the model can't handle longer inputs.</p>
<h4>Sinusoidal encoding</h4>
<p>The original transformer paper used fixed waves instead of a learned table. Each pair of dimensions gets a sine and a cosine at a different speed:</p>
<div class="math">PE[pos, 2i]   = sin(pos / 10000^(2i / d_model))
PE[pos, 2i+1] = cos(pos / 10000^(2i / d_model))</div>
<p>In words: <code>pos</code> is the token's position, <code>i</code> numbers the dimension pairs from 0 to <code>d_model/2 - 1</code>, and <code>10000^(2i/d_model)</code> sets how slowly that pair's wave turns. The first pairs turn fast (like the seconds hand of a clock), the last pairs turn very slowly (like the hour hand). Together they give every position a unique fingerprint, and because sine and cosine of a shifted angle are a fixed rotation of the original, the dot product <code>PE[p] · PE[p+k]</code> depends only on the offset <code>k</code>. The heatmap in the demo shows the fast and slow stripes.</p>
<h4>Relative positions</h4>
<p>For most language tasks, "three tokens back" matters more than "position 1,207". Relative schemes put the distance between query and key directly into the attention score, for example as a learned bias per distance bucket (as in T5). This generalizes better and treats every part of the text the same way.</p>
<h4>Rotary position embedding (RoPE)</h4>
<p>RoPE, used by Llama, Qwen, Mistral and many other open models, gets relative behavior without any extra table. Split the query and key vectors into pairs of numbers and treat each pair as a point on a plane. Rotate the pair at position <code>m</code> by angle <code>m × θ<sub>i</sub></code>, where <code>θ<sub>i</sub> = 10000^(-2i/d)</code> is a per-pair speed, like the sinusoidal waves. Rotation keeps lengths unchanged. The key fact: the dot product of a query rotated by angle <code>a</code> and a key rotated by angle <code>b</code> equals the dot product of the originals with one rotated by <code>a - b</code>. So</p>
<div class="math">score(q at position m, k at position n) depends only on q, k and (m - n)</div>
<p>The demo prints identical scores for positions (3, 1), (10, 8) and (500, 498): all have offset 2. RoPE is applied to queries and keys only, inside every attention layer, not to the values or the token embeddings.</p>
<h4>ALiBi</h4>
<p>ALiBi (attention with linear biases) adds no position vectors at all. It subtracts <code>slope × distance</code> from each attention score, so far-away tokens get a steady penalty. Each head uses a different slope, so some heads look locally and others more widely. It extrapolates to longer inputs gracefully.</p>
<h4>Stretching the context window</h4>
<p>A model trained on 4,000 tokens has never seen RoPE angles for position 16,000. Common fixes, at a high level:</p>
<ul><li><b>Position interpolation:</b> scale positions down (multiply by train length / new length) so they fall inside the trained range, then fine-tune briefly.</li>
<li><b>Changing the base:</b> raise the 10,000 in the formula so all waves turn more slowly ("NTK-aware" scaling); methods such as YaRN mix both ideas per frequency.</li>
<li><b>Long-context fine-tuning:</b> continue training on long documents so the model learns to use the new range.</li></ul>`,
example: ["Reading a medication schedule", `A clinic's assistant reads "take 2 tablets every 6 hours, not 6 tablets every 2 hours". Without positions the two sentences are the same bag of tokens, and a dangerous mix-up is possible. With RoPE, the attention score between "tablets" and the number before it depends on their one-token distance, wherever the sentence sits in a long patient note, so the model reads "2 tablets" the same way at token 40 or token 4,000.`],
diagram: {title: "Where position information enters", caption: "Learned and sinusoidal encodings are added to the token embedding once. RoPE rotates queries and keys inside every attention layer. ALiBi adds a distance penalty to the scores.",
  lanes: ["tokens", "add position", "project", "score", "attention"],
  cols: [[["emb", "Token embeddings", "E[id]", "store"]], [["abs", "Learned or sine PE", "x = E[id] + PE[pos]", "core"]], [["qk", "Queries and keys", "x W_Q, x W_K", "core"], ["rope", "RoPE rotation", "angle = pos x theta", "guard"]], [["sc", "Scores q . k", "depend on m - n", "core"], ["alibi", "ALiBi bias", "- slope x distance", "guard"]], [["attn", "Softmax + values", "order-aware output", "user"]]],
  edges: [["emb", "abs"], ["abs", "qk"], ["qk", "rope", "", "dash"], ["rope", "sc", "rotated q, k", "hot"], ["alibi", "sc", "", "dash"], ["sc", "attn"]]},
demo: {file: "week2/positions.py", run: "python -m week2.positions", what: "Proves attention without positions can't tell 'dog bites man' from 'man bites dog', builds and plots sinusoidal encodings, implements RoPE and prints equal scores for equal offsets, and prints an ALiBi bias matrix.",
code: String.raw`
"""Demo: why transformers need positions, and three ways to add them.

1. Attention without positions is order-blind: shuffling tokens shuffles the output the same way.
2. Sinusoidal encoding: fixed waves of different speeds, one per pair of dimensions.
3. Rotary position embedding (RoPE): rotate q and k by an angle that grows with position,
   so their dot product depends only on how far apart they are.
4. ALiBi: no position vectors at all, just a distance penalty added to attention scores.
"""
import numpy as np


def softmax(z):
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def plain_attention(X):
    """Self-attention with no learned weights and no positions: softmax(X X^T / sqrt(d)) X."""
    return softmax(X @ X.T / np.sqrt(X.shape[1])) @ X


def sinusoidal(num_pos, d_model, base=10000.0):
    """PE[pos, 2i] = sin(pos / base^(2i/d)),  PE[pos, 2i+1] = cos(pos / base^(2i/d))."""
    pos = np.arange(num_pos)[:, None]
    i = np.arange(d_model // 2)[None, :]
    angles = pos / base ** (2 * i / d_model)
    pe = np.zeros((num_pos, d_model))
    pe[:, 0::2] = np.sin(angles)
    pe[:, 1::2] = np.cos(angles)
    return pe


def rope_angles(positions, d, base=10000.0):
    """Angle for every (position, pair of dimensions): pos * theta_i with theta_i = base^(-2i/d)."""
    theta = base ** (-np.arange(0, d, 2) / d)          # (d/2,) one speed per pair
    return np.outer(positions, theta)                  # (T, d/2)


def apply_rope(x, positions, base=10000.0):
    """Rotate each pair (x[2i], x[2i+1]) of every row by its position's angle. x: (T, d)."""
    ang = rope_angles(np.asarray(positions), x.shape[-1], base)
    cos, sin = np.cos(ang), np.sin(ang)
    x1, x2 = x[..., 0::2], x[..., 1::2]
    out = np.empty_like(x)
    out[..., 0::2] = x1 * cos - x2 * sin
    out[..., 1::2] = x1 * sin + x2 * cos
    return out


def alibi_bias(T, slope=0.5):
    """ALiBi adds -slope * distance to each causal attention score (future positions masked)."""
    i, j = np.arange(T)[:, None], np.arange(T)[None, :]
    return np.where(j <= i, slope * (j - i), -np.inf)


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    words = ["dog", "bites", "man"]
    emb = {w: rng.normal(size=8) for w in words}

    # 1. order blindness
    X = np.stack([emb[w] for w in ["dog", "bites", "man"]])
    Y = np.stack([emb[w] for w in ["man", "bites", "dog"]])
    out_x, out_y = plain_attention(X), plain_attention(Y)
    print("output for 'dog' in sentence 1 == output for 'dog' in sentence 2:", np.allclose(out_x[0], out_y[2]))
    print("mean-pooled sentence vectors identical:", np.allclose(out_x.mean(0), out_y.mean(0)))
    pe = sinusoidal(3, 8)
    out_x2, out_y2 = plain_attention(X + pe), plain_attention(Y + pe)
    print("after adding positions, identical?   ", np.allclose(out_x2.mean(0), out_y2.mean(0)))

    # 2. sinusoidal encoding
    pe = sinusoidal(64, 32)
    print("\nsinusoidal PE shape:", pe.shape, " first dims at pos 1:", np.round(pe[1, :4], 3))
    sims = [round(float(pe[p] @ pe[p + 4]), 3) for p in (0, 10, 30)]
    print("PE[p] . PE[p+4] for p = 0, 10, 30:", sims, "(same offset -> same value)")
    try:
        import matplotlib.pyplot as plt
        plt.figure(figsize=(7, 3.5))
        plt.imshow(pe.T, aspect="auto", cmap="RdBu", origin="lower")
        plt.xlabel("position")
        plt.ylabel("dimension")
        plt.title("Sinusoidal positional encoding: fast waves at the bottom, slow at the top")
        plt.colorbar()
        plt.tight_layout()
        plt.savefig("week2_sinusoidal.png", dpi=120)
        print("saved heatmap to week2_sinusoidal.png")
        plt.show()
    except ImportError:
        print("(install matplotlib to see the heatmap)")

    # 3. RoPE: the score depends only on the offset m - n
    d = 16
    q, k = rng.normal(size=d), rng.normal(size=d)
    print("\nRoPE score q(m) . k(n):")
    for m, n in [(3, 1), (10, 8), (500, 498), (10, 2)]:
        qm = apply_rope(q[None, :], [m])[0]
        kn = apply_rope(k[None, :], [n])[0]
        print(f"  m={m:3d} n={n:3d} offset={m - n}: {qm @ kn:+.4f}")
    print("  norm before/after rotation:", round(float(np.linalg.norm(q)), 4), round(float(np.linalg.norm(apply_rope(q[None, :], [77])[0])), 4))

    # 4. ALiBi
    print("\nALiBi bias for 5 tokens (row = query, column = key):")
    print(alibi_bias(5))
`},
lab: {file: "week2/lab_rope.py", run: "python -m week2.lab_rope",
task: "Implement rotary position embedding yourself, show in a table that the score depends only on relative offset, and use position interpolation to fit a 4x longer context into the trained range.",
steps: ["Run the script. It stops at the first assert because <code>my_rope</code> returns its input unchanged.", "Complete <code>my_rope</code>: build the angle table and rotate every pair of dimensions. The assert compares it with the demo.", "Read the offset table: each row must be constant across m = 5, 50 and 5000. Explain why in a comment (TODO 2).", "Complete <code>interpolated_positions</code> so 8,192 positions are squeezed into the 2,048 the model was trained on."],
done: "<code>my_rope</code> matches the demo, every row of the offset table is constant, the largest interpolated position is below 2,048, and your comment explains the relative-offset property.",
code: String.raw`
"""Lab: implement RoPE yourself, prove the relative-offset property, and stretch the context."""
import numpy as np

from week2.positions import apply_rope, rope_angles, sinusoidal


def my_rope(x, positions, base=10000.0):
    """x: (T, d) with d even. Rotate each pair (x[:, 2i], x[:, 2i+1]) by angle pos * base^(-2i/d)."""
    # TODO 1: build the (T, d/2) angle table, then apply the 2-D rotation
    #         [x1, x2] -> [x1*cos - x2*sin, x1*sin + x2*cos] to every pair. Return a new array.
    return x.copy()


def score(q, k, m, n, rope=my_rope):
    """Attention score between a query at position m and a key at position n."""
    return float(rope(q[None, :], [m])[0] @ rope(k[None, :], [n])[0])


def interpolated_positions(positions, train_len, new_len):
    # TODO 3: position interpolation. Squeeze positions 0..new_len-1 into the range the model
    #         saw in training (0..train_len-1) by scaling them. Return a float array.
    return np.asarray(positions, dtype=float)


if __name__ == "__main__":
    rng = np.random.default_rng(1)
    x = rng.normal(size=(6, 8))
    ok = np.allclose(my_rope(x, np.arange(6)), apply_rope(x, np.arange(6)))
    print("my_rope matches the demo:", ok)
    assert ok, "TODO 1: my_rope should match week2.positions.apply_rope"

    q, k = rng.normal(size=16), rng.normal(size=16)
    print("\noffset   m=5      m=50     m=5000")
    for off in range(0, 5):
        row = [score(q, k, m, m - off) for m in (5, 50, 5000)]
        print(f"{off:5d}  " + "  ".join(f"{s:+.4f}" for s in row))
    # TODO 2: each row should be constant. In a comment, explain why in one sentence.

    # Learned absolute positions: a table with one row per position cannot go past its size.
    learned = rng.normal(size=(2048, 16))
    try:
        learned[4095]
    except IndexError:
        print("\nlearned table of 2048 positions: position 4095 -> IndexError (no row for it)")

    train_len, new_len = 2048, 8192
    pos = interpolated_positions(np.arange(new_len), train_len, new_len)
    print("largest position fed to RoPE after interpolation: %.1f" % pos.max())
    assert pos.max() < train_len, "TODO 3: interpolated positions must stay below train_len"
    a_new = rope_angles(pos[-1:], 16)[0, 0]
    a_train = rope_angles(np.array([train_len - 1]), 16)[0, 0]
    print("fastest angle at last new position %.1f vs last trained position %.1f" % (a_new, a_train))
    print("sinusoidal PE has no table, so it can be computed for any position:", sinusoidal(8192, 16).shape)
`},
takeaways: ["Attention is permutation-equivariant: without position information, word order is invisible.", "Learned absolute positions are simple but stop at the trained maximum length.", "Sinusoidal encodings use waves of many speeds; their dot products depend on the offset between positions.", "RoPE rotates queries and keys by position, so q · k depends only on the relative distance; it's the default in most open models.", "ALiBi penalizes distance directly; interpolation and base changes stretch RoPE models to longer contexts."],
mcq: [
{q: "You shuffle the order of tokens fed to an attention layer that has no positional information. What happens to the outputs?", a: ["They change completely", "They are the same vectors, shuffled in the same order", "They become zero", "They are averaged into one vector"], c: 1, why: "Attention is permutation-equivariant: each token's output depends only on the set of tokens, so outputs move with their inputs."},
{q: "With RoPE, which pair has the same attention score as (query at position 12, key at position 9), for the same q and k vectors?", a: ["(12, 12)", "(9, 12)", "(24, 18)", "(103, 100)"], c: 3, why: "RoPE scores depend only on the offset m - n. 103 - 100 = 3, the same as 12 - 9."},
{q: "A model with a learned position table of 2,048 rows is given a 3,000-token input. What is the core problem?", a: ["There is no learned vector for positions beyond 2,047", "Attention becomes order-blind", "The tokenizer fails", "The sine waves repeat"], c: 0, why: "A learned table only has rows for the positions it was trained on; later positions have no vector."}
]
},
{
id: "2.3", title: "Embedding models for semantic search", mins: 60, kicker: "sentence embeddings, mean pooling, contrastive training, cosine search, dimensions vs cost",
focus: "choosing and evaluating an embedding model for search, including the cost of dimensions and the trap of skipping normalization",
pip: ["sentence-transformers"],
runNote: "First run downloads the all-MiniLM-L6-v2 model (about 90 MB). If the package or download is unavailable, the script switches to a pure-numpy hashing embedding and still runs.",
body: `<p>Token embeddings describe single tokens. Search, recommendations, clustering and retrieval-augmented generation (week 9) need one vector for a whole sentence or document, such that texts with the same meaning land close together even when they share no words. That's what an <b>embedding model</b> provides.</p>
<h4>From token vectors to a sentence vector</h4>
<p>An embedding model is usually a small transformer encoder. It produces one vector per token; to get a single vector, it pools them. The most common choice is <b>mean pooling</b>: average the token vectors, skipping padding positions using the attention mask. (Other models use a special first token, or the last token in decoder-style embedders.) The demo checks that padding never changes the pooled vector.</p>
<h4>How they're trained: contrastive learning</h4>
<p>A raw language model's pooled vectors are not good for search. Embedding models are fine-tuned with a <b>contrastive</b> objective on pairs that should match: a question and its answer, a title and its article, two paraphrases. For a batch of pairs, the model is rewarded when each query's vector is closer to its own partner than to every other item in the batch (the other items act as "in-batch negatives"). Over millions of pairs, meaning becomes geometry: "I forgot my login" and "How do I reset my password?" end up near each other.</p>
<h4>Searching with cosine similarity</h4>
<ol><li>Embed every document once and store the matrix (one row per document).</li>
<li>Embed the query with the same model.</li>
<li>Score every document with cosine similarity and return the top k.</li></ol>
<p><b>Normalize</b> every vector to length 1 first. Then the dot product equals the cosine, and the whole search is one matrix-vector multiply. Forgetting to normalize lets long vectors win just for being long, a common bug. For millions of documents, vector databases use approximate nearest-neighbor indexes (week 9) instead of scoring everything.</p>
<h4>Dimensions vs cost</h4>
<div class="tablewrap"><table><thead><tr><th>Dimensions</th><th>float32 per 1M docs</th><th>Typical use</th></tr></thead><tbody>
<tr><td>384</td><td>1.5 GB</td><td>Small, fast open models (MiniLM family), laptops, edge</td></tr>
<tr><td>768 to 1,024</td><td>3 to 4 GB</td><td>Strong general-purpose open and hosted models</td></tr>
<tr><td>1,536 to 3,072</td><td>6 to 12 GB</td><td>Large hosted models; best quality, highest storage and latency</td></tr></tbody></table></div>
<p>More dimensions can hold finer distinctions but cost memory and search time linearly. Two common savings: <b>quantization</b> (store each number in 8 bits or even 1 bit) and <b>truncation</b> for models trained to support it (Matryoshka-style training packs the most important information into the first dimensions, so you can keep the first 256 of 1,024).</p>
<h4>Choosing an embedding model</h4>
<ul><li><b>Quality on your data:</b> public leaderboards such as MTEB are a starting point, but always test on 30 to 100 real queries from your users, with known correct answers. The lab shows how, with recall@k.</li>
<li><b>Language and domain:</b> multilingual support, code, legal or medical text.</li>
<li><b>Max input length:</b> many small models truncate at 256 or 512 tokens, so long documents must be chunked.</li>
<li><b>Hosting and price:</b> open models (sentence-transformers, BGE, E5, GTE, Nomic) run on your own machine; hosted APIs come from several providers.</li>
<li><b>Lock-in:</b> vectors from different models are not comparable. Changing models means re-embedding everything.</li></ul>
<p>Note for this course: Claude does not offer an embeddings endpoint. In Claude-based systems, embeddings come from an open-source library like the one in this lesson or from a dedicated embedding provider, and Claude reads the retrieved text.</p>`,
example: ["A help center that understands customers", `An online retailer's help center had 400 articles and a keyword search box. Customers typing "my parcel never came" got nothing, because the article was titled "Where is my order?". The team embedded every article with a small sentence-transformer, normalized the vectors and ranked by cosine similarity. On 80 real queries with known answers, recall@3 rose from 0.55 with keywords to 0.9. They kept a keyword fallback for exact things like order numbers and SKUs, where lexical matching still wins.`],
diagram: {title: "Semantic search with an embedding model", caption: "Documents are embedded and normalized once, offline. Each query is embedded with the same model, and cosine similarity ranks the documents. Recall@k on labeled queries tells you whether it works.",
  lanes: ["offline", "embed", "store", "query time", "measure"],
  cols: [[["docs", "Help articles", "20 to millions", "ext"]], [["model", "Embedding model", "pool + normalize", "core"]], [["index", "Vector matrix", "one unit row per doc", "store"]], [["q", "User query", "same model", "user"], ["rank", "Cosine top-k", "matrix x vector", "core"]], [["eval", "Recall@k", "labeled queries", "guard"]]],
  edges: [["docs", "model"], ["model", "index", "unit vectors"], ["q", "rank", "embed"], ["index", "rank", "", "hot"], ["rank", "eval"]]},
demo: {file: "week2/semantic_search.py", run: "python -m week2.semantic_search", what: "Embeds 20 help-center questions with all-MiniLM-L6-v2 (or a numpy hashing fallback if the model can't be loaded), checks mean pooling and normalization, answers four customer queries with cosine top-3 search, and prints the storage cost of different embedding sizes.",
code: String.raw`
"""Demo: semantic search over a small help center with sentence embeddings.

Uses the sentence-transformers model all-MiniLM-L6-v2 (384 dimensions) when it can be
installed and downloaded. If not, it falls back to a pure-numpy hashing embedding
(TF-IDF weighted word and character features) so the script always runs. The fallback is
lexical: it matches shared words and word pieces, not meaning.
Set EMBED_BACKEND=hash to force the fallback.
"""
import os
import re
import zlib

import numpy as np

os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "10")
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "30")

DOCS = [
    "How do I reset my password?",
    "I can't log in to my account.",
    "How can I change the email address on my account?",
    "Where is my order? It has not arrived yet.",
    "How do I track my package?",
    "Can I change the delivery address after ordering?",
    "How do I return an item for a refund?",
    "When will I get my refund?",
    "My card was charged twice for one order.",
    "Which payment methods do you accept?",
    "Can I pay in monthly installments?",
    "How do I cancel my subscription?",
    "How do I apply a discount code at checkout?",
    "The product arrived damaged. What should I do?",
    "Do you ship internationally?",
    "How long does standard shipping take?",
    "How do I delete my account and my data?",
    "Can I talk to a human support agent?",
    "How do I turn on two-factor authentication?",
    "Is my personal data shared with third parties?",
]


def features(text):
    """Word unigrams, word bigrams and character trigrams: the fallback's 'tokens'."""
    words = [w.rstrip("s") if len(w) > 3 else w for w in re.findall(r"[a-z0-9]+", text.lower())]
    feats = ["w:" + w for w in words] + ["b:" + a + "_" + b for a, b in zip(words, words[1:])]
    for w in words:
        p = "#" + w + "#"
        feats += ["c:" + p[i:i + 3] for i in range(len(p) - 2)]
    return feats


class HashingEmbedder:
    """Feature hashing: each feature lands in one of dim buckets with a +1 or -1 sign."""

    def __init__(self, dim=512):
        self.dim = dim
        self.idf = np.ones(dim)

    def _raw(self, text):
        v = np.zeros(self.dim)
        for f in features(text):
            h = zlib.crc32(f.encode())
            v[h % self.dim] += 1.0 if (h >> 20) & 1 else -1.0
        return v

    def fit(self, corpus):
        df = np.zeros(self.dim)
        for t in corpus:
            df += self._raw(t) != 0
        self.idf = np.log((1 + len(corpus)) / (1 + df)) + 1.0   # rare buckets count more
        return self

    def encode(self, texts):
        return np.stack([self._raw(t) * self.idf for t in texts])


def normalize(M):
    return M / np.maximum(np.linalg.norm(M, axis=1, keepdims=True), 1e-12)


class Embedder:
    """One interface for both back ends. encode() always returns unit-length rows."""

    def __init__(self, corpus, dim=512):
        self.corpus, self.model, self.hashers = corpus, None, {}
        if os.getenv("EMBED_BACKEND", "") != "hash":
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as e:   # not installed, no network, blocked download...
                print("[fallback] sentence-transformers unavailable (%s)" % type(e).__name__)
        self.name = "all-MiniLM-L6-v2" if self.model else "numpy hashing TF-IDF"
        self.dim = 384 if self.model else dim

    def encode(self, texts, dim=None):
        dim = dim or self.dim
        if self.model is not None:
            M = self.model.encode(list(texts), convert_to_numpy=True)[:, :dim]   # truncate if asked
        else:
            if dim not in self.hashers:
                self.hashers[dim] = HashingEmbedder(dim).fit(self.corpus)
            M = self.hashers[dim].encode(texts)
        return normalize(M)


def mean_pool(token_vectors, mask):
    """Sentence vector = average of token vectors, ignoring padding (mask 0)."""
    m = mask[:, :, None]
    return (token_vectors * m).sum(axis=1) / np.maximum(m.sum(axis=1), 1)


def search(query, doc_matrix, embedder, k=3):
    q = embedder.encode([query])[0]
    scores = doc_matrix @ q            # unit vectors: dot product == cosine similarity
    top = np.argsort(-scores)[:k]
    return [(int(i), float(scores[i])) for i in top]


if __name__ == "__main__":
    # mean pooling: padding must not change the sentence vector
    rng = np.random.default_rng(0)
    tok = rng.normal(size=(2, 5, 4))
    tok[1, :3] = tok[0, :3]
    mask = np.array([[1, 1, 1, 0, 0], [1, 1, 1, 0, 0]])
    tok[1, 3:] = 99.0                                    # garbage in the padded slots
    pooled = mean_pool(tok, mask)
    print("mean pooling ignores padding:", np.allclose(pooled[0], pooled[1]))

    emb = Embedder(DOCS)
    print("embedding backend:", emb.name, "| dimensions:", emb.dim)
    D = emb.encode(DOCS)
    print("doc matrix:", D.shape, "| row norms:", np.round(np.linalg.norm(D, axis=1)[:3], 3))

    for q in ["I forgot my password and cannot sign in", "my package still has not arrived",
              "I was billed two times", "send my parcel abroad"]:
        print("\nquery:", q)
        for i, s in search(q, D, emb):
            print(f"  {s:.3f}  {DOCS[i]}")
    if emb.model is None:
        print("\nNote: the fallback is lexical, so a paraphrase with no shared words ('send my parcel abroad'"
              " vs 'ship internationally') misses. A trained embedding model matches meaning instead.")

    print("\nstorage for 1,000,000 vectors:")
    for d in (384, 768, 1536, 3072):
        print(f"  {d:5d} dims: float32 {d * 4 / 1e3:5.2f} GB   int8 {d / 1e3:5.2f} GB")
`},
lab: {file: "week2/lab_search.py", run: "python -m week2.lab_search",
task: "Evaluate your search engine like a professional: write top-k retrieval and recall@k, run it on ten labeled customer queries, and trade embedding size against memory.",
steps: ["Run the script. The table shows recall 0.00 and the assert fails, because <code>top_k</code> and <code>recall_at_k</code> are placeholders.", "Complete <code>top_k</code> using a dot product (the rows are unit length) and <code>np.argsort</code>.", "Complete <code>recall_at_k</code>: embed documents and queries at the given size and count how often the right document is in the top k.", "Read the size versus recall table and answer TODO 3 in a comment. Note which backend ran (model or fallback)."],
done: "the table shows non-zero recall for every size, the best recall@3 is at least 0.6 (it's usually 0.9 or higher with the real model), and your comment picks a size for 10 million articles with a reason.",
code: String.raw`
"""Lab: measure your search engine with recall@k, and trade dimensions against memory."""
import numpy as np

from week2.semantic_search import DOCS, Embedder

# (query, index of the document that answers it in DOCS)
LABELED = [
    ("forgot my password", 0),
    ("the website will not let me log in", 1),
    ("update the email on my profile", 2),
    ("where is my package", 4),
    ("I want my money back for this item", 6),
    ("you charged my card two times", 8),
    ("stop my monthly subscription", 11),
    ("my item came broken", 13),
    ("how many days does shipping take", 15),
    ("I want to speak with a real person", 17),
]


def top_k(query_vec, doc_matrix, k):
    # TODO 1: rows of doc_matrix and query_vec are unit length. Return the indices of the
    #         k documents with the highest cosine similarity, best first (hint: np.argsort).
    return list(range(k))


def recall_at_k(embedder, k, dim=None):
    # TODO 2: encode DOCS and every query (pass dim to embedder.encode), and return the share
    #         of LABELED queries whose correct document index is inside top_k(..., k).
    return 0.0


if __name__ == "__main__":
    emb = Embedder(DOCS)
    print("backend:", emb.name)
    print("\ndims   recall@1  recall@3  MB per 1M docs (float32)")
    dims = (32, 128, 384) if emb.model is not None else (32, 128, 512, 2048)
    results = {}
    for d in dims:
        r1, r3 = recall_at_k(emb, 1, d), recall_at_k(emb, 3, d)
        results[d] = r3
        print(f"{d:5d}  {r1:8.2f}  {r3:8.2f}  {d * 4:10d}")
    best = max(results.values())
    assert best >= 0.6, "TODO 1 and 2: recall@3 should reach at least 0.6 for the best size"
    # TODO 3: in a comment, pick the size you would ship for 10 million help articles and say why.
    #         With the hashing fallback, also explain why tiny dims hurt (bucket collisions).
`},
takeaways: ["Embedding models turn whole texts into one vector, usually by mean pooling token vectors and skipping padding.", "Contrastive training pulls matching pairs together and pushes in-batch negatives apart.", "Normalize vectors so the dot product equals cosine similarity; then search is one matrix multiply.", "Storage and search cost grow linearly with dimensions; quantization and truncation cut them.", "Pick an embedding model by measuring recall@k on your own labeled queries; Claude has no embeddings endpoint, so use a library or an embedding provider."],
mcq: [
{q: "Why normalize document and query vectors before searching?", a: ["It makes vectors shorter to store", "So the dot product equals cosine similarity and long vectors don't win just for their length", "Embedding models require it to run", "It removes stop words"], c: 1, why: "With unit-length vectors, dot product and cosine are identical, so ranking depends only on direction."},
{q: "In contrastive training with a batch of 64 question-answer pairs, what are the negatives for one question?", a: ["Randomly generated vectors", "Only its own answer", "The other 63 answers in the batch", "Questions with the same first word"], c: 2, why: "In-batch negatives: every other item in the batch serves as a non-matching example."},
{q: "You have 10 million documents. Moving from 384-dim to 1,536-dim float32 embeddings multiplies vector storage by about…", a: ["1.5", "2", "16", "4"], c: 3, why: "Storage grows linearly with dimensions: 1,536 / 384 = 4, so roughly 15 GB becomes 61 GB."}
]
}
],
quiz: [
{q: "What does an embedding layer do with a token id?", a: ["Hashes it into a random vector every time", "Looks up the matching row of a trainable matrix", "Converts it to its characters", "Sorts it by frequency"], c: 1, why: "An embedding is a learned table; the id selects a row, which equals one-hot times the matrix."},
{q: "Weight tying in a language model means…", a: ["Every layer shares the same attention weights", "The token embedding matrix is also used as the output (unembedding) layer", "Queries and keys use one matrix", "The tokenizer and model are trained together"], c: 1, why: "With tying, logits = h · E^T, which saves vocab_size × d_model parameters."},
{q: "Why is a transformer without positional information unable to tell 'dog bites man' from 'man bites dog'?", a: ["The tokenizer merges the words", "Attention treats the tokens as an unordered set, so the outputs only shuffle", "The vocabulary is too small", "Softmax removes word order"], c: 1, why: "Attention is permutation-equivariant: reordering tokens only reorders the outputs."},
{q: "In the sinusoidal encoding, what is different between dimension pairs?", a: ["The speed of the wave: early pairs change fast, later pairs very slowly", "Some pairs are learned, others fixed", "Each pair encodes a different token", "Later pairs are always zero"], c: 0, why: "Each pair's angle is pos / 10000^(2i/d), so the frequency drops as i grows, like clock hands at different speeds."},
{q: "RoPE is applied to…", a: ["The token embeddings once at the input", "The values only", "The output logits", "The queries and keys inside every attention layer"], c: 3, why: "RoPE rotates q and k by their positions in each layer, so scores depend on the offset."},
{q: "Which method extends a RoPE model's context by scaling positions down into the trained range?", a: ["Weight tying", "Mean pooling", "Position interpolation", "Contrastive learning"], c: 2, why: "Interpolation multiplies positions by train length / new length, usually followed by a short fine-tune."},
{q: "A team's semantic search returns long documents first for almost every query. The most likely bug is…", a: ["The vectors were not normalized before the dot product", "The embedding model is too small", "Mean pooling skipped padding", "They used cosine similarity"], c: 0, why: "Without normalization, the dot product rewards vector length, and long texts often have longer vectors."},
{q: "Which statement about embeddings in a Claude-based app is true?", a: ["Claude's API returns embeddings for any text", "Embeddings from different models can be mixed in one index", "Embeddings come from a separate library or provider, and Claude reads the retrieved text", "Embeddings are only needed for images"], c: 2, why: "Claude has no embeddings endpoint, and vectors from different models are not comparable."}
],
checkpoint: `Your skip-gram vectors cluster animals, fruits and vehicles, your analogy function solves man : king :: woman : queen, your own RoPE matches the demo and passes the relative-offset test, and your search engine reports recall@k on labeled queries. Keep <code>week2/</code>: next week's attention uses queries and keys exactly like the ones you rotated here, and week 9 builds a full retrieval system on top of your search code.`
});
