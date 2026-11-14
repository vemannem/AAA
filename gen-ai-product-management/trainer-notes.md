# Generative AI in Product Management: trainer speaker notes

AAA Academy · the same scripts the course site reads aloud with "Listen to trainer".

Course site: https://aaa-learning.vercel.app/gen-ai-product-management/

### Course overview

Welcome to Generative AI in Product Management. We will learn by developing SkillForge Academy, a fictional Data Science and Generative AI course business and LMS.

Work through six modules in order: define the product, investigate the market, understand learners, plan delivery, analyze evidence, and make strategic decisions. Each module gives you an artifact to review.

At any step, choose Listen to trainer for an explanation, example, reflection question, and next action. Use the transcript if you prefer reading, and pause whenever you need time to practice.

The voice uses your browser's available speech service. You control playback and speed. Begin with module one, or open the worked course case to see how the artifacts connect.

## Module 01: Foundations & product definition

### Slide 1: A new partner for product thinking

Welcome. In this module, we will use generative AI to make product work more thoughtful and efficient. Start by separating three responsibilities: the model can propose and organize, evidence tells us what is credible, and the product owner decides what to do.

Our example is SkillForge Academy, an eight-week Data Science and Generative AI course. AI can draft an offer or compare course ideas. It cannot tell us that real learners will pay unless we collect that evidence.

Pause and name one decision you own today. What information would help you make it, and what would still require your judgment?

Next, we will distinguish recognizing a pattern from generating a possible response.

### Slide 2: Recognition and generation

Consider what different AI capabilities actually do. A classification model might assign a category to an existing input. A generative model produces a possible output from patterns and context. A real product can use both, so this is a practical distinction rather than a strict boundary.

For SkillForge, classifying support requests could help route learner problems. Generating a first draft of a lesson explanation is a different job. The first needs accurate categories; the second also needs subject-matter review.

Which of your tasks needs prediction, and which needs content generation? Do not choose a tool simply because both are called AI.

Now let us look at training, inference, and why a fluent answer can still be wrong.

### Slide 3: Training → inference → output

Training is when a model learns statistical relationships from selected data. Inference is when that trained model uses the available context to generate a response. A chat tool may also retrieve sources or run calculations, but those are additional capabilities, not something we should assume.

Imagine asking for the latest course pricing. A model without current source access may produce a plausible old price. For SkillForge's market analysis, we need the actual dated competitor page, and we need to confirm its region and pricing basis.

Before your next prompt, check: can this tool access the files and sources the question requires?

Next, we will turn that awareness into the structure of a useful prompt.

### Slide 4: Seven ingredients of a useful prompt

A useful prompt makes the work inspectable. State the task, relevant context, perspective, output format, examples where helpful, tone, and constraints. These ingredients do not need to be long. Their purpose is to reduce ambiguity about what a good answer should contain.

Compare 'suggest a course' with 'propose an eight-week course for working analysts who already know basic Python and SQL, with a reviewed capstone and a small delivery team.' The second gives us something we can evaluate against a specific learner and constraint.

Pick one vague request you have used. Add the user, intended outcome, and one boundary. What changed in the response?

We will next choose tools based on the job they can perform.

### Slide 5: Choose a tool by the task

Choose an AI tool by testing the workflow you need. Can it read your workbook? Can it show calculations? Can it create a prototype, and can your organization use it for the data involved? Compare capabilities and practical constraints rather than relying on a permanent ranking of brands.

For SkillForge, one task may need report synthesis and another may need interactive code. We can use different tools while keeping the approved product definition and research consistent.

Name the artifact you need next. What capability is essential, and what would be merely convenient?

With a suitable tool selected, our next step is to iterate and verify the result.

### Slide 6: Draft → check → improve

Treat the first response as a draft with explicit review criteria. Check factual claims, calculations, assumptions, and counterexamples. Then add the product knowledge the model did not have. Iteration is useful when each revision resolves a real gap, not when it only sounds more polished.

If an AI draft says SkillForge has proven demand because AI skills are popular, challenge that sentence. A market signal can justify an experiment; it cannot substitute for evidence that this audience values this offer at this price.

Find one strong-sounding claim in your draft. Can you trace it to evidence, or should it be labeled an assumption?

We will now introduce the product case that you will develop across the course.

### Slide 7: Meet SkillForge Academy

SkillForge Academy is our fictional product: a focused, paid Data Science and Generative AI program delivered through an LMS. The initial learner already knows basic Python and SQL. We are proposing an eight-week path, not promising professional mastery or employment.

The example has a thirty-seat pilot hypothesis and reviewed projects. Keeping it small lets us test learning value, feedback capacity, and commercial assumptions together before building a broad platform.

What would make a learner choose this course over an established catalog or free self-study? Write your answer as a hypothesis, not a fact.

Next, we will capture the product in a short requirements document.

### Slide 8: Your first artifact: the PRD

A one-page PRD should make the important questions visible. Describe the problem, audience, evidence, scope, non-goals, outcome measures, and next validation step. For a course product, include the learning promise, prerequisites, assessment approach, and the LMS features needed to deliver it.

Use the supplied SkillForge PRD as a worked example. Notice that its price and success targets are proposed. The document does not turn them into observed business results.

Before continuing, can someone read your PRD and tell what remains uncertain and what is deliberately outside the MVP?

Use the prompts below to draft your PRD. Then complete the reflection and knowledge check before starting market research.

### Practice: From vague idea to a testable brief

This is the practice activity for module 1: from vague idea to a testable brief.

Draft SkillForge Academy's course PRD. Separate learner outcomes, LMS scope, demand evidence and revenue assumptions.

Step 1. Write the problem without naming a feature.

Step 2. Use prompts 01–02 and compare assumptions.

Step 3. Run prompt 03 in your chosen AI tool with a template.

Step 4. Record one fact, three assumptions and one validation experiment.

Pause the voice while you do the work. Save a reflection that states what you checked, what changed, and what is still uncertain. Continue when you have an artifact or a clear next validation step.

### Knowledge check: Foundations

Before finishing module 1, use these questions to check your understanding. Choose the best answer from the evidence and reasoning you learned, not from how confident an option sounds.

Submit all three answers to see explanations. If you miss a question, return to the relevant concept and explain why the better answer fits. A score alone is less useful than correcting the reasoning.

This is an activity checkpoint. The trainer will not select or submit answers for you. When you are ready, pause the audio and complete the knowledge check.

### Prompt 01: Start with a simple prompt

Let us work through prompt 1: start with a simple prompt.

Use this deliberately broad prompt to notice what an AI tool has to invent when context is missing.

For SkillForge, compare its response with the specific audience, prerequisites, and eight-week boundary. Record the assumptions before refining the request.

Your task is to identify what was missing, rather than accepting the first concept as a product plan.

Before you run it, prepare a one-sentence product idea. Your review should produce an intentionally rough starting point.

### Prompt 02: Add role, context and constraints

Let us work through prompt 2: add role, context and constraints.

Now add context that changes the decision: the learner, desired outcome, delivery format, and constraints.

Compare the three course concepts against the same criteria. Ask which difference matters to a real learner and which would require extra production or support.

