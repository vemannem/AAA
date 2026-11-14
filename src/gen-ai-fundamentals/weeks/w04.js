W({
n: 4, title: "The Full Transformer", short: "Full transformer", hours: "7–9 hours",
goal: "Put attention together with feed-forward layers, residual connections and normalization, trace every step of the original encoder-decoder transformer, and train a small GPT of your own.",
builds: "A transformer block in numpy with every shape printed, an encoder-decoder transformer in PyTorch traced step by step and trained to reverse words, and a tiny character-level GPT you train on a CPU in about a minute.",
outcomes: [
  "Write the forward pass of one transformer block (attention, FFN, residuals, normalization) and explain what each part is for.",
  "Explain LayerNorm vs RMSNorm, pre-norm vs post-norm, GELU vs SwiGLU, and what a mixture-of-experts layer changes.",
  "Walk through every step of the encoder-decoder transformer for translation, including cross-attention, teacher forcing and autoregressive inference.",
  "Choose between encoder-only, decoder-only and encoder-decoder models for a task, and say why nearly all LLMs are decoder-only.",
  "Train a character-level GPT, read its loss curves, count its parameters and reason about how depth, width, context and data size change the result."
],
lessons: [
{
id: "4.1", title: "Feed-forward layers, residual connections and normalization", mins: 65, kicker: "FFN, GELU, SwiGLU, residual stream, LayerNorm, RMSNorm, pre-norm, mixture of experts",
focus: "what the parts of a transformer block around attention do, and why modern LLMs use pre-norm, RMSNorm and gated FFNs",
pip: [],
runNote: "The demo is pure numpy and runs instantly. The lab trains four 24-layer stacks in PyTorch: about 30 to 60 seconds on a laptop CPU.",
body: `<p>In week 3 you built self-attention: the step where tokens look at each other and mix information. Attention alone is not a transformer, though. A transformer <b>block</b> wraps attention with three more ingredients, and the model is just this block stacked many times.</p>
<div class="math">h = x + Attention(Norm(x))        sublayer 1: tokens exchange information
y = h + FFN(Norm(h))             sublayer 2: each token is processed on its own</div>
<p>Here <code>x</code> is a matrix with one row per token (shape T by d, where T is the number of tokens and d is the model width, called d_model). The output <code>y</code> has the same shape, which is what lets you stack 2, 32 or 120 blocks.</p>
<h4>The feed-forward network (FFN)</h4>
<p>The FFN is a small two-layer neural network applied to every token <i>separately</i> (that is why it is called position-wise). It expands each token vector to about 4 times the width, applies a nonlinearity, then projects back:</p>
<div class="math">FFN(x) = W2 · GELU(W1 · x + b1) + b2       W1: d → 4d,  W2: 4d → d</div>
<p>GELU is a smooth version of ReLU: it lets positive values through, squashes negative ones towards zero, and has no sharp corner at zero, which helps optimization. If attention is where tokens <i>talk</i>, the FFN is where each token <i>thinks</i> about what it heard. Research suggests much of a model's factual knowledge is stored in FFN weights, and they hold about two thirds of a block's parameters (the demo prints this).</p>
<p>Many modern LLMs (Llama, Qwen, Mistral and others) use <b>SwiGLU</b> instead: two parallel projections, one passed through SiLU (x times sigmoid of x) acting as a gate that multiplies the other, then a down projection. It has three matrices, so the hidden size is set to about 8/3 of d to keep the parameter count equal to the classic 4d FFN. In practice it trains a little better per parameter.</p>
<h4>Residual connections: the residual stream</h4>
<p>Each sublayer <i>adds</i> its output to its input instead of replacing it. Two big benefits follow:</p>
<ul><li><b>Gradient highway.</b> The derivative of <code>x + f(x)</code> with respect to x is 1 plus the derivative of f. That "1" lets gradients flow straight from the loss to the first layer, even through 100 blocks. Without it, gradients get multiplied by many layer Jacobians and explode or vanish. The lab measures exactly this.</li>
<li><b>A shared workspace.</b> You can picture the token vectors as a <b>residual stream</b> flowing up through the model. Every attention and FFN sublayer reads from the stream and writes a small update back into it. Interpretability researchers use this picture to study what each layer adds.</li></ul>
<h4>Normalization: LayerNorm and RMSNorm</h4>
<p>Activations can drift to very large or very small values as they pass through layers. A norm layer rescales each token vector on its own (not across the batch):</p>
<div class="math">LayerNorm(x) = γ · (x − mean(x)) / sqrt(var(x) + ε) + β
RMSNorm(x)   = γ · x / sqrt(mean(x²) + ε)</div>
<p>In words: LayerNorm subtracts the vector's average and divides by its standard deviation, then applies a learned per-dimension scale γ (gamma) and shift β (beta). ε (epsilon) is a tiny number that avoids dividing by zero. RMSNorm skips the mean and the shift and only divides by the root mean square. It is cheaper and works just as well, so most recent LLMs use it.</p>
<h4>Pre-norm vs post-norm</h4>
<p>The 2017 transformer applied the norm <i>after</i> the residual add: <code>Norm(x + f(x))</code> (post-norm). That puts a norm on the main path, so the clean gradient highway is interrupted at every layer, and deep post-norm models need careful learning-rate warm-up. <b>Pre-norm</b> normalizes only the input to each sublayer: <code>x + f(Norm(x))</code>. The residual path stays an untouched sum from the embeddings to the output, which makes deep models stable to train. GPT-2 onwards and almost every modern LLM use pre-norm, with one extra norm before the final output layer.</p>
<h4>Mixture of experts (MoE), briefly</h4>
<p>An MoE layer replaces the single FFN with, say, 8 to 256 expert FFNs plus a small <b>router</b>: a linear layer that scores the experts for each token. Only the top-k experts (often 1 or 2, sometimes up to 8) run for that token, and their outputs are mixed with the router's softmax weights. The model gets many more parameters (more capacity for knowledge) while the compute per token stays close to a small dense model. Models such as Mixtral and DeepSeek-V3 use this. The costs are memory (all experts must be loaded) and keeping experts evenly used, which training handles with an extra load-balancing loss.</p>`,
example: ["An assembly line with a running file", `Think of a loan application moving through a bank's back office. Each desk (a block) reads the file, adds a note, and passes the whole file on; nobody throws away earlier notes. That is the residual stream. Before reading, each clerk straightens the pages to a standard size (normalization), then first checks the file against related cases (attention) and then works on it alone with their own expertise (the FFN). In a mixture-of-experts office, a receptionist (the router) sends each file to just the two specialists who suit it best (say, mortgages and self-employed income), so the bank employs many specialists but each file only costs two desk visits.`],
diagram: {title: "One pre-norm transformer block", caption: "The residual stream flows straight up the left. Each sublayer reads a normalized copy, computes an update, and adds it back. Stacking N of these blocks gives the transformer body.",
  lanes: ["stream in", "sublayer 1", "add", "sublayer 2", "stream out"],
  cols: [[["x", "Residual stream x", "T tokens x d", "store"]], [["n1", "RMSNorm", "per token", "guard"], ["att", "Self-attention", "tokens mix", "core"]], [["add1", "x + attention", "residual add", "core"]], [["n2", "RMSNorm", "per token", "guard"], ["ffn", "FFN or MoE", "d → 4d → d", "core"]], [["y", "x + FFN", "same shape as x", "store"]]],
  edges: [["x", "n1"], ["n1", "att"], ["att", "add1"], ["x", "add1", "skip", "hot"], ["add1", "n2"], ["n2", "ffn"], ["ffn", "y"], ["add1", "y", "skip", "hot"]]},
demo: {file: "week4/block_numpy.py", run: "python -m week4.block_numpy", what: "A complete pre-norm transformer block in numpy: RMSNorm, multi-head causal attention, a GELU FFN and two residual adds, with the shape printed after every step. It also compares LayerNorm and RMSNorm on one vector, counts parameters, runs a SwiGLU FFN, and routes six tokens through a top-2 mixture of experts.",
code: String.raw`
"""Demo: one pre-norm transformer block, forward pass in numpy, every shape printed.

block(x) = x + Attention(RMSNorm(x))          # sublayer 1, with a residual
           then x + FFN(RMSNorm(x))           # sublayer 2, with a residual
Weights are random, so the numbers are meaningless; the shapes and the flow are the point.
"""
import numpy as np

rng = np.random.default_rng(0)


def layer_norm(x, gamma, beta, eps=1e-5):
    """Subtract the mean, divide by the standard deviation, then scale and shift."""
    mu = x.mean(axis=-1, keepdims=True)
    var = x.var(axis=-1, keepdims=True)
    return gamma * (x - mu) / np.sqrt(var + eps) + beta


def rms_norm(x, gamma, eps=1e-6):
    """Divide by the root mean square only (no mean subtraction, no shift)."""
    rms = np.sqrt((x ** 2).mean(axis=-1, keepdims=True) + eps)
    return gamma * x / rms


def gelu(x):
    return 0.5 * x * (1 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))


def silu(x):
    return x / (1 + np.exp(-x))


def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)


def causal_self_attention(x, p, n_heads):
    """Multi-head causal self-attention for one sequence x of shape (T, d)."""
    T, d = x.shape
    dh = d // n_heads
    q, k, v = x @ p["Wq"], x @ p["Wk"], x @ p["Wv"]                      # (T, d) each
    q, k, v = [m.reshape(T, n_heads, dh).transpose(1, 0, 2) for m in (q, k, v)]  # (h, T, dh)
    scores = q @ k.transpose(0, 2, 1) / np.sqrt(dh)                          # (h, T, T)
    future = np.triu(np.ones((T, T), dtype=bool), k=1)
    scores = np.where(future, -1e9, scores)
    out = softmax(scores) @ v                                                # (h, T, dh)
    return out.transpose(1, 0, 2).reshape(T, d) @ p["Wo"]                    # (T, d)


def ffn_gelu(x, p):
    """Classic FFN: expand to 4d, GELU, project back to d."""
    return gelu(x @ p["W1"] + p["b1"]) @ p["W2"] + p["b2"]


def ffn_swiglu(x, p):
    """SwiGLU FFN: a gated branch silu(x Wg) multiplies a linear branch x Wu."""
    return (silu(x @ p["Wg"]) * (x @ p["Wu"])) @ p["Wd"]


def moe_ffn(x, experts, Wr, top_k=2):
    """Mixture of experts: a router scores experts per token and only the top-k run."""
    logits = x @ Wr                                        # (T, n_experts)
    chosen = np.argsort(-logits, axis=-1)[:, :top_k]       # (T, top_k)
    out = np.zeros_like(x)
    for t in range(x.shape[0]):
        w = softmax(logits[t, chosen[t]])                  # mix weights of the chosen experts
        for weight, e in zip(w, chosen[t]):
            out[t] += weight * ffn_gelu(x[t:t + 1], experts[e])[0]
    return out, chosen


def init_params(d, n_heads, hidden):
    s = 1 / np.sqrt(d)
    p = {name: rng.normal(0, s, (d, d)) for name in ("Wq", "Wk", "Wv", "Wo")}
    p.update(W1=rng.normal(0, s, (d, hidden)), b1=np.zeros(hidden),
             W2=rng.normal(0, 1 / np.sqrt(hidden), (hidden, d)), b2=np.zeros(d),
             g1=np.ones(d), g2=np.ones(d))
    return p


def block(x, p, n_heads, verbose=True):
    show = print if verbose else (lambda *a: None)
    show(f"  input x (residual stream)   {x.shape}")
    h = rms_norm(x, p["g1"])
    show(f"  RMSNorm                     {h.shape}   row RMS now {np.sqrt((h ** 2).mean(-1)).round(2)[:3]}...")
    a = causal_self_attention(h, p, n_heads)
    show(f"  causal self-attention       {a.shape}   ({n_heads} heads of size {x.shape[1] // n_heads})")
    x = x + a
    show(f"  x + attention  (residual)   {x.shape}")
    h = rms_norm(x, p["g2"])
    up = gelu(h @ p["W1"] + p["b1"])
    show(f"  FFN expand + GELU           {up.shape}   (4x wider)")
    f = up @ p["W2"] + p["b2"]
    show(f"  FFN project back            {f.shape}")
    x = x + f
    show(f"  x + FFN  (residual)         {x.shape}")
    return x


if __name__ == "__main__":
    T, d, n_heads = 6, 32, 4
    hidden = 4 * d
    x = rng.normal(0, 1, (T, d))       # 6 token vectors, as if they came from embeddings + positions
    p = init_params(d, n_heads, hidden)

    print(f"One pre-norm block, T={T} tokens, d_model={d}")
    y = block(x, p, n_heads)
    print("output keeps the input shape, so blocks can be stacked:", y.shape == x.shape)

    print("\nLayerNorm vs RMSNorm on the same row:")
    row = np.array([[2.0, 4.0, 6.0, 8.0]])
    print("  LayerNorm:", layer_norm(row, np.ones(4), np.zeros(4)).round(3), " (mean 0, std 1)")
    print("  RMSNorm:  ", rms_norm(row, np.ones(4)).round(3), " (RMS 1, mean not removed)")

    attn_params = 4 * d * d
    ffn_params = 2 * d * hidden + hidden + d
    print(f"\nparameters per block: attention {attn_params:,}  FFN {ffn_params:,}  "
          f"-> FFN is {ffn_params / (attn_params + ffn_params):.0%} of the block")

    sw_hidden = int(8 * d / 3)       # 8/3 d keeps SwiGLU's three matrices near the 4d FFN's two
    sp = {"Wg": rng.normal(0, 0.2, (d, sw_hidden)), "Wu": rng.normal(0, 0.2, (d, sw_hidden)),
          "Wd": rng.normal(0, 0.2, (sw_hidden, d))}
    print(f"SwiGLU FFN: hidden {sw_hidden}, params {3 * d * sw_hidden:,}, output {ffn_swiglu(x, sp).shape}")

    n_experts = 4
    experts = [init_params(d, n_heads, hidden) for _ in range(n_experts)]
    Wr = rng.normal(0, 1, (d, n_experts))
    out, chosen = moe_ffn(rms_norm(x, np.ones(d)), experts, Wr, top_k=2)
    print(f"\nMixture of experts: {n_experts} experts, top-2 per token, output {out.shape}")
    for t in range(T):
        print(f"  token {t} -> experts {sorted(chosen[t].tolist())}")
    print("Each token ran 2 of 4 FFNs: 4x the FFN parameters, about 2x the FFN compute of one expert.")
`},
lab: {file: "week4/lab_residual.py", run: "python -m week4.lab_residual",
task: "Implement RMSNorm, a SwiGLU FFN and the pre-norm residual, then measure how residuals and norm placement change gradients and training in a 24-layer stack.",
steps: ["Run the script. The two checks say \"not done yet\" and all four designs look broken.", "TODO 1: complete <code>RMSNorm.forward</code>; the check expects [0.8485, 1.1314] for the input [3, 4].", "TODO 2: complete <code>SwiGLU.forward</code> as <code>down(silu(gate(x)) * up(x))</code>.", "TODO 3: add the residual in the pre-norm branch, then rerun and read the gradient table.", "TODO 4: explain the results in a comment, then try <code>run(depth=4)</code> and compare."],
done: "both checks print ok, the two residual designs show a first/last gradient ratio between 0.1 and 10 while the two no-residual designs are thousands of times off, pre-norm with residual reaches the lowest loss, and your comment explains why.",
code: String.raw`
"""Lab: why residual connections and pre-norm matter in a deep stack.

We stack 24 FFN sublayers (attention would sit beside each one in a real block,
but the FFN alone is enough to see the effect) and compare four designs:
pre-norm or post-norm, with or without residual connections.
"""
import time

import torch
import torch.nn as nn

torch.manual_seed(0)


class RMSNorm(nn.Module):
    def __init__(self, d, eps=1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(d))

    def forward(self, x):
        # TODO 1: return weight * x / sqrt(mean of x squared over the last dim + eps)
        return x


class SwiGLU(nn.Module):
    def __init__(self, d, hidden):
        super().__init__()
        self.gate = nn.Linear(d, hidden, bias=False)
        self.up = nn.Linear(d, hidden, bias=False)
        self.down = nn.Linear(hidden, d, bias=False)

    def forward(self, x):
        # TODO 2: return down(silu(gate(x)) * up(x)). The line below is a plain ReLU FFN placeholder.
        return self.down(torch.relu(self.up(x)))


class Sublayer(nn.Module):
    def __init__(self, d, residual=True, norm="pre"):
        super().__init__()
        self.residual, self.norm_pos = residual, norm
        self.norm = RMSNorm(d)
        self.ffn = SwiGLU(d, int(8 * d / 3))

    def forward(self, x):
        if self.norm_pos == "pre":
            out = self.ffn(self.norm(x))
            # TODO 3: with a residual, return x + out (the "gradient highway"); without, return out
            return out
        out = self.ffn(x)                                   # post-norm: normalize after adding
        return self.norm(x + out) if self.residual else self.norm(out)


def make_stack(depth, d, residual, norm):
    return nn.Sequential(*[Sublayer(d, residual, norm) for _ in range(depth)], nn.Linear(d, d))


def run(depth=24, d=64, residual=True, norm="pre", steps=150):
    torch.manual_seed(1)
    teacher = nn.Sequential(nn.Linear(d, d), nn.Tanh(), nn.Linear(d, d))   # a target function to learn
    X = torch.randn(256, d)
    with torch.no_grad():
        Y = teacher(X)
    model = make_stack(depth, d, residual, norm)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    grads = None
    for step in range(steps):
        loss = ((model(X) - Y) ** 2).mean()
        opt.zero_grad()
        loss.backward()
        if step == 0:   # gradient size at the first and the last sublayer, before any update
            grads = (model[0].ffn.up.weight.grad.norm().item(), model[depth - 1].ffn.up.weight.grad.norm().item())
        opt.step()
    return grads, loss.item()


if __name__ == "__main__":
    x = torch.tensor([[3.0, 4.0]])
    rms_ok = torch.allclose(RMSNorm(2)(x), torch.tensor([[0.8485, 1.1314]]), atol=1e-3)
    print("TODO 1 RMSNorm check:", "ok" if rms_ok else "not done yet (expected [0.8485, 1.1314] for [3, 4])")
    s = SwiGLU(4, 8)
    v = torch.randn(3, 4)
    swiglu_ok = torch.allclose(s(v), s.down(nn.functional.silu(s.gate(v)) * s.up(v)))
    print("TODO 2 SwiGLU check: ", "ok" if swiglu_ok else "not done yet")

    t0 = time.time()
    print("\ndesign                   grad first   grad last   first/last   loss after 150 steps")
    for residual in (True, False):
        for norm in ("pre", "post"):
            g, loss = run(residual=residual, norm=norm)
            name = f"{norm}-norm, " + ("residual" if residual else "no residual")
            print(f"{name:24s} {g[0]:10.2e} {g[1]:11.2e} {g[0] / max(g[1], 1e-30):12.2e}   {loss:.4f}")
    print(f"({time.time() - t0:.1f} s)")
    # TODO 4: in a comment, explain which design reaches the lowest loss, and why a residual keeps
    # the first and last layers' gradients on a similar scale (ratio near 1) while a plain stack
    # makes them explode or vanish. Then try run(depth=4): does the gap between designs shrink?
`},
takeaways: ["A transformer block is attention plus a position-wise FFN, each wrapped in a norm and a residual add; the model stacks this block N times.", "The FFN expands each token to about 4d, applies GELU (or a SwiGLU gate) and projects back; it holds most of the parameters.", "Residual connections give gradients a direct path and form the residual stream that every sublayer reads from and writes to.", "RMSNorm drops LayerNorm's mean and shift; pre-norm keeps the residual path clean, so deep models train stably.", "Mixture of experts adds many FFN experts and a router that runs only the top-k per token: more parameters, similar compute."],
mcq: [
{q: "Why do residual connections help deep networks train?", a: ["They reduce the number of parameters", "The skip path adds 1 to each layer's derivative, so gradients reach early layers without exploding or vanishing", "They replace the need for attention", "They normalize activations to mean 0"], c: 1, why: "d(x + f(x))/dx = 1 + f'(x): the identity term carries the gradient straight through, layer after layer."},
{q: "What does RMSNorm leave out compared with LayerNorm?", a: ["The learned scale gamma", "The division by a size measure", "Subtracting the mean and adding the learned shift beta", "The epsilon term"], c: 2, why: "RMSNorm only divides by the root mean square and multiplies by gamma; there is no mean subtraction and no beta."},
{q: "A mixture-of-experts layer has 8 experts and routes each token to the top 2. Compared with one dense FFN of the same expert size, what happens?", a: ["Same parameters, 8x compute", "About 8x the FFN parameters but only about 2x the FFN compute per token", "Fewer parameters and less compute", "Every token uses all 8 experts, weighted by the router"], c: 1, why: "All 8 experts exist (parameters), but only 2 run for each token (compute)."}
]
},
{
id: "4.2", title: "Encoder and decoder, every step", mins: 75, kicker: "encoder stack, masked self-attention, cross-attention, teacher forcing, BERT vs GPT vs T5",
focus: "following one translation through every step of the encoder-decoder transformer, and choosing between the three model families",
pip: [],
runNote: "The demo trains a small encoder-decoder for 800 steps: about 30 to 60 seconds on a CPU. Set TRACE = True in the file to print shapes on every call.",
body: `<p>The original transformer ("Attention Is All You Need", 2017) was built for translation: read an English sentence, write a German one. It has two stacks. The <b>encoder</b> reads the whole source sentence. The <b>decoder</b> writes the target sentence one token at a time, looking both at what it has written so far and at the encoder's output. Here is every step, with the shapes you'll see in the demo (B is the batch size, T_s and T_t the source and target lengths, d the model width, V the vocabulary size).</p>
<h4>The encoder</h4>
<ol><li><b>Embed the source tokens</b> (B, T_s) into vectors (B, T_s, d), multiply by sqrt(d), and <b>add positional encodings</b> (the sine and cosine patterns from week 2), because attention by itself ignores order.</li>
<li>Repeat N times (N was 6 in the paper): <b>self-attention</b> where every source token can attend to every other source token, both left and right (only padding is masked), then <b>add &amp; norm</b> (residual add, then LayerNorm), then the <b>FFN</b>, then add &amp; norm again.</li>
<li>The result is the <b>memory</b>: one context-rich vector per source token, shape (B, T_s, d). The encoder runs once per input.</li></ol>
<h4>The decoder</h4>
<ol><li><b>Embed the target tokens shifted right</b>: the decoder input starts with a beginning-of-sequence token, and each position must predict the <i>next</i> token. Add positional encodings.</li>
<li>Repeat N times:
<ul><li><b>Masked self-attention</b> over the target tokens. A causal mask hides every later position, so position i can only see positions 0 to i. Add &amp; norm.</li>
<li><b>Cross-attention</b>: the queries come from the decoder (what am I trying to write next?), and the keys and values come from the encoder memory (what does the source say?). The score matrix is (T_t by T_s): each target position chooses which source words to read. When writing "chat", the decoder attends strongly to "cat". Add &amp; norm.</li>
<li><b>FFN</b>, add &amp; norm.</li></ul></li>
<li><b>Final linear layer + softmax</b>: project each position to V logits (B, T_t, V) and turn them into next-token probabilities.</li></ol>
<h4>Training vs inference</h4>
<p><b>Training uses teacher forcing.</b> We feed the decoder the <i>correct</i> previous target tokens (shifted right) for all positions at once and compute cross-entropy on every position in one pass. The causal mask makes this honest: no position can peek at the token it must predict. Training is therefore fully parallel.</p>
<p><b>Inference is autoregressive.</b> There is no correct target to feed. The encoder runs once; then the decoder starts from the start token, predicts one token, appends it to its own input, and runs again, until it produces an end-of-sequence token or hits a length limit. That is why generation is slower than training, and why week 5's KV cache matters. The gap between the two modes (the model only ever saw perfect prefixes in training) is called <i>exposure bias</i>.</p>
<h4>Three families from the same parts</h4>
<div class="tablewrap"><table><thead><tr><th>Family</th><th>Attention</th><th>Typical use</th><th>Examples</th></tr></thead><tbody>
<tr><td>Encoder-only</td><td>Bidirectional over the input</td><td>Classification, tagging, embeddings for search (week 9)</td><td>BERT, RoBERTa, many embedding models</td></tr>
<tr><td>Decoder-only</td><td>Causal over one sequence</td><td>Text generation, chat, code, agents</td><td>GPT series, Claude, Llama, Qwen</td></tr>
<tr><td>Encoder-decoder</td><td>Bidirectional encoder + causal decoder with cross-attention</td><td>Translation, summarization, input-to-output tasks</td><td>T5, BART, many speech and translation models</td></tr></tbody></table></div>
<p><b>Why are nearly all LLMs decoder-only?</b> One stack is simpler to scale. Next-token prediction can train on any raw text with no input/output split. And a decoder-only model can still do translation or summarization: put the source text in the prompt and let it continue, so the prompt plays the role of the encoder input, attended to by causal self-attention instead of cross-attention.</p>`,
example: ["Translating a product page", `An online shop translates "The red shoes are on sale" into Spanish. The encoder reads all six English words at once, so "red" already knows it describes "shoes". The decoder starts with the start token and writes "Los"; then, with "Los" as input, it writes "zapatos", and its cross-attention looks hardest at "shoes". Next it writes "rojos", attending to "red", even though the word order flips. Meanwhile the shop's search team uses an encoder-only model to embed product titles for search, and its support chatbot is a decoder-only LLM: three families, one company.`],
diagram: {title: "The encoder-decoder transformer", caption: "The encoder reads the source once and produces the memory. Each decoder layer runs masked self-attention over the target so far, then cross-attention with queries from the decoder and keys and values from the memory. At inference the predicted token is fed back in.",
  lanes: ["inputs", "stacks", "attention", "output"],
  cols: [[["src", "Source tokens", "embed + positions", "user"], ["tgt", "Target, shifted", "<bos> + so far", "user"]], [["enc", "Encoder x N", "self-attn + FFN", "core"], ["dec", "Decoder x N", "masked self-attn", "core"]], [["mem", "Memory", "one vector per src", "store"], ["xatt", "Cross-attention", "Q dec, K,V enc", "core"]], [["head", "Linear + softmax", "P(next token)", "core"]]],
  edges: [["src", "enc"], ["enc", "mem"], ["tgt", "dec"], ["dec", "xatt"], ["mem", "xatt", "K, V", "hot"], ["xatt", "head"], ["head", "tgt", "feed back", "dash"]]},
demo: {file: "week4/encdec.py", run: "python -m week4.encdec", what: "A hand-written encoder-decoder transformer in PyTorch. It traces one forward pass and prints the tensor shape after every step (embeddings, each self-attention, add &amp; norm, cross-attention, final logits), trains with teacher forcing to reverse words, then decodes autoregressively and prints what the decoder sees at each step.",
code: String.raw`
"""Demo: the original encoder-decoder transformer, every step traced, then trained.

Task: "translate" a word of letters into the same letters reversed (abcd -> dcba).
It is a toy, but the model is the real architecture: encoder, decoder, masked
self-attention, cross-attention, teacher forcing and autoregressive decoding.
"""
import math
import random
import time

import torch
import torch.nn as nn
import torch.nn.functional as F

PAD, BOS, EOS = 0, 1, 2
LETTERS = "abcdefghij"
VOCAB = ["<pad>", "<bos>", "<eos>"] + list(LETTERS)
STOI = {s: i for i, s in enumerate(VOCAB)}
TRACE = False   # set to True to print the shape after every step


def say(msg, t):
    if TRACE:
        print(f"    {msg:46s} {tuple(t.shape)}")


class MultiHeadAttention(nn.Module):
    """Queries come from x; keys and values come from kv (x itself for self-attention)."""

    def __init__(self, d, n_heads):
        super().__init__()
        self.h, self.dh = n_heads, d // n_heads
        self.q, self.k, self.v, self.o = (nn.Linear(d, d) for _ in range(4))

    def forward(self, x, kv, mask=None, name="attention"):
        B, Tq, d = x.shape
        Tk = kv.shape[1]
        q = self.q(x).view(B, Tq, self.h, self.dh).transpose(1, 2)    # (B, h, Tq, dh)
        k = self.k(kv).view(B, Tk, self.h, self.dh).transpose(1, 2)   # (B, h, Tk, dh)
        v = self.v(kv).view(B, Tk, self.h, self.dh).transpose(1, 2)
        scores = q @ k.transpose(-2, -1) / math.sqrt(self.dh)          # (B, h, Tq, Tk)
        if mask is not None:
            scores = scores.masked_fill(mask, float("-inf"))           # True = not allowed to look
        say(f"{name}: scores", scores)
        out = (scores.softmax(-1) @ v).transpose(1, 2).reshape(B, Tq, d)
        return self.o(out)


class FFN(nn.Module):
    def __init__(self, d):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(d, 4 * d), nn.ReLU(), nn.Linear(4 * d, d))

    def forward(self, x):
        return self.net(x)


class EncoderLayer(nn.Module):
    """Post-norm, as in the 2017 paper: x = norm(x + sublayer(x))."""

    def __init__(self, d, n_heads):
        super().__init__()
        self.attn, self.ffn = MultiHeadAttention(d, n_heads), FFN(d)
        self.n1, self.n2 = nn.LayerNorm(d), nn.LayerNorm(d)

    def forward(self, x, pad_mask):
        x = self.n1(x + self.attn(x, x, pad_mask, "enc self-attention"))
        say("enc add & norm", x)
        x = self.n2(x + self.ffn(x))
        say("enc FFN + add & norm", x)
        return x


class DecoderLayer(nn.Module):
    """Masked self-attention, then (if cross=True) cross-attention over the encoder output, then FFN."""

    def __init__(self, d, n_heads, cross=True):
        super().__init__()
        self.self_attn, self.ffn = MultiHeadAttention(d, n_heads), FFN(d)
        self.cross_attn = MultiHeadAttention(d, n_heads) if cross else None
        self.n1, self.n2, self.n3 = nn.LayerNorm(d), nn.LayerNorm(d), nn.LayerNorm(d)

    def forward(self, y, memory=None, causal=None, mem_mask=None):
        y = self.n1(y + self.self_attn(y, y, causal, "dec masked self-attention"))
        say("dec add & norm", y)
        if self.cross_attn is not None:
            y = self.n2(y + self.cross_attn(y, memory, mem_mask, "dec cross-attn (Q dec, K,V enc)"))
            say("dec cross-attention + add & norm", y)
        y = self.n3(y + self.ffn(y))
        say("dec FFN + add & norm", y)
        return y


def sinusoidal_positions(T, d):
    pos = torch.arange(T).unsqueeze(1)
    freq = torch.exp(torch.arange(0, d, 2) * (-math.log(10000.0) / d))
    pe = torch.zeros(T, d)
    pe[:, 0::2], pe[:, 1::2] = torch.sin(pos * freq), torch.cos(pos * freq)
    return pe


def causal_mask(T):
    """True above the diagonal: position i may not look at positions after i."""
    return torch.triu(torch.ones(T, T, dtype=torch.bool), diagonal=1)


class Seq2Seq(nn.Module):
    def __init__(self, vocab, d=64, n_heads=4, n_layers=2, max_len=32):
        super().__init__()
        self.d = d
        self.src_emb, self.tgt_emb = nn.Embedding(vocab, d), nn.Embedding(vocab, d)
        self.register_buffer("pe", sinusoidal_positions(max_len, d))
        self.enc = nn.ModuleList(EncoderLayer(d, n_heads) for _ in range(n_layers))
        self.dec = nn.ModuleList(DecoderLayer(d, n_heads) for _ in range(n_layers))
        self.out = nn.Linear(d, vocab)

    def encode(self, src):
        say("source token ids", src)
        x = self.src_emb(src) * math.sqrt(self.d) + self.pe[: src.shape[1]]
        say("source embeddings + positions", x)
        pad = (src == PAD)[:, None, None, :]           # hide padding keys: (B, 1, 1, Ts)
        for i, layer in enumerate(self.enc):
            if TRACE:
                print(f"  encoder layer {i}")
            x = layer(x, pad)
        return x, pad

    def decode(self, tgt_in, memory, mem_mask):
        say("decoder input ids (shifted right)", tgt_in)
        y = self.tgt_emb(tgt_in) * math.sqrt(self.d) + self.pe[: tgt_in.shape[1]]
        say("target embeddings + positions", y)
        causal = causal_mask(tgt_in.shape[1])
        for i, layer in enumerate(self.dec):
            if TRACE:
                print(f"  decoder layer {i}")
            y = layer(y, memory, causal, mem_mask)
        logits = self.out(y)
        say("final linear -> logits over vocab", logits)
        return logits

    def forward(self, src, tgt_in):
        memory, mem_mask = self.encode(src)
        return self.decode(tgt_in, memory, mem_mask)


def make_batch(n, rng, min_len=3, max_len=7):
    """Source = random letters; target = reversed letters + <eos>. Pad to equal length."""
    pairs = []
    for _ in range(n):
        w = [rng.choice(LETTERS) for _ in range(rng.randint(min_len, max_len))]
        pairs.append(([STOI[c] for c in w], [STOI[c] for c in reversed(w)] + [EOS]))
    Ts = max(len(s) for s, _ in pairs)
    Tt = max(len(t) for _, t in pairs)
    src = torch.tensor([s + [PAD] * (Ts - len(s)) for s, _ in pairs])
    tgt = torch.tensor([t + [PAD] * (Tt - len(t)) for _, t in pairs])
    tgt_in = torch.cat([torch.full((n, 1), BOS), tgt[:, :-1]], dim=1)   # teacher forcing: shift right
    return src, tgt_in, tgt


@torch.no_grad()
def greedy_translate(model, word, max_new=12, show=False):
    """Autoregressive inference: feed the model its own previous outputs, one token at a time."""
    src = torch.tensor([[STOI[c] for c in word]])
    memory, mem_mask = model.encode(src)              # the encoder runs ONCE
    ys = [BOS]
    for _ in range(max_new):
        logits = model.decode(torch.tensor([ys]), memory, mem_mask)
        nxt = int(logits[0, -1].argmax())
        ys.append(nxt)
        if show:
            print("    decoder sees", "".join(VOCAB[i] if i > 2 else "^" for i in ys[:-1]).ljust(9), "-> predicts", VOCAB[nxt])
        if nxt == EOS:
            break
    return "".join(VOCAB[i] for i in ys[1:] if i > 2)


if __name__ == "__main__":
    torch.manual_seed(0)
    rng = random.Random(0)
    model = Seq2Seq(len(VOCAB))
    print(f"parameters: {sum(p.numel() for p in model.parameters()):,}")

    print("\n1) One forward pass on a toy batch of 2, every step traced:")
    src, tgt_in, tgt = make_batch(2, rng, 4, 5)
    TRACE = True
    logits = model(src, tgt_in)
    TRACE = False
    print("   teacher forcing: decoder input", tgt_in[0].tolist(), "labels", tgt[0].tolist())

    print("\n2) Train with teacher forcing (cross-entropy on every target position at once):")
    opt = torch.optim.AdamW(model.parameters(), lr=2e-3)
    t0 = time.time()
    for step in range(1, 801):
        src, tgt_in, tgt = make_batch(64, rng)
        logits = model(src, tgt_in)
        loss = F.cross_entropy(logits.reshape(-1, logits.shape[-1]), tgt.reshape(-1), ignore_index=PAD)
        opt.zero_grad()
        loss.backward()
        opt.step()
        if step % 200 == 0:
            print(f"   step {step:4d}  loss {loss.item():.3f}")
    print(f"   trained in {time.time() - t0:.1f} s")

    print("\n3) Autoregressive inference (no teacher): one token per decoder pass")
    model.eval()
    print("   result:", greedy_translate(model, "badge", show=True))
    tests = ["cab", "jihg", "abcdef", "deadbee"]
    correct = 0
    for w in tests:
        got = greedy_translate(model, w)
        correct += got == w[::-1]
        print(f"   {w:8s} -> {got:8s} {'ok' if got == w[::-1] else 'wrong (want ' + w[::-1] + ')'}")
    print(f"   {correct}/{len(tests)} correct")
`},
lab: {file: "week4/lab_families.py", run: "python -m week4.lab_families",
task: "Build a decoder-only model and an encoder-only classifier from the demo's layers, prove that the causal mask blocks the future, and compare the three families.",
steps: ["Run the script. The leak test reports a LEAK and the classifier is near chance.", "TODO 1: complete <code>my_causal_mask</code> and rerun: earlier outputs must not change when only the last token changes.", "TODO 2: complete the masked mean pooling in <code>EncoderClassifier</code> so padding positions are ignored.", "TODO 3: read the parameter table and answer the questions in the comment."],
done: "the leak test prints \"no leak\" (change 0), the encoder-only classifier scores above 90% on new words, and your comment names the extra part each decoder layer of the encoder-decoder has and picks a family for each of the three tasks.",
code: String.raw`
"""Lab: build the three transformer families from the same layers and test what sets them apart.

encoder-only  (BERT-style): bidirectional attention, pooled output -> a class label
decoder-only  (GPT-style):  causal attention, next-token logits
encoder-decoder (T5-style): the Seq2Seq model from the demo
"""
import math
import random

import torch
import torch.nn as nn
import torch.nn.functional as F

from week4.encdec import LETTERS, PAD, STOI, VOCAB, DecoderLayer, EncoderLayer, Seq2Seq, sinusoidal_positions


def my_causal_mask(T):
    # TODO 1: return a (T, T) bool tensor that is True ABOVE the diagonal (future positions).
    # Hint: torch.triu(torch.ones(T, T, dtype=torch.bool), diagonal=1)
    return torch.zeros(T, T, dtype=torch.bool)


class DecoderOnly(nn.Module):
    def __init__(self, vocab, d=64, n_heads=4, n_layers=2):
        super().__init__()
        self.emb = nn.Embedding(vocab, d)
        self.register_buffer("pe", sinusoidal_positions(64, d))
        self.layers = nn.ModuleList(DecoderLayer(d, n_heads, cross=False) for _ in range(n_layers))
        self.out = nn.Linear(d, vocab)

    def forward(self, ids):
        x = self.emb(ids) + self.pe[: ids.shape[1]]
        mask = my_causal_mask(ids.shape[1])
        for layer in self.layers:
            x = layer(x, causal=mask)
        return self.out(x)


class EncoderClassifier(nn.Module):
    def __init__(self, vocab, d=64, n_heads=4, n_layers=2, n_classes=2):
        super().__init__()
        self.emb = nn.Embedding(vocab, d)
        self.register_buffer("pe", sinusoidal_positions(64, d))
        self.layers = nn.ModuleList(EncoderLayer(d, n_heads) for _ in range(n_layers))
        self.cls = nn.Linear(d, n_classes)

    def forward(self, ids):
        pad = ids == PAD
        x = self.emb(ids) * math.sqrt(self.emb.embedding_dim) + self.pe[: ids.shape[1]]
        for layer in self.layers:
            x = layer(x, pad[:, None, None, :])
        # TODO 2: masked mean pooling. Average x over the positions that are NOT padding
        # (use ~pad as weights), giving one (B, d) vector per sequence.
        pooled = torch.zeros(x.shape[0], x.shape[2])
        return self.cls(pooled)


def leak_test():
    """Change only the LAST token. With a correct causal mask, earlier outputs must not move."""
    torch.manual_seed(0)
    m = DecoderOnly(len(VOCAB)).eval()
    a = torch.tensor([[STOI[c] for c in "abcdef"]])
    b = a.clone()
    b[0, -1] = STOI["j"]
    with torch.no_grad():
        diff = (m(a)[0, :-1] - m(b)[0, :-1]).abs().max().item()
    return diff


def class_batch(n, rng):
    """Label 1 if the word has more letters from a-e than from f-j."""
    words, labels = [], []
    for _ in range(n):
        w = [rng.choice(LETTERS) for _ in range(rng.randint(4, 9))]
        lo = sum(c in "abcde" for c in w)
        if 2 * lo == len(w):
            w.append(rng.choice("abcde"))
            lo += 1
        words.append([STOI[c] for c in w])
        labels.append(int(lo > len(w) - lo))
    T = max(len(w) for w in words)
    return torch.tensor([w + [PAD] * (T - len(w)) for w in words]), torch.tensor(labels)


if __name__ == "__main__":
    diff = leak_test()
    print(f"1) decoder-only leak test: max change at earlier positions = {diff:.2e}",
          "-> no leak, mask works" if diff < 1e-6 else "-> LEAK: future tokens are visible (TODO 1)")

    torch.manual_seed(0)
    rng = random.Random(0)
    clf = EncoderClassifier(len(VOCAB))
    opt = torch.optim.AdamW(clf.parameters(), lr=2e-3)
    for step in range(300):
        x, y = class_batch(64, rng)
        loss = F.cross_entropy(clf(x), y)
        opt.zero_grad()
        loss.backward()
        opt.step()
    clf.eval()
    with torch.no_grad():
        x, y = class_batch(1000, random.Random(99))
        acc = (clf(x).argmax(-1) == y).float().mean().item()
    print(f"2) encoder-only classifier accuracy on 1000 new words: {acc:.1%}")

    def count(m):
        return sum(p.numel() for p in m.parameters())

    sizes = {"encoder-only": count(EncoderClassifier(len(VOCAB))),
             "decoder-only": count(DecoderOnly(len(VOCAB))),
             "encoder-decoder": count(Seq2Seq(len(VOCAB)))}
    print("3) parameters at d=64, 2 layers each:")
    for name, n in sizes.items():
        print(f"   {name:16s} {n:9,}")
    # TODO 3: in a comment, explain why the encoder-decoder is the largest (what does each
    # decoder layer have that the other two do not?) and which family you would pick for:
    # (a) tagging support tickets by topic, (b) a chat assistant, (c) translating product pages.
`},
takeaways: ["The encoder reads the whole source with bidirectional self-attention and produces one memory vector per source token, once.", "Each decoder layer runs masked self-attention, then cross-attention (queries from the decoder, keys and values from the encoder), then an FFN, each with add and norm.", "Training uses teacher forcing: shifted correct targets, all positions in parallel, with a causal mask.", "Inference is autoregressive: the decoder feeds its own predictions back in until an end token.", "Encoder-only suits classification and embeddings, encoder-decoder suits input-to-output tasks, and decoder-only is what nearly all LLMs use."],
mcq: [
{q: "In the decoder's cross-attention, where do the queries, keys and values come from?", a: ["All three from the encoder output", "Queries from the encoder, keys and values from the decoder", "All three from the decoder", "Queries from the decoder, keys and values from the encoder output"], c: 3, why: "The decoder asks the questions (queries) and reads the source representation (keys and values) from the encoder memory."},
{q: "During training with teacher forcing, what is the decoder's input for the target 'le chat <eos>'?", a: ["<bos> le chat", "le chat <eos>", "Only <bos>", "The source sentence"], c: 0, why: "The target is shifted right: the input starts with <bos>, and each position predicts the next target token."},
{q: "Why can a decoder-only LLM translate without an encoder?", a: ["It secretly contains an encoder", "The source text goes in the prompt, and causal self-attention over the prompt plays the encoder's role", "Translation needs no context", "It uses cross-attention to the tokenizer"], c: 1, why: "Every generated token can attend to all earlier tokens, including the whole source text in the prompt."}
]
},
{
id: "4.3", title: "Train a tiny GPT", mins: 75, kicker: "decoder-only model, char tokenizer, training loop, loss curves, parameter count, scaling laws",
focus: "training a working decoder-only language model end to end, and reading what its loss curves and samples tell you",
pip: [],
runNote: "The demo trains a 3-layer, 160K-parameter model for 600 steps: about 30 to 60 seconds on a CPU, a few seconds on a Colab GPU. The lab's sweep takes 1 to 3 minutes.",
body: `<p>Everything so far comes together here: a decoder-only transformer (a small GPT) that you train on about 8 KB of text. It's the same architecture as a large LLM, only with fewer layers, a narrower width, a shorter context and a tiny dataset.</p>
<h4>The model, piece by piece</h4>
<ol><li><b>Tokenizer:</b> characters. Each distinct character in the text gets an id; there are 47 here. That keeps the code short.</li>
<li><b>Embeddings:</b> a token embedding table (vocab by d) plus a <i>learned</i> position embedding table (context length by d), added together.</li>
<li><b>Blocks:</b> 3 pre-norm blocks, each with causal multi-head self-attention and a GELU FFN, both with residuals (lesson 4.1).</li>
<li><b>Output:</b> a final LayerNorm and a linear layer from d to the vocab size, giving logits for the next character at every position.</li></ol>
<h4>The training loop</h4>
<p>Pick random windows of 64 characters from the training text. The input is the window, and the target is the same window shifted by one character, so a single forward pass gives 64 next-character predictions per window. The loss is cross-entropy averaged over all of them (week 1). The optimizer is AdamW with gradient clipping and a cosine learning-rate schedule, the same tools large models use. Every 150 steps the script estimates loss on the training text and on a held-out 10% (validation).</p>
<h4>Reading the numbers</h4>
<ul><li><b>Start:</b> loss near ln(47) ≈ 3.85, the loss of uniform guessing.</li>
<li><b>Falling:</b> the model first learns character frequencies, then common pairs ("th", "he"), then whole words and spacing.</li>
<li><b>Overfitting:</b> with only 8 KB of text, training loss keeps falling while validation loss stops improving or rises: the model starts memorizing passages. More data, dropout or a smaller model help. This gap is the most important thing to watch on any training run.</li></ul>
<p>The sample will look like English-shaped nonsense with real words mixed in. That's expected: 150K parameters and 7,000 training characters are tiny. Large models use the very same loop with billions of parameters and trillions of tokens.</p>
<h4>Counting parameters</h4>
<p>Each block has about 12·d² weights: 4·d² in attention (query, key, value and output matrices) and 8·d² in the FFN (two d by 4d matrices). With d = 64 and 3 layers that's roughly 147,000, plus the embedding tables. Scale d to 4096 and use 32 layers and you get about 6.4 billion: a 7B-class model.</p>
<p><b>Weight tying</b> reuses the input embedding matrix as the output layer, since both map between tokens and d-dimensional vectors. It saves vocab times d parameters, which is a lot when the vocabulary has 100,000+ tokens, and often helps small models.</p>
<h4>Scaling laws, intuitively</h4>
<p>Studies of many training runs found that loss falls smoothly and predictably, roughly as a power law, as you increase three things together: parameters, training tokens and compute. Doubling only one of them gives diminishing returns. A widely used rule of thumb from the "Chinchilla" study is about 20 training tokens per parameter for compute-efficient training. Our model has about 20 parameters per training character, the reverse of that ratio, which is why it overfits so quickly. Many modern models are deliberately trained on far more tokens than this rule suggests, because a smaller model that has seen more data is cheaper to serve.</p>
<h4>Characters vs BPE</h4>
<p>In week 1 you built a BPE tokenizer. A character tokenizer gives a tiny vocabulary and no unknown symbols, but sequences are about 4 times longer, so a fixed context window covers far less text and the model must spend capacity learning to spell. BPE makes sequences shorter and lets each token carry more meaning, at the cost of a larger embedding table. Real LLMs use byte-level BPE with vocabularies of roughly 30,000 to 250,000 tokens.</p>`,
example: ["A study group's autocomplete", `A computer science study group trains this exact model on their 10 KB of shared lecture notes to see what happens. After a minute it writes things like "the gradient of the loss is the sum of the..." and then drifts into made-up words. They watch validation loss stop improving after about 300 steps while training loss keeps falling, and realize the model is memorizing their notes. Adding dropout and a smaller width gives a slightly better validation loss, and a quick estimate with the 20-tokens-per-parameter rule shows they would need millions of characters of notes to train even this small model well.`],
diagram: {title: "Training a tiny GPT", caption: "Random windows of text become inputs and shifted-by-one targets. The model predicts every next character in parallel, the loss is backpropagated, and AdamW updates the weights. Generation samples one character at a time and feeds it back.",
  lanes: ["data", "model", "loss", "update"],
  cols: [[["txt", "8 KB of text", "chars → ids", "store"], ["win", "Batch of windows", "x and y = x shifted", "core"]], [["emb", "Token + position", "embeddings", "core"], ["blk", "3 pre-norm blocks", "causal attn + FFN", "core"]], [["ce", "Cross-entropy", "every position", "guard"], ["gen", "Generate", "sample, append", "user"]], [["opt", "AdamW", "clip + cosine LR", "core"]]],
  edges: [["txt", "win"], ["win", "emb"], ["emb", "blk"], ["blk", "ce", "logits", "hot"], ["ce", "opt"], ["opt", "blk", "new weights", "dash"], ["blk", "gen"]]},
demo: {file: "week4/tiny_gpt.py", run: "python -m week4.tiny_gpt", what: "A complete character-level GPT in about 150 lines of PyTorch, with its training text inside the file. It prints the vocabulary size, the parameter count, training and validation loss every 150 steps, the training time, and a 300-character sample that starts with \"The librarian\".",
code: String.raw`
"""Demo: train a tiny character-level GPT on a CPU in about a minute.

Decoder-only transformer: token embeddings + learned positions, N pre-norm blocks
(causal self-attention + FFN, each with a residual), a final norm and a linear
layer that scores every character. Trained on next-character prediction.
"""
import math
import time

import torch
import torch.nn as nn
import torch.nn.functional as F

# About 9 KB of original text written for this course. Swap in your own text file to experiment.
TEXT = """The library on Market Street opens at nine. Before the doors open, the librarian walks
between the shelves and listens. A quiet library has its own sounds: the hum of the lights, the
tick of the heater, the soft knock of a book settling against its neighbor. She likes this hour
best, because the building is still deciding what kind of day it will have.

At nine the first visitors arrive. An old man comes for the newspaper and reads it at the same
table every morning. A student comes to print a report and asks how to fix the margins. A mother
comes with two small children who run straight to the picture books and sit on the floor. The
librarian helps each of them in turn, and each of them leaves a little lighter than they came.

In the afternoon the light moves across the reading room. It starts on the map of the city, then
slides over the long oak tables, then climbs the wall of encyclopedias that nobody opens anymore.
The librarian keeps them anyway. She says a shelf of old books is like a row of old trees: you do
not need to climb them to be glad they are there.

On Tuesdays there is a reading group. Six people meet in the corner room and talk about one book
for an hour. They rarely agree. One reader loves every ending, and one reader distrusts them all.
One reads only the first and last chapters and argues anyway. The librarian makes tea and asks
questions, and by the end of the hour everyone has noticed something they missed alone.

On Thursdays the computer class meets. The students are mostly older people who want to write to
their grandchildren, pay a bill, or read the news in a larger font. They learn to click, to type,
to search, and to be patient with a machine that does exactly what you tell it and nothing that
you meant. The librarian tells them that every expert was once a beginner who kept going.

When it rains, the library fills up. People come in to stay dry and stay for the warmth. A man in
a wet coat reads about sailing ships. A girl reads about volcanoes and draws one in the margin of
her notebook. Two friends whisper over a cookbook and plan a dinner they will never make. The rain
taps on the tall windows, and the room feels like a ship of its own, steady in the storm.

In the evening the library grows quiet again. The last visitors return their books to the slot by
the door, and the books fall into the cart with a sound like distant applause. The librarian sorts
them by number, then by name, then by the small notes people leave inside: a receipt, a pressed
leaf, a ticket from a train that left years ago. She keeps the notes in a box behind the desk.

Some nights she reads the notes before she goes home. A shopping list asks for bread, eggs, and
patience. A child has written a single word, dragon, in careful letters. Someone has copied a
line of a poem and underlined it twice. Each note is a small window into a life she will never
see, and she closes each window gently and puts it back in the box.

The library has rules, and most of them are kind. Speak softly. Return what you borrow. Leave the
chair the way you found it, or a little better. Ask when you are lost. The librarian says that a
good rule is one that makes the room better for the next person, and that most good rules are
just ways of remembering that the next person is real.

In winter the heater groans and the windows fog. Visitors wear their coats inside and read with
gloves on. The librarian brings a radio and plays music very low, so low that people are never
quite sure they hear it. They only notice that the room feels warmer, and they stay a little
longer than they planned.

In spring the doors stay open and the smell of cut grass drifts in from the park. Children come
after school with muddy shoes and loud questions. Where do clouds go at night? Why do cats purr?
How many books are in the world? The librarian answers the questions she can and writes the others
on a board by the door, under a sign that says: questions we are still working on.

In summer the library runs a reading challenge. Every child who reads ten books gets a paper star
on the wall. By August the wall is a night sky, crowded with stars, and the children point to their
own and count them again and again. The librarian counts them too. She has never once been bored
by the number.

In autumn the leaves cover the steps, and the library feels like the start of something. New
students arrive with new notebooks. The reading group chooses a long book and promises to finish
it. The old man with the newspaper says the same thing he says every year: the days are getting
shorter, so the evenings are getting better for reading.

The library on Market Street closes at eight. The librarian turns off the lights one row at a
time, and the shelves disappear into the dark like a city seen from a train. She locks the door,
checks it twice, and walks home under the streetlights, already thinking about the morning, when
the building will once again decide what kind of day it will have.

The bakery across the street opens at six, long before the library. The baker starts the ovens in
the dark and shapes the dough by hand. By seven the street smells of bread, and the first workers
stop for a roll on the way to the bus. The baker knows most of them by their order, not their name:
two plain rolls, one seeded loaf, a coffee with no sugar and a long story about the weather.

The baker and the librarian are old friends. Every Friday the baker brings a bag of yesterday's
bread to the library, and the librarian puts it on a table by the door with a small sign that says
take what you need. By noon the bag is always empty. Nobody ever sees who takes the bread, and the
two friends agree that this is the best part.

The park beside the library has a pond, a row of benches, and a tree so old that its trunk is wider
than a door. In the morning the pond is still, and the benches are wet with dew. In the afternoon
the ducks gather near the bridge, where children throw crumbs they are not supposed to throw. In
the evening the tree holds the last of the light in its high branches, long after the grass is dark.

The school on the hill sends its students down to the library once a week. They walk in a long
line, two by two, holding hands across the busy road. The teacher counts them at the corner and
again at the door. Inside, the line breaks apart like a wave on a beach, and every child runs to a
different shelf: one to the dinosaurs, one to the stars, one to the stories about clever animals.

The teacher says that a library is a place where a question can grow. A small question walks in the
door, and a bigger question walks out. A child who asks how birds fly leaves asking why some birds
do not. A child who asks how old the moon is leaves asking how anyone could know. The librarian
says that the best days are the days when nobody gets a final answer.

The market on the corner sells fruit, flowers and fish. The fruit seller stacks the apples in a
pyramid and the oranges in a perfect square. The flower seller wraps each bunch in brown paper and
ties it with string. The fish seller shouts the prices in a voice that carries all the way to the
library steps, where the librarian smiles and pretends not to hear.

On the first day of each month the library holds a sale of old books. The books are spread on long
tables under the trees, and each one costs a coin. People come early and leave with arms full.
A man buys a book about bridges because his father built one. A woman buys a book of maps because
she wants to see the old names of the streets. A boy buys a book with no cover because he likes
the first line.

The librarian keeps a notebook of first lines. She writes down the ones she likes best and reads
them aloud to the reading group when the talk runs out. Some first lines are quiet and some are
loud. Some promise a long journey and some promise a joke. She says a good first line is like a
door left slightly open: you do not have to go in, but it is very hard not to.
"""


class CausalSelfAttention(nn.Module):
    def __init__(self, d, n_heads, dropout):
        super().__init__()
        self.h = n_heads
        self.qkv = nn.Linear(d, 3 * d)
        self.proj = nn.Linear(d, d)
        self.drop = nn.Dropout(dropout)

    def forward(self, x):
        B, T, d = x.shape
        q, k, v = self.qkv(x).split(d, dim=2)
        q, k, v = (m.view(B, T, self.h, d // self.h).transpose(1, 2) for m in (q, k, v))
        att = (q @ k.transpose(-2, -1)) / math.sqrt(d // self.h)
        mask = torch.triu(torch.ones(T, T, dtype=torch.bool, device=x.device), diagonal=1)
        att = self.drop(att.masked_fill(mask, float("-inf")).softmax(-1))
        return self.proj((att @ v).transpose(1, 2).reshape(B, T, d))


class Block(nn.Module):
    """Pre-norm block: x + attn(norm(x)), then x + ffn(norm(x))."""

    def __init__(self, d, n_heads, dropout):
        super().__init__()
        self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.attn = CausalSelfAttention(d, n_heads, dropout)
        self.ffn = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d), nn.Dropout(dropout))

    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        return x + self.ffn(self.ln2(x))


class TinyGPT(nn.Module):
    def __init__(self, vocab_size, d=96, n_layers=3, n_heads=4, block_size=64, dropout=0.0):
        super().__init__()
        self.block_size = block_size
        self.tok = nn.Embedding(vocab_size, d)
        self.pos = nn.Embedding(block_size, d)
        self.drop = nn.Dropout(dropout)
        self.blocks = nn.Sequential(*[Block(d, n_heads, dropout) for _ in range(n_layers)])
        self.ln_f = nn.LayerNorm(d)
        self.head = nn.Linear(d, vocab_size, bias=False)

    def forward(self, idx, targets=None):
        T = idx.shape[1]
        x = self.drop(self.tok(idx) + self.pos(torch.arange(T, device=idx.device)))
        logits = self.head(self.ln_f(self.blocks(x)))          # (B, T, vocab)
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.view(-1, logits.shape[-1]), targets.view(-1))
        return logits, loss

    @torch.no_grad()
    def generate(self, idx, n_new, temperature=0.8):
        for _ in range(n_new):
            logits, _ = self(idx[:, -self.block_size:])
            probs = (logits[:, -1] / temperature).softmax(-1)
            idx = torch.cat([idx, torch.multinomial(probs, 1)], dim=1)
        return idx


def n_params(model):
    return sum(p.numel() for p in model.parameters())


class CharData:
    """Character tokenizer + train/validation split (90/10)."""

    def __init__(self, text=TEXT):
        self.chars = sorted(set(text))
        self.stoi = {c: i for i, c in enumerate(self.chars)}
        data = torch.tensor(self.encode(text))
        cut = int(0.9 * len(data))
        self.train, self.val = data[:cut], data[cut:]

    def encode(self, s):
        return [self.stoi[c] for c in s]

    def decode(self, ids):
        return "".join(self.chars[i] for i in ids)

    def batch(self, split, batch_size, block_size, gen):
        data = self.train if split == "train" else self.val
        ix = torch.randint(len(data) - block_size - 1, (batch_size,), generator=gen)
        x = torch.stack([data[i:i + block_size] for i in ix])
        y = torch.stack([data[i + 1:i + block_size + 1] for i in ix])   # targets: shifted by one
        return x, y


@torch.no_grad()
def estimate_loss(model, data, block_size, gen, iters=10):
    model.eval()
    out = {}
    for split in ("train", "val"):
        losses = [model(*data.batch(split, 32, block_size, gen))[1].item() for _ in range(iters)]
        out[split] = sum(losses) / len(losses)
    model.train()
    return out


def train(model, data, steps=400, batch_size=32, lr=3e-3, log_every=100, seed=0):
    gen = torch.Generator().manual_seed(seed)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=steps)
    for step in range(1, steps + 1):
        x, y = data.batch("train", batch_size, model.block_size, gen)
        _, loss = model(x, y)
        opt.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        sched.step()
        if log_every and (step % log_every == 0 or step == 1):
            est = estimate_loss(model, data, model.block_size, gen)
            print(f"  step {step:4d}  train {est['train']:.3f}  val {est['val']:.3f}")
    return estimate_loss(model, data, model.block_size, gen, iters=20)


if __name__ == "__main__":
    torch.manual_seed(0)
    data = CharData()
    V = len(data.chars)
    print(f"text: {len(TEXT):,} characters, vocabulary: {V} characters")
    print(f"uniform guessing would give loss ln({V}) = {math.log(V):.2f}")
    model = TinyGPT(V, d=64, n_layers=3, n_heads=4, block_size=64)
    print(f"model: 3 layers, d_model 64, 4 heads, context 64 -> {n_params(model):,} parameters\n")
    t0 = time.time()
    final = train(model, data, steps=600, log_every=150)
    print(f"\ntrained in {time.time() - t0:.0f} s; final train {final['train']:.3f}, val {final['val']:.3f}")
    model.eval()
    torch.manual_seed(1)
    start = torch.tensor([data.encode("The librarian ")])
    print("\nsample:\n" + data.decode(model.generate(start, 300)[0].tolist()))
`},
lab: {file: "week4/lab_gpt_sweep.py", run: "python -m week4.lab_gpt_sweep",
task: "Add weight tying and dropout to the tiny GPT, then run a small sweep over depth, width and context length and record what each change does to training and validation loss.",
steps: ["Run the script. It trains a baseline and a \"tied\" model for 150 steps each; the tied one saves 0 parameters because TODO 1 is empty.", "TODO 1: tie the output layer to the token embedding; the saving should equal vocab x d.", "TODO 2: add a run with <code>dropout=0.1</code> and compare its train/val gap with the baseline.", "TODO 3: add configs that change one thing each: depth, width, and context length (try 16 and 128).", "TODO 4: write what helped most in this budget, and what you'd expect to matter with 100x more data."],
done: "the table shows at least six runs, the tying line reports a saving equal to vocab x d, and your comment explains which change lowered validation loss most and why.",
code: String.raw`
"""Lab: tie the weights, add dropout, and run a small depth / width / context sweep.

Each run is short (150 steps), so compare runs with each other, not with the demo.
"""
import time

import torch

from week4.tiny_gpt import CharData, TinyGPT, n_params, train

STEPS = 150


def tie_weights(model):
    # TODO 1: make the output layer reuse the input embedding matrix (weight tying):
    # model.head.weight = model.tok.weight   (both have shape (vocab, d))
    return model


def run(data, n_layers=2, d=64, block_size=64, dropout=0.0, tie=False, seed=0):
    torch.manual_seed(seed)
    model = TinyGPT(len(data.chars), d=d, n_layers=n_layers, n_heads=4, block_size=block_size, dropout=dropout)
    if tie:
        model = tie_weights(model)
    t0 = time.time()
    est = train(model, data, steps=STEPS, log_every=0, seed=seed)
    return n_params(model), est["train"], est["val"], time.time() - t0


if __name__ == "__main__":
    data = CharData()
    print("run                         params   train    val    gap   secs")

    def show(name, r):
        print(f"{name:26s} {r[0]:8,}  {r[1]:.3f}  {r[2]:.3f}  {r[2] - r[1]:+.3f}  {r[3]:4.0f}")

    base = run(data)
    show("baseline 2L d64 ctx64", base)

    tied = run(data, tie=True)
    show("+ weight tying", tied)
    print(f"  tying saved {base[0] - tied[0]:,} parameters (expected vocab x d = {len(data.chars) * 64:,})")

    # TODO 2: add a run with dropout=0.1 and show it. Does the train/val gap shrink?

    CONFIGS = [
        dict(n_layers=4, d=64, block_size=64),
        # TODO 3: add at least three more configs that change ONE thing each from the baseline:
        # depth (n_layers), width (d, keep it divisible by 4), and context (block_size: 16, 32, 128)
    ]
    for cfg in CONFIGS:
        show(f"{cfg['n_layers']}L d{cfg['d']} ctx{cfg['block_size']}", run(data, **cfg))
    # TODO 4: in a comment, write what helped most in this short budget and why. Which change
    # would you expect to matter more with 100x more text and steps?
`},
takeaways: ["A GPT is token + position embeddings, a stack of pre-norm causal blocks, a final norm and a linear layer to the vocabulary.", "One forward pass over a window gives a next-token loss at every position, so training is parallel.", "Watch the gap between training and validation loss: a growing gap means memorization, fixed by more data, dropout or a smaller model.", "Parameters grow as about 12·d² per block; weight tying saves vocab x d by sharing the embedding with the output layer.", "Loss falls predictably as parameters, data and compute grow together; a common guide is about 20 tokens per parameter."],
mcq: [
{q: "Training loss keeps falling, but validation loss has risen for the last 200 steps. What is the most likely diagnosis?", a: ["The learning rate is too low", "The model is overfitting: memorizing the training text", "The tokenizer is broken", "The model is too small"], c: 1, why: "A widening gap between training and validation loss is the classic sign of memorization."},
{q: "A block has d = 512. Roughly how many weights does it have (ignoring biases and norms)?", a: ["About 260 thousand", "About 1 million", "About 12 million", "About 3 million"], c: 3, why: "12·d² = 12 x 262,144 ≈ 3.1 million: 4d² for attention and 8d² for the FFN."},
{q: "Compared with a BPE tokenizer, what does a character tokenizer cost you?", a: ["Longer sequences, so the same context window covers less text", "Unknown-token errors on rare words", "A much larger embedding table", "It cannot represent spaces"], c: 0, why: "Characters give a tiny vocabulary but about 4x more tokens per text than BPE."}
]
}
],
quiz: [
{q: "What does the FFN in a transformer block do?", a: ["Mixes information between tokens", "Processes each token's vector on its own: expand, nonlinearity, project back", "Computes positional encodings", "Normalizes the batch"], c: 1, why: "Attention mixes across tokens; the position-wise FFN transforms each token separately."},
{q: "Which formula is pre-norm?", a: ["Norm(x + f(x))", "x + Norm(f(x))", "x + f(Norm(x))", "Norm(f(x))"], c: 2, why: "Pre-norm normalizes the sublayer input and leaves the residual path as a plain sum."},
{q: "Why does SwiGLU use a hidden size of about 8/3·d instead of 4·d?", a: ["To keep its three matrices at about the same parameter count as the classic FFN's two", "Because 8/3 is required by the SiLU function", "To make the model faster at inference only", "Because it has no output projection"], c: 0, why: "3 x d x (8/3 d) = 8d², the same as 2 x d x 4d."},
{q: "In the encoder, which positions can each source token attend to?", a: ["Only earlier positions", "Only itself", "Only the decoder's tokens", "All source positions, left and right (except padding)"], c: 3, why: "The encoder is bidirectional; only padding is masked."},
{q: "The cross-attention score matrix for 7 target and 5 source positions (per head) has which shape?", a: ["7 x 7", "7 x 5", "5 x 5", "5 x 7"], c: 1, why: "One row per decoder query (7) and one column per encoder key (5)."},
{q: "Why is autoregressive inference slower than training?", a: ["Inference uses a bigger model", "Training skips attention", "Each new token needs another decoder pass that depends on the previous output, so steps can't run in parallel", "Inference runs the encoder once per output token"], c: 2, why: "Training predicts all positions in one pass with teacher forcing; generation must go one token at a time."},
{q: "Your support team wants to sort incoming tickets into 12 topics, fast and cheaply. Which family fits best?", a: ["An encoder-only classifier", "An encoder-decoder translation model", "A 70B decoder-only model generating free text", "No model; use positional encodings"], c: 0, why: "Bidirectional encoders with a classification head are small, fast and accurate for labeling."},
{q: "Your tiny GPT has 2 million parameters. About how many training tokens does the 20-tokens-per-parameter rule suggest?", a: ["About 100 thousand", "About 2 million", "About 40 million", "About 4 billion"], c: 2, why: "20 x 2,000,000 = 40 million tokens for compute-efficient training."}
],
checkpoint: `You can run one transformer block in numpy and explain each line, trace the encoder-decoder transformer from source tokens to output probabilities, prove a causal mask works, and train a tiny GPT whose validation loss you can explain. Keep <code>week4/</code>: in week 5 you'll add sampling and a KV cache to this kind of model, and compare it with a real LLM API.`
});
