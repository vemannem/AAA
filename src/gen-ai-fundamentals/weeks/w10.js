W({
n: 10, title: "Agents, Workflows and Tools", short: "Agents + tools", hours: "6–8 hours",
goal: "Learn when a fixed workflow is enough and when you need an agent, give models tools safely, and build a multi-step agent that searches the web and cites what it found.",
builds: "Five workflow patterns, a tool-calling agent loop with an MCP-style tool server, and an ask-the-web ReAct agent.",
outcomes: [
  "Tell an LLM call, a workflow and an agent apart, place a design on the agency ladder, and argue when not to use an agent.",
  "Implement prompt chaining with gates, routing, parallelization (sectioning and voting), reflection and orchestrator-workers.",
  "Run a tool-calling loop end to end: JSON-schema tool definitions, tool_use, execution, tool_result and errors returned as data.",
  "Execute tools safely with allowlists, human approval, timeouts and idempotency, and expose tools through MCP.",
  "Compare ReAct, Reflexion, ReWOO and tree search for multi-step agents, and set budgets and stopping rules."
],
lessons: [
{
id: "10.1", title: "Agents overview and workflow patterns", mins: 60, kicker: "LLM vs workflow vs agent, agency levels, chaining, routing, parallelization, reflection, orchestrator-workers",
focus: "choosing the least autonomous design that still solves a support or content task reliably",
pip: [],
body: `<p>"Agent" is used for everything from a single prompt to a system that runs for hours. A useful split, and the one this course uses, is about <b>who decides the next step</b>.</p>
<ul><li><b>An LLM call:</b> one prompt in, one answer out. Your code decides everything else.</li>
<li><b>A workflow:</b> several LLM calls (and maybe tools) connected by paths <i>you</i> wrote in code. Predictable, testable, cheap.</li>
<li><b>An agent:</b> the model decides which tool to call next, reads the result, and keeps going until it judges the task done. Flexible, but harder to predict and more expensive.</li></ul>
<p>Both workflows and agents are <b>agentic systems</b>. Most good products are mostly workflow, with an agent only where the path can't be known in advance.</p>
<h4>The agency ladder</h4>
<div class="tablewrap"><table><thead><tr><th>Level</th><th>Who controls the flow</th><th>Example</th></tr></thead><tbody>
<tr><td>1. Single call</td><td>Your code</td><td>Summarise a ticket</td></tr>
<tr><td>2. Chain</td><td>Your code, fixed sequence</td><td>Extract features, check them, write a description</td></tr>
<tr><td>3. Router</td><td>Model picks one of your paths</td><td>Send a ticket to the billing or shipping prompt</td></tr>
<tr><td>4. Tool-using step</td><td>Model picks tools inside one step</td><td>Look up an order, then answer</td></tr>
<tr><td>5. Autonomous agent</td><td>Model plans and loops until done</td><td>Research a question across many web pages</td></tr></tbody></table></div>
<h4>When not to use an agent</h4>
<p>Skip the agent when the steps are known (a fixed form, a nightly report), when a mistake is costly and hard to undo (payments, deletions) and there's no human check, when latency must be low, or when you can't evaluate the result. Each extra level of autonomy adds cost, latency and new failure modes such as loops and wrong tool calls. Climb the ladder only when the level below fails your evaluation.</p>
<h4>Five workflow patterns</h4>
<ol><li><b>Prompt chaining with a gate:</b> split a task into steps, each consuming the previous output. Between steps put a programmatic check (the <i>gate</i>): "at least three bullet features and no prices". If the gate fails, stop or retry before wasting the next call.</li>
<li><b>Routing:</b> a cheap model classifies the input and your code sends it to a specialised prompt, model or team. Always validate the label: a free-text answer outside your list must fall back to a default.</li>
<li><b>Parallelization:</b> <i>sectioning</i> runs independent subtasks at the same time (review a policy for clarity, legal risk and tone in parallel); <i>voting</i> runs the same check several times, with different instructions or lenses, and takes the majority. Use <code>concurrent.futures</code> or async calls; latency becomes the slowest call, not the sum.</li>
<li><b>Reflection (evaluator-optimizer):</b> generate, critique against an explicit checklist, revise, and stop when the critic approves or after a fixed number of rounds. It works when you can state what "good" means.</li>
<li><b>Orchestrator-workers:</b> a capable model breaks a goal into subtasks it chooses at run time, workers (often a faster model) do them in parallel, and a synthesis step merges the results. Unlike sectioning, the subtasks aren't known in advance.</li></ol>
<p>The demo implements all five in one file. Each call goes through a small <code>llm()</code> function that uses <code>FAST_MODEL</code> for cheap steps (classification, votes, critiques) and the main model for writing, and switches to a scripted fake when no API key is set so you can trace the control flow offline.</p>
<h4>Design habits that carry into agents</h4>
<ul><li>Ask for structured output (a label, JSON) when code will read it, and parse defensively.</li>
<li>Log every call's input and output; you'll debug workflows by reading these traces.</li>
<li>Keep a small labelled test set for each step, like the router accuracy check in the lab.</li></ul>`,
example: ["A returns desk that stayed a workflow", `An online furniture store first built an autonomous agent to handle return requests. It sometimes looped over the same lookups and once offered a refund on a non-returnable mattress. They replaced it with a workflow: a router (return, damage, other), a fixed chain that looks up the order and checks the policy with code, and a reflection step that checks the reply against a five-point checklist. Cost per ticket fell by about 70%, and every reply could be traced to a known path. The agent survived only for the rare "other" tickets, with a human approving every refund.`],
diagram: {title: "Workflow patterns at a glance", caption: "A router sends input down one of your paths; an orchestrator invents subtasks for parallel workers; results are merged or voted on, and a critic checks them against a checklist before they leave.",
  lanes: ["input", "decide", "workers", "check", "output"],
  cols: [[["in", "Ticket or goal", "user input", "user"]], [["route", "Router", "fast model, a label", "core"], ["orch", "Orchestrator", "plans subtasks", "core"]], [["w1", "Worker A", "section or subtask", "core"], ["w2", "Worker B", "runs in parallel", "core"], ["w3", "Worker C", "or one vote of three", "core"]], [["agg", "Aggregate", "merge or majority", "core"], ["crit", "Critic", "explicit checklist", "guard"]], [["out", "Result", "reply or brief", "user"]]],
  edges: [["in", "route"], ["in", "orch"], ["route", "w1", "one path"], ["orch", "w1"], ["orch", "w2"], ["orch", "w3"], ["w1", "agg"], ["w2", "agg"], ["w3", "agg"], ["agg", "crit"], ["crit", "out", "approved", "hot"], ["crit", "w1", "revise", "dash"]]},
demo: {file: "week10/workflows.py", run: "python -m week10.workflows", what: "All five patterns for an online store: a product-description chain with a gate, a ticket router with specialist prompts, parallel policy review and spam voting with concurrent.futures, a reply that is critiqued and revised until approved, and an orchestrator that plans launch-content subtasks for parallel workers.",
code: String.raw`
"""Demo: five workflow patterns for an online store's support and content team.

1 prompt chaining with a gate   2 routing   3 parallelization (sectioning + voting)
4 reflection (generate, critique, revise)   5 orchestrator-workers

Every step goes through llm(). With an API key it calls Claude (FAST_MODEL for cheap steps);
offline, fake_llm() returns small scripted answers so the control flow still runs.
"""
import json
import re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from common.llm import FAST_MODEL, MODEL, OFFLINE, ask


def llm(prompt, step, system=None, fast=True):
    """One model call. step names the job, so the offline fake knows what to return."""
    if OFFLINE:
        return fake_llm(prompt, step)
    return ask(prompt, system=system, model=FAST_MODEL if fast else MODEL, max_tokens=1500, effort="low")


def fake_llm(prompt, step):
    p = prompt.lower()
    if step == "features":
        return "- holds 750 ml\n- keeps drinks cold for 24 hours\n- dishwasher safe lid\n- weighs 340 g"
    if step == "description":
        return "Meet the TrailFlask: 750 ml of ice-cold water for a full 24 hours, a lid that goes in the dishwasher, and only 340 g in your pack."
    if step == "route":
        for label, words in [("billing", ["charge", "refund", "card"]), ("shipping", ["parcel", "deliver", "tracking", "arrive"]),
                             ("technical", ["app", "login", "password", "error"])]:
            if any(w in p for w in words):
                return label
        return "other"
    if step.startswith("specialist"):
        return "(" + step.split(":")[1] + " specialist) Thanks for reaching out, here is what we will do next..."
    if step.startswith("review"):
        aspect = step.split(":")[1]
        notes = {"clarity": "Say '30 days from delivery', not 'a month'.", "risk": "Avoid 'always'; damaged-item rules have exceptions.",
                 "tone": "Friendly, but 'You must' sounds strict; try 'Please'."}
        return notes[aspect]
    if step.startswith("vote"):
        voter = int(step.split(":")[1])
        spammy = sum(w in p for w in ["!!!", "visit", "discount code", "www"])
        return "SPAM" if spammy >= 2 or (voter == 2 and spammy == 1) else "OK"
    if step == "draft":
        return "We are sorry. Refunds take time. Wait."
    if step == "critique":
        draft = p.split("draft reply:")[-1]
        missing = [m for m, w in [("give the 5 to 7 day refund timing", "5 to 7"), ("offer a next step", "track")] if w not in draft]
        return "APPROVED" if not missing else "Fix: " + "; ".join(missing)
    if step == "revise":
        return "I'm sorry for the wait. Your refund was approved and usually appears in 5 to 7 business days; you can track it under Account > Orders."
    if step == "plan":
        return json.dumps([{"worker": "taglines", "task": "Write 3 short taglines"},
                           {"worker": "faq", "task": "Write 3 FAQ questions with answers"},
                           {"worker": "email", "task": "Write a 2-sentence launch email"}])
    if step.startswith("worker"):
        return {"taglines": "Cold for 24h. | Light as your phone. | Fill once, hike all day.",
                "faq": "Q: Dishwasher safe? A: The lid is. Q: Size? A: 750 ml. Q: Weight? A: 340 g.",
                "email": "The TrailFlask is here. Ice-cold water for 24 hours, 10 percent off this week."}[step.split(":")[1]]
    if step == "synthesize":
        return "LAUNCH BRIEF\n" + prompt.split("Worker outputs:")[-1].strip()
    return "[offline] " + prompt[:60]


# 1. Prompt chaining with a gate -------------------------------------------------------------
SPEC = "TrailFlask bottle. Capacity 750 ml. Insulation: cold 24 h. Lid: dishwasher safe. Weight 340 g. SKU TF-750."


def gate_features(text):
    """A programmatic check between steps: at least 3 bullets and no invented prices."""
    bullets = [l for l in text.splitlines() if l.strip().startswith("-")]
    return len(bullets) >= 3 and "$" not in text


def chain():
    features = llm("List the customer-facing features in this spec as '- ' bullets, nothing else:\n" + SPEC, "features")
    if not gate_features(features):
        return "GATE FAILED, stopping before step 2:\n" + features
    return llm("Write a 2-sentence product description using only these features:\n" + features, "description", fast=False)


# 2. Routing ----------------------------------------------------------------------------------
ROUTES = ["billing", "shipping", "technical", "other"]
SPECIALISTS = {r: f"You are a {r} support specialist for an online store. Be brief and concrete." for r in ROUTES}


def route(ticket):
    label = llm("Classify this support ticket as one of " + ", ".join(ROUTES) + ". Reply with the label only.\n\n" + ticket, "route").strip().lower()
    label = label if label in ROUTES else "other"          # never trust free text blindly
    reply = llm(ticket, "specialist:" + label, system=SPECIALISTS[label])
    return label, reply


# 3. Parallelization: sectioning and voting ---------------------------------------------------
POLICY = "You must return items within a month. We always refund damaged items."


def sectioning(text):
    aspects = ["clarity", "risk", "tone"]
    with ThreadPoolExecutor(max_workers=3) as pool:      # independent calls run at the same time
        notes = list(pool.map(lambda a: llm(f"Review this policy text only for {a}. One sentence.\n\n{text}", "review:" + a), aspects))
    return dict(zip(aspects, notes))


def voting(review, n=3):
    lenses = ["links and promotions", "repetition and shouting", "relevance to the product"]
    with ThreadPoolExecutor(max_workers=n) as pool:
        votes = list(pool.map(lambda i: llm(f"Focus on {lenses[i]}. Is this product review SPAM or OK? Reply with one word.\n\n{review}",
                                            f"vote:{i}").strip().upper(), range(n)))
    return Counter(votes).most_common(1)[0][0], votes


# 4. Reflection -------------------------------------------------------------------------------
CHECKLIST = "The reply must apologise once, give the 5 to 7 business day refund timing, and offer a next step (how to track it)."


def reflection(complaint, max_rounds=3):
    draft = llm("Write a short reply to this customer:\n" + complaint, "draft")
    for i in range(max_rounds):
        critique = llm(f"Check the draft against this checklist: {CHECKLIST}\nReply APPROVED or list fixes.\n\nDraft reply: {draft}", "critique")
        print(f"   round {i}: {critique}")
        if critique.strip().upper().startswith("APPROVED"):
            break
        draft = llm(f"Revise the draft. Fixes: {critique}\nChecklist: {CHECKLIST}\n\nDraft reply: {draft}", "revise", fast=False)
    return draft


# 5. Orchestrator-workers ---------------------------------------------------------------------
def orchestrate(goal):
    plan_text = llm("Break this goal into 2-4 independent subtasks. Reply with JSON only: "
                    '[{"worker": "short-name", "task": "..."}]\n\nGoal: ' + goal, "plan", fast=False)
    m = re.search(r"\[.*\]", plan_text, re.S)
    plan = json.loads(m.group(0)) if m else []
    print("   plan:", [p["worker"] for p in plan])
    with ThreadPoolExecutor(max_workers=4) as pool:
        outputs = list(pool.map(lambda p: llm(p["task"] + "\nProduct: " + SPEC, "worker:" + p["worker"]), plan))
    joined = "\n".join(f"[{p['worker']}] {o}" for p, o in zip(plan, outputs))
    return llm("Combine these into one launch brief with a heading per part.\nWorker outputs:\n" + joined, "synthesize", fast=False)


if __name__ == "__main__":
    print("mode:", "OFFLINE fake model" if OFFLINE else f"Claude ({FAST_MODEL} for cheap steps, {MODEL} for writing)")
    print("\n1) prompt chain with gate\n  ", chain())
    print("\n2) routing")
    for t in ["I was charged twice for order 1042.", "My parcel has not arrived and tracking is stuck.", "The app shows an error at login."]:
        label, reply = route(t)
        print(f"   {label:<9} <- {t}\n             {reply[:90]}")
    print("\n3a) parallel sectioning:")
    for aspect, note in sectioning(POLICY).items():
        print(f"   {aspect:<7} {note}")
    for review in ["Great bottle!!! Visit www.cheap-bottles.example for a discount code!!!",
                   "Keeps water cold all day. Visit the brand page for more colours."]:
        verdict, votes = voting(review)
        print("3b) voting:", votes, "->", verdict, "|", review[:40])
    print("\n4) reflection loop")
    print("   final:", reflection("I returned my blender two weeks ago and still have no refund. Ridiculous."))
    print("\n5) orchestrator-workers")
    print(orchestrate("Prepare launch content for the TrailFlask bottle."))
`},
lab: {file: "week10/lab_router.py", run: "python -m week10.lab_router",
task: "Measure a cheap keyword router against the LLM router on 12 labelled tickets, make label parsing robust to messy model output, and escalate tickets to a person when the two routers disagree.",
steps: ["Run the script. The keyword router scores 25% because it always says 'other'.", "Complete <code>keyword_route</code> with a few words per queue and rerun until it reaches at least 75%.", "Complete <code>parse_label</code> so 'Label: Billing.' becomes 'billing' and unknown text becomes 'other'.", "Complete the agreement gate (TODO 3) and print which tickets go to human review.", "Answer TODO 4 in a comment: one task where this workflow beats an agent, and one where an agent is worth it."],
done: "the keyword router reaches at least 75% accuracy, both parse_label asserts pass, the escalation list is printed, and the script ends with 'checks passed'.",
code: String.raw`
"""Lab: measure a router, make its output parsing robust, and escalate when routers disagree."""
from collections import Counter

from common.llm import OFFLINE
from week10.workflows import ROUTES, llm

TICKETS = [
    ("I was charged twice for my last order.", "billing"),
    ("Where is my refund? It has been two weeks.", "billing"),
    ("Can I get an invoice with my company name?", "billing"),
    ("My parcel says delivered but it is not here.", "shipping"),
    ("Tracking has not moved since Monday.", "shipping"),
    ("Do you deliver to Canada?", "shipping"),
    ("The app crashes when I open my cart.", "technical"),
    ("I cannot reset my password.", "technical"),
    ("Checkout page shows error 500.", "technical"),
    ("Do you have this sofa in green?", "other"),
    ("I love your store, keep it up!", "other"),
    ("Is the blender compatible with 220 volts?", "other"),
]


def keyword_route(ticket):
    """Cheap baseline router: no model call at all."""
    t = ticket.lower()
    # TODO 1: return "billing", "shipping" or "technical" when the ticket contains words typical of that
    #         queue (think: charged, refund, invoice / parcel, tracking, deliver / app, password, error), else "other"
    return "other"


def parse_label(text):
    """Turn a model reply such as 'Label: Billing.' or '**shipping**' into a valid route."""
    # TODO 2: lowercase, then return the first route name that appears in the text; "other" if none does
    return text.strip()


def llm_route(ticket):
    reply = llm("Classify this support ticket as one of " + ", ".join(ROUTES) + ". Reply with the label only.\n\n" + ticket, "route")
    return parse_label(reply)


def accuracy(router):
    preds = [(router(t), gold) for t, gold in TICKETS]
    confusion = Counter((g, p) for p, g in preds if p != g)
    return sum(p == g for p, g in preds) / len(preds), confusion


if __name__ == "__main__":
    print("llm router:", "offline fake (a different keyword list)" if OFFLINE else "Claude, fast model")
    for name, router in [("keyword", keyword_route), ("llm", llm_route)]:
        acc, mistakes = accuracy(router)
        print(f"{name:<8} accuracy {acc:.0%}   mistakes (gold, predicted): {dict(mistakes)}")

    for messy in ["Label: Billing.", "**shipping**", "I think this is a technical issue", "no idea"]:
        print(f"parse_label({messy!r}) -> {parse_label(messy)!r}")

    # TODO 3: an agreement gate. For each ticket, run both routers; when they disagree, send it to
    #         "human-review" instead of guessing. Print how many tickets were escalated.
    escalated = []
    print("escalated to a person:", escalated)

    assert accuracy(keyword_route)[0] >= 0.75, "TODO 1: the keyword router should reach 75%"
    assert parse_label("Label: Billing.") == "billing" and parse_label("no idea") == "other", "TODO 2"
    print("checks passed")
    # TODO 4: in a comment, name one support task where this fixed workflow is better than an
    #         autonomous agent, and one where an agent would be worth its extra cost and risk.
`},
takeaways: ["A workflow follows paths you coded; an agent lets the model choose the next step and loop until done.", "Climb the agency ladder only when the simpler level fails your evaluation; autonomy costs money, latency and predictability.", "Chaining with gates, routing, parallel sectioning and voting, reflection and orchestrator-workers cover most real products.", "Validate every model output your code depends on, and fall back safely when it is malformed.", "Log every step and keep a small labelled test set per step."],
mcq: [
{q: "A system classifies a ticket with a model, then your code sends it to one of four fixed prompts. What is it?", a: ["An autonomous agent", "A workflow using the routing pattern", "A single LLM call", "Orchestrator-workers"], c: 1, why: "The model only chooses among paths you wrote; your code controls the flow."},
{q: "Three parallel reviews take 2 s, 3 s and 5 s. Roughly how long does the parallel step take?", a: ["2 s", "3.3 s", "10 s", "5 s"], c: 3, why: "Running concurrently, the step finishes when the slowest call does: about 5 s instead of 10 s in sequence."},
{q: "When is orchestrator-workers a better fit than parallel sectioning?", a: ["When the subtasks aren't known until the model reads the goal", "When there is exactly one subtask", "When you need the cheapest possible system", "When the output must be a single label"], c: 0, why: "Sectioning splits along subtasks you define in advance; an orchestrator decides the subtasks at run time."}
]
},
{
id: "10.2", title: "Tools: calling, formatting, safe execution and MCP", mins: 70, kicker: "JSON-schema tools, tool_use and tool_result, errors as data, sandboxing, approvals, idempotency, Model Context Protocol",
focus: "designing tool definitions and execution guards for an agent that can issue refunds",
pip: ["mcp"],
deps: [],
runNote: "The demo needs only the standard library. The lab's optional MCP part uses the mcp package (installed by the notebook's first cell).",
body: `<p>A model can't look up an order or move money. It can only produce text. <b>Tool calling</b> turns that text into actions in a controlled way: you describe tools, the model asks for one in a structured form, <i>your code</i> runs it, and you send the result back.</p>
<h4>The loop, end to end</h4>
<ol><li>You send the conversation plus a list of tool definitions: <code>name</code>, <code>description</code> and an <code>input_schema</code> in JSON Schema.</li>
<li>If the model wants a tool, the response has <code>stop_reason == "tool_use"</code> and one or more <code>tool_use</code> blocks, each with an <code>id</code>, the tool <code>name</code> and an <code>input</code> object.</li>
<li>Your code runs each tool and sends back one user message containing a <code>tool_result</code> block per call, matched by <code>tool_use_id</code>. All results of a turn go in the same message.</li>
<li>Repeat until the model answers without asking for a tool. Always append the model's full response content, which may include thinking blocks, before adding the results.</li></ol>
<p>Tools that run on your side are <b>client tools</b>. Some, such as web search, run on Anthropic's servers and return their results in the same response; you'll use one in lesson 10.3.</p>
<h4>Formatting tools well</h4>
<ul><li><b>Names and descriptions are prompts.</b> Say what the tool does, when to use it, what it returns, and its limits: "Look up a store order by id (like A1002). Returns status, items, total in USD, weight in kg and carrier."</li>
<li><b>Strict schemas:</b> list <code>required</code> fields, set <code>additionalProperties: false</code>, use <code>enum</code> for fixed choices (units), and add <code>"strict": true</code> so inputs always match the schema.</li>
<li><b>Few, well-separated tools</b> beat many overlapping ones. If two tools are always called together, merge them.</li>
<li><b>Concise outputs:</b> return compact JSON or short text with exactly what the model needs; long dumps waste context and confuse it.</li>
<li><b>Errors as data:</b> when a tool fails, return a <code>tool_result</code> with <code>is_error: true</code> and a helpful message ("no order with id Z9999; ids look like A1001"). The model can then retry or ask the user instead of crashing your loop.</li></ul>
<h4>Executing tools safely</h4>
<p>The model chooses arguments, and text from users, web pages or documents can try to steer it. Treat every tool call as untrusted input.</p>
<ul><li><b>Sandboxing:</b> never <code>eval</code> model text. The demo's calculator walks the syntax tree and allows only numbers and arithmetic; code execution belongs in a container with no secrets and no network.</li>
<li><b>Permissions and allowlists:</b> each agent sees only the tools its job needs, with the least privilege (read-only order lookup for a FAQ bot).</li>
<li><b>Timeouts and budgets:</b> cap each tool's run time and the number of loop turns.</li>
<li><b>Idempotency:</b> if a refund call is retried after a timeout, it must not pay twice. Cache results by tool and arguments, or pass an idempotency key to the payment API.</li>
<li><b>Human approval:</b> risky or irreversible actions (refunds above a limit, emails to customers, deletions) wait for a person to approve the exact action and arguments.</li></ul>
<h4>MCP: one way to plug tools into any agent</h4>
<p>The <b>Model Context Protocol (MCP)</b> is an open standard for connecting AI applications to tools and data. An <b>MCP server</b> exposes <i>tools</i> (functions), <i>resources</i> (readable data such as files or records) and <i>prompts</i> (reusable templates). An <b>MCP client</b> inside an app such as Claude Desktop, an IDE or your own agent connects to the server over stdio or HTTP, lists what it offers and calls it with JSON-RPC messages. Write the server once and every MCP-capable client can use it. With the Python <code>mcp</code> package, a server is a few lines:</p>
<pre class="code" style="border-radius:10px"><code>from mcp.server.fastmcp import FastMCP   # mcp 1.x; in mcp 2.x: from mcp.server.mcpserver import MCPServer
server = FastMCP("lumen-store")

@server.tool()
def lookup_order(order_id: str) -&gt; str:
    """Look up a store order by id (like A1002)."""
    return json.dumps(ORDERS[order_id])

if __name__ == "__main__":
    server.run()   # stdio: the client starts this process and talks over stdin and stdout</code></pre>
<p>The type hints and docstring become the tool's schema and description. The demo's <code>ToolServer</code> class mimics the same two operations, <code>list_tools</code> and <code>call_tool</code>, with no dependencies, and the lab builds a real MCP server object.</p>`,
example: ["The double refund", `A subscription box company's support agent called a payments tool to refund a customer. The payments API was slow, the tool timed out, the agent retried, and the customer was refunded twice. The fix had three parts: the refund tool now sends an idempotency key built from the ticket id and amount, refunds above 50 dollars wait for a human to approve the exact arguments, and every tool has a 10-second timeout that returns an is_error result the agent can explain to the customer.`],
diagram: {title: "The tool-calling loop", caption: "Your loop sends messages and tool definitions to the model. Each tool_use goes through guards to the tool server, and every result returns as a tool_result in one user message, until the model answers in plain text.",
  cols: [[["user", "Customer", "task", "user"]], [["loop", "Agent loop", "messages, budget", "core"], ["guard", "Guards", "allowlist, approval", "guard"]], [["llm", "Claude", "chooses tool_use", "ext"]], [["srv", "Tool server", "list_tools, call_tool", "core"]], [["calc", "calculator", "safe arithmetic", "core"], ["conv", "convert_units", "kg, km, c...", "core"], ["orders", "lookup_order", "order records", "store"]]],
  edges: [["user", "loop", "task"], ["loop", "llm", "messages + tools", "hot"], ["llm", "loop", "tool_use", "dash"], ["loop", "guard"], ["guard", "srv", "call_tool"], ["srv", "calc"], ["srv", "conv"], ["srv", "orders"], ["srv", "loop", "tool_result", "dash"]]},
demo: {file: "week10/tool_agent.py", run: "python -m week10.tool_agent", what: "A manual agent loop with three strict-schema tools (a safe calculator, a unit converter and an order lookup) served by an MCP-style ToolServer. It answers a multi-part order question with two tool calls in one turn, returns a missing order as an is_error result the agent explains, and blocks an attempted code injection in the calculator.",
code: String.raw`
"""Demo: a tool-calling agent loop with an MCP-style tool server.

The model sees tool definitions (name, description, JSON schema). When it wants a tool it
returns a tool_use block; our code runs the tool and sends back a tool_result. The loop ends
when the model answers without asking for a tool. Offline, a scripted fake model plays the
model's part so you can watch the same loop run.
"""
import ast
import json
import operator
import re
from types import SimpleNamespace

from common.llm import OFFLINE, create, text_of

# ---------- the tools ----------

ORDERS = {
    "A1001": {"status": "delivered", "items": ["desk lamp"], "total_usd": 42.00, "weight_kg": 1.2, "carrier": "UPS"},
    "A1002": {"status": "in transit", "items": ["blender", "glass jar"], "total_usd": 129.50, "weight_kg": 3.4, "carrier": "FedEx"},
    "A1003": {"status": "processing", "items": ["oak sofa"], "total_usd": 899.00, "weight_kg": 48.0, "carrier": "freight"},
}

OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
       ast.Pow: operator.pow, ast.USub: operator.neg, ast.Mod: operator.mod}


def calculator(expression):
    """Safe arithmetic: walks the syntax tree and allows numbers and + - * / ** % only (no eval)."""
    def ev(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in OPS:
            return OPS[type(node.op)](ev(node.left), ev(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in OPS:
            return OPS[type(node.op)](ev(node.operand))
        raise ValueError("only numbers and + - * / ** % are allowed")
    return str(round(ev(ast.parse(expression, mode="eval").body), 4))


FACTORS = {("kg", "lb"): 2.20462, ("lb", "kg"): 1 / 2.20462, ("km", "mi"): 0.621371, ("mi", "km"): 1.609344,
           ("cm", "in"): 1 / 2.54, ("in", "cm"): 2.54}


def convert_units(value, from_unit, to_unit):
    if (from_unit, to_unit) == ("c", "f"):
        return f"{value * 9 / 5 + 32:.1f} f"
    if (from_unit, to_unit) == ("f", "c"):
        return f"{(value - 32) * 5 / 9:.1f} c"
    if (from_unit, to_unit) not in FACTORS:
        raise ValueError(f"cannot convert {from_unit} to {to_unit}")
    return f"{value * FACTORS[(from_unit, to_unit)]:.2f} {to_unit}"


def lookup_order(order_id):
    order = ORDERS.get(order_id.strip().upper())
    if order is None:
        raise KeyError(f"no order with id {order_id}; ids look like A1001")
    return json.dumps(order)          # concise, structured output the model can read easily


UNITS = ["kg", "lb", "km", "mi", "cm", "in", "c", "f"]
TOOLS = [
    {"name": "calculator", "description": "Evaluate an arithmetic expression such as '129.5 * 0.85'. Use it for any math instead of computing in your head.",
     "strict": True,
     "input_schema": {"type": "object", "properties": {"expression": {"type": "string", "description": "numbers and + - * / ** % only"}},
                      "required": ["expression"], "additionalProperties": False}},
    {"name": "convert_units", "description": "Convert a value between units: kg/lb, km/mi, cm/in, c/f (temperature).",
     "strict": True,
     "input_schema": {"type": "object", "properties": {"value": {"type": "number"}, "from_unit": {"type": "string", "enum": UNITS},
                                                       "to_unit": {"type": "string", "enum": UNITS}},
                      "required": ["value", "from_unit", "to_unit"], "additionalProperties": False}},
    {"name": "lookup_order", "description": "Look up a store order by id (like A1002). Returns status, items, total in USD, weight in kg and carrier.",
     "strict": True,
     "input_schema": {"type": "object", "properties": {"order_id": {"type": "string"}},
                      "required": ["order_id"], "additionalProperties": False}},
]


class ToolServer:
    """MCP-style server: it advertises tools (list_tools) and executes them (call_tool).
    A real MCP server does the same over JSON-RPC (stdio or HTTP), so any MCP client can use it."""

    def __init__(self, tools, functions):
        self.tools, self.functions = tools, functions

    def list_tools(self):
        return [dict(t) for t in self.tools]

    def call_tool(self, name, args):
        if name not in self.functions:
            return {"content": f"unknown tool {name}", "is_error": True}
        try:
            return {"content": self.functions[name](**args), "is_error": False}
        except Exception as e:      # errors go back to the model as data, so it can recover
            return {"content": f"{type(e).__name__}: {e}", "is_error": True}


SERVER = ToolServer(TOOLS, {"calculator": calculator, "convert_units": convert_units, "lookup_order": lookup_order})
SYSTEM = ("You are a support agent for an online store. Use lookup_order for order facts, convert_units for units "
          "and calculator for any arithmetic. Answer in 2-3 sentences with the numbers the tools returned.")


# ---------- an offline stand-in for the model ----------

def block(**kw):
    return SimpleNamespace(**kw)


def fake_create(messages):
    """Scripted policy that emits tool_use blocks like a model would. Not intelligent, just enough to drive the loop."""
    task = messages[0]["content"]
    results = {}
    for m in messages:
        if m["role"] == "user" and isinstance(m["content"], list):
            for r in m["content"]:
                results[r["tool_use_id"]] = r
    turn = sum(m["role"] == "assistant" for m in messages)
    ids = re.findall(r"[A-Z]\d{4}", task)
    if turn == 0 and ids:
        return block(stop_reason="tool_use", content=[block(type="text", text="Let me look up the order."),
                     block(type="tool_use", id="toolu_1", name="lookup_order", input={"order_id": ids[0]})])
    first = results.get("toolu_1")
    if turn == 1 and first and not first.get("is_error"):
        order = json.loads(first["content"])
        calls = []
        if "pound" in task.lower():
            calls.append(block(type="tool_use", id="toolu_2", name="convert_units", input={"value": order["weight_kg"], "from_unit": "kg", "to_unit": "lb"}))
        pct = re.search(r"(\d+)\s*%", task)
        if pct:
            calls.append(block(type="tool_use", id="toolu_3", name="calculator", input={"expression": f"{order['total_usd']} * (1 - {pct.group(1)} / 100)"}))
        if calls:   # two tool calls in one turn: the loop must return both results in ONE user message
            return block(stop_reason="tool_use", content=calls)
    if first and first.get("is_error"):
        text = "I couldn't find that order (" + first["content"] + "). Could you check the id on your confirmation email?"
    else:
        order = json.loads(first["content"]) if first else {}
        text = f"Order {ids[0] if ids else '?'} is {order.get('status', 'unknown')} with {order.get('carrier', '?')}."
        if "toolu_2" in results:
            text += f" It weighs {results['toolu_2']['content']}."
        if "toolu_3" in results:
            text += f" With the discount the total would be {results['toolu_3']['content']} USD."
    return block(stop_reason="end_turn", content=[block(type="text", text=text)])


# ---------- the agent loop ----------

def run_agent(task, server=SERVER, max_turns=8, verbose=True):
    tools = server.list_tools()
    messages = [{"role": "user", "content": task}]
    for _ in range(max_turns):                # a budget: never loop forever
        if OFFLINE:
            resp = fake_create(messages)
        else:
            resp = create(messages, system=SYSTEM, tools=tools, max_tokens=4000, effort="low")
        messages.append({"role": "assistant", "content": resp.content})   # FULL content, thinking blocks included
        if resp.stop_reason != "tool_use":
            break
        results = []
        for b in resp.content:
            if b.type == "tool_use":
                out = server.call_tool(b.name, b.input)
                if verbose:
                    print(f"   tool {b.name}({json.dumps(b.input)}) -> {out['content'][:80]}{'  [error]' if out['is_error'] else ''}")
                results.append({"type": "tool_result", "tool_use_id": b.id, "content": out["content"], "is_error": out["is_error"]})
        messages.append({"role": "user", "content": results})        # ALL results in ONE user message
    return text_of(resp), messages


if __name__ == "__main__":
    print("mode:", "OFFLINE scripted model" if OFFLINE else "Claude with client-side tools")
    print("server advertises:", [t["name"] for t in SERVER.list_tools()])
    print("calculator('2 ** 10 / 4') =", calculator("2 ** 10 / 4"))
    print("blocked:", SERVER.call_tool("calculator", {"expression": "__import__('os').system('ls')"}))
    for task in ["Where is order A1002, how heavy is it in pounds, and what would it cost with 15% off?",
                 "What's the status of order Z9999?"]:
        print("\nTASK:", task)
        answer, msgs = run_agent(task)
        print("ANSWER:", answer)
        print(f"   ({len(msgs)} messages in the conversation)")
`},
lab: {file: "week10/lab_tools.py", run: "python -m week10.lab_tools",
task: "Add a refund tool and wrap the tool server with production guards: an allowlist, human approval for risky tools, idempotent retries and timeouts. Then expose tools through a real MCP server object.",
steps: ["Run the script. It stops at the first assert because a 899 dollar refund went through without approval.", "Write the JSON-schema definitions for <code>issue_refund</code> and <code>slow_report</code> (TODO 1).", "Complete <code>GuardedServer.call_tool</code>: allowlist first, then the idempotency cache, then approval for risky tools, then a timeout.", "Rerun until 'guard checks passed' prints and the agent still answers through the guarded server.", "Read the MCP section of the output: the same tools listed and called through an MCP server object."],
done: "the large refund returns an is_error asking for approval, the repeated small refund returns the cached result without a second approval, convert_units is refused as not allowed, slow_report times out in about 1 second, and the MCP server lists its tools.",
code: String.raw`
"""Lab: make tool execution safe (allowlist, human approval, timeouts, idempotency), then serve tools over MCP."""
import asyncio
import json
import time
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout

from week10.tool_agent import ORDERS, SERVER, TOOLS, ToolServer, calculator, lookup_order, run_agent

REFUNDS = {}   # order id -> refund record (a stand-in for the payments system)


def issue_refund(order_id, amount_usd, reason):
    order = ORDERS[order_id]
    if amount_usd > order["total_usd"]:
        raise ValueError("refund is larger than the order total")
    REFUNDS[order_id] = {"amount_usd": amount_usd, "reason": reason, "refund_id": "R-" + order_id}
    return json.dumps(REFUNDS[order_id])


def slow_report():
    time.sleep(3)              # pretend this hits a slow warehouse API
    return "report ready"


# TODO 1: write the JSON-schema tool definitions for issue_refund (order_id string, amount_usd number,
#         reason string; all required; additionalProperties False; strict True) and slow_report (no inputs).
REFUND_TOOL = {"name": "issue_refund", "description": "", "input_schema": {"type": "object", "properties": {}}}
SLOW_TOOL = {"name": "slow_report", "description": "", "input_schema": {"type": "object", "properties": {}}}


class GuardedServer(ToolServer):
    def __init__(self, tools, functions, allow, risky, approve, timeout_s=1.0):
        super().__init__(tools, functions)
        self.allow, self.risky, self.approve, self.timeout_s = set(allow), set(risky), approve, timeout_s
        self.done = {}         # idempotency cache: (name, arguments) -> earlier result

    def list_tools(self):
        return [t for t in super().list_tools() if t["name"] in self.allow]

    def call_tool(self, name, args):
        # TODO 2a: if the tool is not in self.allow, return {"content": "... not allowed for this agent", "is_error": True}
        # TODO 3:  idempotency: if (name, json.dumps(args, sort_keys=True)) is in self.done, return that earlier
        #          result instead of running the tool again (a retried refund must not pay twice).
        # TODO 2b: if the tool is risky and self.approve(name, args) is False, return an is_error result
        #          whose content says it "needs human approval"
        # TODO 4:  run the tool in a ThreadPoolExecutor and wait at most self.timeout_s seconds; on timeout
        #          return an is_error result ("timed out after 1.0 s"). Store successful results in self.done.
        return super().call_tool(name, args)


def build_mcp_server():
    """Extra: expose the same tools through a real MCP server object (pip install mcp)."""
    try:
        from mcp.server.mcpserver import MCPServer                  # mcp 2.x
    except ImportError:
        try:
            from mcp.server.fastmcp import FastMCP as MCPServer     # mcp 1.x
        except ImportError:
            return None
    server = MCPServer("lumen-store")

    @server.tool()
    def lookup(order_id: str) -> str:
        """Look up a store order by id (like A1002)."""
        return lookup_order(order_id)

    @server.tool()
    def calc(expression: str) -> str:
        """Evaluate an arithmetic expression."""
        return calculator(expression)

    return server


if __name__ == "__main__":
    asked = []
    approve = lambda name, args: asked.append((name, args)) or args.get("amount_usd", 0) <= 50   # auto-approve small refunds only
    functions = dict(SERVER.functions, issue_refund=issue_refund, slow_report=slow_report)
    server = GuardedServer(TOOLS + [REFUND_TOOL, SLOW_TOOL], functions,
                           allow=["lookup_order", "calculator", "issue_refund", "slow_report"], risky=["issue_refund"], approve=approve)

    print("agent can see:", [t["name"] for t in server.list_tools()])
    big = server.call_tool("issue_refund", {"order_id": "A1003", "amount_usd": 899.0, "reason": "damaged"})
    print("large refund ->", big)
    assert big["is_error"] and "approval" in big["content"], "TODO 2b: risky tools need approval"
    small = {"order_id": "A1001", "amount_usd": 12.0, "reason": "late delivery"}
    first, again = server.call_tool("issue_refund", small), server.call_tool("issue_refund", small)
    print("small refund twice ->", first["content"], "|", again["content"])
    assert first == again and len(asked) == 2, "TODO 3: the retry should reuse the first result without asking again"
    blocked = server.call_tool("convert_units", {"value": 1, "from_unit": "kg", "to_unit": "lb"})
    print("not allowlisted ->", blocked)
    assert blocked["is_error"] and "not allowed" in blocked["content"], "TODO 2a: enforce the allowlist"
    t = time.perf_counter()
    slow = server.call_tool("slow_report", {})
    print(f"slow tool -> {slow} after {time.perf_counter() - t:.1f} s")
    assert slow["is_error"] and time.perf_counter() - t < 2, "TODO 4: time out slow tools"
    assert REFUND_TOOL["input_schema"].get("required") == ["order_id", "amount_usd", "reason"], "TODO 1: refund schema"
    print("guard checks passed")

    answer, _ = run_agent("Where is order A1001?", server=server, verbose=True)
    print("agent through the guarded server:", answer)

    mcp_server = build_mcp_server()
    if mcp_server is None:
        print("\n(mcp not installed: pip install mcp to try the MCP server)")
    else:
        tools = asyncio.run(mcp_server.list_tools())
        schema = lambda x: getattr(x, "input_schema", None) or getattr(x, "inputSchema", {})   # 2.x vs 1.x name
        print("\nMCP server tools:", [(x.name, sorted(schema(x)["properties"])) for x in tools])
        print("MCP call_tool:", str(asyncio.run(mcp_server.call_tool("lookup", {"order_id": "A1002"})))[:160])
        # To serve it to any MCP client (Claude Desktop, an IDE...) over stdio: mcp_server.run()
`},
takeaways: ["The model only requests a tool; your code runs it and returns a tool_result matched by tool_use_id, all results in one message.", "Tool names, descriptions and strict JSON schemas are prompts: make them specific, few and non-overlapping.", "Return errors as is_error results and keep outputs concise so the model can recover and reason.", "Guard execution with sandboxing, allowlists, timeouts, idempotency and human approval for risky actions.", "MCP servers expose tools, resources and prompts once, for any MCP client to use."],
mcq: [
{q: "The model returns two tool_use blocks in one response. How should you send the results?", a: ["Two separate user messages, one per result", "One user message containing both tool_result blocks", "Only the first result; the model will ask again", "As plain text in the system prompt"], c: 1, why: "All tool results for a turn go back together in a single user message, each matched by tool_use_id."},
{q: "lookup_order raises 'no order with id Z9999'. What should the loop do?", a: ["Crash and show a stack trace", "Silently drop the tool call", "Return a tool_result with is_error true and a helpful message", "Retry the same call forever"], c: 2, why: "Errors returned as data let the model recover, for example by asking the customer to check the id."},
{q: "A refund call timed out and the agent retried it. What prevents a double refund?", a: ["An idempotency key or a cache keyed on the tool and its arguments", "A longer system prompt", "A larger max_tokens", "Removing the timeout"], c: 0, why: "Idempotency makes a repeated request return the original result instead of performing the action again."}
]
},
{
id: "10.3", title: "Multi-step agents: ReAct, Reflexion, ReWOO and tree search", mins: 75, kicker: "planning autonomy, ReAct, Reflexion, ReWOO, LATS and tree search, budgets, web search and pause_turn",
focus: "picking a planning strategy and a budget for an agent that answers questions from the web",
pip: [],
deps: ["10.2"],
runNote: "Offline it runs a ReAct loop over a 4-page mini web. With an API key it uses Claude's server-side web search, which must be enabled for your organisation.",
body: `<p>A single tool call answers "where is order A1002?". Questions like "which of these three suppliers ships fastest to Canada, and what would it cost?" need several searches, each chosen after reading the last result. That is a <b>multi-step agent</b>, and the main design choice is how much planning the model does before acting.</p>
<h4>Planning autonomy</h4>
<ul><li><b>Plan-then-execute:</b> write the whole plan first, then run it. Cheap and easy to review, but brittle when a step returns something unexpected.</li>
<li><b>Interleaved:</b> decide one step, act, observe, decide again. Adapts to surprises at the cost of one model call per step.</li></ul>
<h4>ReAct: reason, act, observe</h4>
<p><b>ReAct</b> interleaves a <i>Thought</i> (what do I know, what do I need), an <i>Action</i> (a tool call such as <code>search[MCP introduced]</code>) and an <i>Observation</i> (the tool's result appended to the context). The loop ends with a <code>finish[answer]</code> action. Modern tool calling is ReAct with structured actions: the thinking happens in the model's reasoning, the action is a <code>tool_use</code> block, and the observation is a <code>tool_result</code>. The offline demo prints the text form so you can see each step.</p>
<h4>Reflexion: learning across attempts</h4>
<p><b>Reflexion</b> adds memory between attempts. When an attempt fails a check (a unit test, a judge, a missing citation), the agent writes a short self-reflection ("I trusted the first search result without checking the date") and stores it. The next attempt starts with those reflections in its prompt. No weights change; the agent improves through text memory. It works when failure can be detected automatically.</p>
<h4>ReWOO: plan all tool calls up front</h4>
<p><b>ReWOO</b> (reasoning without observation) uses three roles. The <b>planner</b> writes every step at once with placeholders: <code>#E1 = lookup_order[A1002]</code>, <code>#E2 = shipping_fee[#E1.carrier]</code>. The <b>worker</b> runs the tools in order, filling each placeholder with earlier evidence, with no model calls. The <b>solver</b> reads the plan and evidence and writes the answer. That's two model calls in total instead of one per step, which saves tokens and latency, but the plan can't change if a step fails. You build it in the lab.</p>
<h4>Tree search for agents</h4>
<p>Instead of committing to one path, <b>tree search</b> explores several. At each step the model proposes a few candidate actions, a value function (often the model itself, or a test) scores the resulting states, and the search expands the most promising branches, backing up from dead ends. Language agent tree search (LATS) applies Monte Carlo tree search this way: select a promising node, expand it with sampled actions, evaluate, and back the scores up the tree. It finds better answers on hard problems such as coding and puzzles, at several times the cost, so use it when you can score partial progress.</p>
<div class="tablewrap"><table><thead><tr><th>Strategy</th><th>Model calls</th><th>Adapts mid-task</th><th>Best for</th></tr></thead><tbody>
<tr><td>ReAct</td><td>One per step</td><td>Yes</td><td>Open-ended search and tool use</td></tr>
<tr><td>ReWOO</td><td>Two</td><td>No</td><td>Predictable multi-tool lookups</td></tr>
<tr><td>Reflexion</td><td>Per attempt, plus reflections</td><td>Across attempts</td><td>Tasks with automatic checks</td></tr>
<tr><td>Tree search</td><td>Many</td><td>Yes, by branching</td><td>Hard problems with a scorer</td></tr></tbody></table></div>
<h4>Budgets and stopping</h4>
<p>Every agent needs explicit limits: maximum steps, maximum tool calls (the web search tool's <code>max_uses</code>), a token or cost budget and a wall-clock timeout. Stop when the model gives a final answer, when the budget runs out (return the best partial answer and say so), or when it repeats the same action. Log each step so you can see why it stopped.</p>
<h4>Ask-the-web with server-side search</h4>
<p>The demo adds <code>{"type": "web_search_20260209", "name": "web_search", "max_uses": 5}</code> to <code>tools</code>. The search runs on Anthropic's side, so results arrive in the same response as <code>server_tool_use</code> and <code>web_search_tool_result</code> blocks, and the answer's text blocks carry citations with URLs. A long turn may end with <code>stop_reason == "pause_turn"</code>: append the assistant content and call again to let it continue. The demo checks that every cited URL appeared in the search results.</p>`,
example: ["A pricing analyst's research agent", `A travel company wanted weekly answers to questions like "what do the three biggest rail operators charge for a bike on board, and has it changed?". A ReWOO plan broke whenever one operator moved its fare page. A ReAct agent with web search adapted, but sometimes stopped after one source. The final design was ReAct with a budget of 8 searches, a rule that every number needs a cited URL from the results, and a Reflexion-style note saved when the weekly reviewer rejected an answer. Rejections dropped from about one in four to one in twenty within a month.`],
diagram: {title: "A multi-step agent", caption: "The agent thinks, acts with a tool such as web search, and observes the result, looping within a budget. Reflections from failed attempts feed the next try, and the final answer cites sources it actually saw.",
  cols: [[["q", "Question", "needs several steps", "user"]], [["think", "Think / plan", "next step or full plan", "core"]], [["act", "Act", "tool call", "core"], ["web", "Web search", "server-side tool", "ext"]], [["obs", "Observe", "results into context", "core"]], [["ans", "Answer + sources", "cited URLs", "core"], ["mem", "Reflection memory", "lessons from failures", "store"]]],
  edges: [["q", "think"], ["think", "act", "action"], ["act", "web"], ["web", "obs", "results"], ["obs", "think", "loop within budget", "dash"], ["obs", "ans", "finish", "hot"], ["obs", "mem", "failed check"], ["mem", "think", "next attempt", "dash"]]},
demo: {file: "week10/web_agent.py", run: "python -m week10.web_agent", what: "An ask-the-web agent for a two-hop question. Online, Claude uses the server-side web_search tool, the script continues any pause_turn, and prints the searches made and which cited URLs came from the results. Offline, a ReAct loop with Thought, Action and Observation lines runs over a 4-page mini web with a calculator, under a step budget.",
code: String.raw`
"""Demo: an ask-the-web agent that searches, reasons over results and cites its sources.

Online: Claude with the server-side web_search tool. The search runs on Anthropic's side and the
results come back in the same response; long turns can stop with "pause_turn", which we continue.
Offline: a ReAct loop (Thought -> Action -> Observation) over a tiny embedded "web", with a
scripted policy standing in for the model, so you can see every step.
"""
import re

from common.llm import OFFLINE, create, text_of
from week10.tool_agent import calculator

QUESTION = ("In what year was the paper that introduced the transformer published, and how many years later "
            "was the Model Context Protocol introduced? Cite your sources.")

SYSTEM = ("You answer questions using web search. Search as many times as you need (but no more), prefer primary "
          "sources, and end with a 'Sources:' list of the URLs you relied on. If sources disagree, say so.")

WEB_SEARCH = {"type": "web_search_20260209", "name": "web_search", "max_uses": 5}

# ---------- online: server-side web search ----------


def ask_web(question, max_continues=4):
    messages = [{"role": "user", "content": question}]
    for _ in range(max_continues + 1):
        resp = create(messages, system=SYSTEM, tools=[WEB_SEARCH], max_tokens=8000, effort="medium")
        messages.append({"role": "assistant", "content": resp.content})
        if resp.stop_reason != "pause_turn":       # pause_turn: the server paused a long turn; send it back to continue
            break
        print("   (pause_turn: continuing)")
    queries, result_urls, cited = [], [], []
    for m in messages:
        if m["role"] != "assistant":
            continue
        for b in m["content"]:
            if b.type == "server_tool_use":
                queries.append(b.input.get("query"))
            elif b.type == "web_search_tool_result" and isinstance(b.content, list):
                result_urls += [r.url for r in b.content]
            elif b.type == "text":
                cited += [c.url for c in (getattr(b, "citations", None) or []) if getattr(c, "url", None)]
    return text_of(resp), queries, result_urls, cited


# ---------- offline: ReAct over a mini web ----------

MINI_WEB = {
    "https://mini-web.example/attention-paper": ("Attention Is All You Need",
        "Attention Is All You Need is a 2017 research paper by eight researchers at Google. It introduced the transformer, an architecture built on self-attention."),
    "https://mini-web.example/transformers-film": ("Transformers (film)",
        "Transformers is a 2007 science fiction action film based on the toy line."),
    "https://mini-web.example/mcp": ("Model Context Protocol",
        "The Model Context Protocol (MCP) is an open standard introduced by Anthropic in November 2024 for connecting AI applications to tools and data sources."),
    "https://mini-web.example/bert": ("BERT (language model)",
        "BERT is an encoder-only transformer model released by Google in 2018."),
}


def mini_search(query, k=2):
    q = set(re.findall(r"[a-z]+", query.lower()))
    scored = sorted(MINI_WEB.items(), key=lambda kv: -len(q & set(re.findall(r"[a-z]+", (kv[1][0] + " " + kv[1][1]).lower()))))
    return "\n".join(f"[{url}] {title}: {text}" for url, (title, text) in scored[:k])


TOOLS = {"search": mini_search, "calculate": calculator}


def fake_policy(question, transcript):
    """Stands in for the model: reads the transcript and writes the next Thought and Action."""
    obs = re.findall(r"Observation: (.*?)(?=\nThought:|\Z)", transcript, re.S)
    found = {}
    for o in obs:
        for url, text in re.findall(r"\[(\S+)\] [^:]+: ([^\n]+)", o):
            if "transformer" in text and "paper" in text:
                found["paper"] = (re.search(r"(19|20)\d\d", text).group(0), url)
            if "Model Context Protocol" in text:
                found["mcp"] = (re.search(r"(19|20)\d\d", text).group(0), url)
    diff = re.findall(r"Observation: (-?\d+)\s*$", transcript.strip())
    if "paper" not in found:
        return "Thought: I need the publication year of the paper that introduced the transformer.\nAction: search[transformer architecture paper year]"
    if "mcp" not in found:
        return f"Thought: The paper is from {found['paper'][0]}. Now I need when MCP was introduced.\nAction: search[Model Context Protocol introduced]"
    if not diff:
        return f"Thought: MCP was introduced in {found['mcp'][0]}. I will compute the gap with the calculator.\nAction: calculate[{found['mcp'][0]} - {found['paper'][0]}]"
    return (f"Thought: I have everything I need.\nAction: finish[The transformer paper was published in {found['paper'][0]} "
            f"({found['paper'][1]}), and MCP was introduced {diff[-1]} years later, in {found['mcp'][0]} ({found['mcp'][1]}).]")


def react(question, policy, tools, max_steps=6):
    transcript = "Question: " + question
    for step in range(max_steps):                  # budget: a hard cap on steps
        out = policy(question, transcript)
        transcript += "\n" + out
        print(out)
        m = re.search(r"Action: (\w+)\[(.*)\]\s*$", out, re.S)
        if not m:
            transcript += "\nObservation: could not parse an action; use name[input]"
            continue
        name, arg = m.group(1), m.group(2)
        if name == "finish":
            return arg, step + 1
        try:
            obs = tools[name](arg) if name in tools else f"unknown tool {name}"
        except Exception as e:
            obs = f"error: {e}"
        print("Observation:", obs.replace("\n", "\n             "))
        transcript += "\nObservation: " + obs
    return "Stopped: step budget used up before an answer.", max_steps


if __name__ == "__main__":
    print("QUESTION:", QUESTION, "\n")
    if OFFLINE:
        print("mode: OFFLINE ReAct over a 4-page mini web (scripted policy instead of a model)\n")
        answer, steps = react(QUESTION, fake_policy, TOOLS)
        urls = re.findall(r"https://\S+?(?=\))", answer)
        print(f"\nANSWER after {steps} steps: {answer}")
        print("cited URLs all came from observations:", all(u in MINI_WEB for u in urls), urls)
    else:
        print("mode: Claude with server-side web search\n")
        answer, queries, result_urls, cited = ask_web(QUESTION)
        print("searches made:", queries)
        print(f"results returned: {len(result_urls)} URLs")
        print("\nANSWER:\n" + answer)
        print("\ncited URLs that appeared in the search results:", sorted(set(u for u in cited if u in result_urls)))
`},
lab: {file: "week10/lab_rewoo.py", run: "python -m week10.lab_rewoo",
task: "Implement ReWOO over local tools: parse the planner's #E steps, run them in a worker that substitutes earlier evidence (including JSON fields like #E1.carrier), and write the solver prompt, so a four-tool question takes exactly two model calls.",
steps: ["Run the script. It prints the plan and stops at the first assert because nothing was parsed.", "Complete <code>parse_plan</code> with a regular expression that captures the variable, tool and input of each step.", "Complete <code>substitute</code> so <code>#E1.total_usd</code> and <code>#E2</code> are replaced by earlier evidence.", "Complete <code>solve</code> so the solver sees each plan line with its evidence.", "Answer TODO 4: describe a question where ReWOO's fixed plan breaks but ReAct would recover."],
done: "the worker prints four tool calls ending in 127.42, the answer contains 127.42, the call counter shows 2 model calls and 4 tool calls, and the final 'done' line prints.",
code: String.raw`
"""Lab: ReWOO. Plan every tool call up front, run them without the model, then solve once.

A ReAct agent calls the model after every tool result. ReWOO calls it twice in total:
the PLANNER writes all steps with placeholders (#E1, #E2...), the WORKER runs the tools and
fills the placeholders, and the SOLVER writes the answer from the collected evidence.
"""
import json
import re

from common.llm import MODEL, OFFLINE, ask
from week10.tool_agent import calculator, lookup_order

SHIPPING_USD = {"UPS": 7.50, "FedEx": 9.00, "freight": 39.00}
FX = {("USD", "EUR"): 0.92, ("USD", "GBP"): 0.79}     # fixed demo rates, not live ones


def shipping_fee(carrier):
    return str(SHIPPING_USD[carrier.strip()])


def fx_rate(pair):
    a, b = [x.strip().upper() for x in pair.split(",")]
    return str(FX[(a, b)])


TOOLS = {"lookup_order": lookup_order, "shipping_fee": shipping_fee, "fx_rate": fx_rate, "calculator": calculator}
TOOL_HELP = """lookup_order[order id] -> JSON with status, items, total_usd, weight_kg, carrier
shipping_fee[carrier] -> shipping fee in USD
fx_rate[FROM,TO] -> exchange rate, e.g. fx_rate[USD,EUR]
calculator[expression] -> arithmetic result"""

PLANNER = """Make a plan to answer the question with these tools:
{tools}
Write one line per step, exactly in this form:
Plan: <why> #E<n> = <tool>[<input>]
Inputs may use earlier evidence: #E1 for a whole result, or #E1.field for a JSON field. Do not answer the question.

Question: {question}"""

CALLS = {"llm": 0, "tool": 0}


def llm(prompt):
    CALLS["llm"] += 1
    if OFFLINE:
        if prompt.startswith("Make a plan"):
            return ("Plan: get the order. #E1 = lookup_order[A1002]\n"
                    "Plan: get the fee for its carrier. #E2 = shipping_fee[#E1.carrier]\n"
                    "Plan: get the exchange rate. #E3 = fx_rate[USD,EUR]\n"
                    "Plan: convert the order total plus shipping. #E4 = calculator[(#E1.total_usd + #E2) * #E3]")
        found = re.findall(r"#E\d+ = (.*)", prompt)
        return "[offline solver] The answer is " + (found[-1].strip() + " EUR." if found else "unknown: no evidence given.")
    return ask(prompt, model=MODEL, max_tokens=1500, effort="low")


def parse_plan(text):
    """Return a list of (var, tool, raw_input) tuples, e.g. ("#E2", "shipping_fee", "#E1.carrier")."""
    # TODO 1: use re.findall with a pattern like r"(#E\d+)\s*=\s*(\w+)\[(.*)\]" on each line
    return []


def substitute(arg, evidence):
    """Replace #E1.field and #E1 in arg with values from evidence (a dict var -> result string)."""
    # TODO 2: first replace #En.field with json.loads(evidence["#En"])[field], then plain #En with evidence["#En"].
    #         Hint: re.sub(r"(#E\d+)\.(\w+)", lambda m: ..., arg). Replace longer variable names first.
    return arg


def worker(plan):
    evidence = {}
    for var, tool, raw in plan:
        CALLS["tool"] += 1
        try:
            arg = substitute(raw, evidence)
            evidence[var] = TOOLS[tool](arg.strip().strip('"'))
        except Exception as e:          # ReWOO cannot re-plan mid-way, so errors just become evidence
            arg, evidence[var] = raw, f"error: {type(e).__name__}: {e}"
        print(f"   {var} = {tool}[{arg}] -> {evidence[var][:70]}")
    return evidence


def solve(question, plan_text, evidence):
    # TODO 3: build the solver prompt: the question, then each plan line followed by its evidence
    #         ("#E1 = <result>"), then "Answer the question in one sentence using only this evidence."
    prompt = question
    return llm(prompt)


if __name__ == "__main__":
    question = "What is the total in EUR of order A1002 including its shipping fee?"
    plan_text = llm(PLANNER.format(tools=TOOL_HELP, question=question))
    print("PLAN:\n" + plan_text)
    plan = parse_plan(plan_text)
    print(f"\nparsed {len(plan)} steps; worker runs them with no model calls:")
    evidence = worker(plan)
    answer = solve(question, plan_text, evidence)
    print("\nANSWER:", answer)
    print("calls:", CALLS)

    expected = round((129.50 + 9.00) * 0.92, 2)
    assert len(plan) >= 3, "TODO 1: parse the plan steps (the offline plan has 4)"
    assert str(expected) in evidence.values(), f"TODO 2: substitution should let the calculator return {expected}"
    assert CALLS["llm"] == 2 and CALLS["tool"] == len(plan), "ReWOO uses exactly 2 model calls and one tool call per step"
    assert str(expected) in answer, "TODO 3: the solver needs the evidence in its prompt"
    print("done: ReWOO answered with 2 model calls; a ReAct loop would have needed about 5")
    # TODO 4: in a comment, describe a question where ReWOO's fixed plan breaks but ReAct recovers
    #         (hint: what if lookup_order returns an error, or the next step depends on what you find?).
`},
takeaways: ["Plan-then-execute is cheap and reviewable; interleaved planning adapts to surprises at one model call per step.", "ReAct loops Thought, Action and Observation; native tool calling is ReAct with structured actions.", "Reflexion stores self-reflections from failed attempts as text memory for the next attempt.", "ReWOO plans every tool call with placeholders, runs them without the model, then solves once: two model calls total.", "Tree search explores and scores several branches; every agent needs step, tool, cost and time budgets."],
mcq: [
{q: "A ReWOO plan has 5 tool steps. How many model calls does the whole run use?", a: ["5", "6", "2", "10"], c: 2, why: "One planner call and one solver call; the worker runs the 5 tools without the model."},
{q: "What distinguishes Reflexion from plain ReAct?", a: ["It never uses tools", "It stores self-reflections from failed attempts and reuses them on the next attempt", "It fine-tunes the model's weights after each attempt", "It plans all steps up front"], c: 1, why: "Reflexion improves through text memory across attempts; the weights don't change."},
{q: "The web search agent's response ends with stop_reason 'pause_turn'. What should your code do?", a: ["Treat it as an error and stop", "Delete the last message and retry", "Ask the user to rephrase", "Append the assistant content and call the API again so it continues"], c: 3, why: "pause_turn means the server paused a long turn; sending the content back lets the model resume."}
]
}
],
quiz: [
{q: "Which design is an agent rather than a workflow?", a: ["A fixed chain: extract, check, write", "A router that picks one of four prompts", "A loop where the model chooses tools and decides when it is done", "Three parallel reviews merged by code"], c: 2, why: "In an agent the model controls the sequence of steps; in a workflow your code does."},
{q: "What is the gate in prompt chaining?", a: ["A programmatic check between steps that stops or retries bad intermediate output", "The final answer", "An API key check", "A rate limiter"], c: 0, why: "Gates catch bad intermediate results before the next call builds on them."},
{q: "Three voters say SPAM, OK, OK. What does majority voting return, and why use different lenses per voter?", a: ["SPAM, because one vote is enough", "OK; different instructions make the votes less correlated", "Nothing, voting needs five", "OK; lenses make it faster"], c: 1, why: "The majority is OK. Identical prompts give near-identical answers; varied lenses make votes more independent."},
{q: "Which tool definition is best formatted?", a: ["name 'tool1', no description", "A long description listing every internal table", "A free-form input with no schema", "A specific name, a description of when to use it and what it returns, and a strict schema with required fields"], c: 3, why: "Descriptions and schemas are what the model reads to decide when and how to call a tool."},
{q: "Why should a calculator tool never call eval on the model's input?", a: ["Model-chosen input is untrusted and eval can run arbitrary code", "eval is too slow", "eval can't do division", "The API forbids it"], c: 0, why: "Text from users or web pages can steer the model into sending code; parse and allow only arithmetic."},
{q: "What does an MCP server expose to clients?", a: ["Only model weights", "Tools, resources and prompts over a standard protocol", "A vector database", "A web browser"], c: 1, why: "MCP standardises how applications discover and call tools and read resources and prompts from servers."},
{q: "When is ReWOO a worse choice than ReAct?", a: ["When tool calls are predictable", "When you want fewer model calls", "When the next step depends on what an earlier result reveals, or a step may fail", "When you need lower latency"], c: 2, why: "ReWOO fixes the plan up front, so it can't adapt to surprises; ReAct decides after each observation."},
{q: "Which set of limits belongs on a web research agent?", a: ["None, so it finds the best answer", "Only a max_tokens value", "A longer system prompt", "Maximum steps and searches, a cost or token budget, a timeout, and a stop on repeated actions"], c: 3, why: "Explicit budgets prevent loops and runaway cost, and force a best partial answer when time runs out."}
],
checkpoint: `You can trace all five workflow patterns, your guarded tool server refuses unapproved refunds, times out slow tools and never pays twice, your agent loop recovers from tool errors, your ReWOO agent answers a four-tool question with two model calls, and your web agent cites URLs it actually retrieved. Keep <code>week10/</code>: in week 11 these single agents become a team with memory, evaluation and safety guards.`
});