Choose one concept as a hypothesis and explain why it deserves a test.

Before you run it, prepare product, audience, outcome, tone and constraints. Your review should produce three comparable concepts with trade-offs.

### Prompt 03: Draft a one-page PRD

Let us work through prompt 3: draft a one-page PRD.

Attach the preferred template and current evidence before requesting a PRD. The document should expose uncertainty, not fill every gap with confident prose.

For SkillForge, separate the learning promise from the portal features needed to deliver it. Include prerequisites, assessments, costs, and non-goals.

Review one claim, one metric, and one scope boundary before you use the draft.

Before you run it, prepare product brief, approved research and preferred PRD template. Your review should produce one-page PRD and a short assumptions list.

### Prompt 04: Set reusable project context

Let us work through prompt 4: set reusable project context.

Project context reduces repetition only when the tool actually has the right files and instructions.

Keep the approved SkillForge PRD, curriculum version, research, and decision log available. Ask the tool to identify conflicts rather than quietly choosing between documents.

Confirm the current version of one source before relying on a project-wide answer.

Before you run it, prepare current PRD, research, constraints and decision log. Your review should produce reusable project instructions.

## Module 02: Market research & competitive insight

### Slide 1: Research for a decision

Market research should begin with a decision. Are we choosing an audience, testing a course proposition, or deciding whether to invest in content production? Once the decision is clear, we can choose the sources and comparisons that would change our direction.

For SkillForge, our initial question is whether a focused analyst course with reviewed projects is worth testing. We are not trying to prove that everyone interested in AI belongs in our target market.

Write the decision your research needs to inform, and name one finding that would make you change your plan.

Next, we will use AI to broaden the research without lowering the evidence standard.

### Slide 2: Scale, speed and scrutiny

AI can help process more material quickly, but speed and scale do not guarantee accurate conclusions. We still need to check definitions, publication dates, source quality, and contradictions. A confident summary can hide uncertainty if we do not ask for it.

When comparing education reports, retain each report's population. Employer expectations, platform enrollments, and actual purchases are different signals. They should not be combined into a single invented market-size number.

Which number in your research would be most damaging if it were wrong? Check that one directly in its source.

Now we will combine broad signals with focused conversations.

### Slide 3: Combine breadth with depth

Think of research breadth and depth as complementary. AI-assisted synthesis can identify recurring themes across many documents. Interviews and observation help us understand the situations behind those patterns. Product judgment connects both to a practical decision.

Suppose platform reports show interest in applied AI. We still need to ask working analysts what they tried to learn, what stopped them, and what feedback they would value. That gives us a more useful course proposition than adding every trending topic.

What question can a report answer well, and what question needs a real learner conversation?

Next, we will map the alternatives learners can choose today.

### Slide 4: Competitors include the status quo

A competitor is any meaningful way the user can solve the job. Include direct course providers, different learning formats, free self-study, and the option of doing nothing. Compare the job served, learner level, learning evidence, support, and commercial model.

For SkillForge, IBM on Coursera, DataCamp, and relevant specialist AI courses are useful comparisons. Free documentation may also be a strong alternative. A larger catalog is not automatically the advantage our small pilot should copy.

What does your target learner currently use, and what would have to improve enough for them to switch?

We will next organize the sources into an evidence map.

### Slide 5: Build an education evidence map

Different sources support different claims. Employer research can describe expected skills. Occupational projections describe a particular labor market and time horizon. Learning-platform reports describe behavior within their own populations. Course pages describe the current offer, not necessarily its impact.

The SkillForge case links these types separately. Its source list is a starting point for verification, not a claim that the business has been validated.

Choose one source and write both what it supports and what it cannot establish. That second sentence is often where better product thinking begins.

Next, we will distinguish observed statistics from forecasts.

### Slide 6: Observed data ≠ future forecast

When a number enters your analysis, keep its meaning attached. Preserve units, geography, population, observation year, and forecast horizon. Compare year-over-year changes only when the definitions and methods are sufficiently comparable.

For SkillForge, a projected change in U.S. employment is not the same measure as course enrollments on a global platform. Neither is the conversion rate of our proposed pilot.

Look at two figures you were about to compare. Are their denominators and periods compatible? If not, keep them separate and explain why.

We will now turn research findings into experiments.

### Slide 7: Research → implication → experiment

A useful insight has three parts: a finding, a reason it matters to the target user, and a testable implication. Avoid jumping directly from a market trend to a committed feature or revenue claim.

If analysts value practical learning, we might test a sample project with a clear rubric. The experiment should tell us whether the task fits their needs and whether feedback affects their decision, rather than merely asking whether they like the idea.

What is the smallest test that would make your most important research implication more credible?

Next, we will bring reviewed findings back into the product definition.

### Slide 8: Update the product definition

Updating a PRD is a controlled change, not a rewrite that forgets earlier decisions. Preserve the structure and show what changed, why, and which evidence supports it. Keep unresolved choices visible.

For SkillForge, research might justify clearer prerequisites or a narrower capstone. It does not justify silently expanding into enterprise reporting or a large course marketplace.

Review one proposed PRD change. Is it supported by evidence, a necessary constraint, or simply a new suggestion? Label it accordingly.

Use the research prompts below, verify sources, and record the change you would actually approve.

### Practice: Build an evidence-backed market brief

This is the practice activity for module 2: build an evidence-backed market brief.

Use the education sources and official competitor pages. Produce a market brief, positioning hypothesis and controlled PRD update for SkillForge Academy.

Step 1. State a decision and source scope.

Step 2. Use prompt 05 for direct and indirect alternatives.

Step 3. Use prompt 06; check three source claims manually.

Step 4. Use prompt 07 and review the change log.

Pause the voice while you do the work. Save a reflection that states what you checked, what changed, and what is still uncertain. Continue when you have an artifact or a clear next validation step.

### Knowledge check: Market research

Before finishing module 2, use these questions to check your understanding. Choose the best answer from the evidence and reasoning you learned, not from how confident an option sounds.

Submit all three answers to see explanations. If you miss a question, return to the relevant concept and explain why the better answer fits. A score alone is less useful than correcting the reasoning.

This is an activity checkpoint. The trainer will not select or submit answers for you. When you are ready, pause the audio and complete the knowledge check.

### Prompt 05: Analyze competing courses and alternatives

Let us work through prompt 5: analyze competing courses and alternatives.

Begin with the learner's job and include alternatives beyond direct course competitors.

The SkillForge comparison includes established catalogs and free self-study. Verify course scope and regional commercial terms instead of inventing market share or a single global price.

End with testable differences in learner value, not a list of everything competitors have.

Before you run it, prepare PRD, competitor list, public filings, pricing pages or approved source excerpts. Your review should produce comparison table and opportunity hypotheses.

### Prompt 06: Find course-market and skills trends

Let us work through prompt 6: find course-market and skills trends.

Attach actual reports or source excerpts and retain each source's date, population, and definitions.

Ask for the trend, supporting evidence, implication, and uncertainty. The critical-statistics table must separate observed data from projections.

Pick three important claims and check them directly before using the synthesis.

