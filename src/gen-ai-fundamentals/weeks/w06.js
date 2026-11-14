W({
n: 6, title: "Post-Training and Evaluation", short: "Post-training + evals", hours: "7–9 hours",
goal: "Turn a base model into an assistant with supervised fine-tuning and preference training, then measure whether it actually got better.",
builds: "An SFT data formatter with chat templates and loss masking, a Bradley-Terry reward model and a DPO loss on toy preference data, and an evaluation harness with exact match, F1, pass@k, a multiple-choice benchmark and an LLM judge with position swapping.",
outcomes: [
  "Format conversations with a chat template and train only on assistant tokens using a loss mask.",
  "Explain why SFT alone is not enough, and how reward models, PPO with a KL penalty, and DPO use human preferences.",
  "Train a Bradley-Terry reward model, compute the DPO loss by hand, and recognize reward hacking.",
  "Compute exact match, F1, perplexity and unbiased pass@k, and explain what each metric misses.",
  "Build an LLM-as-judge with a rubric and bias controls, and fit an evaluation loop into a chatbot's design."
],
lessons: [
{
id: "6.1", title: "Supervised fine-tuning: from base model to instruction follower", mins: 70, kicker: "instruct models, chat templates, loss masking, data quality, forgetting",
focus: "how a conversation becomes token ids plus a loss mask, and why a few thousand clean examples beat a million noisy ones",
pip: [],
runNote: "Trains a tiny character-level model on CPU in a few seconds.",
body: `<p>After pre-training (week 1) you have a <b>base model</b>: it continues text. Ask it "How do I reset my password?" and it may write three more questions, as if it were completing an FAQ page. <b>Supervised fine-tuning (SFT)</b> keeps training the same network, with the same next-token loss, on a much smaller set of example conversations where an assistant answers well. The result is an <b>instruct</b> (or chat) model that answers instead of continuing.</p>
<h4>What SFT data looks like</h4>
<p>An SFT example is a conversation: an optional system message, then alternating user and assistant turns. Datasets come from people writing ideal answers, from experts in a domain (medicine, law, coding), and increasingly from strong models whose outputs are filtered and checked by humans. Typical sizes are thousands to a few million conversations, tiny compared with trillions of pre-training tokens.</p>
<h4>Chat templates: role markers the model learns</h4>
<p>The network only sees one long token sequence, so the conversation is flattened with special tokens that mark who is speaking and where each turn ends:</p>
<div class="math">&lt;|system|&gt;You are a store assistant.&lt;|end|&gt;&lt;|user|&gt;Can I return shoes?&lt;|end|&gt;&lt;|assistant|&gt;Yes, within 30 days.&lt;|end|&gt;</div>
<p>At inference time the chat application builds the same string and ends it with <code>&lt;|assistant|&gt;</code>. The model generates the reply and then the <code>&lt;|end|&gt;</code> token, which is how it knows to stop. Every model family has its own template, and using the wrong one at inference quietly hurts quality.</p>
<h4>Loss masking: learn to answer, not to ask</h4>
<p>We don't want the model to learn to write user messages or to repeat the system prompt. So each token gets a <b>mask</b> value: 1 if it belongs to an assistant reply (including its end token), 0 otherwise. The loss is averaged only over masked positions:</p>
<div class="math">loss = sum over t of mask_t × (−log P(token_t | tokens before t)) / sum over t of mask_t</div>
<p>Here <code>token_t</code> is the true token at position t, <code>P(token_t | …)</code> is the probability the model gave it, and <code>mask_t</code> is 0 or 1. Prompt tokens still flow through the network as context; they simply don't contribute to the loss. In a typical chat dataset only 30 to 60 percent of tokens are trained on.</p>
<h4>Quality over quantity</h4>
<p>SFT mostly teaches <i>format and behavior</i>: tone, when to ask a clarifying question, how long to answer, how to refuse. Knowledge comes mainly from pre-training. That's why a small set of carefully written, diverse, correct conversations often beats a huge scraped one. Bad examples teach bad habits fast: boilerplate disclaimers, wrong facts stated confidently, or one-word answers. Good pipelines deduplicate, filter by length and quality, balance topics, and hold out an evaluation set.</p>
<h4>Catastrophic forgetting</h4>
<p>Fine-tuning moves the weights. Train too long, with too high a learning rate, or on too narrow a dataset, and the model loses skills it had: a model fine-tuned only on legal summaries may get worse at arithmetic or coding. Common defenses are a low learning rate, few epochs (often 1 to 3), mixing in some general data, and parameter-efficient methods such as LoRA (week 8) that leave the original weights frozen.</p>`,
example: ["A hospital billing assistant", `A healthcare admin team wants an assistant that explains bills in plain language. Their first attempt fine-tuned on 50,000 scraped forum answers, and the model learned to say "I am not a doctor, consult a professional" in every reply, even about parking fees. The second attempt used 3,000 answers written and reviewed by billing staff, masked the loss to assistant turns only, and mixed in 10 percent general chat data. It answered more accurately, stopped the boilerplate, and still handled small talk.`],
diagram: {title: "From conversations to an SFT training step", caption: "Conversations are flattened with a chat template, tokenized, and given a loss mask that is 1 only on assistant tokens. The masked loss updates the base model into an instruct model.",
  lanes: ["data", "template", "tokens", "loss", "model"],
  cols: [[["conv", "Conversations", "system, user, assistant", "store"]], [["tmpl", "Chat template", "role markers + end", "core"]], [["ids", "Token ids", "one long sequence", "core"], ["mask", "Loss mask", "1 on assistant only", "guard"]], [["loss", "Masked loss", "-log P where mask=1", "core"]], [["base", "Base model", "pre-trained weights", "ext"], ["inst", "Instruct model", "answers, then stops", "core"]]],
  edges: [["conv", "tmpl"], ["tmpl", "ids"], ["ids", "mask"], ["ids", "loss"], ["mask", "loss", "", "hot"], ["base", "inst", "fine-tune"], ["loss", "inst", "gradients", "hot"]]},
demo: {file: "week6/sft_format.py", run: "python -m week6.sft_format", what: "Formats store-assistant conversations with a chat template, builds token ids and a loss mask, shows which characters are trained on, then fine-tunes a tiny character-level model with masked cross-entropy and asks it new questions from the training set.",
code: String.raw`
"""Demo: format conversations for supervised fine-tuning (SFT) and train with a loss mask.

Every conversation becomes token ids plus a mask. The mask is 1 on tokens the model
should learn to produce (assistant text and its end marker) and 0 on tokens it only
reads (system prompt, user turns, role markers). A tiny character-level neural LM
stands in for a real transformer: the formatting and the masked loss are exactly the same.
"""
import math

import torch
import torch.nn as nn
import torch.nn.functional as F

SPECIAL = ["<|pad|>", "<|system|>", "<|user|>", "<|assistant|>", "<|end|>"]
SYSTEM = "You are a helpful store assistant."
CONVERSATIONS = [
    [("system", SYSTEM), ("user", "Where is my order?"), ("assistant", "Share your order number and I will check.")],
    [("system", SYSTEM), ("user", "Can I return shoes?"), ("assistant", "Yes, within 30 days with a receipt.")],
    [("system", SYSTEM), ("user", "Do you ship abroad?"), ("assistant", "Yes, to 40 countries.")],
    [("system", SYSTEM), ("user", "Hi!"), ("assistant", "Hello! How can I help?"),
     ("user", "Is the store open Sunday?"), ("assistant", "Yes, from 10am to 6pm.")],
]


class CharTokenizer:
    """Special tokens get their own ids; every other character is one token."""

    def __init__(self, texts):
        chars = sorted({c for t in texts for c in t})
        self.itos = SPECIAL + chars
        self.stoi = {s: i for i, s in enumerate(self.itos)}

    def encode(self, text):
        return [self.stoi[c] for c in text]

    def decode(self, ids):
        return "".join(self.itos[i] for i in ids)

    def __len__(self):
        return len(self.itos)


def all_texts(convs):
    return [text for conv in convs for _, text in conv]


def build_example(conv, tok):
    """Apply the chat template. Returns (ids, mask), two lists of equal length."""
    ids, mask = [], []
    for role, text in conv:
        learn = 1 if role == "assistant" else 0
        piece = [tok.stoi["<|" + role + "|>"]] + tok.encode(text) + [tok.stoi["<|end|>"]]
        ids += piece
        mask += [0] + [learn] * (len(piece) - 1)   # the role marker is given, never learned
    return ids, mask


def show_mask(ids, mask, tok):
    """Print the templated text with ^ under every token the loss trains on."""
    top, bottom = "", ""
    for i, m in zip(ids, mask):
        piece = tok.itos[i]
        top += piece
        bottom += ("^" if m else " ") * len(piece)
    print(top)
    print(bottom)


def batchify(examples, pad_id):
    T = max(len(ids) for ids, _ in examples)
    x = torch.full((len(examples), T), pad_id, dtype=torch.long)
    m = torch.zeros((len(examples), T))
    for b, (ids, mask) in enumerate(examples):
        x[b, :len(ids)] = torch.tensor(ids)
        m[b, :len(mask)] = torch.tensor(mask, dtype=torch.float)
    return x, m


class TinyLM(nn.Module):
    """A fixed-window neural LM: an MLP reads the previous CONTEXT tokens.
    It stands in for a transformer; the template and the masked loss are the same."""

    def __init__(self, vocab, context=64, d=16, h=256):
        super().__init__()
        self.context = context
        self.emb = nn.Embedding(vocab, d)
        self.mlp = nn.Sequential(nn.Linear(context * d, h), nn.ReLU(), nn.Linear(h, vocab))

    def forward(self, x):
        """x: (B, T) token ids -> logits (B, T, vocab); position t sees tokens up to t."""
        B, T = x.shape
        padded = F.pad(x, (self.context - 1, 0), value=0)       # id 0 is <|pad|>
        windows = padded.unfold(1, self.context, 1)             # (B, T, context)
        return self.mlp(self.emb(windows).reshape(B, T, -1))


def masked_cross_entropy(logits, targets, mask):
    """Average of -log P(target) over positions where mask == 1."""
    per_tok = F.cross_entropy(logits.reshape(-1, logits.shape[-1]), targets.reshape(-1), reduction="none")
    mask = mask.reshape(-1)
    return (per_tok * mask).sum() / mask.sum().clamp(min=1)


def train(examples, tok, steps=400, lr=0.01, seed=0, verbose=True):
    torch.manual_seed(seed)
    model = TinyLM(len(tok))
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    x, m = batchify(examples, tok.stoi["<|pad|>"])
    inputs, targets, tmask = x[:, :-1], x[:, 1:], m[:, 1:]   # position t predicts token t+1
    for step in range(steps):
        loss = masked_cross_entropy(model(inputs), targets, tmask)
        opt.zero_grad()
        loss.backward()
        opt.step()
        if verbose and (step % 100 == 0 or step == steps - 1):
            print(f"  step {step:4d}  masked loss {loss.item():.3f}")
    return model


@torch.no_grad()
def reply(model, tok, conv_so_far, max_len=60):
    """Greedy generation after the <|assistant|> marker, stopping at <|end|>."""
    ids, _ = build_example(conv_so_far, tok)
    ids = ids + [tok.stoi["<|assistant|>"]]
    out = []
    for _ in range(max_len):
        nxt = int(model(torch.tensor([ids]))[0, -1].argmax())
        if nxt == tok.stoi["<|end|>"]:
            break
        out.append(nxt)
        ids.append(nxt)
    return tok.decode(out)


if __name__ == "__main__":
    tok = CharTokenizer(all_texts(CONVERSATIONS))
    examples = [build_example(c, tok) for c in CONVERSATIONS]
    print("vocabulary size:", len(tok))
    print("\nconversation 3 after the chat template (^ = trained tokens):")
    show_mask(*examples[3], tok)
    total = sum(len(ids) for ids, _ in examples)
    trained = sum(sum(m) for _, m in examples)
    print(f"\ntokens {total}, trained on {trained} ({trained / total:.0%}); the rest is context only")
    print(f"loss before training is about ln(vocab) = {math.log(len(tok)):.2f}")

    print("\nfine-tuning with the masked loss:")
    model = train(examples, tok)
    for question in ["Can I return shoes?", "Do you ship abroad?", "Where is my order?"]:
        answer = reply(model, tok, [("system", SYSTEM), ("user", question)])
        print(f"user: {question:22s} assistant: {answer}")
`},
lab: {file: "week6/lab_sft_data.py", run: "python -m week6.lab_sft_data",
task: "Clean a messy SFT dataset, implement last-turn-only masking, and see what bad examples teach a model.",
steps: ["Run the script. Both checks fail and it stops at an assert.", "Complete <code>quality_ok</code> (TODO 1): drop conversations with no final assistant turn, very short replies, AI boilerplate, and exact duplicates.", "Complete <code>build_last_turn_only</code> (TODO 2) so only the final assistant reply and its end token have mask 1.", "Do TODO 3: train once on the filtered data and once on everything, ask both models 'Can I return shoes?', and explain the difference in a comment."],
done: "CHECK 1 and CHECK 2 print PASS, the assert passes, and your comment describes what the unfiltered model learned from the bad examples.",
code: String.raw`
"""Lab: clean an SFT dataset and try last-turn-only loss masking."""
from week6.sft_format import SYSTEM, CharTokenizer, all_texts, build_example, reply, show_mask, train

RAW = [
    [("system", SYSTEM), ("user", "Where is my order?"), ("assistant", "Share your order number and I will check.")],
    [("system", SYSTEM), ("user", "Where is my order?"), ("assistant", "Share your order number and I will check.")],
    [("system", SYSTEM), ("user", "Can I return shoes?"), ("assistant", "As an AI language model, I cannot know that.")],
    [("system", SYSTEM), ("user", "Can I return shoes?"), ("assistant", "Yes, within 30 days with a receipt.")],
    [("system", SYSTEM), ("user", "Do you ship abroad?"), ("assistant", "ok")],
    [("system", SYSTEM), ("user", "Do you ship abroad?"), ("assistant", "Yes, to 40 countries.")],
    [("system", SYSTEM), ("user", "Do you sell gift cards?")],
    [("system", SYSTEM), ("user", "Hi!"), ("assistant", "Hello! How can I help?"),
     ("user", "Is the store open Sunday?"), ("assistant", "Yes, from 10am to 6pm.")],
]
EXPECTED_KEEP = [0, 3, 5, 7]


def quality_ok(conv, seen):
    """True if the conversation is worth training on. 'seen' holds normalized conversations already kept."""
    # TODO 1: return False when
    #   (a) the last turn is not from the assistant,
    #   (b) any assistant reply has fewer than 3 words,
    #   (c) any assistant reply contains boilerplate such as "as an ai language model",
    #   (d) the conversation, lower-cased and joined into one string, is already in 'seen'.
    #   Otherwise add the normalized conversation to 'seen' and return True.
    return True


def build_last_turn_only(conv, tok):
    """Like build_example, but only the FINAL assistant turn is trained (mask 1)."""
    ids, mask = build_example(conv, tok)
    # TODO 2: set mask to 0 everywhere before the final assistant turn's text.
    #   Hint: find the index of the last <|assistant|> marker in ids.
    return ids, mask


if __name__ == "__main__":
    seen = set()
    kept = [i for i, c in enumerate(RAW) if quality_ok(c, seen)]
    print("kept conversations:", kept)
    ok1 = kept == EXPECTED_KEEP
    print("CHECK 1 (quality filter):", "PASS" if ok1 else "FAIL, expected %s" % EXPECTED_KEEP)

    tok = CharTokenizer(all_texts(RAW))
    ids, mask = build_last_turn_only(RAW[7], tok)
    show_mask(ids, mask, tok)
    want = len("Yes, from 10am to 6pm.") + 1
    ok2 = sum(mask) == want
    print("CHECK 2 (last-turn mask): %s, trained tokens %d, expected %d" % ("PASS" if ok2 else "FAIL", sum(mask), want))
    assert ok1 and ok2, "finish TODO 1 and TODO 2, then run again"

    clean = [build_example(RAW[i], tok) for i in kept]
    model = train(clean, tok, verbose=False)
    print("filtered data  ->", reply(model, tok, [("system", SYSTEM), ("user", "Can I return shoes?")]))
    # TODO 3: train a second model on every RAW conversation that ends with an assistant turn
    #   (no other filtering), print its reply to the same question, and explain the difference here.
`},
takeaways: ["SFT continues next-token training on example conversations, turning a base model into an instruct model.", "Chat templates flatten a conversation with role markers and an end token; inference must use the same template.", "A loss mask trains only on assistant tokens; prompts are context, not targets.", "SFT mostly teaches behavior and format, so a small clean dataset often beats a large noisy one.", "Low learning rates, few epochs, mixed-in general data and adapters reduce catastrophic forgetting."],
mcq: [
{q: "In SFT with loss masking, which tokens contribute to the loss?", a: ["Every token in the conversation", "Only the system prompt", "The assistant's reply tokens and its end-of-turn token", "Only the last token of the sequence"], c: 2, why: "Mask 1 marks what the model should learn to produce: assistant text plus the end marker that teaches it to stop."},
{q: "A team fine-tunes on 500,000 scraped answers and the model starts adding a disclaimer to every reply. What is the most likely fix?", a: ["Curate a smaller, cleaner dataset without the boilerplate", "Train for more epochs", "Raise the learning rate", "Remove the chat template"], c: 0, why: "SFT copies behavior from its examples; filtering out the boilerplate removes the habit."},
{q: "After fine-tuning only on legal summaries, a model gets worse at arithmetic. This is called…", a: ["Reward hacking", "Data contamination", "Position bias", "Catastrophic forgetting"], c: 3, why: "Narrow fine-tuning can overwrite general skills; low learning rates, mixed data and adapters help."}
]
},
{
id: "6.2", title: "RL and RLHF: learning from preferences", mins: 75, kicker: "reward models, Bradley-Terry, PPO with a KL penalty, DPO, verifiable rewards, reward hacking",
focus: "how 'answer A is better than answer B' becomes a training signal, and how to stop the model gaming it",
pip: [],
runNote: "Pure PyTorch on CPU; finishes in a few seconds.",
body: `<p>SFT teaches a model to imitate good answers. But many good answers exist for each question, writing perfect demonstrations is slow, and imitation never shows the model what a <i>bad</i> answer looks like. People find it much easier to <b>compare</b>: "answer A is clearer and correct, answer B is vague". Reinforcement learning from human feedback (<b>RLHF</b>) turns those comparisons into a training signal.</p>
<h4>Step 1: a reward model from preference pairs</h4>
<p>Collect pairs (prompt, chosen answer, rejected answer). Train a <b>reward model</b> r(x, y) that gives a score to answer y for prompt x. The <b>Bradley-Terry</b> model says the probability a person prefers the chosen answer depends only on the score difference:</p>
<div class="math">P(chosen beats rejected) = sigmoid(r(x, y_chosen) − r(x, y_rejected))
loss = −log sigmoid(r_chosen − r_rejected)</div>
<p><code>sigmoid(z) = 1 / (1 + e^(−z))</code> squashes any number into 0 to 1. The loss is small when the chosen answer scores well above the rejected one. In practice the reward model is the SFT model with its vocabulary head replaced by a single number output.</p>
<h4>Step 2: optimize the policy with PPO and a KL penalty</h4>
<p>The model being trained is called the <b>policy</b>. It generates answers, the reward model scores them, and an RL algorithm, usually <b>PPO</b> (proximal policy optimization), nudges the policy toward higher-scoring answers, taking small, clipped steps so training stays stable. One extra term matters a lot: a <b>KL penalty</b> to a frozen <b>reference model</b> (the SFT model).</p>
<div class="math">objective = reward(x, y) − β × (log π(y|x) − log π_ref(y|x))</div>
<p>π is the policy's probability of the answer, π_ref the reference model's, and β (beta) sets how strongly the policy is held near the reference. Without it, the policy drifts into strange text the reward model happens to like.</p>
<h4>DPO: preferences without a separate reward model</h4>
<p><b>Direct preference optimization (DPO)</b> skips the reward model and the RL loop. It shows that the KL-constrained objective has a closed-form answer, which leads to a simple classification-style loss on the same preference pairs:</p>
<div class="math">loss = −log sigmoid( β × [ (log π(y_c) − log π_ref(y_c)) − (log π(y_r) − log π_ref(y_r)) ] )</div>
<p>y_c is the chosen answer and y_r the rejected one. Each bracket measures how much more likely the policy makes an answer than the reference did. The loss falls when the policy raises the chosen answer relative to the rejected one. DPO needs only the policy, a frozen reference copy and the pairs, which made it very popular for open models.</p>
<h4>RL with verifiable rewards</h4>
<p>For math and code you don't need human taste: you can <b>check</b> the answer. Reward 1 if the final number matches, or the fraction of unit tests that pass. This is how reasoning models (week 12) are trained to think longer and more carefully. Related ideas use AI feedback: a model critiques answers against a written set of principles (a "constitution"), which scales preference labeling.</p>
<h4>Reward hacking</h4>
<p>Any learned reward is an imperfect proxy. The policy will find its blind spots: very long answers if raters liked detail, flattery, confident tone, or, with unit tests, code that special-cases the tests. Defenses include the KL penalty, refreshing the reward model with new comparisons, length controls, held-out evaluations, and reading samples by hand.</p>`,
example: ["The essay-length trap", `An education startup trained a reward model from teachers' preferences between feedback comments on student essays. Teachers usually preferred the more detailed comment, so the reward model learned "longer is better". After a few RL rounds the tutor wrote 600-word comments that buried the one useful suggestion. The team added length-matched comparison pairs, a length penalty and a stronger KL term, and checked a weekly sample by hand. Comments went back to around 120 words and teacher ratings improved.`],
diagram: {title: "RLHF with PPO, and where DPO cuts in", caption: "People compare answers; a reward model learns their taste; PPO raises the policy's reward while a KL penalty keeps it near the frozen SFT reference. DPO trains the policy directly on the same pairs, with no reward model or RL loop.",
  lanes: ["people", "models", "signals", "update"],
  cols: [[["hum", "Human prefs", "A better than B", "user"], ["prm", "Prompts", "sampled tasks", "store"]], [["pol", "Policy", "model being trained", "core"], ["ref", "Reference", "frozen SFT copy", "store"]], [["rm", "Reward model", "Bradley-Terry", "core"], ["kl", "KL penalty", "stay near reference", "guard"]], [["ppo", "PPO update", "reward minus KL", "core"], ["dpo", "DPO", "loss on pairs", "core"]]],
  edges: [["prm", "pol"], ["hum", "rm", "train"], ["pol", "rm", "answers"], ["pol", "kl"], ["ref", "kl"], ["rm", "ppo", "reward", "hot"], ["kl", "ppo"], ["ppo", "pol", "update", "dash"], ["hum", "dpo", "same pairs", "dash"]]},
demo: {file: "week6/reward_dpo.py", run: "python -m week6.reward_dpo", what: "Trains a Bradley-Terry reward model on 2,000 toy preference pairs and recovers the hidden 'human taste', shows reward hacking when a padded answer games the length feature, computes the DPO loss for example log-probabilities, the KL-penalized PPO reward, and verifiable rewards for math and code.",
code: String.raw`
"""Demo: reward models, DPO and verifiable rewards on toy data.

Each 'answer' is described by 5 features in [0, 1]. Hidden human taste is a weight
per feature; people prefer answer a over b with probability sigmoid(w . (a - b)),
which is exactly the Bradley-Terry model. We learn the weights back from pairs.
"""
import re

import torch
import torch.nn.functional as F

FEATURES = ["correct", "helpful", "polite", "length", "hedging"]
TRUE_W = torch.tensor([2.0, 1.5, 0.7, 0.3, -1.0])


def make_pairs(n, seed=0):
    """Sample answer pairs and let a noisy Bradley-Terry 'rater' pick the winner."""
    g = torch.Generator().manual_seed(seed)
    a = torch.rand(n, len(FEATURES), generator=g)
    b = torch.rand(n, len(FEATURES), generator=g)
    a_wins = torch.rand(n, generator=g) < torch.sigmoid((a - b) @ TRUE_W)
    chosen = torch.where(a_wins[:, None], a, b)
    rejected = torch.where(a_wins[:, None], b, a)
    return chosen, rejected


class RewardModel(torch.nn.Module):
    """A linear reward model: score = w . features (a bias would cancel in the difference)."""

    def __init__(self, d):
        super().__init__()
        self.lin = torch.nn.Linear(d, 1, bias=False)

    def forward(self, x):
        return self.lin(x).squeeze(-1)


def bt_loss(r_chosen, r_rejected):
    """Bradley-Terry loss: -log sigmoid(r_chosen - r_rejected), averaged over pairs."""
    return -F.logsigmoid(r_chosen - r_rejected).mean()


def train_reward_model(chosen, rejected, steps=500, lr=0.05):
    torch.manual_seed(0)
    rm = RewardModel(chosen.shape[1])
    opt = torch.optim.Adam(rm.parameters(), lr=lr)
    for _ in range(steps):
        loss = bt_loss(rm(chosen), rm(rejected))
        opt.zero_grad()
        loss.backward()
        opt.step()
    return rm, loss.item()


def pref_accuracy(score_fn, chosen, rejected):
    with torch.no_grad():
        return (score_fn(chosen) > score_fn(rejected)).float().mean().item()


def dpo_loss(pol_c, pol_r, ref_c, ref_r, beta=0.1):
    """DPO loss from sequence log-probs of the chosen (c) and rejected (r) answers."""
    margin = beta * ((pol_c - ref_c) - (pol_r - ref_r))
    return -F.logsigmoid(margin)


def kl_penalized_reward(reward, logp_policy, logp_ref, beta=0.1):
    """The per-sample quantity PPO-based RLHF maximizes."""
    return reward - beta * (logp_policy - logp_ref)


def math_reward(answer_text, expected):
    """Verifiable reward: 1 if the last number in the answer equals the expected value."""
    nums = re.findall(r"-?\d+(?:\.\d+)?", answer_text)
    return float(bool(nums) and float(nums[-1]) == float(expected))


def unit_test_reward(fn, tests):
    """Verifiable reward for code: the fraction of (input, expected) tests that pass."""
    passed = 0
    for args, want in tests:
        try:
            passed += fn(*args) == want
        except Exception:
            pass
    return passed / len(tests)


if __name__ == "__main__":
    chosen, rejected = make_pairs(2000, seed=0)
    test_c, test_r = make_pairs(500, seed=1)
    rm, final_loss = train_reward_model(chosen, rejected)
    w = rm.lin.weight.detach()[0]
    print("1) Bradley-Terry reward model")
    print(f"   final training loss {final_loss:.3f}")
    for name, true_w, learned in zip(FEATURES, TRUE_W.tolist(), w.tolist()):
        print(f"   {name:8s} hidden {true_w:+.2f}   learned {learned:+.2f}")
    print(f"   held-out preference accuracy {pref_accuracy(rm, test_c, test_r):.1%} "
          f"(the hidden weights themselves score {pref_accuracy(lambda x: x @ TRUE_W, test_c, test_r):.1%}, "
          "because raters are noisy)")

    print("\n2) Reward hacking: a policy searches for what the reward model likes")
    good = torch.tensor([0.9, 0.8, 0.6, 0.4, 0.2])
    padded = torch.tensor([0.3, 0.3, 0.6, 10.0, 0.0])   # 10x longer than anything in training

    def true_quality(x):
        length_term = 0.3 * min(float(x[3]), 1.0) - 1.0 * max(float(x[3]) - 1.0, 0.0)
        return float(x[[0, 1, 2, 4]] @ TRUE_W[[0, 1, 2, 4]]) + length_term

    with torch.no_grad():
        scores = {name: rm(x).item() for name, x in [("good answer", good), ("padded answer", padded)]}
    for name, x in [("good answer", good), ("padded answer", padded)]:
        print(f"   {name:14s} reward model {scores[name]:+.2f}   true quality {true_quality(x):+.2f}")
    print("   the reward model never saw such long answers, so it extrapolates 'longer is better'")

    print("\n3) DPO loss (sequence log-probs; beta = 0.1)")
    cases = [("policy = reference", -11.0, -13.0, -11.0, -13.0),
             ("chosen up, rejected down", -9.0, -16.0, -11.0, -13.0),
             ("moved toward rejected", -13.0, -11.0, -11.0, -13.0)]
    for name, pc, pr, rc, rr in cases:
        loss = dpo_loss(torch.tensor(pc), torch.tensor(pr), torch.tensor(rc), torch.tensor(rr))
        print(f"   {name:26s} loss {loss.item():.3f}")
    print("   ln 2 = 0.693 is the starting point; lower means the policy favors the chosen answer more than the reference did")

    print("\n4) KL-penalized reward used by PPO (beta = 0.1)")
    for name, r, lp, lr_ in [("close to reference", 1.0, -20.0, -21.0), ("far from reference", 1.6, -5.0, -30.0)]:
        print(f"   {name:20s} reward {r:.1f}  log-ratio {lp - lr_:+.1f}  penalized {kl_penalized_reward(r, lp, lr_):+.2f}")

    print("\n5) Verifiable rewards")
    print("   math 'so the total is 42'   ->", math_reward("so the total is 42", 42))
    print("   math 'about 40 I think'     ->", math_reward("about 40 I think", 42))
    tests = [((2, 3), 5), ((0, 0), 0), ((-1, 4), 3)]
    print("   code add(a, b) correct     ->", unit_test_reward(lambda a, b: a + b, tests))
    print("   code that hard-codes 5     ->", round(unit_test_reward(lambda a, b: 5, tests), 2))
`},
lab: {file: "week6/lab_dpo.py", run: "python -m week6.lab_dpo",
task: "Train a tiny policy with DPO on support-reply preferences, and measure how beta controls how far it moves from the reference model.",
steps: ["Run the script. It prints the starting margins and stops at an assert.", "Complete <code>seq_logprob</code> (TODO 1): sum the log-probabilities of the real (unpadded) response tokens.", "Complete the loss line in <code>train_dpo</code> (TODO 2) using <code>dpo_loss</code> from the demo.", "Do TODO 3: run beta = 0.01, 0.1 and 1.0 and record the final loss and the KL to the reference; explain the pattern in a comment."],
done: "every pair's margin over the reference is positive, the script prints 'all pairs preferred: True', and your beta table and comment are in the file.",
code: String.raw`
"""Lab: train a tiny policy with DPO and watch beta control how far it moves."""
import torch
import torch.nn.functional as F

from week6.reward_dpo import dpo_loss

VOCAB = ["<pad>", "sure", "here", "is", "the", "refund", "policy", "steps", "to", "reset",
         "no", "idea", "go", "away", "later", "maybe"]
W2I = {w: i for i, w in enumerate(VOCAB)}
L = 5   # max response length in tokens
PROMPTS = ["how do I get a refund", "how do I reset my password"]
PAIRS = [   # (prompt index, chosen response, rejected response)
    (0, "here is the refund policy", "no idea"),
    (0, "sure here is the policy", "go away"),
    (1, "here is the reset steps", "maybe later"),
    (1, "sure steps to reset", "no idea go away"),
]


def encode(text):
    ids = [W2I[w] for w in text.split()][:L]
    mask = [1] * len(ids) + [0] * (L - len(ids))
    return ids + [0] * (L - len(ids)), mask


def batch():
    p = torch.tensor([pi for pi, _, _ in PAIRS])
    c = [encode(c) for _, c, _ in PAIRS]
    r = [encode(r) for _, _, r in PAIRS]
    t = lambda xs, k: torch.tensor([x[k] for x in xs])
    return p, t(c, 0), t(c, 1).float(), t(r, 0), t(r, 1).float()


class TablePolicy(torch.nn.Module):
    """For each prompt and position, a learned distribution over the vocabulary."""

    def __init__(self, init):
        super().__init__()
        self.logits = torch.nn.Parameter(init.clone())

    def token_logprobs(self, prompt_ids):
        return F.log_softmax(self.logits[prompt_ids], dim=-1)   # (B, L, V)


def seq_logprob(token_logprobs, ids, mask):
    """Sum of log P(token) over real tokens. Shapes (B, L, V), (B, L), (B, L) -> (B,)."""
    # TODO 1: pick each position's log-prob for the token in ids (torch.gather on the last dim),
    #   multiply by mask so padding counts zero, and sum over positions.
    return torch.zeros(ids.shape[0])


def kl_to_reference(pol, ref):
    """Average per-position KL(policy || reference)."""
    lp, lr = F.log_softmax(pol.logits, -1), F.log_softmax(ref.logits, -1)
    return (lp.exp() * (lp - lr)).sum(-1).mean().item()


def train_dpo(beta, steps=150, lr=0.05):
    torch.manual_seed(0)
    ref = TablePolicy(torch.randn(len(PROMPTS), L, len(VOCAB)) * 0.5)
    ref.logits.requires_grad_(False)
    pol = TablePolicy(ref.logits.detach())
    p, c_ids, c_mask, r_ids, r_mask = batch()
    with torch.no_grad():
        ref_c = seq_logprob(ref.token_logprobs(p), c_ids, c_mask)
        ref_r = seq_logprob(ref.token_logprobs(p), r_ids, r_mask)
    opt = torch.optim.Adam(pol.parameters(), lr=lr)
    for _ in range(steps):
        pol_c = seq_logprob(pol.token_logprobs(p), c_ids, c_mask)
        pol_r = seq_logprob(pol.token_logprobs(p), r_ids, r_mask)
        # TODO 2: the mean DPO loss over the pairs, with this beta
        loss = torch.zeros((), requires_grad=True)
        opt.zero_grad()
        loss.backward()
        opt.step()
    with torch.no_grad():
        pol_c = seq_logprob(pol.token_logprobs(p), c_ids, c_mask)
        pol_r = seq_logprob(pol.token_logprobs(p), r_ids, r_mask)
    margins = (pol_c - ref_c) - (pol_r - ref_r)
    return margins, kl_to_reference(pol, ref), float(loss.detach())


if __name__ == "__main__":
    margins, kl, loss = train_dpo(beta=0.1)
    for (pi, c, r), m in zip(PAIRS, margins.tolist()):
        print(f"{PROMPTS[pi]:28s} '{c}' vs '{r}': margin {m:+.2f}")
    print(f"KL to reference {kl:.3f}   final loss {loss:.3f}")
    ok = bool((margins > 0).all())
    print("all pairs preferred:", ok)
    assert ok, "finish TODO 1 and TODO 2: every margin should become positive"
    # TODO 3: loop over beta in (0.01, 0.1, 1.0), print beta, final loss and KL to reference,
    #   and explain here why the KL changes the way it does.
`},
takeaways: ["Comparisons are easier to collect than perfect demonstrations, and they show the model what bad looks like.", "A Bradley-Terry reward model learns scores whose differences predict which answer people prefer.", "PPO-based RLHF maximizes reward minus a KL penalty that keeps the policy near the SFT reference.", "DPO optimizes the same preferences with a simple loss on pairs, using only the policy and a frozen reference.", "Verifiable rewards (correct answers, passing tests) avoid human labels, but every reward can be hacked, so keep checking samples."],
mcq: [
{q: "A reward model scores the chosen answer 2.0 and the rejected one 0.0. Under Bradley-Terry, what is P(chosen preferred)?", a: ["0.50", "0.73", "0.88", "1.00"], c: 2, why: "sigmoid(2.0 - 0.0) = 1 / (1 + e^-2) is about 0.88."},
{q: "Why does PPO-based RLHF subtract a KL penalty to a reference model?", a: ["To keep the policy from drifting into odd text that games the reward model", "To make the reward model train faster", "To shorten the context window", "Because PPO cannot work without labels"], c: 0, why: "The penalty limits how far the policy moves from the SFT model, which limits reward hacking and keeps fluency."},
{q: "What does DPO need that PPO-based RLHF also needs?", a: ["A separately trained reward model", "Sampling new answers during training", "A value network", "Preference pairs and a frozen reference model"], c: 3, why: "DPO trains directly on preference pairs, comparing the policy's log-probs with a frozen reference; it drops the reward model and the RL sampling loop."}
]
},
{
id: "6.3", title: "Evaluating LLMs and designing the chatbot around them", mins: 75, kicker: "EM, F1, BLEU/ROUGE, perplexity, benchmarks, pass@k, contamination, leaderboards, LLM-as-judge",
focus: "picking metrics that match the task, knowing what each one misses, and building an eval loop into the product",
pip: [],
runNote: "Runs offline with a heuristic judge; with an API key the judge calls FAST_MODEL about six times.",
body: `<p>"Is the new model better?" sounds simple, yet it is the hardest question in LLM work. Outputs are open-ended, many answers can be right, and a model can ace a benchmark it has secretly memorized. Good teams use several kinds of evaluation and know the blind spot of each.</p>
<h4>Traditional metrics</h4>
<ul><li><b>Perplexity:</b> exp of the average −log P(true token) on held-out text (week 1). Great for comparing pre-training runs with the same tokenizer; says little about helpfulness.</li>
<li><b>Exact match (EM):</b> 1 if the normalized answer equals the reference, else 0. Normalizing means lower-casing and removing punctuation and articles.</li>
<li><b>Token F1:</b> overlap of answer words with reference words. Precision = shared words / answer words, recall = shared words / reference words, F1 = 2PR / (P + R). Gives partial credit.</li>
<li><b>BLEU and ROUGE:</b> n-gram overlap with reference texts, from translation and summarization. Cheap, but a correct paraphrase can score low and a fluent wrong answer can score high.</li></ul>
<h4>Task-specific benchmarks</h4>
<p><b>Multiple-choice</b> knowledge tests (MMLU-style: four options per question across many subjects) are scored by accuracy, with 25 percent as the random baseline. <b>Math</b> sets check the final answer. <b>Coding</b> benchmarks run unit tests and report <b>pass@k</b>: the chance that at least one of k sampled programs passes. Sampling exactly k programs is noisy, so we sample n ≥ k, count c that pass, and use the unbiased estimator:</p>
<div class="math">pass@k = 1 − C(n − c, k) / C(n, k)</div>
<p>C(a, b) is "a choose b", the number of ways to pick b items from a. The fraction is the probability that k programs drawn from the n are all failures.</p>
<p><b>Contamination</b> is the big caveat: if benchmark questions leaked into pre-training data, scores measure memory, not skill. Checks include n-gram overlap between test items and the training corpus, fresh held-out sets, and rewritten variants of questions.</p>
<h4>Human evaluation and leaderboards</h4>
<p>People compare two anonymous answers to the same prompt and pick the better one. Thousands of such votes are turned into ratings with <b>Elo</b> or a <b>Bradley-Terry</b> fit (the same model as the reward model in 6.2). Public arenas rank chatbots this way. Pairwise votes capture style and helpfulness that metrics miss, but they are slow, costly and can reward confident tone.</p>
<h4>LLM-as-judge</h4>
<p>A strong model grades answers against a <b>rubric</b>: criteria in priority order, a required output format, and an explicit "length is not a virtue". Known biases need controls: <b>position bias</b> (judge both orders and count a win only if it holds after the swap), <b>length bias</b>, and <b>self-preference</b> for answers in its own style. Always measure the judge's agreement with a few dozen human labels before trusting it.</p>
<h4>The chatbot around the model</h4>
<p>A production chatbot is a system: a <b>system prompt</b> (role, rules, tone), <b>history management</b> (keep recent turns, summarize older ones, stay inside the context window), retrieval and tools, <b>safety</b> layers on input and output, and an <b>eval loop</b>: a fixed test set, automatic metrics and a judge on every change, human review of samples, and production feedback that becomes new test cases.</p>`,
example: ["Grading a bank's FAQ bot", `A bank's FAQ bot answered "Can I reverse a wire transfer?" with "Wire transfers generally cannot be reversed once sent; contact us within 24 hours." The reference said "No, but call within one day to request a recall." Exact match was 0 and ROUGE was low, yet a human said it was correct. A rubric-based judge, asked to check facts against the policy, agreed with the human, and with position swapping it agreed with human graders on 92 percent of 200 labeled pairs. The team now runs EM for fields such as fees and dates, the judge for open answers, and a weekly human sample.`],
diagram: {title: "An evaluation loop for a chatbot", caption: "Every change to the prompt, model or retrieval runs through fixed eval sets. Cheap automatic metrics and a calibrated judge run on every change; human review samples the rest; the scorecard decides whether to ship or fix.",
  lanes: ["data", "system", "automatic", "people", "decide"],
  cols: [[["sets", "Eval sets", "benchmarks + own tasks", "store"], ["prod", "Production logs", "real failures", "ext"]], [["bot", "Chatbot", "prompt, history, model", "core"]], [["auto", "Auto metrics", "EM, F1, pass@k", "core"], ["judge", "LLM judge", "rubric + swap", "guard"]], [["human", "Human review", "pairwise votes", "user"]], [["card", "Scorecard", "ship or fix", "store"]]],
  edges: [["sets", "bot"], ["bot", "auto", "answers"], ["bot", "judge"], ["judge", "human", "calibrate", "dash"], ["auto", "card"], ["judge", "card", "", "hot"], ["human", "card"], ["prod", "sets", "new cases"], ["card", "bot", "fix", "dash"]]},
demo: {file: "week6/eval_harness.py", run: "python -m week6.eval_harness", what: "A compact eval harness: exact match and F1 on QA answers, a paraphrase that fools overlap metrics, the unbiased pass@k estimator checked against the closed form, a multiple-choice benchmark with an n-gram contamination check, an Elo leaderboard from pairwise votes, and an LLM judge with a rubric and position swapping.",
code: String.raw`
"""Demo: an evaluation harness for LLM outputs."""
import math
import re
import string
from collections import Counter

from common.llm import FAST_MODEL, OFFLINE, ask


def normalize(s):
    s = "".join(ch for ch in s.lower() if ch not in string.punctuation)
    s = re.sub(r"\b(a|an|the)\b", " ", s)
    return " ".join(s.split())


def exact_match(pred, gold):
    return float(normalize(pred) == normalize(gold))


def f1(pred, gold):
    p, g = normalize(pred).split(), normalize(gold).split()
    common = sum((Counter(p) & Counter(g)).values())
    if common == 0:
        return 0.0
    precision, recall = common / len(p), common / len(g)
    return 2 * precision * recall / (precision + recall)


def perplexity(token_probs):
    return math.exp(-sum(math.log(p) for p in token_probs) / len(token_probs))


def pass_at_k(n, c, k):
    """Unbiased pass@k: 1 - C(n-c, k) / C(n, k), computed as a stable product."""
    if n - c < k:
        return 1.0
    all_fail = 1.0
    for i in range(n - c + 1, n + 1):
        all_fail *= 1.0 - k / i
    return 1.0 - all_fail


def ngrams(text, n=6):
    w = normalize(text).split()
    return {" ".join(w[i:i + n]) for i in range(len(w) - n + 1)}


def contaminated(question, corpus, n=6):
    return bool(ngrams(question, n) & ngrams(corpus, n))


def elo(matches, k=32, base=1000.0):
    """matches: (model_a, model_b, result) with result 'A', 'B' or 'TIE'."""
    r = {}
    for a, b, res in matches:
        ra, rb = r.setdefault(a, base), r.setdefault(b, base)
        expected_a = 1 / (1 + 10 ** ((rb - ra) / 400))
        score_a = {"A": 1.0, "B": 0.0, "TIE": 0.5}[res]
        r[a] = ra + k * (score_a - expected_a)
        r[b] = rb - k * (score_a - expected_a)
    return dict(sorted(r.items(), key=lambda kv: -kv[1]))


RUBRIC = """You grade two answers to a customer's question for an online store.
Criteria, in priority order: 1) factually consistent with the policy given, 2) actually answers
the question, 3) clear and concise. Length is not a virtue. Ignore which answer comes first.
Write one short sentence of reasoning, then a final line exactly WINNER: A, WINNER: B or WINNER: TIE."""
POLICY = "Returns are accepted within 30 days with a receipt. Refunds go to the original payment method."


def offline_judge(question, a, b):
    """Heuristic stand-in with deliberate flaws: it likes keyword overlap, length, and position A."""
    def score(ans):
        words = set(normalize(ans).split())
        return len(words & set(normalize(question + " " + POLICY).split())) / 10 + len(ans) / 400
    sa, sb = score(a) + 0.15, score(b)   # +0.15 is a position bias toward A
    return "A" if sa > sb else "B"


def llm_judge(question, a, b):
    if OFFLINE:
        return offline_judge(question, a, b)
    prompt = (f"<policy>{POLICY}</policy>\n<question>{question}</question>\n"
              f"<answer_a>{a}</answer_a>\n<answer_b>{b}</answer_b>")
    text = ask(prompt, system=RUBRIC, model=FAST_MODEL, max_tokens=1500, effort="low")
    found = re.findall(r"WINNER:\s*(A|B|TIE)", text.upper())
    return found[-1] if found else "TIE"


def judge_swapped(question, a, b):
    """Judge both orders. A win counts only if it survives the swap; otherwise TIE."""
    first = llm_judge(question, a, b)
    second = {"A": "B", "B": "A", "TIE": "TIE"}[llm_judge(question, b, a)]
    return (first if first == second else "TIE"), first, second


QA = [("What is the capital of Australia?", "Canberra", "Canberra."),
      ("Who wrote Pride and Prejudice?", "Jane Austen", "The novel was written by Jane Austen"),
      ("What gas do plants absorb?", "carbon dioxide", "oxygen"),
      ("How many days is the return window?", "30 days", "You have a 30 day return window")]

MCQ = [("Which planet is known as the red planet?", "Mars"), ("What is 7 times 8?", "56"),
       ("Which organ pumps blood through the body?", "heart"), ("What is the boiling point of water at sea level in Celsius?", "100")]
MODEL_ANSWERS = ["Mars", "54", "heart", "100"]
TRAINING_CORPUS = "trivia night recap: which organ pumps blood through the body? the heart, of course."

if __name__ == "__main__":
    print("1) exact match vs F1")
    for q, gold, pred in QA:
        print(f"   EM {exact_match(pred, gold):.0f}  F1 {f1(pred, gold):.2f}  pred: {pred}")
    para = ("Unopened items may come back within a month if you keep the slip", "Returns are accepted within 30 days with a receipt")
    wrong = ("Returns are accepted within 3 days with no receipt", "Returns are accepted within 30 days with a receipt")
    print(f"   correct paraphrase F1 {f1(*para):.2f}   wrong but similar F1 {f1(*wrong):.2f}  <- overlap metrics miss meaning")
    print(f"   perplexity of token probs [0.5, 0.25, 0.8]: {perplexity([0.5, 0.25, 0.8]):.2f}")

    print("\n2) pass@k with n = 20 samples per problem")
    for c in (0, 1, 5, 15):
        row = [pass_at_k(20, c, k) for k in (1, 5, 10)]
        exact = 1 - math.comb(20 - c, 5) / math.comb(20, 5)
        print(f"   c = {c:2d} passing: pass@1 {row[0]:.2f}  pass@5 {row[1]:.2f}  pass@10 {row[2]:.2f}   (closed form pass@5 {exact:.2f})")

    print("\n3) multiple-choice benchmark + contamination check")
    acc = sum(m == gold for (_, gold), m in zip(MCQ, MODEL_ANSWERS)) / len(MCQ)
    print(f"   accuracy {acc:.0%} (random guessing on 4 options would be 25%)")
    for q, _ in MCQ:
        if contaminated(q, TRAINING_CORPUS):
            print(f"   CONTAMINATED: '{q}' shares a 6-gram with the training corpus")

    print("\n4) Elo leaderboard from pairwise human votes")
    votes = [("bot-x", "bot-y", "A"), ("bot-y", "bot-z", "A"), ("bot-x", "bot-z", "A"), ("bot-z", "bot-y", "TIE"),
             ("bot-y", "bot-x", "B"), ("bot-x", "bot-z", "TIE"), ("bot-z", "bot-y", "B"), ("bot-x", "bot-y", "A")]
    for name, rating in elo(votes).items():
        print(f"   {name}: {rating:.0f}")

    print("\n5) LLM judge with position swap" + ("  [offline heuristic judge]" if OFFLINE else "  [" + FAST_MODEL + "]"))
    question = "Can I return a jacket I bought 3 weeks ago?"
    concise = "Yes. Returns are accepted within 30 days with a receipt, refunded to your original payment method."
    rambling = ("Thank you so much for your question about returns! We value every customer and returns are an important "
                "topic. Usually items can be returned, but it depends, so please check the policy page and maybe contact us.")
    close = "Yes, within 30 days if you have the receipt."
    close2 = "Yes, you have 30 days, and you need the receipt."
    pairs = [(concise, rambling, "concise first"), (rambling, concise, "rambling first"), (close, close2, "two close ones")]
    for a, b, label in pairs:
        final, v1, v2 = judge_swapped(question, a, b)
        print(f"   {label:15s} order1 {v1}  order2 (mapped back) {v2}  -> counted as {final}")
    print("   a verdict that flips with the order is position bias, so it is counted as a tie")
`},
lab: {file: "week6/lab_judge.py", run: "python -m week6.lab_judge",
task: "Check whether you can trust an LLM judge: measure its agreement with human labels, its length bias, and whether a leaderboard built from its verdicts matches the human one.",
steps: ["Run the script. It judges eight labeled pairs and prints the verdicts.", "Complete <code>agreement_and_kappa</code> (TODO 1): raw agreement with the human labels, plus Cohen's kappa.", "Complete <code>length_bias_rate</code> (TODO 2): among pairs where humans picked the shorter answer, how often did the judge pick the longer one?", "Do TODO 3: build an Elo leaderboard from the judge's verdicts with <code>elo</code> from the demo and print it next to the human one. Would you ship this judge?"],
done: "the script prints agreement, kappa, a length-bias rate and two leaderboards, and your comment says whether the judge is good enough and what you'd change in the rubric.",
code: String.raw`
"""Lab: can you trust your LLM judge?"""
from collections import Counter

from common.llm import OFFLINE
from week6.eval_harness import elo, judge_swapped

PAIRS = [   # question, bot behind answer a, answer a, bot behind answer b, answer b, human verdict
    ("Can I return shoes after 40 days?", "bot-x", "No, the return window is 30 days.", "bot-y",
     "Returns are a big part of shopping and we love helping. In most cases you can return items, so feel free to send them back anytime!", "A"),
    ("Where does my refund go?", "bot-y", "To your original payment method.", "bot-z", "We send refunds as store credit.", "A"),
    ("Do I need a receipt to return a lamp?", "bot-z", "Yes, returns need a receipt and must be within 30 days.", "bot-x", "Yes, a receipt is required.", "TIE"),
    ("Can I return a gift card?", "bot-x", "I am not sure, perhaps, it depends on many things like the store, the card and the day.", "bot-y", "Gift cards cannot be returned.", "B"),
    ("How long is the return window?", "bot-z", "30 days.", "bot-x", "The return window is 30 days from delivery, and you need the receipt.", "B"),
    ("Is shipping refunded on returns?", "bot-y", "Original shipping is not refunded unless the item was faulty.", "bot-z", "Yes always.", "A"),
    ("Can I return opened software?", "bot-x", "Opened software can only be exchanged for the same title.", "bot-z",
     "Software is a fascinating category with many licensing models, which we will happily explain in great detail another time.", "A"),
    ("Do you refund in cash?", "bot-z", "Refunds go to the original payment method, so cash purchases get cash back.", "bot-y", "No.", "A"),
]


def agreement_and_kappa(judge, human):
    """Raw agreement, and Cohen's kappa = (p_o - p_e) / (1 - p_e) over labels A, B, TIE."""
    # TODO 1: p_o = fraction where judge == human.
    #   p_e = sum over labels of P(judge says label) * P(human says label).
    return 0.0, 0.0


def length_bias_rate(pairs, judge):
    """Among pairs where humans chose the SHORTER answer, the share where the judge chose the longer one."""
    # TODO 2: look at pairs whose human verdict is A or B and where that answer is the shorter one.
    return 0.0


if __name__ == "__main__":
    print("judge:", "offline heuristic (biased on purpose)" if OFFLINE else "LLM judge with swap")
    verdicts = []
    for q, bot_a, a, bot_b, b, human in PAIRS:
        final, v1, v2 = judge_swapped(q, a, b)
        verdicts.append(final)
        print(f"  {q:36s} judge {final:3s} (orders {v1}/{v2})  human {human}")
    humans = [p[-1] for p in PAIRS]
    agree, kappa = agreement_and_kappa(verdicts, humans)
    print(f"agreement {agree:.0%}   Cohen's kappa {kappa:.2f}")
    print(f"length-bias rate {length_bias_rate(PAIRS, verdicts):.0%}")
    print("label counts  judge:", dict(Counter(verdicts)), " human:", dict(Counter(humans)))
    human_board = elo([(p[1], p[3], p[-1]) for p in PAIRS])
    print("human leaderboard:", {k: round(v) for k, v in human_board.items()})
    # TODO 3: build judge_board from the judge's verdicts the same way, print it,
    #   and write here whether you would trust this judge and what you would change.
`},
takeaways: ["Use several kinds of evaluation; every metric has a blind spot.", "EM and F1 suit short factual answers; BLEU and ROUGE reward overlap, not meaning; perplexity compares base models.", "Benchmarks need contamination checks, and coding is scored with the unbiased pass@k from n samples.", "Pairwise human votes turned into Elo or Bradley-Terry ratings capture helpfulness that metrics miss.", "An LLM judge needs a rubric, position swapping, length controls and measured agreement with humans; build it into the chatbot's release loop."],
mcq: [
{q: "Prediction 'Jane Austen wrote it', reference 'Jane Austen'. Which is right after normalization?", a: ["EM 1, F1 1.0", "EM 0, F1 0.0", "EM 1, F1 0.67", "EM 0, F1 about 0.67"], c: 3, why: "Strings differ, so EM is 0. Two of four predicted words match both reference words: P = 0.5, R = 1.0, F1 = 0.67."},
{q: "For a coding problem you draw n = 10 samples and c = 0 pass. What is pass@5?", a: ["0", "0.5", "0.05", "Undefined"], c: 0, why: "With no passing samples, every subset of 5 fails, so pass@5 = 1 - C(10,5)/C(10,5) = 0."},
{q: "A judge picks answer A in order (A, B) and answer B again when the order is swapped to (B, A), meaning the same text loses. What should you record?", a: ["A win for the first answer", "A tie, because the verdict followed position rather than content", "A win for the longer answer", "Discard the question forever"], c: 1, why: "If the winner changes with the order, the judge is following position; counting it as a tie removes that bias."}
]
}
],
quiz: [
{q: "What is the main difference between a base model and an instruct model?", a: ["The instruct model has more parameters", "The instruct model was post-trained on conversations and preferences, so it answers instead of continuing text", "The base model cannot use a tokenizer", "The instruct model uses a different architecture"], c: 1, why: "Same architecture; post-training (SFT and preference training) changes its behavior."},
{q: "In a chat template, why does the assistant's reply include an end-of-turn token in the loss?", a: ["It makes sequences shorter", "It encrypts the reply", "It lets the model learn when to stop generating", "It marks the system prompt"], c: 2, why: "Generating the end token is how the model ends its turn; it must be learned like any other token."},
{q: "In a dataset, 40% of tokens belong to assistant replies. With assistant-only masking, what share of tokens produces gradients through the loss?", a: ["40%", "60%", "100%", "0%"], c: 0, why: "Only masked positions contribute to the loss; the other 60% are context."},
{q: "Which statement about DPO is true?", a: ["It needs a reward model trained first", "It trains a policy directly on preference pairs, comparing log-probs with a frozen reference", "It only works with verifiable rewards", "It removes the need for any preference data"], c: 1, why: "DPO turns the KL-constrained RLHF objective into a loss on pairs."},
{q: "A coding model learns to detect the test inputs and print the expected outputs. This is…", a: ["Catastrophic forgetting", "Contamination", "Position bias", "Reward hacking"], c: 3, why: "The policy maximizes the reward signal (passing tests) without doing the real task."},
{q: "Why can ROUGE give a low score to a correct answer?", a: ["It ignores punctuation", "It measures n-gram overlap, so a correct paraphrase with different words scores low", "It only works on code", "It requires a judge model"], c: 1, why: "Overlap metrics reward shared words, not shared meaning."},
{q: "A model scores 92% on a benchmark, and you find the test questions verbatim in its training data. What does the score mostly measure?", a: ["Memorization rather than skill", "Reasoning ability", "Calibration", "Tokenizer quality"], c: 0, why: "Contamination inflates scores; use fresh or rewritten test sets."},
{q: "Before trusting an LLM judge to gate releases, what should you do first?", a: ["Make the rubric longer", "Use the same model as the chatbot", "Measure its agreement with human labels on a sample and control position and length bias", "Only judge in one order to save cost"], c: 2, why: "A judge is a model too; calibrate it against people and control known biases."}
],
checkpoint: `You can format conversations with a chat template and a loss mask, train a reward model from preference pairs, compute DPO losses and explain beta, and run an eval harness with EM, F1, pass@k, contamination checks, Elo and a position-swapped judge. Keep <code>week6/</code>: in week 8 you'll reuse the eval ideas to A/B test prompts and to compare LoRA fine-tuning against prompting.`
});
