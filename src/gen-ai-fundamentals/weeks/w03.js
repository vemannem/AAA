W({
n: 3, title: "Self-Attention from Scratch", short: "Self-attention", hours: "7–9 hours",
goal: "Understand self-attention well enough to write it from memory: queries, keys and values, scaling, masking, multiple heads, and what it costs at long context.",
builds: "Scaled dot-product attention in numpy, causal and padding masks, multi-head attention in numpy and as a PyTorch module checked against the built-in kernel, and attention heatmaps for hand-built heads.",
outcomes: [
  "Compute scaled dot-product attention by hand for a few tokens and explain every step, including why scores are divided by the square root of d_k.",
  "Build causal and padding masks and combine them for a padded batch.",
  "Implement multi-head attention, track tensor shapes through split and merge, and match PyTorch's built-in attention.",
  "Measure the quadratic cost of attention and explain how grouped-query attention, FlashAttention-style tiling and sliding windows reduce it.",
  "Read an attention heatmap and recognize patterns such as previous-token and induction heads."
],
lessons: [
{
id: "3.1", title: "Scaled dot-product attention", mins: 70, kicker: "queries, keys, values, scaling by sqrt(d_k), softmax, weighted sums",
focus: "what each of Q, K and V does, and why the scores are divided by the square root of d_k before the softmax",
pip: [],
body: `<p>Attention is how a transformer lets tokens share information. In "the cat sat because it was tired", the vector for "it" needs to pick up information from "cat". Attention computes, for every token, a weighted average of information from all the tokens it may look at, with weights the model learns to choose.</p>
<h4>Queries, keys and values</h4>
<p>Each token's vector <code>x</code> (length <code>d_model</code>) is multiplied by three learned matrices:</p>
<div class="math">q = x · W_Q    (the question this token asks)
k = x · W_K    (what this token advertises about itself)
v = x · W_V    (what this token shares if someone attends to it)</div>
<p><code>W_Q</code> and <code>W_K</code> have shape <code>(d_model, d_k)</code> and <code>W_V</code> has shape <code>(d_model, d_v)</code>. All three come from the same tokens, which is why this is called <b>self</b>-attention. A useful picture is a library: each token asks a question (query), every book has a label on its spine (key), and the book's content is what you take home (value). The query decides <i>whom</i> to listen to; the value decides <i>what</i> they say.</p>
<h4>The four steps</h4>
<ol><li><b>Scores:</b> compare every query with every key using a dot product. Stacking all tokens into matrices, that's <code>S = Q K<sup>T</sup></code>, a <code>T × T</code> table where row <code>i</code>, column <code>j</code> says how well token <code>i</code>'s question matches token <code>j</code>'s label. <code>T</code> is the number of tokens.</li>
<li><b>Scale:</b> divide by <code>sqrt(d_k)</code>, the square root of the query and key length.</li>
<li><b>Softmax per row:</b> turn each row of scores into positive weights that sum to 1.</li>
<li><b>Weighted sum:</b> multiply the weights by <code>V</code>. Each token's output is a blend of the value vectors, mostly from the tokens it weighted highly.</li></ol>
<div class="math">Attention(Q, K, V) = softmax( Q K^T / sqrt(d_k) ) · V</div>
<h4>Why divide by sqrt(d_k)?</h4>
<p>A dot product is a sum of <code>d_k</code> products. If the entries of q and k are random with variance 1, each product has variance 1, and the sum has variance <code>d_k</code>. With <code>d_k = 512</code>, typical scores are around ±22. Softmax of numbers that far apart is almost one-hot: one token gets nearly all the weight, and the gradient for the others is close to zero, so learning stalls. Dividing by <code>sqrt(d_k)</code> brings the variance back to about 1 whatever the head size. The demo checks this numerically: unscaled variance grows with <code>d_k</code> and the softmax saturates; scaled, it stays near 1.</p>
<h4>A worked example</h4>
<p>The demo uses 4 tokens ("the cat sat down"), <code>d_model = 8</code> and <code>d_k = 4</code>. It prints the shapes of <code>Q</code>, <code>K</code> and <code>V</code> (each 4 × 4), the 4 × 4 score table, the softmax weights (each row sums to 1) and the 4 × 4 output. With random, untrained weights the pattern is arbitrary; training is what makes "it" look at "cat". In the lab you'll hand-design <code>W_Q</code> and <code>W_K</code> to do exactly that, which shows what training has to discover.</p>
<h4>Things that trip people up</h4>
<ul><li>Softmax goes along each <b>row</b> (over keys), not down columns.</li>
<li>Subtract the row maximum before <code>exp</code>: same result, no overflow. Every real implementation does this.</li>
<li>The output has one row per <b>query</b>. Queries and keys can come from different sequences (cross-attention, lesson 3.3), and then the score table is <code>T_q × T_k</code>.</li>
<li>Attention has no weights of its own beyond <code>W_Q</code>, <code>W_K</code>, <code>W_V</code> (and <code>W_O</code> in lesson 3.2). The weights in the softmax are computed fresh for every input.</li></ul>`,
example: ["Resolving 'it' in a support ticket", `A ticket reads: "I returned the headphones but the refund for them never arrived, and it has been three weeks." To route it, a model must know that "them" means the headphones and "it has been" refers to the waiting time. In a trained model, an attention head lets the query of "them" match the key of "headphones", so the output vector for "them" carries the product information. A ticket classifier built on those vectors sends it to the refunds team, not to audio support.`],
diagram: {title: "Scaled dot-product attention", caption: "The same token vectors are projected into queries, keys and values. Query-key scores are scaled and softmaxed per row, then used to average the values.",
  lanes: ["tokens", "project", "compare", "normalize", "combine"],
  cols: [[["x", "Token vectors X", "T x d_model", "store"]], [["q", "Queries Q", "X W_Q", "core"], ["k", "Keys K", "X W_K", "core"], ["v", "Values V", "X W_V", "core"]], [["s", "Scores", "Q K^T / sqrt(d_k)", "core"]], [["sm", "Softmax per row", "weights sum to 1", "guard"]], [["out", "Output", "weights x V", "user"]]],
  edges: [["x", "q"], ["x", "k"], ["x", "v"], ["q", "s"], ["k", "s"], ["s", "sm"], ["sm", "out", "", "hot"], ["v", "out"]]},
demo: {file: "week3/attention.py", run: "python -m week3.attention", what: "Defines softmax and scaled_dot_product_attention(Q, K, V, mask=None), walks through 4 tokens printing every matrix, then checks the variance argument: unscaled scores grow with d_k and make softmax nearly one-hot, scaled scores stay near variance 1.",
code: String.raw`
"""Demo: scaled dot-product attention in numpy, step by step.

Each token's vector is projected three ways:
  query (what am I looking for?), key (what do I offer?), value (what I pass on).
scores = Q K^T / sqrt(d_k), weights = softmax(scores) per row, output = weights V.
"""
import numpy as np


def softmax(z, axis=-1):
    """Numerically stable softmax: subtract the row max before exponentiating."""
    z = z - np.max(z, axis=axis, keepdims=True)
    e = np.exp(z)
    return e / np.sum(e, axis=axis, keepdims=True)


def scaled_dot_product_attention(Q, K, V, mask=None):
    """Q: (..., T_q, d_k), K: (..., T_k, d_k), V: (..., T_k, d_v).

    mask: boolean array broadcastable to (..., T_q, T_k); True means "may attend".
    Returns (output (..., T_q, d_v), weights (..., T_q, T_k)).
    """
    d_k = Q.shape[-1]
    scores = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d_k)
    if mask is not None:
        scores = np.where(mask, scores, -1e9)      # a huge negative score -> weight ~0
    weights = softmax(scores, axis=-1)
    return weights @ V, weights


if __name__ == "__main__":
    np.set_printoptions(precision=2, suppress=True)
    rng = np.random.default_rng(42)
    tokens = ["the", "cat", "sat", "down"]
    d_model, d_k = 8, 4
    X = rng.normal(size=(len(tokens), d_model))          # one embedding per token
    W_Q, W_K, W_V = (rng.normal(size=(d_model, d_k)) for _ in range(3))   # random: untrained

    Q, K, V = X @ W_Q, X @ W_K, X @ W_V
    print("X", X.shape, "-> Q", Q.shape, "K", K.shape, "V", V.shape)
    scores = Q @ K.T / np.sqrt(d_k)
    print("\nscores = Q K^T / sqrt(d_k)  (row = query token, column = key token)\n", scores)
    out, w = scaled_dot_product_attention(Q, K, V)
    print("\nattention weights (each row sums to 1)\n", w)
    print("row sums:", w.sum(axis=1))
    for t, row in zip(tokens, w):
        print(f"  '{t}' attends most to '{tokens[int(row.argmax())]}' ({row.max():.2f})")
    print("\noutput = weights @ V, shape", out.shape, "\n", out)

    # Why divide by sqrt(d_k)? q.k is a sum of d_k products, so its variance grows like d_k.
    print("\n d_k   var(q.k)   var(q.k/sqrt(d_k))   avg max softmax weight over 10 keys (raw vs scaled)")
    for dk in (4, 64, 512):
        q = rng.normal(size=(2000, dk))
        k = rng.normal(size=(2000, dk))
        dots = (q * k).sum(axis=1)
        raw = softmax(dots.reshape(200, 10)).max(axis=1).mean()
        scaled = softmax((dots / np.sqrt(dk)).reshape(200, 10)).max(axis=1).mean()
        print(f"{dk:4d}  {dots.var():9.1f}  {(dots / np.sqrt(dk)).var():12.2f}          {raw:.2f} vs {scaled:.2f}")
    print("Without scaling, large d_k pushes softmax toward one-hot, and gradients vanish.")
`},
lab: {file: "week3/lab_attention.py", run: "python -m week3.lab_attention",
task: "Write attention with plain loops so every step is visible, then hand-design query and key matrices so the pronoun 'it' attends to 'cat'.",
steps: ["Run the script. It stops at the first assert because <code>attention_loop</code> is empty.", "Complete <code>attention_loop</code> with explicit loops over queries and keys; it must match the vectorized version.", "Fill <code>W_Q</code> and <code>W_K</code> so the query of 'it' (a pronoun) matches the key of 'cat' (a noun) with weight above 0.8.", "Do TODO 3: compare the largest softmax weight with and without the sqrt(d_k) scaling at d_k = 256, and explain it in a comment."],
done: "the loop and vectorized outputs match, 'it' puts more than 0.8 of its attention on 'cat', and your comment explains what scaling does to the softmax.",
code: String.raw`
"""Lab: write attention with plain loops, then hand-design a query and key so a pronoun finds its noun."""
import numpy as np

from week3.attention import scaled_dot_product_attention, softmax


def attention_loop(Q, K, V):
    """Same result as scaled_dot_product_attention, one query at a time, no matrix tricks."""
    T_q, d_k = Q.shape
    out = np.zeros((T_q, V.shape[1]))
    for i in range(T_q):
        # TODO 1: score query i against every key (dot product / sqrt(d_k)),
        #         softmax the scores, and set out[i] to the weighted sum of the rows of V.
        pass
    return out


TOKENS = ["the", "cat", "sat", "because", "it", "was", "tired"]
# hand-made features: [is_noun, is_pronoun, is_verb, is_other]
X = np.array([
    [0, 0, 0, 1],   # the
    [1, 0, 0, 0],   # cat
    [0, 0, 1, 0],   # sat
    [0, 0, 0, 1],   # because
    [0, 1, 0, 0],   # it
    [0, 0, 1, 0],   # was
    [0, 0, 0, 1],   # tired
], dtype=float)

if __name__ == "__main__":
    rng = np.random.default_rng(0)
    Q, K, V = rng.normal(size=(5, 4)), rng.normal(size=(6, 4)), rng.normal(size=(6, 3))
    ref, _ = scaled_dot_product_attention(Q, K, V)
    mine = attention_loop(Q, K, V)
    print("loop version matches vectorized:", np.allclose(mine, ref))
    assert np.allclose(mine, ref), "TODO 1: attention_loop does not match yet"

    # TODO 2: fill W_Q and W_K (shape 4 x 2) so the query of 'it' matches the key of 'cat'.
    #         Hint: put a large number where the 'is_pronoun' row of W_Q and the 'is_noun'
    #         row of W_K use the same output column.
    W_Q = np.zeros((4, 2))
    W_K = np.zeros((4, 2))
    W_V = np.eye(4)
    _, w = scaled_dot_product_attention(X @ W_Q, X @ W_K, X @ W_V)
    it, cat = TOKENS.index("it"), TOKENS.index("cat")
    print("\nweights from 'it':", {t: round(float(p), 2) for t, p in zip(TOKENS, w[it])})
    assert w[it, cat] > 0.8, "TODO 2: 'it' should put more than 0.8 of its attention on 'cat'"
    print("'it' -> 'cat' weight: %.2f" % w[it, cat])

    # TODO 3: set d_k = 256 below, compute raw (unscaled) scores for random q and k, and compare the
    #         largest softmax weight with and without dividing by sqrt(d_k). Explain in a comment.
    d_k = 256
    q, k = rng.normal(size=d_k), rng.normal(size=(8, d_k))
    print("\nmax weight scaled:", round(float(softmax(k @ q / np.sqrt(d_k)).max()), 2))
`},
takeaways: ["Queries, keys and values are three learned projections of the same token vectors.", "Scores Q K^T compare every query with every key; softmax per row turns them into weights that sum to 1.", "Each output is a weighted average of value vectors.", "Dividing by sqrt(d_k) keeps score variance near 1, so softmax doesn't saturate and gradients keep flowing.", "The attention weights are computed fresh for every input; only W_Q, W_K, W_V (and W_O) are learned."],
mcq: [
{q: "With d_k = 64, what do you divide the raw scores by?", a: ["64", "32", "8", "4096"], c: 2, why: "The scale is sqrt(d_k) = sqrt(64) = 8."},
{q: "In softmax(Q K^T / sqrt(d_k)), along which axis is the softmax taken?", a: ["Along each row, over the keys, so each query's weights sum to 1", "Down each column, over the queries", "Over the whole matrix at once", "Over the d_k dimension"], c: 0, why: "Each query distributes one unit of attention across the keys, so the softmax runs along each row."},
{q: "Without the sqrt(d_k) scaling and with d_k = 1,024, what typically happens at initialization?", a: ["All weights become exactly equal", "Scores become tiny and attention is uniform", "Training is faster", "Scores have large spread, softmax is nearly one-hot, and gradients for most keys vanish"], c: 3, why: "Dot products of length-1,024 random vectors have variance about 1,024, so softmax saturates."}
]
},
{
id: "3.2", title: "Masking and multi-head attention", mins: 75, kicker: "causal masks, padding masks, heads, split and merge, W_O, PyTorch",
focus: "how masks keep a decoder from seeing the future and from attending to padding, and why several smaller heads beat one big one",
pip: [], deps: ["3.1"],
runNote: "Uses PyTorch on the CPU; Colab already has it. Runs in a few seconds.",
body: `<p>Lesson 3.1 let every token look at every other token. Two practical rules change that, and one structural idea makes attention far more expressive.</p>
<h4>Causal masks: no peeking at the future</h4>
<p>A decoder language model is trained to predict token <code>t+1</code> from tokens <code>0..t</code>. All positions are trained in parallel in one pass, so if position 3 could attend to position 4, it would simply copy the answer. The <b>causal mask</b> forbids that: before the softmax, every score above the diagonal (key later than query) is set to <code>-∞</code> (in code, a very large negative number). <code>exp(-∞) = 0</code>, so those keys get exactly zero weight, and each row still sums to 1 over the allowed keys.</p>
<div class="math">mask[i, j] = True if j ≤ i  (key j is not after query i)
scores[i, j] = -inf where mask is False, then softmax per row</div>
<p>Encoders such as BERT and embedding models (lesson 2.3) don't use a causal mask: they see the whole input at once.</p>
<h4>Padding masks: batches of different lengths</h4>
<p>To process several sequences at once they are padded to the same length <code>T</code>. Padding tokens are not real text, so no query should attend to them. A <b>padding mask</b> of shape <code>(B, T)</code> marks real tokens. For a decoder you combine both rules: a key is allowed only if it's not in the future <b>and</b> not padding. Broadcasting does it in one line: <code>causal[None, None, :, :] & pad[:, None, None, :]</code>, shape <code>(B, 1, T, T)</code>. The "1" broadcasts over heads.</p>
<h4>Multi-head attention</h4>
<p>One attention pattern per token is limiting. A word may need to look at its subject, at the previous word and at a matching bracket all at once. <b>Multi-head attention</b> runs <code>h</code> attentions in parallel, each with its own smaller queries, keys and values, and combines them:</p>
<ol><li>Project: <code>Q = X W_Q</code>, <code>K = X W_K</code>, <code>V = X W_V</code>, each <code>(B, T, d_model)</code>.</li>
<li>Split: reshape to <code>(B, T, h, d_head)</code> with <code>d_head = d_model / h</code>, then transpose to <code>(B, h, T, d_head)</code>. Each head now has its own slice.</li>
<li>Attend: scaled dot-product attention per head, all at once, giving <code>(B, h, T, d_head)</code> and weights <code>(B, h, T, T)</code>.</li>
<li>Merge: transpose back and reshape to <code>(B, T, d_model)</code>, which concatenates the heads.</li>
<li>Mix: multiply by an output projection <code>W_O</code> of shape <code>(d_model, d_model)</code>, so heads can combine their findings.</li></ol>
<div class="tablewrap"><table><thead><tr><th>Step</th><th>Shape (B=2, T=5, d_model=16, h=4)</th></tr></thead><tbody>
<tr><td>Input x</td><td>(2, 5, 16)</td></tr>
<tr><td>After split</td><td>(2, 4, 5, 4)</td></tr>
<tr><td>Weights</td><td>(2, 4, 5, 5)</td></tr>
<tr><td>After merge and W_O</td><td>(2, 5, 16)</td></tr></tbody></table></div>
<p>The parameter count is <code>4 × d_model²</code> (for <code>W_Q</code>, <code>W_K</code>, <code>W_V</code>, <code>W_O</code>, without biases) no matter how many heads you use: heads split the same width, they don't add weights. What you gain is <code>h</code> independent attention patterns. Typical models use 12 to 128 heads with <code>d_head</code> of 64 or 128.</p>
<h4>PyTorch</h4>
<p>The demo builds a <code>MultiHeadAttention</code> module with four <code>nn.Linear</code> layers and the steps above written out, then checks it against <code>torch.nn.functional.scaled_dot_product_attention(q, k, v, is_causal=True)</code>, PyTorch's fused kernel that real models call. It also loads the same weights into the numpy version (note <code>nn.Linear</code> computes <code>x · W<sup>T</sup></code>, so the numpy matrix is the transpose). All three agree to about 1e-7.</p>`,
example: ["Autocomplete in an email client", `When you type "Thanks for the update, I'll send the" in an email app with smart compose, the model must suggest the next word using only what you've typed so far. The causal mask guarantees that during training it never learned to cheat by looking ahead. Different heads track different things at once: one links "send" to "update" (what is being sent), another tracks the polite register of "Thanks", and their combined output suggests "report" or "details".`],
diagram: {title: "Multi-head attention with masks", caption: "Inputs are projected and split into heads. Every head attends separately under the combined causal and padding mask. Heads are concatenated and mixed by W_O.",
  lanes: ["input", "project", "split", "attend", "combine"],
  cols: [[["x", "Input x", "(B, T, d_model)", "store"], ["m", "Masks", "causal AND padding", "guard"]], [["proj", "Q, K, V", "three Linear layers", "core"]], [["split", "Split heads", "(B, h, T, d_head)", "core"]], [["att", "Attention per head", "softmax(QK^T/sqrt d)V", "core"]], [["merge", "Merge heads", "(B, T, d_model)", "core"], ["wo", "Output W_O", "mix the heads", "user"]]],
  edges: [["x", "proj"], ["proj", "split"], ["split", "att", "h in parallel", "hot"], ["m", "att", "-inf where False", "dash"], ["att", "merge"], ["merge", "wo"]]},
demo: {file: "week3/multihead.py", run: "python -m week3.multihead", what: "Builds causal and padding masks and combines them for a padded batch, runs multi-head attention in numpy with every shape printed, then defines a PyTorch MultiHeadAttention module and shows it matches F.scaled_dot_product_attention and the numpy version.",
code: String.raw`
"""Demo: causal and padding masks, and multi-head attention in numpy and PyTorch.

Shapes to remember:
  x (B, T, d_model) -> project -> split -> (B, h, T, d_head) -> attend -> merge -> (B, T, d_model) -> W_O
"""
import math

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from week3.attention import scaled_dot_product_attention


def causal_mask(T):
    """True on and below the diagonal: token i may look at tokens 0..i, never the future."""
    return np.tril(np.ones((T, T), dtype=bool))


def padding_mask(lengths, T):
    """(B, T) True where the token is real, False where it is padding."""
    return np.arange(T)[None, :] < np.array(lengths)[:, None]


def split_heads(x, h):
    B, T, D = x.shape
    return x.reshape(B, T, h, D // h).transpose(0, 2, 1, 3)       # (B, h, T, d_head)


def merge_heads(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)          # (B, T, d_model)


def mha_numpy(X, W_Q, W_K, W_V, W_O, h, mask=None):
    Q, K, V = (split_heads(X @ W, h) for W in (W_Q, W_K, W_V))
    out, weights = scaled_dot_product_attention(Q, K, V, mask)
    return merge_heads(out) @ W_O, weights


class MultiHeadAttention(nn.Module):
    """Causal multi-head self-attention, written out so every step is visible."""

    def __init__(self, d_model, n_heads):
        super().__init__()
        assert d_model % n_heads == 0
        self.h, self.dh = n_heads, d_model // n_heads
        self.q = nn.Linear(d_model, d_model, bias=False)
        self.k = nn.Linear(d_model, d_model, bias=False)
        self.v = nn.Linear(d_model, d_model, bias=False)
        self.o = nn.Linear(d_model, d_model, bias=False)

    def forward(self, x, use_builtin=False):
        B, T, D = x.shape
        q, k, v = (lin(x).view(B, T, self.h, self.dh).transpose(1, 2) for lin in (self.q, self.k, self.v))
        if use_builtin:
            out = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        else:
            scores = q @ k.transpose(-2, -1) / math.sqrt(self.dh)
            future = torch.triu(torch.ones(T, T, dtype=torch.bool, device=x.device), diagonal=1)
            scores = scores.masked_fill(future, float("-inf"))
            out = torch.softmax(scores, dim=-1) @ v
        out = out.transpose(1, 2).contiguous().view(B, T, D)
        return self.o(out)


if __name__ == "__main__":
    np.set_printoptions(precision=2, suppress=True)
    rng = np.random.default_rng(0)

    T = 5
    print("causal mask (1 = may attend):\n", causal_mask(T).astype(int))
    Q = K = V = rng.normal(size=(T, 4))
    _, w = scaled_dot_product_attention(Q, K, V, causal_mask(T))
    print("causal attention weights (upper triangle is zero):\n", w)

    lengths = [5, 3]
    pad = padding_mask(lengths, T)
    print("\npadding mask for lengths", lengths, ":\n", pad.astype(int))
    combined = causal_mask(T)[None, None] & pad[:, None, None, :]           # (B, 1, T, T)
    print("combined mask shape:", combined.shape)

    B, d_model, h = 2, 16, 4
    X = rng.normal(size=(B, T, d_model))
    Ws = [rng.normal(size=(d_model, d_model)) / math.sqrt(d_model) for _ in range(4)]
    out, w = mha_numpy(X, *Ws, h=h, mask=combined)
    print("\nx", X.shape, "-> Q split into heads", split_heads(X @ Ws[0], h).shape,
          "-> weights", w.shape, "-> output", out.shape)
    print("sequence 2, head 0, query 2 (its last real token); padded keys 3, 4 get 0:", w[1, 0, 2])

    # PyTorch: our module vs the built-in fused kernel
    torch.manual_seed(0)
    mha = MultiHeadAttention(d_model, h)
    x = torch.randn(B, T, d_model)
    with torch.no_grad():
        mine, builtin = mha(x), mha(x, use_builtin=True)
    print("\ntorch manual vs F.scaled_dot_product_attention, max abs diff: %.2e" % (mine - builtin).abs().max().item())

    # numpy vs torch with the same weights (nn.Linear computes x @ W.T)
    Wn = [lin.weight.detach().numpy().T.astype(np.float64) for lin in (mha.q, mha.k, mha.v, mha.o)]
    out_np, _ = mha_numpy(x.numpy().astype(np.float64), *Wn, h=h, mask=causal_mask(T))
    print("numpy vs torch, max abs diff: %.2e" % np.abs(out_np - mine.numpy()).max())
    print("parameters in this layer:", sum(p.numel() for p in mha.parameters()), "= 4 x d_model^2 =", 4 * d_model ** 2)
`},
lab: {file: "week3/lab_multihead.py", run: "python -m week3.lab_multihead",
task: "Do the head reshaping yourself, build the combined mask for a padded batch, and write a test that proves the decoder never uses future tokens.",
steps: ["Run the script. It stops at the first assert because the reshape functions return their input.", "Complete <code>my_split_heads</code> and <code>my_merge_heads</code>. The asserts check shapes, order and that merge undoes split.", "Complete <code>batch_mask</code> so padded keys and future keys get zero weight.", "Complete <code>future_leak</code> by comparing outputs before position t, then answer TODO 4 (parameters versus number of heads) in a comment."],
done: "all asserts pass, the printed weights for the length-4 sequence have zeros in the last two columns and above the diagonal, the leak list is all False, and your comment explains why head count doesn't change the parameter count.",
code: String.raw`
"""Lab: reshape for heads yourself, combine masks for a padded batch, and prove the decoder can't see the future."""
import numpy as np
import torch

from week3.attention import scaled_dot_product_attention
from week3.multihead import MultiHeadAttention, causal_mask, merge_heads, split_heads


def my_split_heads(x, h):
    # TODO 1a: (B, T, d_model) -> (B, h, T, d_model // h). Use reshape, then transpose.
    return x


def my_merge_heads(x):
    # TODO 1b: (B, h, T, d_head) -> (B, T, h * d_head). The exact inverse of my_split_heads.
    return x


def batch_mask(lengths, T):
    # TODO 2: return a boolean mask of shape (B, 1, T, T) that is True only where the key is
    #         not in the future (causal) AND the key is a real token (not padding).
    return np.ones((len(lengths), 1, T, T), dtype=bool)


def future_leak(model, x, t):
    """True if changing token t changes the output at any position before t."""
    with torch.no_grad():
        before = model(x)
        x2 = x.clone()
        x2[:, t] += 5.0
        after = model(x2)
    # TODO 3: compare before[:, :t] and after[:, :t]; return True if they differ (use torch.allclose)
    return True


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    x = rng.normal(size=(2, 6, 12))
    ok = my_split_heads(x, 3).shape == (2, 3, 6, 4) and np.allclose(my_split_heads(x, 3), split_heads(x, 3))
    print("split matches demo:", ok)
    assert ok, "TODO 1a: my_split_heads gives the wrong shape or order"
    assert np.allclose(my_merge_heads(my_split_heads(x, 3)), x), "TODO 1b: merge(split(x)) must give back x"
    assert np.allclose(my_merge_heads(split_heads(x, 3)), merge_heads(split_heads(x, 3)))
    print("merge(split(x)) == x: True")

    lengths, T = [6, 4], 6
    m = batch_mask(lengths, T)
    Q = K = V = rng.normal(size=(2, 1, T, 4))
    _, w = scaled_dot_product_attention(Q, K, V, m)
    print("\nweights for sequence 2 (length 4):\n", np.round(w[1, 0], 2))
    assert np.allclose(w[1, 0][:, 4:], 0), "TODO 2: padded keys 4 and 5 must get zero weight"
    assert np.allclose(np.triu(w[0, 0], 1), 0), "TODO 2: future keys must get zero weight"
    assert np.allclose(m[0, 0], causal_mask(T))
    print("mask ok: no weight on padding or on the future")

    torch.manual_seed(0)
    mha = MultiHeadAttention(16, 4)
    xt = torch.randn(1, 8, 16)
    leaks = [future_leak(mha, xt, t) for t in range(1, 8)]
    print("\nfuture leak for t = 1..7:", leaks)
    assert not any(leaks), "TODO 3: a causal decoder must never leak (or future_leak is not finished)"
    # TODO 4: count parameters of MultiHeadAttention(16, h) for h = 1, 2, 4, 8 and explain in a
    #         comment why the count does not change with the number of heads.
`},
takeaways: ["A causal mask sets future scores to -inf so each position only sees itself and earlier tokens.", "Padding masks stop attention to filler tokens; for decoders, combine them with the causal mask using AND.", "Multi-head attention splits d_model into h heads, attends in parallel, concatenates and mixes with W_O.", "Shapes go (B, T, d_model) to (B, h, T, d_head) and back; the parameter count stays 4 × d_model².", "PyTorch's F.scaled_dot_product_attention gives the same result as the hand-written version, using faster kernels."],
mcq: [
{q: "In a causal mask for 5 tokens, how many (query, key) pairs are allowed?", a: ["5", "10", "15", "25"], c: 2, why: "Query i may see keys 0..i, so 1 + 2 + 3 + 4 + 5 = 15 pairs."},
{q: "d_model = 768 with 12 heads. What is d_head, and the shape of Q after splitting for a batch of 4 sequences of 100 tokens?", a: ["64, and (4, 12, 100, 64)", "768, and (4, 100, 768)", "64, and (4, 100, 12, 768)", "12, and (4, 64, 100, 12)"], c: 0, why: "768 / 12 = 64, and after the transpose the layout is (B, h, T, d_head)."},
{q: "You double the number of heads from 8 to 16 at the same d_model. What happens to the attention layer's parameter count?", a: ["It doubles", "It halves", "It increases by 16 × d_model", "It stays the same"], c: 3, why: "W_Q, W_K, W_V and W_O stay d_model × d_model; more heads just split the same width into smaller slices."}
]
},
{
id: "3.3", title: "Attention in practice: cost, variants and what heads learn", mins: 70, kicker: "O(T²), cross-attention, MQA and GQA, FlashAttention, sliding windows, heatmaps, induction heads",
focus: "why attention cost grows with the square of the context, and how grouped-query attention, tiling and sliding windows keep long contexts affordable",
pip: [], deps: ["3.1"],
runNote: "The timing table uses up to 8,192 tokens and briefly needs about 1 GB of RAM; heatmaps need matplotlib (already in Colab).",
body: `<p>Attention is simple to write and expensive to run. This lesson looks at its cost, the variants every modern model uses to tame it, and what trained heads actually do.</p>
<h4>The quadratic cost</h4>
<p>The score table has one entry per (query, key) pair: <code>T × T</code>. Double the context and you get four times the scores, four times the memory to hold them and roughly four times the work. At <code>T = 8,192</code> one head's float32 score table is 268 MB; a model with 32 layers and 32 heads would need that 1,024 times over if it stored them all. The demo measures time against <code>T</code> so you can see the curve bend upward. The rest of the transformer (week 4) grows only linearly with <code>T</code>, so attention dominates at long context.</p>
<h4>Self-attention vs cross-attention</h4>
<p>In <b>self-attention</b>, queries, keys and values come from the same sequence. In <b>cross-attention</b>, queries come from one sequence and keys and values from another. The original encoder-decoder transformer used it so each translated word could look at the source sentence; speech and image models use it to let text look at audio or image features. Decoder-only LLMs, the focus of this course, use only self-attention.</p>
<h4>Multi-query and grouped-query attention</h4>
<p>During generation (week 5), a model saves every token's keys and values so it doesn't recompute them: the <b>KV cache</b>. Its size is <code>2 × layers × kv_heads × d_head × T</code> numbers per sequence, and it often limits how many users a GPU can serve.</p>
<ul><li><b>Multi-query attention (MQA):</b> all query heads share one key head and one value head. The cache shrinks by the number of heads, with some quality loss.</li>
<li><b>Grouped-query attention (GQA):</b> a middle ground. Query heads are split into groups, and each group shares one K/V head (for example 32 query heads and 8 KV heads). The cache shrinks 4 times with almost no quality loss, which is why Llama, Mistral, Qwen and most recent models use it.</li></ul>
<p>The demo prints the cache size for an 8,192-token sequence: about 4.3 GB with full multi-head, 1.1 GB with 8 KV heads, 0.13 GB with one.</p>
<h4>FlashAttention: same math, less memory traffic</h4>
<p>On a GPU, the slow part is often moving the big score table in and out of memory, not the arithmetic. <b>FlashAttention</b> computes exactly the same result without ever storing the full <code>T × T</code> table. It processes keys in tiles that fit in fast on-chip memory and uses an <b>online softmax</b>: keep a running maximum, a running sum of exponentials and a running weighted output, and rescale them whenever a new tile raises the maximum. The demo implements this in numpy and matches full attention to 1e-16 while holding only a <code>T × 128</code> block at a time. It's not an approximation, which is why it became the default; PyTorch's <code>scaled_dot_product_attention</code> picks such kernels automatically.</p>
<h4>Sliding-window attention</h4>
<p>Another lever is to let each token attend only to the last <code>w</code> tokens. Cost becomes <code>T × w</code> instead of <code>T²</code>. Information still travels further, because each layer passes it on another <code>w</code> tokens. Several models mix sliding-window layers with a few full-attention layers to keep some long-range reach.</p>
<h4>What heads learn</h4>
<p>An <b>attention heatmap</b> plots the weight matrix: rows are queries, columns are keys, bright cells are strong attention. Interpretability research on trained models finds recurring patterns:</p>
<ul><li><b>Previous-token heads:</b> each token attends to the one just before it, a bright line just below the diagonal.</li>
<li><b>Induction heads:</b> a two-layer circuit that completes repeated patterns. If "Mr Dursley" appeared earlier and the text now says "Mr", the head finds the earlier "Mr", looks at what came next, and predicts "Dursley". It builds on a previous-token head in an earlier layer, and it's a key ingredient of in-context learning (week 8).</li>
<li><b>Positional and syntactic heads:</b> heads that track the first token, punctuation, or subject-verb links.</li></ul>
<p>Heatmaps are useful for intuition but easy to over-read: a weight shows where information was pulled from, not why the model made its final prediction.</p>`,
example: ["Summarizing long contracts at a bank", `A bank's legal team summarizes 120-page loan agreements, about 80,000 tokens each. With full multi-head attention and no tricks, the KV cache alone for one document would fill most of a GPU. Their model uses grouped-query attention (8 KV heads for 64 query heads) and FlashAttention kernels, so the cache shrinks 8 times and the score table is never stored in full. The same GPU now handles six documents at once, and the summaries are unchanged because neither trick changes the math the model was trained with.`],
diagram: {title: "Making attention affordable", caption: "Full attention scales with T squared. GQA shrinks the KV cache, tiling avoids storing the score table, and sliding windows cut the number of keys per query.",
  lanes: ["problem", "memory fix", "compute fix", "range fix", "result"],
  cols: [[["full", "Full attention", "T x T scores", "core"], ["kv", "KV cache", "2 x L x kv x d x T", "store"]], [["gqa", "GQA / MQA", "fewer K/V heads", "guard"]], [["flash", "Tiled online softmax", "FlashAttention idea", "guard"]], [["swa", "Sliding window", "only last w keys", "guard"]], [["out", "Long context", "fits on the GPU", "user"]]],
  edges: [["kv", "gqa", "shrink cache"], ["full", "flash", "never store T x T"], ["flash", "swa", "", "dash"], ["gqa", "out"], ["flash", "out", "same math", "hot"], ["swa", "out"]]},
demo: {file: "week3/attention_cost.py", run: "python -m week3.attention_cost", what: "Times numpy attention from 512 to 8,192 tokens and prints score-matrix memory, checks a tiled online-softmax attention against the full version, prints KV-cache sizes for multi-head, grouped-query and multi-query attention, shows a sliding-window mask, and saves an attention heatmap.",
code: String.raw`
"""Demo: what attention costs, and the tricks that make it affordable.

1. Time and memory grow with T^2: measure it.
2. Tiled attention with an online softmax (the idea behind FlashAttention): same answer,
   but never holds the full T x T score matrix.
3. KV-cache memory for multi-head, grouped-query and multi-query attention.
4. A sliding-window mask, and an attention heatmap.
"""
import time

import numpy as np

from week3.attention import scaled_dot_product_attention, softmax


def time_attention(T, d=64, repeats=5):
    rng = np.random.default_rng(0)
    Q, K, V = (rng.normal(size=(T, d)).astype(np.float32) for _ in range(3))
    scaled_dot_product_attention(Q, K, V)                # warm-up run, not timed
    best = 1e9
    for _ in range(repeats):
        t0 = time.perf_counter()
        scaled_dot_product_attention(Q, K, V)
        best = min(best, time.perf_counter() - t0)
    return best


def tiled_attention(Q, K, V, block=64):
    """Process keys in blocks, keeping a running max (m), running sum (l) and running output."""
    T, d = Q.shape
    m = np.full((T, 1), -np.inf)
    l = np.zeros((T, 1))
    acc = np.zeros((T, V.shape[1]))
    for s in range(0, K.shape[0], block):
        S = Q @ K[s:s + block].T / np.sqrt(d)            # only a (T, block) slice of scores
        m_new = np.maximum(m, S.max(axis=1, keepdims=True))
        p = np.exp(S - m_new)
        correction = np.exp(m - m_new)                     # rescale what we summed so far
        l = l * correction + p.sum(axis=1, keepdims=True)
        acc = acc * correction + p @ V[s:s + block]
        m = m_new
    return acc / l


def kv_cache_bytes(layers, kv_heads, d_head, seq_len, batch=1, bytes_per=2):
    return 2 * layers * kv_heads * d_head * seq_len * batch * bytes_per      # 2 = keys and values


def sliding_window_mask(T, w):
    i, j = np.arange(T)[:, None], np.arange(T)[None, :]
    return (j <= i) & (i - j < w)


if __name__ == "__main__":
    print("   T   time (ms)  x prev   score matrix (MB, float32)")
    prev = None
    for T in (512, 1024, 2048, 4096, 8192):
        t = time_attention(T)
        ratio = "" if prev is None else f"{t / prev:5.1f}x"
        print(f"{T:5d}  {t * 1000:9.1f}  {ratio:>6s}   {T * T * 4 / 1e6:8.1f}")
        prev = t
    print("Doubling T quadruples the score memory and the work. Timings are noisy and small sizes")
    print("are dominated by fixed overheads, but the ratio climbs toward 4x as T grows.")

    rng = np.random.default_rng(1)
    Q, K, V = (rng.normal(size=(1024, 64)) for _ in range(3))
    full, _ = scaled_dot_product_attention(Q, K, V)
    tiled = tiled_attention(Q, K, V, block=128)
    print("\ntiled vs full attention, max abs diff: %.2e" % np.abs(full - tiled).max())
    print("largest score block held: (1024, 128) = %.1f MB instead of %.1f MB" % (1024 * 128 * 8 / 1e6, 1024 * 1024 * 8 / 1e6))

    print("\nKV cache for one 8,192-token sequence, 32 layers, 32 query heads, d_head 128, fp16:")
    for name, kv in (("multi-head (32 KV heads)", 32), ("grouped-query (8 KV heads)", 8), ("multi-query (1 KV head)", 1)):
        print(f"  {name:28s} {kv_cache_bytes(32, kv, 128, 8192) / 1e9:6.2f} GB")

    print("\nsliding-window mask, T=8, window 3:\n", sliding_window_mask(8, 3).astype(int))

    words = "the customer asked why the refund for the order was late".split()
    T = len(words)
    X = rng.normal(size=(T, 16))
    W_Q, W_K = rng.normal(size=(16, 8)) / 4, rng.normal(size=(16, 8)) / 4
    _, w = scaled_dot_product_attention(X @ W_Q, X @ W_K, X, np.tril(np.ones((T, T), bool)))
    try:
        import matplotlib.pyplot as plt
        plt.figure(figsize=(6, 5))
        plt.imshow(w, cmap="viridis")
        plt.xticks(range(T), words, rotation=60)
        plt.yticks(range(T), words)
        plt.xlabel("key (attended to)")
        plt.ylabel("query (attending)")
        plt.title("Causal attention weights (random, untrained head)")
        plt.colorbar()
        plt.tight_layout()
        plt.savefig("week3_attention.png", dpi=120)
        print("\nsaved heatmap to week3_attention.png")
        plt.show()
    except ImportError:
        print("\n(install matplotlib to see the heatmap)")
    print("row for 'late':", [(wd, round(float(p), 2)) for wd, p in zip(words, w[-1]) if p > 0.05])
`},
lab: {file: "week3/lab_heads.py", run: "python -m week3.lab_heads",
task: "Build a previous-token head by hand, implement grouped-query attention and confirm it equals multi-head attention when every query head has its own KV head, then add a sliding-window mask and plot both patterns.",
steps: ["Run the script. It stops at the first assert because <code>W_Q</code> is all zeros, so attention is spread evenly.", "Complete <code>previous_token_WQ</code> so every token puts more than 0.9 of its attention on the token before it.", "Complete <code>gqa</code> by repeating each K and V head with <code>np.repeat</code>; check it equals multi-head attention when n_kv equals h.", "Complete <code>sliding_window_mask</code>, look at the saved heatmaps, and answer TODO 4 about induction heads in a comment."],
done: "all asserts pass, the previous-token weights are above 0.9, the GQA table prints for 8, 4, 2 and 1 KV heads, no query uses more than 3 keys, and <code>week3_heads.png</code> shows a bright line under the diagonal and a band of width 3.",
code: String.raw`
"""Lab: hand-build a previous-token head, implement grouped-query attention, and add a sliding window."""
import numpy as np

from week3.attention import scaled_dot_product_attention


def previous_token_WQ(T, strength=20.0):
    """Queries and keys come from one-hot positions (X = identity, W_K = identity).
    Build W_Q (T x T) so the query at position i matches the key at position i - 1."""
    W_Q = np.zeros((T, T))
    # TODO 1: for every i >= 1 set W_Q[i, i - 1] = strength. (Row i of X @ W_Q is then
    #         strength * one_hot(i - 1), which lines up with key i - 1.)
    return W_Q


def gqa(Q, K, V, mask=None):
    """Grouped-query attention. Q: (h, T, d). K, V: (n_kv, T, d) with h divisible by n_kv.
    Each group of h // n_kv query heads shares one key/value head."""
    h, n_kv = Q.shape[0], K.shape[0]
    # TODO 2: repeat every K and V head h // n_kv times along axis 0 (np.repeat), then call
    #         scaled_dot_product_attention and return its output.
    return np.zeros_like(Q)


def sliding_window_mask(T, w):
    # TODO 3: True where key j is not in the future and at most w - 1 steps back: 0 <= i - j < w
    return np.tril(np.ones((T, T), dtype=bool))


if __name__ == "__main__":
    np.set_printoptions(precision=2, suppress=True)
    T = 8
    X = np.eye(T)
    causal = np.tril(np.ones((T, T), dtype=bool))
    _, w = scaled_dot_product_attention(X @ previous_token_WQ(T), X @ np.eye(T), X, causal)
    print("previous-token head weights:\n", w)
    prev = [w[i, i - 1] for i in range(1, T)]
    assert min(prev) > 0.9, "TODO 1: every token should put > 0.9 of its attention on the token before it"
    print("each token -> previous token: ok (min weight %.3f)" % min(prev))

    rng = np.random.default_rng(0)
    h, d = 8, 16
    Q = rng.normal(size=(h, T, d))
    K8, V8 = rng.normal(size=(h, T, d)), rng.normal(size=(h, T, d))
    mha, _ = scaled_dot_product_attention(Q, K8, V8, causal)
    assert np.allclose(gqa(Q, K8, V8, causal), mha), "TODO 2: with n_kv == h, GQA must equal multi-head attention"
    print("\nGQA with 8 KV heads == MHA: True")
    for n_kv in (8, 4, 2, 1):
        out = gqa(Q, K8[:n_kv], V8[:n_kv], causal)
        kv_floats = 2 * n_kv * T * d
        print(f"  n_kv={n_kv}: output {out.shape}, KV numbers cached per layer: {kv_floats}")

    wmask = sliding_window_mask(T, 3)
    _, ws = scaled_dot_product_attention(Q[0], K8[0], V8[0], wmask)
    nonzero = (ws > 1e-6).sum(axis=1)
    print("\nkeys used per query with window 3:", nonzero)
    assert nonzero.max() <= 3, "TODO 3: no query may use more than 3 keys"
    try:
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(1, 2, figsize=(8, 3.5))
        ax[0].imshow(w, cmap="viridis")
        ax[0].set_title("previous-token head")
        ax[1].imshow(ws, cmap="viridis")
        ax[1].set_title("sliding window (w=3)")
        for a in ax:
            a.set_xlabel("key")
            a.set_ylabel("query")
        plt.tight_layout()
        plt.savefig("week3_heads.png", dpi=120)
        print("saved week3_heads.png")
        plt.show()
    except ImportError:
        print("(install matplotlib to see the heatmaps)")
    # TODO 4: in a comment, explain how a previous-token head in layer 1 lets an induction head
    #         in layer 2 complete a repeated pattern such as "Mr Dursley ... Mr" -> "Dursley".
`},
takeaways: ["Attention's score table is T × T, so memory and work grow with the square of the context length.", "Cross-attention takes queries from one sequence and keys and values from another; decoder-only LLMs use self-attention.", "MQA and GQA share key/value heads across query heads, shrinking the KV cache with little quality loss.", "FlashAttention tiles the computation with an online softmax: exact results without storing the full score table.", "Heatmaps reveal patterns such as previous-token and induction heads, but weights alone don't explain a prediction."],
mcq: [
{q: "Context grows from 4,000 to 16,000 tokens. Roughly how much larger is each attention score table?", a: ["4 times", "8 times", "16 times", "The same"], c: 2, why: "Scores scale with T²: (16,000 / 4,000)² = 16."},
{q: "A model has 32 query heads and 8 key/value heads. Compared with full multi-head attention, its KV cache is…", a: ["The same size", "4 times smaller", "8 times smaller", "32 times smaller"], c: 1, why: "The cache scales with the number of KV heads: 32 / 8 = 4 times smaller."},
{q: "What does FlashAttention change about attention's output?", a: ["It approximates the softmax with a cheaper function", "It drops low-weight keys", "It only attends to nearby tokens", "Nothing: it computes the exact same result while avoiding storing the full score matrix"], c: 3, why: "It tiles the work with an online softmax; the math is identical, only memory traffic changes."}
]
}
],
quiz: [
{q: "In self-attention, where do the queries, keys and values come from?", a: ["Queries from the input, keys and values from a database", "All three are learned projections of the same token vectors", "Keys and values are fixed random matrices", "Only values are learned"], c: 1, why: "Q = X W_Q, K = X W_K, V = X W_V, all from the same sequence X."},
{q: "What does row i of the attention weight matrix tell you?", a: ["How much each key token contributes to token i's output", "How often token i appears", "The embedding of token i", "Which tokens attend to token i"], c: 0, why: "Row i is query i's softmax over keys: how much of each value vector goes into its output."},
{q: "Why is the causal mask needed when training a decoder on whole sequences in parallel?", a: ["To save memory", "To normalize the scores", "So each position can't attend to later tokens and copy the answer it must predict", "To ignore padding"], c: 2, why: "Without it, position t could read token t+1, which is exactly its training target."},
{q: "For a padded batch in a decoder, which key positions may a query attend to?", a: ["All positions", "Only padding", "Only the query itself", "Keys that are not in the future and not padding"], c: 3, why: "Combine the causal and padding masks with AND."},
{q: "What is W_O for in multi-head attention?", a: ["It mixes the concatenated head outputs back into one d_model-sized vector per token", "It masks the future", "It produces the queries", "It scales the scores"], c: 0, why: "After merging the heads, W_O lets information from different heads combine."},
{q: "Two implementations of attention give outputs that differ by 1e-7. What's the most likely explanation?", a: ["One has a bug in the mask", "Normal floating-point rounding from a different order of operations", "One uses a different softmax", "The heads were concatenated in a different order"], c: 1, why: "Fused kernels and hand-written code add numbers in different orders; float32 differences around 1e-7 are expected."},
{q: "Which change reduces the KV cache without changing the number of query heads?", a: ["Adding more layers", "Raising d_model", "Grouped-query attention", "Removing the causal mask"], c: 2, why: "GQA lets groups of query heads share one key/value head, so fewer K and V vectors are cached."},
{q: "An induction head helps a model…", a: ["Count tokens", "Find positions in the vocabulary", "Remove padding", "Continue a pattern seen earlier in the context, such as repeating a name after its first word"], c: 3, why: "It finds an earlier occurrence of the current token and predicts what followed it, a basis for in-context learning."}
],
checkpoint: `You can write softmax(Q K^T / sqrt(d_k)) V from memory and explain the scaling, your masks block the future and padding, your multi-head layer matches PyTorch's built-in attention, and you've measured the quadratic cost and built GQA, a sliding window and a previous-token head. Keep <code>week3/</code>: in week 4 you'll wrap this attention in residual connections, layer norm and a feed-forward network to build and train a complete GPT.`
});