Before you run it, prepare dated reports, scope, geography and product context. Your review should produce trend summary, evidence table, forecasts and implications.

### Prompt 07: Update a PRD from research

Let us work through prompt 7: update a PRD from research.

A PRD update should include a change log so the team can inspect what changed and why.

For SkillForge, research may support a narrower outcome or clearer prerequisite check. Keep price and conversion assumptions labeled until the pilot tests them.

Approve or reject each scope change rather than accepting the entire revision at once.

Before you run it, prepare existing PRD and verified trend report. Your review should produce revised PRD, traceable change log and open decisions.

## Module 03: User-centered design & prototyping

### Slide 1: Start with a user's world

User-centered design starts with how people work and learn in context. Investigate goals, current workarounds, constraints, and access needs before deciding on features. A polished interface is only useful if it helps someone accomplish the right task.

For SkillForge, a learner may study after work with limited time. That could make a clear weekly workload and a reliable resume action more valuable than another long list of content.

Describe a recent learning task from the user's perspective. Where did the effort, confusion, or risk occur?

Next, we will organize those hypotheses into provisional personas.

### Slide 2: Personas are hypotheses until validated

Personas should explain meaningful differences in jobs and behavior. Do not invent demographic detail merely to make a profile feel real. Tie attributes to evidence, and clearly label what you inferred.

SkillForge distinguishes a working analyst, an early-career learner, and an employer learning sponsor. The sponsor may approve the budget while another person uses the course. Their needs overlap, but they are not interchangeable.

Which persona attribute would change your design or service decision? If an attribute changes nothing, consider leaving it out.

Now we will turn the biggest assumptions into neutral interview questions.

### Slide 3: Turn assumptions into interview questions

Ask about recent, concrete behavior before asking for reactions to your proposed solution. A participant can describe what they bought, tried, abandoned, or worked around. Hypothetical enthusiasm is a weaker signal.

For SkillForge, ask about the last course someone paid for and what happened after the first two weeks. Probe time, prerequisites, feedback, and the decision process without suggesting the answer.

Take one feature question, such as 'would you like an AI tutor,' and rewrite it as a question about a recent difficulty.

Next, we will use competitor information as inspiration without losing our user focus.

### Slide 4: Borrow learning principles, not a competitor's syllabus

Public product information can reveal useful design patterns, but it rarely proves that a feature caused commercial success. Extract the principle, then ask whether it fits your learner, goal, and service capacity.

A large provider's broad catalog does not mean SkillForge should build one. A smaller hypothesis might be that a visible project rubric helps qualified learners understand the value before buying.

For one feature idea, explain the user need and what you would test. If you can only name the competitor that has it, the idea needs more work.

Now we will make a small learner journey clickable.

### Slide 5: Make the LMS journey clickable

A prototype should answer a focused question. Connect the steps a learner needs to complete, and include the information necessary to make an informed choice. Use fictional data and make simulated actions clear.

In the LMS demo, discover the course, inspect its prerequisites, preview a lesson, and simulate enrollment. Then resume learning, answer a knowledge check, and save a project link. No real payment or mentor review happens.

Which part of that journey is most likely to confuse a first-time learner? Turn it into a usability task with an observable result.

Next, we will make the experience accessible and recoverable.

### Slide 6: Accessibility is part of the experience

Accessibility is part of the primary experience. Consider keyboard navigation, visible focus, meaningful labels, readable contrast, captions or transcripts, and useful error recovery. AI can help identify issues, but manual checks and relevant user testing remain important.

In SkillForge, a learner should be able to reach the lesson, understand the quiz feedback, and correct a malformed project link without a mouse. Progress should not disappear because a loading request fails.

Try one task using only a keyboard. Where does focus go, and can you tell what the next action will do?

Now we will connect these interaction details to human understanding.

### Slide 7: Data meets empathy

Data and human insight contribute different strengths. Large-scale analysis can reveal patterns, while people explain context, emotions, and trade-offs. A metric can improve even when the real experience gets worse, so keep both in view.

For SkillForge, more lesson clicks may mean useful practice, or they may mean that learners are repeatedly looking for something they cannot find. A short observation session can help distinguish the two.

What interpretation of your preferred metric could be misleading? Name a qualitative signal you would check alongside it.

Next, we will prepare the prototype for an actual learning session.

### Slide 8: Your artifact: a testable experience

A testable experience includes the prototype and a research plan. State the learner task, what success looks like, what you will observe, and which assumptions remain open. Keep generated suggestions separate from feedback you actually collect.

For SkillForge, ask someone to decide whether they meet the prerequisites, resume a lesson, and locate the project criteria. Watch what they do before explaining the interface.

What would you change after a failed task, and what would require more evidence before changing the product?

Use the design prompts and the LMS demo below, then record the next real learner test you would run.

### Practice: Test a two-page product journey

This is the practice activity for module 3: test a two-page product journey.

Create learner/sponsor hypotheses, test the included LMS prototype and prepare an interview and usability session.

Step 1. Use prompt 08 and mark unvalidated attributes.

Step 2. Use prompt 09 with one relevant public source.

Step 3. Use prompt 11 in a tool that supports code/prototypes.

Step 4. Use prompts 24–25 to prepare interviews and usability tasks.

Pause the voice while you do the work. Save a reflection that states what you checked, what changed, and what is still uncertain. Continue when you have an artifact or a clear next validation step.

### Knowledge check: User-centered design

Before finishing module 3, use these questions to check your understanding. Choose the best answer from the evidence and reasoning you learned, not from how confident an option sounds.

Submit all three answers to see explanations. If you miss a question, return to the relevant concept and explain why the better answer fits. A score alone is less useful than correcting the reasoning.

This is an activity checkpoint. The trainer will not select or submit answers for you. When you are ready, pause the audio and complete the knowledge check.

### Prompt 08: Create provisional learner and buyer personas

Let us work through prompt 8: create provisional learner and buyer personas.

Use personas to organize evidence and assumptions about different jobs, not to invent detailed people.

SkillForge separates a learner's study constraints from a sponsor's purchase decision. Both matter, but they require different research.

Choose two unvalidated attributes that would materially affect the course or LMS design.

Before you run it, prepare PRD, real research or an explicitly hypothetical target audience. Your review should produce three provisional personas with evidence and validation questions.

### Prompt 09: Find LMS and course-service opportunities

Let us work through prompt 9: find LMS and course-service opportunities.

Use official course and LMS information to identify transferable principles.

A documented feature does not prove a business effect. Link each SkillForge opportunity to a learner need and a small test.

Prefer a clear hypothesis about value over a long list of fashionable AI features.

Before you run it, prepare PRD, provisional learner personas, official course pages and LMS feature documentation. Your review should produce evidence-linked LMS features and learner-service experiments.

### Prompt 10: Prepare a stakeholder PDF

Let us work through prompt 10: prepare a stakeholder PDF.

Make the stakeholder brief serve a decision. Give enough evidence and uncertainty for readers to challenge the recommendation.

For SkillForge, explain the proposed pilot, learning outcome, operational limits, and commercial assumptions before requesting a PDF.

