W({
n: 8, title: "Adapting LLMs: the Ladder, LoRA and Choosing a Strategy", short: "Ladder + LoRA", hours: "7–9 hours",
goal: "Learn the ladder of ways to adapt a model to your task, from a better prompt to LoRA fine-tuning, and how to pick the cheapest one that works.",
builds: "A prompt lab that compares zero-shot, few-shot and chain-of-thought prompts on support tickets, a role and user-context prompt with validated JSON output, a LoRA layer written from scratch in PyTorch, and a decision helper plus A/B harness for choosing between prompting, RAG and fine-tuning.",
outcomes: [
  "Place prompting, RAG, fine-tuning and pre-training on an adaptation ladder by cost, effort and what each can change.",
  "Write zero-shot, few-shot, chain-of-thought and role or user-context prompts, and score them on a labeled set.",
  "Estimate the memory cost of full fine-tuning and explain how adapters, prefix tuning, LoRA and QLoRA cut it.",
  "Implement a LoRA layer, fine-tune only about 2% of a model's parameters, and merge the adapter back into the weights.",
  "Choose an adaptation strategy for a real use case and prove the choice with a before-and-after evaluation."
],
lessons: [
{
id: "8.1", title: "The adaptation ladder and prompt engineering", mins: 70, kicker: "zero-shot, few-shot, chain-of-thought, role and user context, structured outputs",
focus: "getting the most out of a model without touching its weights, and measuring prompts instead of guessing",
pip: [],
runNote: "Offline it shows the prompts, their token costs and a keyword baseline; with an API key it makes 30 short FAST_MODEL calls.",
body: `<p>A general model rarely fits your task perfectly out of the box. You can adapt it in four broad ways, and they form a <b>ladder</b>: each rung costs more and changes more.</p>
<div class="tablewrap"><table><thead><tr><th>Rung</th><th>What changes</th><th>Typical cost and effort</th></tr></thead><tbody>
<tr><td>Prompting</td><td>Only the input text: instructions, examples, context</td><td>Minutes to days; no training; pay per token</td></tr>
<tr><td>RAG (week 9)</td><td>The input gets retrieved documents</td><td>Days to weeks; a search index to build and maintain</td></tr>
<tr><td>Fine-tuning</td><td>The weights, from your examples</td><td>Weeks; labeled data, GPUs, an eval set</td></tr>
<tr><td>Pre-training</td><td>Everything, from raw text</td><td>Months and millions of dollars</td></tr></tbody></table></div>
<p>Start at the bottom and climb only when you have measured that the current rung isn't enough.</p>
<h4>Zero-shot and few-shot prompting</h4>
<p><b>Zero-shot</b> means instructions only: "Classify this ticket as billing, technical, account or shipping." <b>Few-shot</b> adds a handful of solved examples in the prompt. The model picks up the label set, the format and edge cases from them. Three rules make examples work: cover every label, keep the format of every example identical to the output you want, and prefer examples similar to the real input (you can retrieve the most similar ones per request, as the lab does). Examples cost tokens on every call, so measure whether they earn their place.</p>
<h4>Chain-of-thought</h4>
<p><b>Chain-of-thought (CoT)</b> prompting asks the model to reason step by step before answering. It helped older models a lot on math and multi-step questions. Modern models such as Claude think <i>adaptively</i>: they decide how much internal reasoning a request needs, and you steer the depth with an <b>effort</b> setting (low to max) rather than with magic phrases. Asking for visible reasoning is still useful when you want to read or log the reasoning, or when you ask for a fixed structure ("first list the facts, then decide"). Always put the final answer on a line you can parse.</p>
<h4>Role-specific and user-context prompting</h4>
<p>A <b>system prompt</b> sets the role, audience and rules: "You are a support agent for an online pharmacy; never give dosing advice." <b>User context</b> adds what is known about this user: plan, language, open orders, past tickets. Wrap each kind of context in its own XML-style tags such as <code>&lt;policies&gt;</code>, <code>&lt;user_profile&gt;</code> and <code>&lt;ticket&gt;</code>. Tags keep instructions apart from data, let you refer to sections by name ("answer using only &lt;policies&gt;"), and make it harder for text inside a ticket to pose as an instruction.</p>
<h4>Structured outputs</h4>
<p>Software needs output it can parse. Ask for a JSON object with named keys and allowed values, then <b>validate</b> it: is it valid JSON, are the keys present, are the values in range? Many APIs can also enforce a JSON schema, or you can define a tool whose input schema is the shape you want. Validate anyway, and retry or fall back when it fails.</p>
<h4>Measure, don't guess</h4>
<p>A prompt is code. Keep a small labeled set (even 20 to 50 examples), score every prompt variant on it, and track accuracy, token cost and latency together. A prompt that is 2 points more accurate but 4 times longer may not be worth it at a million calls a day.</p>`,
example: ["Routing tickets at an online pharmacy", `A pharmacy's support team routed tickets with a zero-shot prompt and got 81% accuracy; most errors were "refund for a missing item", which the model called shipping while the team called it billing. Adding six few-shot examples, two of them exactly that edge case, raised accuracy to 93%. Asking for visible step-by-step reasoning added nothing on top, but tripled output tokens, so they dropped it. A <code>&lt;user_profile&gt;</code> section with the customer's plan let the same prompt also flag premium customers for faster handling.`],
diagram: {title: "Anatomy of a production prompt", caption: "The system prompt sets the role and rules, tagged sections carry user context and examples, the task holds the input, and the reply is parsed and validated before any software uses it.",
  lanes: ["instructions", "context", "input", "model", "output"],
  cols: [[["sys", "System prompt", "role, rules, format", "core"]], [["ctx", "User context", "user_profile tags", "store"], ["shots", "Few-shot examples", "chosen by similarity", "store"]], [["task", "Task + input", "ticket in tags", "user"]], [["llm", "Model", "adaptive thinking", "core"]], [["out", "JSON reply", "category, urgency", "core"], ["val", "Validator", "schema, retry", "guard"]]],
  edges: [["sys", "llm"], ["ctx", "llm"], ["shots", "llm"], ["task", "llm", "", "hot"], ["llm", "out"], ["out", "val"], ["val", "llm", "retry", "dash"]]},
demo: {file: "week8/prompt_lab.py", run: "python -m week8.prompt_lab", what: "Classifies ten support tickets with three prompt strategies (zero-shot, few-shot and chain-of-thought), prints each prompt and its token cost, scores accuracy against the labels, and lists the mistakes. Offline it scores a keyword baseline so you can see where rules break.",
code: String.raw`
"""Demo: zero-shot vs few-shot vs chain-of-thought prompts for ticket routing."""
import re

from common.llm import FAST_MODEL, OFFLINE, ask, count_tokens

LABELS = ["billing", "technical", "account", "shipping"]
TICKETS = [
    ("I was charged twice for my March invoice.", "billing"),
    ("The app crashes every time I open the camera screen.", "technical"),
    ("How do I change the email address on my profile?", "account"),
    ("My parcel has been stuck in Memphis for six days.", "shipping"),
    ("Your checkout page shows an error 500 when I try to pay.", "technical"),
    ("Please cancel my subscription before the next renewal charge.", "billing"),
    ("I can't log in, the reset link says it expired.", "account"),
    ("The tracking number you sent does not work.", "shipping"),
    ("The package arrived but the refund for the missing item never reached my card.", "billing"),
    ("Someone else's name appears on my dashboard after I signed in.", "account"),
]
EXAMPLES = [
    ("I need a copy of last month's receipt.", "billing"),
    ("The website will not load on Firefox.", "technical"),
    ("Please merge my two accounts into one.", "account"),
    ("When will my order be delivered?", "shipping"),
]
KEYWORDS = {
    "billing": ["charge", "charged", "invoice", "refund", "receipt", "subscription", "pay"],
    "technical": ["crash", "crashes", "error", "load", "bug"],
    "account": ["log in", "login", "password", "email", "profile", "account", "reset"],
    "shipping": ["parcel", "package", "tracking", "delivered", "delivery", "order"],
}
SYSTEM = "You route customer support tickets for an online store. The categories are: " + ", ".join(LABELS) + "."


def keyword_baseline(ticket):
    """Count keyword hits per label; ties go to the label listed first. No model needed."""
    text = ticket.lower()
    hits = {label: sum(k in text for k in words) for label, words in KEYWORDS.items()}
    return max(LABELS, key=lambda label: hits[label])


def zero_shot(ticket):
    return f"Classify this ticket into one category.\n<ticket>{ticket}</ticket>\nReply with only the category name."


def few_shot(ticket):
    shots = "\n".join(f"<ticket>{t}</ticket>\ncategory: {y}" for t, y in EXAMPLES)
    return f"Classify the ticket. Solved examples:\n{shots}\n\nNow this one:\n<ticket>{ticket}</ticket>\ncategory:"


def chain_of_thought(ticket):
    return (f"Classify this ticket.\n<ticket>{ticket}</ticket>\n"
            "First write two or three short sentences: what is the customer's real problem, and which team can fix it? "
            "Then end with a final line in the form LABEL: category")


STRATEGIES = {"zero-shot": zero_shot, "few-shot": few_shot, "chain-of-thought": chain_of_thought}


def parse_label(text):
    """Prefer an explicit 'LABEL: x' line; otherwise the first label word that appears."""
    found = re.findall(r"LABEL:\s*([a-z]+)", text, flags=re.I)
    if found and found[-1].lower() in LABELS:
        return found[-1].lower()
    words = re.findall(r"[a-z]+", text.lower())
    return next((w for w in words if w in LABELS), "unknown")


def classify(build_prompt, ticket):
    if OFFLINE:
        return keyword_baseline(ticket)
    reply = ask(build_prompt(ticket), system=SYSTEM, model=FAST_MODEL, max_tokens=2000, effort="low")
    return parse_label(reply)


def score(build_prompt):
    preds = [classify(build_prompt, t) for t, _ in TICKETS]
    correct = sum(p == y for p, (_, y) in zip(preds, TICKETS))
    mistakes = [(t, y, p) for p, (t, y) in zip(preds, TICKETS) if p != y]
    return correct / len(TICKETS), mistakes


if __name__ == "__main__":
    sample = TICKETS[8][0]
    for name, build in STRATEGIES.items():
        print(f"--- {name} prompt ({count_tokens(SYSTEM + build(sample))} tokens{', estimated' if OFFLINE else ''})")
        print(build(sample))
    print()
    if OFFLINE:
        acc, mistakes = score(zero_shot)
        print(f"[offline] keyword baseline accuracy {acc:.0%}; set ANTHROPIC_API_KEY to compare the three prompts")
        for t, y, p in mistakes:
            print(f"   wrong: '{t}' -> {p} (label {y})")
    else:
        for name, build in STRATEGIES.items():
            acc, mistakes = score(build)
            print(f"{name:17s} accuracy {acc:.0%}   mistakes: {[(t[:30], p) for t, y, p in mistakes]}")
        print(f"keyword baseline  accuracy {sum(keyword_baseline(t) == y for t, y in TICKETS) / len(TICKETS):.0%}")
`},
lab: {file: "week8/lab_prompts.py", run: "python -m week8.lab_prompts",
task: "Build a role and user-context prompt with XML-tagged sections, pick few-shot examples by similarity, and validate the model's JSON reply.",
steps: ["Run the script. It prints the prompt pieces and reports 0 valid replies, then stops at an assert.", "Complete <code>build_system</code> (TODO 1): a role, the policies in <code>&lt;policies&gt;</code>, the user profile in <code>&lt;user_profile&gt;</code>, and an exact JSON output instruction.", "Complete <code>pick_examples</code> (TODO 2): choose the k pool examples whose words overlap most with the ticket.", "Complete <code>parse_reply</code> (TODO 3): extract the JSON object from the reply, parse it and validate every field."],
done: "the structure checks print True, the chosen examples look relevant to each ticket, and the script reports 5/5 valid replies (offline with the fake model, or online with a key).",
code: String.raw`
"""Lab: a role + user-context prompt with XML sections and a validated JSON reply."""
import json
import re

from common.llm import FAST_MODEL, OFFLINE, ask
from week8.prompt_lab import EXAMPLES, LABELS, TICKETS, keyword_baseline

USER = {"name": "Priya", "plan": "Premium", "language": "English", "open_orders": 2, "customer_since": 2021}
POLICIES = ["Premium customers get refunds up to 100 USD without a receipt.",
            "Never promise a delivery date.",
            "Anything about another person's data is urgent and goes to the security team."]
POOL = EXAMPLES + [
    ("I was billed after I cancelled my plan.", "billing"),
    ("The password reset email never arrives.", "account"),
    ("The app freezes on the payment screen.", "technical"),
    ("My package was delivered to the wrong address.", "shipping"),
]
URGENCY = ["low", "medium", "high"]


def build_system(user, policies):
    """A role prompt with XML-tagged sections the model can refer to by name."""
    # TODO 1: return a system prompt that
    #   (a) gives a role: "You are a support agent for an online store...",
    #   (b) lists the policies inside <policies>...</policies>,
    #   (c) puts the user's profile (one key: value per line) inside <user_profile>...</user_profile>,
    #   (d) says: reply with ONLY a JSON object with keys "category" (one of LABELS),
    #       "urgency" (low, medium or high) and "reply" (at most two sentences to the customer).
    return "You are a support agent."


def pick_examples(ticket, pool, k=2):
    """The k examples most similar to the ticket (by shared lower-case words)."""
    # TODO 2: score each (text, label) in pool by how many words it shares with ticket; return the top k.
    return pool[:k]


def parse_reply(text):
    """Extract the first {...} object in text, parse it, validate it. Return the dict or None."""
    # TODO 3: models sometimes wrap JSON in a sentence. Find the {...} part (re.search with re.S),
    #   json.loads it (catch ValueError), and return it only if category is in LABELS,
    #   urgency is in URGENCY and reply is a non-empty string.
    return None


def build_user_message(ticket, shots):
    examples = "\n".join(f"<example><text>{t}</text><category>{y}</category></example>" for t, y in shots)
    return f"<examples>\n{examples}\n</examples>\n<current_ticket>{ticket}</current_ticket>"


def fake_model(system, message):
    """Offline stand-in that wraps its JSON in chatty text, as real models sometimes do."""
    ticket = re.search(r"<current_ticket>(.*?)</current_ticket>", message, re.S).group(1)
    urgent = "someone else" in ticket.lower()
    if "JSON" not in system:
        return "Thanks for reaching out! I have passed your ticket to the right team."
    obj = {"category": keyword_baseline(ticket), "urgency": "high" if urgent else "medium",
           "reply": "Thanks, I am on it and will update you shortly."}
    return "Sure, here is the result: " + json.dumps(obj) + " Let me know if you need more."


if __name__ == "__main__":
    system = build_system(USER, POLICIES)
    print("structure checks:", {tag: tag in system for tag in ("<policies>", "<user_profile>", "JSON")})
    valid = 0
    for ticket, label in TICKETS[:5]:
        shots = pick_examples(ticket, POOL)
        message = build_user_message(ticket, shots)
        text = fake_model(system, message) if OFFLINE else ask(message, system=system, model=FAST_MODEL, max_tokens=1500, effort="low")
        parsed = parse_reply(text)
        valid += parsed is not None
        print(f"\n{ticket}\n  examples: {[t for t, _ in shots]}\n  parsed: {parsed}  (label {label})")
    print(f"\nvalid replies: {valid}/5" + ("  [offline fake model]" if OFFLINE else ""))
    assert valid == 5, "finish TODO 1 and TODO 3 so every reply is valid JSON"
`},
takeaways: ["Adapt with the cheapest rung that works: prompting, then RAG, then fine-tuning, and almost never pre-training.", "Few-shot examples teach labels, format and edge cases; keep them consistent and similar to the real input.", "Modern models think adaptively; steer depth with effort and ask for visible reasoning only when you need it.", "Use a system prompt for role and rules, and XML-tagged sections for user context, examples and input.", "Ask for structured output, validate it every time, and score every prompt variant on a labeled set."],
mcq: [
{q: "Your zero-shot router keeps confusing one specific edge case. What is the cheapest fix to try first?", a: ["Pre-train a new model", "Add a few labeled examples of that edge case to the prompt", "Fine-tune on 100,000 tickets", "Raise max_tokens"], c: 1, why: "Few-shot examples are the cheapest way to show the model an edge case; measure before climbing the ladder."},
{q: "Why wrap user data in tags such as <user_profile> and <ticket>?", a: ["Tags make the model faster", "The API requires XML", "It separates instructions from data, lets you refer to sections, and makes injected text less likely to read as instructions", "Tags reduce the token count"], c: 2, why: "Clear sections help the model know what is context versus instruction."},
{q: "With a modern adaptive-thinking model, what is the main way to ask for deeper reasoning on hard requests?", a: ["Raise the effort setting", "Add 'think step by step' to every prompt", "Set temperature to 0", "Repeat the question three times"], c: 0, why: "Adaptive models decide how much to think; the effort parameter steers how deep they go."}
]
},
{
id: "8.2", title: "Fine-tuning and parameter-efficient fine-tuning (LoRA)", mins: 80, kicker: "full fine-tuning memory, adapters, prefix tuning, LoRA math, QLoRA, merging",
focus: "why updating every weight is expensive, and how a low-rank update gets most of the benefit at about 2% of the trainable parameters",
pip: [],
runNote: "Trains a small MLP on CPU; the demo takes about 10 seconds and the lab under a minute.",
body: `<p>When prompting and retrieval aren't enough, for example you need a consistent style across millions of calls, a narrow skill a small model can't do from instructions, or lower latency, you fine-tune: keep training the model on your examples.</p>
<h4>Why full fine-tuning is expensive</h4>
<p>Full fine-tuning updates every parameter, and training needs far more memory than inference. With mixed precision and the Adam optimizer, each parameter typically needs about 16 bytes: 2 for the bf16 weight, 2 for its gradient, 4 for an fp32 master copy, and 8 for Adam's two running averages. A 7-billion-parameter model needs about 112 GB before counting activations, so several large GPUs. You also store a full 14 GB copy of the model for every task you tune.</p>
<h4>Parameter-efficient fine-tuning (PEFT)</h4>
<p>PEFT methods freeze the original weights and train a small number of new ones:</p>
<ul><li><b>Adapters:</b> small bottleneck layers inserted inside each transformer block.</li>
<li><b>Prefix and prompt tuning:</b> learned "virtual tokens" prepended to the input or to every layer's keys and values; the model is untouched.</li>
<li><b>LoRA (low-rank adaptation):</b> a low-rank update added beside existing weight matrices. The most widely used today.</li></ul>
<h4>LoRA in one equation</h4>
<p>A linear layer computes y = W x, with W of shape d_out × d_in. LoRA keeps W frozen and learns a correction made of two thin matrices:</p>
<div class="math">y = W x + (α / r) × B A x
A: r × d_in (random init)    B: d_out × r (zeros init)    r much smaller than d_in, d_out</div>
<p>r is the <b>rank</b>, often 4 to 64. B A has the same shape as W but only r × (d_in + d_out) parameters. For a 4096 × 4096 attention matrix with r = 8, that is 65,536 trainable numbers instead of 16.8 million, about 0.4%. B starts at zero, so training begins exactly at the original model. α (alpha) is a scale; dividing by r keeps the update's size similar when you change r. The idea works because the change fine-tuning needs tends to be low-rank: a few directions in weight space carry most of it.</p>
<h4>Which matrices to adapt</h4>
<p>The original recipe adapted only the attention query and value projections. Adapting all linear layers (attention and the feed-forward network) usually works better for a modest extra cost. Rank matters less than people expect; try 8 or 16 first.</p>
<h4>QLoRA and merging</h4>
<p><b>QLoRA</b> stores the frozen base model in 4-bit precision (about 0.5 bytes per parameter) and trains LoRA adapters in higher precision on top, which lets a 7B to 13B model be tuned on a single consumer GPU. After training you can <b>merge</b>: compute W' = W + (α/r) B A once, and serve a normal model with zero extra latency. Or keep adapters separate, a few megabytes each, and swap them per customer or per task on one shared base model.</p>
<h4>Risks</h4>
<p>Fine-tuning can overfit a small dataset, forget general skills (6.1), or bake in errors from bad labels. LoRA reduces forgetting because the base weights stay intact: switch the adapter off and the original model is back. Always evaluate on held-out examples and on a few general tasks before and after.</p>`,
example: ["One base model, many insurers", `A software vendor serves claims-triage models to 40 insurance companies. Fully fine-tuning a 7B model per customer would mean 40 copies of 14 GB and a GPU cluster for training. Instead they train one LoRA adapter per insurer (rank 16 on all linear layers, about 40 MB each) with QLoRA on a single GPU, keep one base model in memory, and load the right adapter per request. When an insurer's data has a problem, they retrain only that adapter in an afternoon.`],
diagram: {title: "A LoRA layer", caption: "The input goes through the frozen weight W and, in parallel, through the thin trainable matrices A and B. Their scaled product is added to the output. After training, B A can be merged into W.",
  lanes: ["input", "frozen + down", "up", "combine", "output"],
  cols: [[["x", "Input x", "d_in numbers", "user"]], [["W", "Frozen W", "d_out x d_in", "store"], ["A", "A: r x d_in", "trainable", "core"]], [["B", "B: d_out x r", "trainable, zero init", "core"]], [["add", "Add", "Wx + (alpha/r)BAx", "core"]], [["y", "Output y", "same shape as before", "ext"]]],
  edges: [["x", "W"], ["x", "A"], ["A", "B", "r numbers", "hot"], ["W", "add"], ["B", "add", "scaled", "hot"], ["add", "y"]]},
demo: {file: "week8/lora.py", run: "python -m week8.lora", what: "Implements a LoRALinear module, pretrains a small MLP on task A, freezes it and fine-tunes LoRA adapters (about 2% of parameters) on a shifted task B, compares with full fine-tuning, checks that merging gives identical outputs, and prints a memory table for full fine-tuning, LoRA and QLoRA at 1B, 7B and 70B parameters.",
code: String.raw`
"""Demo: LoRA from scratch. Freeze a pretrained MLP, add low-rank adapters, train only those."""
import copy
import math

import torch
import torch.nn as nn
import torch.nn.functional as F

D_IN, HIDDEN, N_CLASSES = 16, 384, 4


class LoRALinear(nn.Module):
    """y = W x + b + (alpha / r) * B A x, with W and b frozen."""

    def __init__(self, base, r=2, alpha=4):
        super().__init__()
        self.base = base
        for p in self.base.parameters():
            p.requires_grad = False
        self.r, self.scale = r, alpha / r
        self.A = nn.Parameter(torch.empty(r, base.in_features))
        nn.init.kaiming_uniform_(self.A, a=math.sqrt(5))          # random, like a normal linear layer
        self.B = nn.Parameter(torch.zeros(base.out_features, r))   # zero: training starts at the base model
        self.enabled = True

    def forward(self, x):
        y = self.base(x)
        if self.enabled:
            y = y + (x @ self.A.T @ self.B.T) * self.scale
        return y

    def merged(self):
        """A plain nn.Linear with the adapter folded into its weight."""
        lin = nn.Linear(self.base.in_features, self.base.out_features)
        with torch.no_grad():
            lin.weight.copy_(self.base.weight + self.scale * self.B @ self.A)
            lin.bias.copy_(self.base.bias)
        return lin


def mlp():
    return nn.Sequential(nn.Linear(D_IN, HIDDEN), nn.ReLU(), nn.Linear(HIDDEN, HIDDEN), nn.ReLU(),
                         nn.Linear(HIDDEN, N_CLASSES))


def make_tasks(n=1000, seed=0):
    """Task A: labels from a random linear teacher. Task B: the same teacher plus a rank-2 change."""
    g = torch.Generator().manual_seed(seed)
    teacher_a = torch.randn(D_IN, N_CLASSES, generator=g)
    teacher_b = teacher_a + 1.0 * torch.randn(D_IN, 2, generator=g) @ torch.randn(2, N_CLASSES, generator=g)

    def split(teacher):
        X, Xt = torch.randn(n, D_IN, generator=g), torch.randn(n // 2, D_IN, generator=g)
        return X, (X @ teacher).argmax(1), Xt, (Xt @ teacher).argmax(1)
    return split(teacher_a), split(teacher_b)


def train(model, X, y, steps=200, lr=1e-2):
    params = [p for p in model.parameters() if p.requires_grad]
    opt = torch.optim.Adam(params, lr=lr)
    for _ in range(steps):
        loss = F.cross_entropy(model(X), y)
        opt.zero_grad()
        loss.backward()
        opt.step()
    return loss.item()


@torch.no_grad()
def accuracy(model, X, y):
    return (model(X).argmax(1) == y).float().mean().item()


def count_params(model):
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return trainable, total


def add_lora(model, r=2, alpha=4, layers=None):
    """A frozen copy of model with each nn.Linear (or those at the given indices) wrapped in LoRALinear."""
    model = copy.deepcopy(model)
    for p in model.parameters():
        p.requires_grad = False
    for i, m in enumerate(model):
        if isinstance(m, nn.Linear) and (layers is None or i in layers):
            model[i] = LoRALinear(m, r, alpha)
    return model


def set_lora(model, enabled):
    for m in model:
        if isinstance(m, LoRALinear):
            m.enabled = enabled


def merge_lora(model):
    model = copy.deepcopy(model)
    for i, m in enumerate(model):
        if isinstance(m, LoRALinear):
            model[i] = m.merged()
    return model


def pretrain_base(task_a, steps=200):
    torch.manual_seed(0)
    model = mlp()
    train(model, task_a[0], task_a[1], steps=steps, lr=1e-2)
    return model


def memory_table():
    rows = [("inference, bf16", 2.0), ("full fine-tune, bf16 + Adam", 16.0),
            ("LoRA, frozen bf16 base", 2.0), ("QLoRA, frozen 4-bit base", 0.5)]
    print("bytes per base parameter, before activations and the small adapter:")
    print(f"   {'setup':30s} {'1B':>8s} {'7B':>8s} {'70B':>8s}")
    for name, bpp in rows:
        print(f"   {name:30s} " + " ".join(f"{bpp * n:7.1f}G" for n in (1, 7, 70)))


if __name__ == "__main__":
    torch.manual_seed(0)
    task_a, task_b = make_tasks()
    base = pretrain_base(task_a)
    Xb, yb, Xbt, ybt = task_b
    print(f"base model: task A test acc {accuracy(base, task_a[2], task_a[3]):.1%}, task B test acc {accuracy(base, Xbt, ybt):.1%}")

    torch.manual_seed(1)
    lora = add_lora(base, r=2, alpha=4)
    trainable, total = count_params(lora)
    train(lora, Xb, yb, steps=200, lr=1e-2)
    print(f"LoRA r=2:   trains {trainable:,} of {total:,} parameters ({trainable / total:.1%}), task B test acc {accuracy(lora, Xbt, ybt):.1%}")

    full = copy.deepcopy(base)
    train(full, Xb, yb, steps=200, lr=3e-3)
    t_full, _ = count_params(full)
    print(f"full FT:    trains {t_full:,} parameters (100%), task B test acc {accuracy(full, Xbt, ybt):.1%}")

    merged = merge_lora(lora)
    with torch.no_grad():
        diff = (merged(Xbt) - lora(Xbt)).abs().max().item()
    print(f"merged LoRA into W: max output difference {diff:.2e} (a plain MLP again, zero extra latency)")
    set_lora(lora, False)
    print(f"adapter switched off: task A test acc {accuracy(lora, task_a[2], task_a[3]):.1%} (the base model is untouched)")
    print()
    memory_table()
`},
lab: {file: "week8/lab_lora_rank.py", run: "python -m week8.lab_lora_rank",
task: "Measure how LoRA's rank and placement trade trainable parameters for accuracy, and compare forgetting with full fine-tuning.",
steps: ["Run the script. It pretrains the base model and prints an empty rank table.", "Do TODO 1: for r in 1, 2, 4, 8, 16, add LoRA (alpha = 2r), train on task B and print the trainable share and task B accuracy.", "Do TODO 2: fine-tune a full copy of the base on task B, then print task A accuracy for the base, the full fine-tune, and the LoRA model with its adapter on and off.", "Do TODO 3: compare LoRA on only the last layer (index 4) with LoRA on all layers at r = 4, and explain the result in a comment."],
done: "the rank table is filled, the forgetting table shows the LoRA model with its adapter off matching the base on task A, and your comments explain the rank and placement results.",
code: String.raw`
"""Lab: LoRA rank, placement and forgetting."""
import copy

import torch

from week8.lora import accuracy, add_lora, count_params, make_tasks, pretrain_base, set_lora, train

if __name__ == "__main__":
    task_a, task_b = make_tasks()
    Xa, ya, Xat, yat = task_a
    Xb, yb, Xbt, ybt = task_b
    base = pretrain_base(task_a)
    print(f"base: task A {accuracy(base, Xat, yat):.1%}  task B {accuracy(base, Xbt, ybt):.1%}\n")

    print("rank  trainable  task-B acc")
    for r in (1, 2, 4, 8, 16):
        torch.manual_seed(1)
        # TODO 1: lora = add_lora(base, r=r, alpha=2 * r); train it on (Xb, yb) for 200 steps with lr=1e-2;
        #   print r, the trainable share from count_params, and accuracy on (Xbt, ybt).
        pass

    # TODO 2: forgetting. full = copy.deepcopy(base); train(full, Xb, yb, steps=200, lr=3e-3).
    #   Print task-A test accuracy for: base, full, a trained r=4 LoRA model with adapters on,
    #   and the same model after set_lora(model, False).

    # TODO 3: at r = 4, compare add_lora(base, r=4, alpha=8, layers=[4]) (last layer only)
    #   with add_lora(base, r=4, alpha=8) (all layers). Which wins on task B, and why?
`},
takeaways: ["Full fine-tuning with Adam needs about 16 bytes per parameter, plus a full model copy per task.", "PEFT freezes the base and trains a little: adapters, prefix or prompt tuning, or LoRA.", "LoRA adds (alpha/r) B A beside a frozen W; B starts at zero, so training starts exactly at the base model.", "QLoRA keeps the frozen base in 4-bit, so large models fit on one GPU; adapters can be merged or swapped per task.", "Because the base weights stay intact, switching an adapter off removes its effect, which limits forgetting."],
mcq: [
{q: "A 1024 × 1024 weight gets a LoRA adapter with r = 8. How many trainable parameters does the adapter add?", a: ["8", "8,192", "1,048,576", "16,384"], c: 3, why: "r × (d_in + d_out) = 8 × (1024 + 1024) = 16,384, about 1.6% of the full matrix."},
{q: "Why is LoRA's B matrix initialized to zero?", a: ["To save memory", "So B A = 0 at the start and the adapted model begins exactly as the base model", "Because A is zero too", "To make the rank smaller"], c: 1, why: "With B = 0 the adapter's contribution is zero, so training starts from the pretrained behavior."},
{q: "What does QLoRA change compared with LoRA?", a: ["It trains all weights in 4-bit", "It removes the A matrix", "It stores the frozen base model in 4-bit precision and trains LoRA adapters on top", "It merges adapters before training"], c: 2, why: "Quantizing the frozen base cuts its memory to about 0.5 bytes per parameter while adapters train in higher precision."}
]
},
{
id: "8.3", title: "Choosing an adaptation strategy", mins: 60, kicker: "knowledge vs behavior vs format vs cost, data needs, before/after evals, a claims case study",
focus: "matching the problem to the cheapest technique that fixes it, and proving it with an A/B test",
pip: [],
runNote: "Offline the A/B harness uses a rule-following fake model; with an API key it calls FAST_MODEL about 12 times.",
body: `<p>Most adaptation projects fail for a boring reason: the team picked a technique before naming the problem. Start with one question: <b>what exactly must change?</b></p>
<div class="tablewrap"><table><thead><tr><th>What must change</th><th>Best first tool</th><th>Why</th></tr></thead><tbody>
<tr><td>Knowledge: private, large or changing facts</td><td>RAG</td><td>Update documents, not weights; cite sources</td></tr>
<tr><td>Behavior or style: tone, policy, what to ask</td><td>Prompting, then fine-tuning</td><td>A system prompt often suffices; fine-tune when you need consistency at scale</td></tr>
<tr><td>Format: fields, JSON, labels</td><td>Prompting with structured outputs</td><td>Schemas and validation handle most of it</td></tr>
<tr><td>Latency or cost per call</td><td>Fine-tune a smaller model</td><td>Short prompts on a small tuned model are fast and cheap</td></tr>
<tr><td>A new language or modality from scratch</td><td>Continued pre-training</td><td>Rarely needed; very expensive</td></tr></tbody></table></div>
<p>Fine-tuning is a poor way to add facts: the model may blend them up, it can't cite them, and the weights go stale when the facts change. RAG is a poor way to change behavior: retrieved text informs the answer but doesn't make the model more concise or more cautious. Many real systems combine all three: a prompt for rules and format, retrieval for facts, and sometimes a small tuned model for one high-volume step.</p>
<h4>Data needs</h4>
<ul><li><b>Prompting:</b> 20 to 50 labeled examples, for evaluation, not training.</li>
<li><b>RAG:</b> the documents plus questions with known answers for evaluation.</li>
<li><b>LoRA fine-tuning:</b> hundreds to tens of thousands of high-quality input-output pairs, plus a held-out set.</li></ul>
<h4>Evaluate before and after</h4>
<p>Build the eval set <i>first</i>, from real inputs, including the hard ones. Measure the baseline (a plain prompt), then each change, on the same set, with the same metrics: task accuracy, format validity, cost and latency per call, and a few general-skill checks. Compare variants on the same cases (a <b>paired</b> comparison) and look at the uncertainty: with 30 cases, a 3-point gain may be noise.</p>
<h4>Failure modes</h4>
<ul><li><b>Overfitting:</b> great on training examples, worse on new ones. Hold data out and stop early.</li>
<li><b>Forgetting:</b> the tuned model loses general skills. Check general tasks; prefer LoRA.</li>
<li><b>Prompt brittleness:</b> small wording changes swing results. Test paraphrased inputs and keep a regression set.</li>
<li><b>Stale knowledge:</b> facts baked into weights or prompts drift from reality. Put changing facts in retrieval.</li></ul>
<h4>Case study: an insurance claims assistant</h4>
<p>An insurer wants an assistant that reads a first notice of loss ("a tree fell on my garage") and drafts an intake. Needs: identify the claim type (auto, home, travel), ask for missing details such as the policy number, cite the right policy clause, return fixed JSON fields for the claims system, and handle 20,000 claims a day. Mapping needs to tools: clauses change every quarter, so <b>RAG</b> over policy documents; fields and follow-up questions come from a <b>prompt</b> with a schema and validation; if volume makes the large model too costly, a <b>LoRA-tuned small model</b> for claim-type triage, trained on 50,000 historical labeled claims. Each step is A/B tested against the previous version before release.</p>`,
example: ["A three-week decision, not a three-month one", `A retail bank planned to fine-tune a model on its product manuals so its chatbot would "know" them. A one-day review found that the manuals changed monthly and answers had to cite the clause, so they built RAG instead. Fine-tuning came later, for one narrow step: classifying 30,000 daily messages into 12 intents with a LoRA-tuned small model, which cut latency from 1.8 seconds to 200 milliseconds. Both choices were confirmed with A/B tests on a 300-case eval set.`],
diagram: {title: "Picking the rung that fixes the problem", caption: "Name what must change, map it to the cheapest technique, and confirm the choice on a fixed eval set before and after. Production failures flow back into the eval set.",
  lanes: ["need", "diagnose", "technique", "prove", "ship"],
  cols: [[["need", "Use case", "what must change?", "user"]], [["know", "Knowledge?", "facts, documents", "guard"], ["behav", "Behavior/format?", "style, schema", "guard"], ["cost", "Latency/cost?", "volume, speed", "guard"]], [["rag", "RAG", "retrieve + cite", "core"], ["prm", "Prompting", "rules, examples", "core"], ["ft", "LoRA fine-tune", "many examples", "core"]], [["eval", "A/B on eval set", "paired, with CI", "store"]], [["ship", "Ship + monitor", "drift, new cases", "ext"]]],
  edges: [["need", "know"], ["need", "behav"], ["need", "cost"], ["know", "rag"], ["behav", "prm", "", "hot"], ["cost", "ft"], ["rag", "eval"], ["prm", "eval", "", "hot"], ["ft", "eval"], ["eval", "ship"], ["ship", "eval", "new cases", "dash"]]},
demo: {file: "week8/strategy.py", run: "python -m week8.strategy", what: "A rule-of-thumb decision helper that scores prompting, RAG, fine-tuning and pre-training for three described use cases (including an insurance claims assistant) and prints its reasons, followed by a small A/B harness that runs two system prompts over claim descriptions and checks claim type and follow-up questions.",
code: String.raw`
"""Demo: choose an adaptation strategy, then A/B test prompts before shipping."""
import re

from common.llm import FAST_MODEL, OFFLINE, ask

OPTIONS = ["prompting", "RAG", "fine-tuning", "pre-training"]


def score_options(case):
    """Rule-of-thumb scores for a use case described as a dict. Returns ranked options and reasons."""
    s = {o: 0 for o in OPTIONS}
    why = {o: [] for o in OPTIONS}

    def add(option, pts, reason):
        s[option] += pts
        why[option].append(f"{pts:+d} {reason}")

    add("prompting", 3, "cheapest to try; always the baseline")
    if case["private_or_changing_facts"]:
        add("RAG", 4, "facts live in documents that change")
        add("fine-tuning", -2, "facts in weights go stale and can't be cited")
    if case["needs_citations"]:
        add("RAG", 2, "answers can cite the retrieved passages")
    if case["style_or_behavior_change"]:
        add("prompting", 1, "a system prompt may be enough")
        add("fine-tuning", 2, "consistent behavior can be learned from examples")
    if case["strict_output_format"]:
        add("prompting", 2, "schemas plus validation handle format")
    n = case["labeled_examples"]
    if n >= 1000:
        add("fine-tuning", 3, f"{n:,} labeled examples available")
    elif n < 100:
        add("fine-tuning", -3, f"only {n} labeled examples")
    if case["calls_per_day"] > 100000 or case["latency_budget_ms"] < 400:
        add("fine-tuning", 2, "a small tuned model is fast and cheap per call")
        add("prompting", -1, "long prompts on a large model cost latency and money at this volume")
    if case["new_language_from_scratch"]:
        add("pre-training", 2, "no existing model covers the language")
    else:
        add("pre-training", -5, "far too costly for this need")
    return sorted(s.items(), key=lambda kv: -kv[1]), why


CASES = {
    "insurance claims assistant": dict(private_or_changing_facts=True, needs_citations=True, style_or_behavior_change=False,
                                       strict_output_format=True, labeled_examples=50000, calls_per_day=20000,
                                       latency_budget_ms=3000, new_language_from_scratch=False),
    "brand-voice email writer": dict(private_or_changing_facts=False, needs_citations=False, style_or_behavior_change=True,
                                     strict_output_format=False, labeled_examples=60, calls_per_day=500,
                                     latency_budget_ms=5000, new_language_from_scratch=False),
    "medical billing code tagger": dict(private_or_changing_facts=False, needs_citations=False, style_or_behavior_change=False,
                                        strict_output_format=True, labeled_examples=200000, calls_per_day=400000,
                                        latency_budget_ms=150, new_language_from_scratch=False),
}

CLAIMS = [
    {"input": "A tree fell on my garage roof last night. Policy HP-4471.", "type": "home", "missing_policy": False},
    {"input": "Someone rear-ended my car at a red light this morning.", "type": "auto", "missing_policy": True},
    {"input": "My luggage was lost on a flight to Lisbon.", "type": "travel", "missing_policy": True},
    {"input": "Hail cracked my windshield in the parking lot. Policy AU-2210.", "type": "auto", "missing_policy": False},
    {"input": "A pipe burst and flooded the kitchen.", "type": "home", "missing_policy": True},
    {"input": "My trip was cancelled because I was in hospital. Policy TR-0912.", "type": "travel", "missing_policy": False},
]
VARIANTS = {
    "A: short": "You are a helpful insurance assistant. Help the customer with their claim.",
    "B: explicit": ("You are an insurance intake assistant. First line exactly: TYPE: auto, home or travel. "
                    "Then one sentence acknowledging the loss. If the message has no policy number, ask for the policy number."),
}


def fake_model(system, message):
    """Offline stand-in that follows explicit instructions literally and nothing else."""
    text = message.lower()
    out = []
    if "TYPE:" in system:
        kind = "auto" if re.search(r"car|windshield|rear-ended", text) else "travel" if re.search(r"flight|trip|luggage", text) else "home"
        out.append("TYPE: " + kind)
    out.append("I am sorry to hear about this, we will help you with the claim.")
    if "policy number" in system and not re.search(r"[A-Z]{2}-\d{4}", message):
        out.append("Could you share your policy number?")
    return "\n".join(out)


def run_variant(system, message):
    if OFFLINE:
        return fake_model(system, message)
    return ask(message, system=system, model=FAST_MODEL, max_tokens=1000, effort="low")


def check(case, output):
    """1 if the claim type is stated on a TYPE line and a missing policy number is requested."""
    m = re.search(r"TYPE:\s*(auto|home|travel)", output, flags=re.I)
    type_ok = bool(m) and m.group(1).lower() == case["type"]
    ask_ok = (not case["missing_policy"]) or "policy number" in output.lower()
    return int(type_ok and ask_ok)


def ab_test(variants, cases):
    """Run every variant on every case; return {variant: [0/1 per case]}."""
    results = {}
    for name, system in variants.items():
        results[name] = [check(c, run_variant(system, c["input"])) for c in cases]
        print(f"   {name:12s} passed {sum(results[name])}/{len(cases)}  per case {results[name]}")
    return results


if __name__ == "__main__":
    for name, case in CASES.items():
        ranked, why = score_options(case)
        print(f"{name}: " + ", ".join(f"{o} {sc:+d}" for o, sc in ranked))
        print("   top choice because: " + "; ".join(why[ranked[0][0]]))
    print("\nA/B test of two intake prompts" + ("  [offline: rule-following fake model]" if OFFLINE else "  [" + FAST_MODEL + "]"))
    ab_test(VARIANTS, CLAIMS)
    print("ship the variant that wins on the same cases, and keep these cases as a regression set")
`},
lab: {file: "week8/lab_ab.py", run: "python -m week8.lab_ab",
task: "Turn the A/B skeleton into a decision you can defend: harder test cases, a paired bootstrap confidence interval, a third prompt variant, and a decision profile for your own use case.",
steps: ["Run the script. It runs the A/B test on the starter cases and prints a zero confidence interval.", "Do TODO 1: add at least four tricky claims to <code>EXTRA_CASES</code> (mixed signals, a policy number in an odd format, a vague message).", "Complete <code>paired_bootstrap</code> (TODO 2): resample case indices with replacement and return the mean difference with a 95% interval.", "Do TODO 3: write variant C, run all three, and apply the ship rule. Then describe your own use case and run <code>score_options</code> on it (TODO 4)."],
done: "the script prints pass rates for three variants on at least 10 cases, a 95% interval for B minus A, a ship decision from the rule, and the ranked options for your own use case.",
code: String.raw`
"""Lab: from an A/B skeleton to a defensible ship decision."""
import random

from common.llm import OFFLINE
from week8.strategy import CLAIMS, VARIANTS, ab_test, score_options

EXTRA_CASES = [
    # TODO 1: add at least 4 tricky cases in the same format, for example:
    # {"input": "My rental car was damaged while I was on holiday in Spain.", "type": "auto", "missing_policy": True},
]


def paired_bootstrap(a, b, n=2000, seed=0):
    """Mean of (b - a) over cases and a 95% interval, by resampling case indices."""
    # TODO 2: repeat n times: draw len(a) indices with replacement, compute mean(b[i] - a[i]) over them.
    #   Return (observed mean difference, 2.5th percentile, 97.5th percentile).
    return 0.0, 0.0, 0.0


if __name__ == "__main__":
    cases = CLAIMS + EXTRA_CASES
    variants = dict(VARIANTS)
    # TODO 3: add variants["C: yours"] = "..." with your best prompt.
    print(f"{len(cases)} cases" + ("  [offline fake model]" if OFFLINE else ""))
    results = ab_test(variants, cases)
    diff, lo, hi = paired_bootstrap(results["A: short"], results["B: explicit"])
    print(f"B minus A: {diff:+.2f}  95% interval [{lo:+.2f}, {hi:+.2f}]")
    print("ship rule: replace A with B only if the whole interval is above 0 ->", "SHIP B" if lo > 0 else "keep testing")
    # TODO 4: describe your own use case as a dict with the same keys as week8.strategy.CASES,
    #   print score_options(...) for it, and say in a comment whether you agree with the ranking.
`},
takeaways: ["Name what must change first: knowledge, behavior, format, or latency and cost.", "Use RAG for changing or private facts, prompting for rules and format, and fine-tuning for consistent behavior or cheap high-volume steps.", "Build the eval set first and measure every change on the same cases, with cost and latency alongside accuracy.", "Compare variants with paired tests and confidence intervals; small eval sets make small gains look real.", "Real systems often combine prompting, retrieval and a small tuned model, each proven by an A/B test."],
mcq: [
{q: "A chatbot must answer from HR policies that change every month and must cite the clause. What is the best first choice?", a: ["Fine-tune on the policies", "Pre-train on HR text", "RAG over the policy documents", "Few-shot prompting with old answers"], c: 2, why: "Changing facts with citations call for retrieval; weights would go stale and can't cite."},
{q: "Prompt B beats prompt A by 3 points on 30 cases, and the paired 95% interval is [-0.07, +0.13]. What should you do?", a: ["Ship B immediately", "Keep testing or add cases; the interval includes zero", "Ship A, because it is shorter", "Fine-tune instead"], c: 1, why: "An interval that contains 0 means the gain could be noise; you need more evidence."},
{q: "Which need points most clearly toward fine-tuning a small model?", a: ["Handling 400,000 short classification calls a day under a 150 ms latency budget, with 200,000 labeled examples", "Answering questions about this week's prices", "Changing the reply format to JSON", "Supporting a one-off analysis"], c: 0, why: "High volume, a tight latency budget and plenty of labeled data favor a small tuned model."}
]
}
],
quiz: [
{q: "What is the right order to try adaptation techniques for most products?", a: ["Pre-training, fine-tuning, RAG, prompting", "Prompting, then RAG or fine-tuning as measured needs require, pre-training almost never", "Fine-tuning first, because it is most powerful", "RAG only"], c: 1, why: "Climb the ladder from cheapest to most expensive, only when an eval shows the current rung falls short."},
{q: "Few-shot examples work best when…", a: ["They all show the same label", "They use a different format from the expected output", "They are as long as possible", "They cover the labels, match the output format, and resemble the real input"], c: 3, why: "Consistent, representative examples teach labels, format and edge cases."},
{q: "Your app must parse the model's reply into fields. What should it do with every reply?", a: ["Trust it if it looks like JSON", "Ask for prose and use regex", "Validate it against the expected keys and values, and retry or fall back on failure", "Increase effort"], c: 2, why: "Structured output plus validation makes model output safe to use in software."},
{q: "About how much memory does full fine-tuning of a 7B model with Adam and mixed precision need, before activations?", a: ["About 112 GB", "About 14 GB", "About 3.5 GB", "About 1 TB"], c: 0, why: "Roughly 16 bytes per parameter: 7B × 16 bytes is about 112 GB."},
{q: "In LoRA, what does the rank r control?", a: ["The number of layers", "The learning rate", "The inner width of B A, and so the number of trainable parameters per adapted matrix", "The vocabulary size"], c: 2, why: "Each adapted matrix gets r × (d_in + d_out) trainable parameters."},
{q: "Why does a merged LoRA model add no inference latency?", a: ["Merging deletes the adapter", "B A is folded into W once, so the layer is a single ordinary matrix multiply again", "It runs in 4-bit", "It skips the frozen layers"], c: 1, why: "W' = W + (alpha/r) B A has the original shape, so serving cost is unchanged."},
{q: "A team wants its model to 'know' a product catalog that changes daily. Why is fine-tuning a poor fit?", a: ["Fine-tuning can't handle text", "LoRA ranks are too small", "Catalogs are too short", "The weights would go stale daily and the model can't cite where a fact came from"], c: 3, why: "Changing knowledge belongs in retrieval, which updates instantly and supports citations."},
{q: "After fine-tuning, a model is excellent on its training examples but worse on new ones. This is…", a: ["Overfitting", "Prompt brittleness", "Contamination", "Quantization error"], c: 0, why: "It memorized the training set; use held-out data, fewer epochs or more varied examples."}
],
checkpoint: `You can compare prompt strategies on a labeled set, build a role and user-context prompt with validated JSON output, implement and merge a LoRA layer, explain the memory math of full fine-tuning, LoRA and QLoRA, and defend an adaptation choice with a paired A/B test. Keep <code>week8/</code>: in week 9 you'll add retrieval to the support assistant and reuse the A/B harness to prove it helps.`
});