Check the brief against the source analysis so summarizing has not changed the claims.

Before you run it, prepare reviewed research, recipient context and requested decision. Your review should produce stakeholder memo plus optional PDF.

### Prompt 11: Prototype course discovery and the learner workspace

Let us work through prompt 11: prototype course discovery and the learner workspace.

Describe the primary learner journey and its recovery states before asking a tool to generate a prototype.

In SkillForge, connect discovery, course information, simulated enrollment, learning, and project submission. Test the links and keyboard path yourself.

Use the result to observe user behavior. A working prototype is not validation of paid demand.

Before you run it, prepare approved PRD, personas, user stories and interaction requirements. Your review should produce clickable prototype and three test tasks.

### Prompt 24: Plan real customer interviews

Let us work through prompt 24: plan real customer interviews.

Use a neutral interview guide with people who fit your segment and research objective.

Ask about recent course purchases, actual study behavior, and workarounds. Avoid presenting the SkillForge offer before understanding the participant's experience.

Review the guide for leading questions and plan how to record consent and de-identify notes.

Before you run it, prepare research objective, target segment and assumptions. Your review should produce interview guide, screener and notes template.

### Prompt 25: Review accessibility and test the prototype

Let us work through prompt 25: review accessibility and test the prototype.

Use this review to structure checks and tests, not to declare compliance.

Inspect keyboard access, focus, labels, contrast, transcripts, and recovery. Then manually verify issues and test relevant tasks with users.

Record the observable result of one accessibility or usability task.

Before you run it, prepare prototype/screens, interaction map and target users. Your review should produce issue list and usability test plan.

## Module 04: Roadmaps, backlogs & prioritization

### Slide 1: Strategy becomes a sequence of choices

A roadmap is a sequence of choices aimed at an outcome. Explain the vision, the change you want to achieve, and the initiatives that might create that change. A list of features with dates is not enough to express the strategy.

SkillForge's roadmap begins with demand and learning-value validation, then course production and LMS setup, then a staffed pilot. Expansion depends on what we learn.

If your team completed every planned feature, what user or business outcome would still need to improve?

Next, we will separate the roadmap from the execution backlog.

### Slide 2: Roadmap and backlog

The roadmap and backlog work at different levels. A roadmap communicates direction, outcomes, and horizons. A backlog contains stories, bugs, technical debt, and implementation work. Keep a link between them without forcing both into the same level of detail.

For SkillForge, 'help learners demonstrate competence' is an outcome. Project submission and rubric feedback are possible ways to support it. The technical tasks to deliver them belong in the backlog.

Choose one backlog item and trace it to an outcome. If the connection is unclear, ask why the work is being done.

Now we will make roadmap timing honest about uncertainty.

### Slide 3: Build horizons from evidence

Use delivery horizons that match the evidence. Now, Next, and Later can express uncertainty more honestly than invented dates. Where dates are necessary, validate capacity, dependencies, and review gates with the people doing the work.

SkillForge cannot sell a credible pilot merely because the landing page is ready. Its curriculum, access controls, payment process, assessment rubric, and mentor capacity also need to be ready.

Which dependency could invalidate your launch date? Who can provide the evidence to estimate it?

Next, we will translate approved initiatives into actionable user stories.

### Slide 4: Make stories actionable

A story explains a user's goal and why it matters. Acceptance criteria make the expected behavior testable, including errors and edge cases. Small stories are easier to discuss and validate than broad feature labels.

For SkillForge's resume-learning story, specify which position is saved, how the next task is shown, and how progress is isolated to the correct learner. 'Add a dashboard' would leave those questions open.

Could a tester decide whether your story is complete without asking what you meant? Find one criterion that needs clarification.

Now we will use RICE to make prioritization assumptions visible.

### Slide 5: RICE makes assumptions visible

RICE combines reach, impact, confidence, and effort. Use one time horizon and consistent units, then show the inputs and calculation. Confidence is a fraction in the arithmetic, even if you display it as a percentage.

The SkillForge example gives a course-transparency story a reach of thirty, impact of two, confidence of eighty percent, and effort of three quarters of a person-month. Thirty times two times point eight, divided by point seven five, gives sixty-four.

Which input in that example is least supported? Change it in the practice lab and see whether the ranking still looks convincing.

Next, we will discuss why a ranked score is not a complete product decision.

### Slide 6: A ranking is not a strategy

A ranking helps a discussion, but it cannot remove constraints. Necessary dependencies, required controls, uncertainty, and strategic coherence can all change the order. Investigate how sensitive a recommendation is to weak estimates.

A payment flow may score below a visible growth improvement, yet SkillForge still needs reliable payment and course access before a paid launch. Those release requirements should not disappear inside a score.

What would you include in the release even if its numerical score were low, and why?

Now we will consider a simpler comparison when the data is too thin for detailed scoring.

### Slide 7: Impact versus effort

An impact-versus-effort comparison can be useful early in discovery. Define the scales and mark unknowns instead of inventing precision. Use the matrix to decide what to investigate, not just what to build.

For SkillForge, compare clearer prerequisites with a custom AI tutor. The second may promise broad value, but its effort, learning benefit, cost, and failure modes may be much less certain.

Which small experiment could reduce uncertainty enough to improve your next prioritization conversation?

Next, we will assemble a coherent minimum pilot rather than simply taking the top few scores.

### Slide 8: Your artifact: an explainable MVP

An MVP should be the smallest coherent way to test the product promise. Review the user journey, learning content, operational capacity, and required controls together. A high-scoring collection of disconnected features may still fail to deliver value.

SkillForge's pilot needs transparent course information, reliable enrollment and access, usable lessons, assessment, submission, and staffed feedback. Enterprise features can wait until the pilot provides evidence.

Can you explain the proposed pilot scope in terms of learner value and evidence gained, rather than feature count?

Use the roadmap and story prompts, test the RICE assumptions, and record the decision you would take to your team.

### Practice: Run a prioritization workshop

This is the practice activity for module 4: run a prioritization workshop.

Review the SkillForge roadmap and ten stories, then change RICE inputs to test the proposed pilot scope.

Step 1. Use prompt 12 with goals, capacity and dependencies.

Step 2. Use prompt 13 and inspect acceptance criteria.

Step 3. Change reach, impact, confidence and effort in the RICE lab.

Step 4. Use prompt 14 with actual estimates; record one decision and its uncertainty.

Pause the voice while you do the work. Save a reflection that states what you checked, what changed, and what is still uncertain. Continue when you have an artifact or a clear next validation step.

### Knowledge check: Roadmap & priorities

Before finishing module 4, use these questions to check your understanding. Choose the best answer from the evidence and reasoning you learned, not from how confident an option sounds.

Submit all three answers to see explanations. If you miss a question, return to the relevant concept and explain why the better answer fits. A score alone is less useful than correcting the reasoning.

This is an activity checkpoint. The trainer will not select or submit answers for you. When you are ready, pause the audio and complete the knowledge check.

### Prompt 12: Build a strategic roadmap

Let us work through prompt 12: build a strategic roadmap.

Give the roadmap prompt product goals, capacity, dependencies, and the evidence behind the initiatives.

SkillForge should validate its proposition, review content, configure delivery, and learn from a staffed pilot before expanding.

Review every date and identify which milestone requires a human or team decision.

Before you run it, prepare PRD, business goals, capacity, constraints and dependencies. Your review should produce roadmap, metric definitions and unresolved decisions.

### Prompt 13: Write the first ten user stories

Let us work through prompt 13: write the first ten user stories.

Ask for user value and testable acceptance criteria, then check whether the stories are small enough to discuss and deliver.

For SkillForge's project submission, define the rubric, permitted links, receipt, access, and recovery behavior.

Refine a story with the people who design, build, and operate the experience.

Before you run it, prepare roadmap, PRD, personas and definition of ready. Your review should produce ten draft stories with business value and acceptance criteria.

### Prompt 14: Prioritize with RICE

Let us work through prompt 14: prioritize with RICE.

Set one reach horizon and consistent impact and effort units before calculating RICE.

Show the inputs, label illustrative values, and test sensitivity. For SkillForge, necessary access and payment controls remain release gates regardless of rank.

Ask which single assumption could change the MVP recommendation.

Before you run it, prepare stories, reach estimates, evidence, impact scale, confidence, effort and capacity. Your review should produce transparent RICE table and a proposed MVP.

### Prompt 26: Compare impact and effort

Let us work through prompt 26: compare impact and effort.

Use impact versus effort when detailed reach estimates would create false precision.

Define the scales and mark unknowns. Compare a focused improvement with a more ambitious feature.

Choose an experiment that could reduce uncertainty before the next prioritization discussion.

Before you run it, prepare initiatives, outcome metric and rough engineering estimates. Your review should produce impact/effort matrix with unknowns and experiments.

## Module 05: Product analytics & research synthesis

### Slide 1: Begin with the business question

Start analytics with a decision question. Identify who or what you are measuring, the period, the comparison, and what action the result could inform. This keeps chart creation connected to product work.

For SkillForge, we might ask whether an acquisition channel brings learners who activate and complete the capstone at an acceptable cost. Paid-seat volume alone does not answer that question.

What is the decision behind the chart you want to make? State it before choosing the visualization.

Next, we will inspect the dataset and its definitions.

### Slide 2: Inspect before you interpret

Before interpreting data, inspect its contract. Confirm units, date fields, event definitions, missing values, duplicates, and transformations. Data cleaning is an analytical choice, so record what changed and why.

In SkillForge's fictional funnel dataset, paid seats, activated learners, completed capstones, refunds, and marketing spend have different meanings. The exercise assumes each cohort has finished its eight-week window.

Which field could be misunderstood, and what definition would prevent that mistake? Check that the denominators are consistent.

Now we will answer two complementary chart questions.

### Slide 3: Two charts for a course business

Read acquisition and learning success together. One chart can compare paid enrollments by channel; another can compare paid, activated, and completed learners across mature cohorts. Keep the tables behind both charts available for verification.

The SkillForge lab lets you filter a channel and inspect its totals. The second chart deliberately shows all channels, as labeled. Net tuition subtracts fully refunded seats before multiplying by the assumed tuition.

Recalculate one total yourself. Then ask whether the observed pattern could reflect channel mix or cohort maturity rather than a product improvement.

Next, we will separate observation from explanation and action.

### Slide 4: Observation → explanation → decision

An observation states what the data shows. An explanation is a hypothesis about why it happened. A decision is an action supported by that evidence and the uncertainty that remains. Keeping these separate prevents a chart from making a causal claim it cannot support.

If SkillForge has more paid seats in March than January, marketing spend, audience mix, timing, or positioning could explain it. We need a suitable comparison or experiment before crediting a particular feature.

Write one observation without using the word 'because.' Then write two possible explanations.

Now we will apply a similar evidence discipline to interview transcripts.

### Slide 5: Unstructured data needs traceability

Qualitative synthesis needs traceability. Connect themes to participant references and actual quotes, include exceptions, and state the sample limitations. Repetition in a small sample can be informative without establishing population prevalence.

For SkillForge, two learners mentioning unclear prerequisites may justify a focused test. It does not establish what percentage of the entire market has that problem.

Choose one theme. Can you find its supporting evidence and a counterexample, or are you relying only on the AI summary?

Next, we will make the boundary between real and simulated interviews explicit.

### Slide 6: Synthetic interviews are for practice

Synthetic interviews are useful for practicing analysis, not for validating customer needs. A model can create internally consistent answers that merely reflect the assumptions already present in the persona and PRD.

If we generate three SkillForge learner interviews, label every transcript and every resulting synthesis as fictional training material. Their apparent agreement does not prove demand or research saturation.

Where will you obtain actual learner evidence before turning a practice theme into a product commitment?

Now we will translate verified findings into backlog candidates.

### Slide 7: Findings become backlog candidates

A research-backed story should retain its evidence link. Identify the user need, supporting source, business or learning value, acceptance criteria, and validation status. A well-written story can still be the wrong priority.

For SkillForge, a feedback-turnaround story should be grounded in actual learner needs and realistic mentor capacity. If it comes only from a simulated interview, keep it as a discovery hypothesis.

What must be true for your proposed story to help the user, and what evidence do you have for that assumption?

Next, we will communicate the analysis as a decision memo.

### Slide 8: Your artifact: a decision memo

A decision memo helps someone else challenge your reasoning. State the question, scope, method, findings, limitations, recommendation, and next measurement. Make the evidence accessible without forcing the reader to repeat every calculation.

For SkillForge, the memo should connect learning quality with conversion, refunds, and contribution assumptions. Growing tuition revenue is not enough if learners fail to achieve the outcome or service costs exceed the value.

What is the clearest next decision from your analysis, and what uncertainty would you explicitly bring to the discussion?

Use the analytics prompts, inspect the fictional data, and record a recommendation that respects its limits.

### Practice: Practice both quantitative and qualitative analysis

This is the practice activity for module 5: practice both quantitative and qualitative analysis.

Explore the fictional course-funnel data. Write one observation, one explanation hypothesis and one learning/revenue experiment.

Step 1. Download the sample CSV and inspect its definitions.

Step 2. Use prompt 15 and verify one aggregate manually.

Step 3. Use prompt 16 to draft a decision memo.

Step 4. Use prompts 17–19 only with clear provenance; record validation status.

Pause the voice while you do the work. Save a reflection that states what you checked, what changed, and what is still uncertain. Continue when you have an artifact or a clear next validation step.

### Knowledge check: Analytics & insight

Before finishing module 5, use these questions to check your understanding. Choose the best answer from the evidence and reasoning you learned, not from how confident an option sounds.

Submit all three answers to see explanations. If you miss a question, return to the relevant concept and explain why the better answer fits. A score alone is less useful than correcting the reasoning.

This is an activity checkpoint. The trainer will not select or submit answers for you. When you are ready, pause the audio and complete the knowledge check.

### Prompt 15: Analyze enrollments, learner progress and revenue

Let us work through prompt 15: analyze enrollments, learner progress and revenue.

Inspect the dataset and definitions before requesting charts.

For SkillForge, compare acquisition with activation and mature-cohort completion. Reconcile refunds and tuition, and keep the fictional training label visible.

Manually verify one aggregate before interpreting the visual pattern.

Before you run it, prepare LMS/acquisition cohort CSV, event dictionary, currency, cohort maturity and cost definitions. Your review should produce two charts, funnel table, learning metrics and a decision memo.

### Prompt 16: Write an analytics memo

Let us work through prompt 16: write an analytics memo.

An analytics memo should distinguish an observed result, a possible explanation, and a proposed action.

For SkillForge, connect conversion, learning quality, refunds, costs, and capacity. Do not call net tuition profit.

Ask whether a teammate can trace the recommendation to the tables behind it.

Before you run it, prepare reviewed charts, tables, assumptions and decision context. Your review should produce concise memo with evidence and next action.

### Prompt 17: Generate simulated interviews for practice

Let us work through prompt 17: generate simulated interviews for practice.

This prompt creates practice material only. Keep synthetic labels in the files and in every subsequent synthesis.

Model-generated learner answers can rehearse qualitative coding, but they cannot tell us what actual SkillForge customers need or will buy.

Write the real research you still need before turning a practice insight into a requirement.

Before you run it, prepare PRD and provisional personas. Your review should produce three clearly labeled fictional transcripts.

### Prompt 18: Analyze interview transcripts

Let us work through prompt 18: analyze interview transcripts.

State whether the interviews are real or synthetic before looking for themes.

Request participant references, supporting quotes, exceptions, and limitations. Separate an observation from your interpretation.

Check one quote against the transcript and look for a participant whose experience challenges the theme.

Before you run it, prepare de-identified transcripts, research question and provenance. Your review should produce evidence-linked themes, exceptions and research gaps.

### Prompt 19: Turn findings into four user stories

Let us work through prompt 19: turn findings into four user stories.

Keep a research reference attached to every proposed story.

For SkillForge, a real learner difficulty may support a discovery or delivery candidate. A synthetic difficulty remains a hypothesis.

Check that the acceptance criteria address the stated need and do not merely describe a preferred interface.

Before you run it, prepare verified synthesis and existing backlog. Your review should produce four traceable stories or discovery candidates.

## Module 06: Strategic thinking & problem solving

### Slide 1: AI as a thought partner

Use AI as a thought partner to expand and challenge your options. Ask for alternative explanations, trade-offs, and missing evidence. Then apply your domain knowledge and take responsibility for the choice.

SkillForge could improve curriculum clarity, add feedback capacity, or broaden acquisition. AI can help compare these paths, but our decision should depend on learning outcomes, evidence, and available resources.

Which strategic assumption are you currently treating as settled? Ask what evidence would make you reconsider it.

Next, we will connect the course funnel to commercial outcomes.

### Slide 2: Define the course revenue funnel

Interest, paid enrollment, course completion, and profit are different outcomes. Define the funnel and the cost model before interpreting the commercial story. Capacity also matters: demand beyond the available seats does not automatically become revenue.

SkillForge's model starts with visitors, lead conversion, and paid conversion, then caps seats at delivery capacity. It subtracts expected refunds, processing, delivery, acquisition, and fixed campaign costs.

Which cost or denominator is easiest to overlook in your own business case? Write it down before using the calculator.

Now we will compare plausible scenarios rather than treating one estimate as certain.

### Slide 3: Build three plausible futures

A scenario is a conditional future: if these assumptions hold, this is the result the model produces. Build alternatives around meaningful constraints and drivers. Identify the signals that would help distinguish them early.

In SkillForge's worked case, a more successful campaign can still end at thirty seats because mentor capacity is limited. If acquisition spend must rise to produce that traffic, the costs should change too.

Which assumption could make your central scenario fail, and what would you monitor before committing more resources?

Next, we will use historical transitions to ask better strategic questions.

### Slide 4: Use history with boundaries

Historical analogies can reveal useful patterns, but they should include where the comparison breaks. Consider audience, incentives, infrastructure, switching costs, and regulation. A similar-looking curve is not evidence that a new product will follow the same path.

For SkillForge, a transition from classroom learning to online delivery may suggest questions about flexibility and trust. It does not prove that a small reviewed-project course will gain the same adoption as a large platform.

What part of your analogy is genuinely similar, and what difference could overturn the lesson?

Now we will choose frameworks that fit the decision.

### Slide 5: Frameworks give analysis a shape

A framework gives analysis a structure. Scenario planning organizes uncertainty; learning curves connect experience with performance; resource allocation makes opportunity cost explicit. Choose the framework because it clarifies your question, not because its name sounds rigorous.

For SkillForge, learning curves may help examine content-production effort, while the revenue model helps examine campaign viability. Neither framework validates learner demand on its own.

What question are you trying to answer, and which framework exposes the assumptions that matter most?

Next, we will apply learning curves to course operations.

### Slide 6: Learning curves in course operations

A learning curve needs a mechanism and a measure of cumulative experience. Improvements may also come from scale or technology changes, so keep those explanations separate. Add a quality guardrail so faster output is not mistaken for better work.

For SkillForge, track authoring hours per exercise that passes review, or support time per resolved learner issue. Producing more unchecked content would not demonstrate the improvement we want.

Choose one operational task. What output counts as acceptable, and what evidence would show that experience is helping?

Now we will turn strategic analysis into a small, reversible test.

### Slide 7: Choose a reversible strategic test

The next experiment should reduce uncertainty that affects a decision. Compare the options, define the earliest useful signal, and state success, stop, or pivot thresholds in advance. Name the owner and review point.

For SkillForge, a truthful pilot offer and a reviewed sample project can test more than an ambitious platform build. We need real evidence of commitment and learning value, together with actual delivery costs.

What is the smallest action that could change your launch decision, and what would you do if the result disappoints?

Next, we will review the entire product case as one connected story.

### Slide 8: Your capstone: an evidence-linked product story

Your capstone is an evidence-linked product story. The PRD sets the direction, research challenges it, learner work informs the experience, and the roadmap and backlog explain execution. Analytics and strategy then shape the next experiment.

For SkillForge, check that the course promise matches its curriculum, the LMS supports the learner journey, and the revenue case includes delivery capacity and costs. Polish should not hide a broken connection.

Which artifact has the weakest evidence, and what is the most important improvement before making a real commitment?

Use the capstone review and final prompts. Finish by stating your next decision, its owner, and the evidence you still need.

### Practice: Write your strategic decision brief

This is the practice activity for module 6: write your strategic decision brief.

Use the course-revenue model to compare scenarios, then choose the smallest experiment that could change a launch decision.

Step 1. Use prompt 20 and inspect every funnel denominator and cost.

Step 2. Use prompts 21–22 to challenge the delivery assumptions.

Step 3. Use prompt 27 to design a willingness-to-pay or learning-value experiment.

Step 4. Use prompt 28 to review the course business, LMS and revenue case.

Pause the voice while you do the work. Save a reflection that states what you checked, what changed, and what is still uncertain. Continue when you have an artifact or a clear next validation step.

### Knowledge check: Strategy & decisions

Before finishing module 6, use these questions to check your understanding. Choose the best answer from the evidence and reasoning you learned, not from how confident an option sounds.

Submit all three answers to see explanations. If you miss a question, return to the relevant concept and explain why the better answer fits. A score alone is less useful than correcting the reasoning.

This is an activity checkpoint. The trainer will not select or submit answers for you. When you are ready, pause the audio and complete the knowledge check.

### Prompt 20: Model enrollment and course-revenue scenarios

Let us work through prompt 20: model enrollment and course-revenue scenarios.

Use this prompt to explore conditional course economics, not to produce a confident revenue promise.

Define visitors, conversion denominators, price, refunds, capacity, and every included cost. Compare scenarios and note what is excluded.

Change the least certain assumption and see whether the decision still holds.

Before you run it, prepare campaign horizon, qualified visitors, funnel rates, price, capacity, refund rate and cost assumptions. Your review should produce three enrollment/revenue scenarios, contribution and decision triggers.

### Prompt 21: Learn from professional-education transitions

Let us work through prompt 21: learn from professional-education transitions.

Use history to generate bounded lessons and questions.

Compare incentives, audience, delivery, and constraints before applying a professional-education analogy to SkillForge.

Write one reason the analogy could fail and one small experiment that tests its practical lesson.

Before you run it, prepare scenario analysis and specific strategic question. Your review should produce three bounded analogies and testable lessons.

### Prompt 22: Apply learning curves to course operations

Let us work through prompt 22: apply learning curves to course operations.

Connect cumulative experience to a measured course-operation outcome.

For SkillForge, faster exercise authoring matters only if the work passes review. Separate learning from scale and tool changes.

Choose one measure of efficiency and one learning-quality guardrail.

Before you run it, prepare historical cost/performance data and cumulative production or usage. Your review should produce seven applications and an evidence/measurement plan.

### Prompt 23: Continue an interactive explanation

Let us work through prompt 23: continue an interactive explanation.

Use a checkpoint when your input could change the next action, not after every paragraph.

Ask the tool to recap the supported conclusion and the next question before continuing.

Decide what you understand, what remains uncertain, and what evidence the next step should add.

Before you run it, prepare previous explanation and a defined checkpoint. Your review should produce next explanation section with a useful decision checkpoint.

### Prompt 27: Choose a strategic experiment

Let us work through prompt 27: choose a strategic experiment.

Make the strategic experiment specific enough that it can change a decision.

For SkillForge, state the proposition, qualified audience, measurement, delivery readiness, and threshold before a paid pilot.

Assign an owner and define what you would do after success, failure, or an ambiguous result.

Before you run it, prepare research, scenarios, capacity and decision deadline. Your review should produce option table and experiment charter.

### Prompt 28: Review the complete product portfolio

Let us work through prompt 28: review the complete product portfolio.

Use the portfolio critique to challenge connections between artifacts, not to reward polished language.

For SkillForge, align the problem evidence, course outcomes, LMS journey, roadmap, measurements, and commercial model.

Select the three most important evidence gaps and turn the first into a concrete next step.

Before you run it, prepare all completed course artifacts. Your review should produce evidence-based rubric and next steps.

## Worked business case

### 01 / Draft the course and LMS PRD

Step 1: Draft the course and LMS PRD.

Start with the provisional PRD. We are defining a course business and its delivery experience together: who it serves, what learning outcome it promises, and what must be true for that promise to be credible.

Notice how scope and non-goals keep the pilot bounded. The proposed price, cohort size, and success thresholds are planning choices that need evidence, not observed facts.

Before moving on, name the single assumption that could most strongly invalidate the product proposition.

Your next validation: Interview 12 target learners and three potential employer buyers before finalizing the promise. All targets above are hypotheses.

### 02 / Read demand signals and competitors

Step 2: Read demand signals and competitors.

This step asks whether there is enough category evidence to justify investigation. It does not ask the reports to prove that SkillForge will sell.

Read the source date, geography, population, and limitation beside each signal. Compare existing alternatives in terms of the learner's job and evidence of learning, not only catalog size.

Which claim can you verify today, and which claim requires direct research or a real offer test?

Your next validation: Create a sourced competitor sheet with date, geography, pricing basis and limits. Test the differentiator with recent course purchasers.

### 03 / Turn market trends into product changes

Step 3: Turn market trends into product changes.

Now translate a market signal into a product hypothesis and a validation step. This is where information becomes useful strategy.

A growing interest in applied AI might justify a sample project. Strong competitors might push us toward a smaller, clearer path with useful feedback. Neither observation automatically determines the feature backlog.

Choose one row and explain what result would make you reject the proposed response.

Your next validation: PRD revision: make prerequisite transparency, an applied capstone and measurable feedback quality core. Defer enterprise features and AI tutoring until pilot evidence supports them.

### 04 / Understand learners and the buyer

Step 4: Understand learners and the buyer.

These three personas separate the user, the learner's situation, and the buyer's job. They help us plan questions, but they are still provisional.

Investigate actual course choices, study constraints, prerequisite readiness, and the criteria used to approve spending. Keep statements linked to participants and avoid turning imagined biographies into evidence.

What question would reveal whether the working-analyst segment is different enough to design for?

Your next validation: Test the discovery → enrollment → lesson → project journey with five target learners before building more features.

### 05 / Define the curriculum and learning evidence

Step 5: Define the curriculum and learning evidence.

A curriculum is a sequence of demonstrated learning outcomes, not a list of topics. Prerequisites protect the scope, and assessment makes the promise inspectable.

Follow the path from data reasoning through evaluation to a bounded GenAI workflow. The capstone asks learners to show their reasoning and limitations, not only produce an impressive demo.

Which outcome would be too broad for the available time, and what would you narrow or move to prework?

Your next validation: Have a subject-matter reviewer validate scope, correctness and workload. Rubric: problem/data reasoning 25%, method/evaluation 30%, responsible AI/reproducibility 25%, communication 20%; proposed pass ≥70/100.

### 06 / Design the LMS around the learner journey

Step 6: Design the LMS around the learner journey.

Read the LMS through the learner journey: discover, decide, enroll, learn, demonstrate, and improve. At each step, include enough information and recovery behavior to build trust.

The prototype demonstrates the interaction, while a real platform would need payment integration, access control, submission storage, and staffed feedback. Use an existing LMS where it meets the job.

Choose a learner task to observe before adding another feature.

Your next validation: Open the included LMS prototype, then test find-a-course, resume-learning and submit-a-project tasks with real learners.

### 07 / Sequence discovery, curriculum and delivery

Step 7: Sequence discovery, curriculum and delivery.

The roadmap connects research, curriculum readiness, platform configuration, and pilot delivery. Its gates matter more than how tidy the timeline looks.

A course can fail if marketing is ready before content and support. Review dependencies with the people responsible for instruction, implementation, and operations.

What evidence must be available at the next gate before you would release more budget?

Your next validation: Content review, instructor capacity, payment setup and access controls are dependencies. Do not promise a launch date before the team validates the sequence.

### 08 / Draft the first ten LMS stories

Step 8: Draft the first ten LMS stories.

Read the ten stories as candidates for refinement. Each should connect a user goal with business or learning value and testable behavior.

Open the course-transparency story and inspect its criteria. Then compare it with a more operational story such as project submission. Both require precise expectations and dependencies.

Which criterion would a tester find ambiguous, and how would you clarify it with the team?

Your next validation: Keep a definition of ready: evidence or hypothesis, owner, testable criteria, dependencies, assessment/content readiness and estimate confidence.

### 09 / Prioritize with RICE and release gates

Step 9: Prioritize with RICE and release gates.

RICE makes assumed reach, impact, confidence, and effort visible. It does not replace the release checklist or the minimum coherent learner journey.

Use the ranking to ask why a story is near the top and what evidence supports its inputs. Then check required access controls, payments, content readiness, and feedback capacity.

Change one weak estimate in the live lab. Does the priority discussion change in a meaningful way?

Your next validation: Use the live RICE lab to test assumptions. Do not drop a prerequisite because its score is lower than a visible growth feature.

### 10 / Measure the acquisition and learning funnel

Step 10: Measure the acquisition and learning funnel.

The practice data is fictional. It helps you rehearse a real analysis without pretending that a live course has produced these results.

Check each funnel denominator, cohort maturity, refunds, and currency. Read paid-seat growth together with activation, assessed completion, and acquisition costs.

Write one observation, two possible explanations, and the next measurement that would distinguish them.

Your next validation: Reconcile one funnel aggregate manually. Then choose an experiment: clearer prerequisites, a better first lesson or faster project feedback.

### 11 / Plan revenue and validate willingness to pay

Step 11: Plan revenue and validate willingness to pay.

This is a conditional revenue model. Gross tuition, net tuition, contribution, and accounting profit are different measures.

The central case fills thirty seats under explicit assumptions. The accelerated case does not sell beyond capacity, and higher traffic may require higher spend. Check the costs that the example excludes.

Open the calculator and change the assumption you trust least. Would you still launch the same pilot?

Your next validation: Test the proposed price with an honestly described pilot offer. Track actual commitments and refunds; do not take payment before terms, delivery and support are ready.

### 12 / Launch small, learn and revise

Step 12: Launch small, learn and revise.

Finish with a small experiment and a decision rule. We want real evidence of value and commitment before expanding the course or platform.

Interview qualified learners and buyers, show a truthful sample and offer, and set the measurement window and thresholds in advance. After delivery, review learning quality, refunds, service load, and contribution together.

State the next decision, its owner, the evidence required, and what would cause you to stop, revise, or expand.

Your next validation: No live payment or outreach is performed by this learning site. The prototype and calculations let you rehearse the decisions.

## Practice lab, LMS prototype and resources

### Prompt reference

Use this reference to choose the task you actually need to do. The course-case version follows SkillForge Academy, and the reusable version uses your current product context.

Attach real approved source files, replace the context where needed, and run the prompt in a suitable AI tool. This website prepares prompts; it does not execute them.

Each prompt has its own trainer walkthrough and review checks. Judge the output by evidence, user relevance, and the decision it supports. Keep a record of which assumptions remain unvalidated.

### RICE prioritization

Start by reading the time horizon and units. In this exercise, reach is the number of learners, out of a planned thirty-seat cohort, that a story would affect during a ninety-day pilot window, so some stories reach eighteen or twenty-four rather than thirty. Values are illustrative.

Change one input at a time and watch the score and ranking. Confidence is displayed as a percentage but divided by one hundred in the calculation. An empty or invalid effort should not produce a meaningful score.

Choose the top two candidates and ask which input is least supported. Then identify dependencies and required release controls that the numerical ranking does not capture.

Save your rationale. The goal is an explainable prioritization discussion, not merely the largest score.

### Course analytics

Begin with the fictional-data label and cohort definition. This exercise assumes every cohort has completed its eight-week window. That matters when comparing completion.

Use the channel filter, inspect the table, and recalculate one total. Net tuition subtracts fully refunded seats from paid seats and uses the assumed tuition price.

Compare paid volume, activation, assessed completion, and acquisition spend. The second channel chart is labeled as an all-channel view.

Write an observation separately from its possible explanation, then state the next evidence or experiment you would need.

### Revenue model

Read the model as a set of assumptions. Visitors become leads, leads become paid seats, and delivery capacity caps the result. Expected refunds may be fractional even though seats are whole numbers.

The model subtracts refunds, processing on gross tuition, variable delivery, acquisition spend, and fixed campaign or content cost. It does not automatically include tax, salary, or every overhead.

Change the least certain conversion or cost input. Then check whether break-even is possible within capacity. If unit contribution is not positive, selling more seats will not solve the assumed economics.

Record which input needs real evidence before making a launch or expansion decision.

### Scenario explorer

This explorer is an abstract adoption illustration rather than a course-sales forecast. Adoption means the share of a defined eligible learner audience taking a course.

Adjust the starting adoption, ceiling, growth parameter, and horizon. The model shows how different assumptions create different conditional outcomes.

Do not infer that any scenario is likely just because a curve looks smooth. Ask which leading indicator could help distinguish the futures. Use the separate revenue model for course conversion and costs.

Save the assumption you would test first and the decision it could change.

### Capstone review

Review the full set of artifacts together: product definition, research, learners, curriculum, prototype, roadmap, stories, analytics, and strategic experiment.

Score evidence, user relevance, traceability, feasibility, metric quality, and uncertainty from zero to two. Zero means missing, one means partial or assumption-based, and two means clear and supported.

A high total is not certification. Focus on the weakest link that could change a real product decision.

Write three improvements and one next validation step, then export your portfolio so you can discuss it with your team.

### LMS: course discovery

Approach this screen as a prospective learner. Look for the learning outcome, prerequisite knowledge, workload, format, price hypothesis, and evidence of what you will be able to demonstrate.

Try searching the learning outcomes, inspect the syllabus, and preview the sample before deciding. Observe whether any purchase-relevant information is missing or hard to find.

The enrollment action is a local demonstration. It takes no payment and grants no real course access. Use it to investigate the interaction rather than to measure genuine buying intent.

Your task is to decide whether this course fits the intended learner, and to note any question that a real user would still need answered.

### LMS: learner workspace

Now follow the learner's main task. Read the sample explanation about evaluation and data leakage, then use the knowledge check to test your understanding.

Marking a lesson complete is different from demonstrating the learning outcome. Review the project rubric before saving a link, and notice the confirmation and error behavior.

The demo stores state and project links on this device. No mentor receives or grades the submission, and no credential is issued.

Observe whether a learner can resume, understand feedback, and recover from a mistake without help. That is the evidence this prototype can help you collect.

### Course materials

These downloads let you use the course outside the website. The prompt reference, the worked course case and the trainer transcript are ready to print or save.

Keep the prompt handbook and worked academic case alongside your own artifacts. Refer to linked sources and maintain their dates, populations, and limitations.

Audio on this site is browser speech, not a recording inside the downloaded files. Your learning notes remain on this device unless you export them.

Choose the material you need for your next discussion, practice session, or product decision.
