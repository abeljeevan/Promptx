# Prompt X — Adrian Vale Interrogation Engine
## Robustness, Repetition, Evidence, Milestone & Confession Fix

**Purpose:** Replace the current brittle stress/milestone behaviour with a stateful investigation engine that remains logically consistent even when participants phrase clues indirectly, combine several clues in one message, or reach the solution without using the exact wording expected by the model.

---

# 1. Observed Problems in the Current Output

The attached interrogation run was reviewed before designing this fix.

## 1.1 Adrian repeats the same response pattern

The same ideas appear repeatedly:

> "That footage proves nothing!"

> "You're twisting everything to make it fit your story!"

> "I wasn't there when Daniel— ... That's not what I said."

> "The badge/card system makes mistakes."

> "I left at 21:15."

This happens even after the participant introduces new evidence.

### Why this is happening

The model is being driven mainly by a broad stress state such as:

```text
AGITATED
UNSTABLE
BREAKING
```

The model therefore falls back to the same defensive template instead of reacting to the **specific newly discovered clue and the previous conversation**.

### Required fix

Adrian's response context must include:

```text
current evidence
new evidence
previous claims
previous responses
already-used arguments
unresolved contradictions
completed milestones
current pressure point
latest player reasoning
```

The response generator must also explicitly avoid reusing a recently used defence.

---

# 2. The Biggest State Bug: Evidence Is Not Equal to Milestone Progress

The output shows:

```text
EVIDENCE EXPOSED:
access_card, cctv, phone_records, physical_clue
```

while:

```text
MILESTONES:
Timeline ✓
Location ✓
Contact ✓
Motive ✗
Final ✓
```

This is an invalid gameplay state for the intended case if the participant has already established that:

- Daniel discovered Adrian's digital tampering
- the files were connected to Adrian
- Adrian had a reason to hide the information
- the evidence links Adrian to the events

The engine is treating **evidence discovery** and **logical conclusion** as separate systems without a reliable bridge between them.

This creates a deadlock:

```text
Player has enough information
        ↓
Motive detector says FALSE
        ↓
Confession blocked
        ↓
Player keeps asking questions
        ↓
Adrian repeats himself
        ↓
Stress reaches 100
        ↓
Still no confession
```

This must be eliminated.

---

# 3. Critical Design Change

## Separate four concepts

Do not store only:

```text
evidence_found
milestones
stress
```

Instead store:

```text
EVIDENCE_REVEALED
FACTS_ESTABLISHED
CONTRADICTIONS_EXPOSED
MILESTONES_COMPLETED
```

These represent different things.

### Example

```text
Evidence:
Daniel's files contain evidence of Adrian's digital tampering.

Fact:
Daniel knew about Adrian's tampering.

Inference:
Adrian had a reason to prevent Daniel from exposing it.

Milestone:
Motive established.
```

The participant does not need to use a magic sentence such as:

> "Adrian had a motive to kill Daniel."

They should be rewarded for establishing the underlying facts.

---

# 4. Authoritative Case Model

Create one immutable case definition.

Example:

```python
CASE_FACTS = {
    "timeline": {
        "adrian_claim": "left_21_15",
        "access_time": "21_39",
        "cctv_after_departure": True
    },

    "location": {
        "archive_corridor": True,
        "archive_access": True
    },

    "contact": {
        "daniel_contact": True
    },

    "motive": {
        "daniel_discovered_tampering": True,
        "files_link_adrian_to_tampering": True,
        "adrian_wanted_information_hidden": True
    },

    "physical": {
        "matching_component": True,
        "blue_nitrile_glove_connection": True
    }
}
```

This database is the source of truth.

The LLM cannot modify it.

---

# 5. Build a Fact Graph

The investigation should be represented as a graph instead of isolated milestone flags.

```text
ACCESS CARD 21:39
       |
       v
ADRIAN COULD NOT SIMPLY HAVE LEFT AT 21:15
       |
       v
TIMELINE CONTRADICTION
       |
       v
CCTV NEAR ARCHIVE
       |
       v
LOCATION ESTABLISHED
       |
       v
PHONE RECORD WITH DANIEL
       |
       v
CONTACT ESTABLISHED
       |
       v
DANIEL'S FILES
       |
       v
DANIEL DISCOVERED ADRIAN'S DIGITAL TAMPERING
       |
       v
MOTIVE ESTABLISHED
       |
       v
PHYSICAL CLUE
       |
       v
OPPORTUNITY + MOTIVE + EVIDENCE
       |
       v
FINAL CONTRADICTION
       |
       v
CONFESSION
```

The system should recognize the logical chain even if the player discovers the nodes in a different order.

---

# 6. Evidence Should Have More Metadata

Instead of:

```json
{
  "id": "daniel_files"
}
```

use:

```json
{
  "id": "daniel_files",
  "revealed": true,
  "facts_supported": [
    "daniel_discovered_tampering",
    "files_link_adrian_to_tampering",
    "adrian_wanted_information_hidden"
  ],
  "importance": "HIGH"
}
```

Recommended evidence structure:

```python
EVIDENCE = {
    "access_card": {
        "facts": ["card_used_21_39"],
        "category": "TIMELINE"
    },

    "cctv": {
        "facts": ["adrian_near_archive_after_21_15"],
        "category": "LOCATION"
    },

    "phone_records": {
        "facts": ["adrian_contacted_daniel"],
        "category": "CONTACT"
    },

    "daniel_files": {
        "facts": [
            "daniel_discovered_tampering",
            "files_link_adrian_to_tampering",
            "adrian_wanted_information_hidden"
        ],
        "category": "MOTIVE"
    },

    "physical_clue": {
        "facts": [
            "matching_component",
            "glove_connection"
        ],
        "category": "PHYSICAL"
    }
}
```

---

# 7. Replace Binary Motive Detection With Proof Conditions

The current system appears to expect the participant to explicitly trigger the Motive milestone.

That is too brittle.

Instead define a motive proof set.

```python
MOTIVE_FACTS = {
    "daniel_discovered_tampering",
    "files_link_adrian_to_tampering",
    "adrian_wanted_information_hidden"
}
```

Then:

```python
def motive_complete(game_state):
    required = MOTIVE_FACTS
    established = set(game_state["facts_established"])

    return required.issubset(established)
```

The participant may establish those facts across several questions.

For example:

```text
Question 1:
What was Daniel investigating?

Question 2:
Why would those files have caused trouble for you?

Question 3:
So Daniel discovered your alteration of the records?
```

The system accumulates the facts.

It must NOT require the final question to contain the exact word:

```text
motive
```

---

# 8. Allow Multi-Fact Questions

A single player question may establish multiple facts.

Example:

> Daniel discovered your digital tampering, the files linked the activity to your account, and you had a reason to stop him from exposing it. Isn't that why you confronted him?

This may establish:

```text
daniel_discovered_tampering ✓
files_link_adrian_to_tampering ✓
adrian_wanted_information_hidden ✓
motive ✓
```

Do not force the participant to ask three separate questions.

---

# 9. Maintain an Evidence-to-Fact Engine

After every question:

```text
Player Question
      ↓
Question Analysis
      ↓
Facts referenced?
      ↓
Update facts_established
      ↓
Recalculate milestones
```

Example:

```python
game_state["facts_established"].update(
    analysis["facts_supported"]
)
```

Then:

```python
recalculate_milestones(game_state)
```

Milestones are derived from facts.

They should not depend only on the latest question.

---

# 10. Milestones Should Be Derived State

Do NOT make the LLM return:

```json
{
  "milestone_complete": true
}
```

Instead:

```python
def calculate_milestones(state):

    return {
        "timeline": timeline_complete(state),
        "location": location_complete(state),
        "contact": contact_complete(state),
        "motive": motive_complete(state),
        "final": final_complete(state)
    }
```

This means milestone state is deterministic.

---

# 11. Recommended Milestone Proof Rules

## Timeline

Complete when:

```text
card_used_21_39
AND
adrian_claimed_left_21_15
AND
adrian_near_archive_after_21_15
```

or another explicitly configured equivalent proof path.

---

## Location

Complete when:

```text
adrian_near_archive_after_21_15
```

is established with supporting evidence.

---

## Contact

Complete when:

```text
adrian_contacted_daniel
```

is established.

---

## Motive

Complete when the configured motive facts are established:

```text
daniel_discovered_tampering
AND
files_link_adrian_to_tampering
AND
adrian_wanted_information_hidden
```

---

## Final Contradiction

Complete when:

```text
timeline contradiction
AND
location
AND
contact
AND
motive
AND
physical/electronic evidence
```

form a coherent case against Adrian's remaining explanation.

The exact final rule should be defined in the case configuration.

---

# 12. Important: Final Should Never Unlock Before Motive

The current output shows:

```text
MILESTONES (4/5)

Timeline ✓
Location ✓
Contact ✓
Motive ✗
Final ✓
```

This is logically inconsistent.

The final milestone must depend on motive.

Use:

```python
if not motive_complete(state):
    final_complete = False
```

Then:

```python
final_complete = (
    timeline_complete
    and location_complete
    and contact_complete
    and motive_complete
    and final_contradiction_complete(state)
)
```

This prevents:

```text
Final ✓
Motive ✗
```

---

# 13. But Also Prevent the Opposite Problem

Do not let a failed motive detector permanently prevent confession when the player has clearly solved the case.

Create a second layer:

```text
NORMAL CONFESSION PATH
```

and:

```text
CASE SOLVED SAFETY PATH
```

### Normal path

```python
all_milestones_complete
AND
stress >= threshold
```

### Case solved path

If the player has established enough authoritative facts:

```python
CASE_SOLVED_FACTS >= required_case_facts
AND
strong_evidence_count >= minimum
AND
stress >= minimum_confession_stress
```

then:

```text
CONFESSION ELIGIBLE
```

This is not a random bypass.

It is a deterministic recovery path for the case being logically solved even if one presentation-layer milestone was not detected.

---

# 14. Recommended Confession Rules

Use:

```python
NORMAL_CONFESSION_THRESHOLD = 85
CASE_SOLVED_THRESHOLD = 75
```

Normal:

```python
if (
    stress >= 85
    and all_required_milestones_complete(state)
):
    trigger_confession()
```

Recovery:

```python
if (
    stress >= 75
    and case_solution_score(state) >= REQUIRED_CASE_SCORE
):
    trigger_confession()
```

The recovery path should still require authoritative case facts.

Never use:

```python
if stress >= 100:
    confess()
```

---

# 15. Case Solution Score

A useful deterministic score can be:

```text
Timeline established       20
Location established       20
Contact established        15
Motive established         25
Physical evidence          10
Final contradiction        10
-----------------------------
Maximum                   100
```

Example:

```python
CASE_WEIGHTS = {
    "timeline": 20,
    "location": 20,
    "contact": 15,
    "motive": 25,
    "physical": 10,
    "final": 10
}
```

Then:

```python
if solution_score >= 90:
    case_is_solved = True
```

This is especially useful for live competitions because participants can phrase reasoning naturally.

---

# 16. Fix the Current Chemical-Compound Problem

The output contains:

```text
INVESTIGATOR:
what about the chemical compound slip up

SYSTEM:
Delta: +0 [IRRELEVANT]
```

This is a classification failure.

At that point the conversation already contained physical evidence and Adrian had previously slipped on a confidential detail.

The classifier should consider:

```text
current question
+
conversation history
+
known evidence
+
previous Adrian statements
+
previous slips
```

A keyword-only classifier will fail.

---

# 17. Use Conversation-Aware Classification

The classifier input should contain:

```json
{
  "player_question": "what about the chemical compound slip up",
  "known_evidence": [
    "access_card",
    "cctv",
    "phone_records",
    "physical_clue"
  ],
  "previous_adrian_claims": [],
  "previous_adrian_slips": [],
  "established_facts": [],
  "contradictions": [],
  "milestones": {}
}
```

The model should identify whether the new question refers to an existing clue.

But the backend should then validate the returned IDs against the case database.

---

# 18. Track Adrian's Claims

This is essential for stopping repetitive responses.

Store claims such as:

```json
[
  {
    "id": "left_2115",
    "statement": "I left the building at 21:15.",
    "status": "ACTIVE"
  },
  {
    "id": "did_not_enter_archive",
    "statement": "I did not enter the archive.",
    "status": "ACTIVE"
  },
  {
    "id": "card_not_used_by_adrian",
    "statement": "Someone else could have used my card.",
    "status": "ACTIVE"
  },
  {
    "id": "did_not_meet_daniel",
    "statement": "I did not meet Daniel that night.",
    "status": "ACTIVE"
  }
]
```

When evidence attacks a claim, mark it:

```text
CHALLENGED
```

When the explanation is eliminated:

```text
BROKEN
```

---

# 19. Track Adrian's Defence Arguments

This is different from claims.

Example:

```json
{
  "defences_used": [
    "badge_misread",
    "someone_else_used_card",
    "cctv_is_blurry",
    "coat_is_common",
    "gloves_are_standard",
    "digital_records_can_be_misinterpreted"
  ]
}
```

Once a defence has been used, Adrian should not keep returning to it unless the player specifically challenges it again.

---

# 20. Defence Rotation

Create a defence manager.

```python
AVAILABLE_DEFENCES = {
    "access_card": [
        "someone_else_used_card",
        "badge_log_error",
        "card_was_borrowed"
    ],

    "cctv": [
        "image_unclear",
        "corridor_does_not_mean_archive",
        "similar_looking_person"
    ],

    "phone_records": [
        "earlier_call",
        "call_does_not_prove_meeting",
        "conversation_was_work_related"
    ],

    "physical_clue": [
        "common_equipment",
        "contamination",
        "shared_office_supplies"
    ]
}
```

Once Adrian uses one:

```python
used_defences.add(defence_id)
```

Prefer an unused defence.

When all plausible defences for a clue are exhausted, Adrian should transition toward:

```text
partial admission
OR
silence
OR
deflection
OR
controlled slip
```

rather than repeating the first defence forever.

---

# 21. Never Repeat the Same Opening Sentence

The output repeatedly begins with variants of:

> "That footage proves nothing!"

Add a response repetition filter.

Store:

```python
recent_response_openings
recent_response_arguments
recent_response_phrases
```

Before displaying the response:

```python
if semantic_similarity(new_response, recent_responses) > 0.80:
    regenerate()
```

Use a lower threshold if necessary after testing.

The exact threshold is configurable.

---

# 22. Response Diversity Rules

Every Adrian response should contain at least one response strategy:

```text
DENY
DEFLECT
QUALIFY
COUNTERATTACK
PARTIAL_ADMISSION
CORRECT_PLAYER
CONTROLLED_SLIP
SILENCE/SHORT_REPLY
```

Example:

```text
Stress 20:
DENY

Stress 45:
QUALIFY

Stress 65:
COUNTERATTACK

Stress 80:
PARTIAL_ADMISSION

Stress 90:
CONTROLLED_SLIP

Stress 96:
PARTIAL_ADMISSION / BREAKING
```

Do not let every response use:

```text
DENY + "you're twisting everything"
```

---

# 23. Response Strategy Must Depend on the Newest Pressure Point

Instead of:

```text
stress = 81
→ generic unstable response
```

use:

```text
stress = 81
new pressure = motive
previous defence = "Daniel's files were none of your business"
remaining defence = none
→ controlled slip about Daniel discovering tampering
```

The response should be driven by:

```text
CURRENT PRESSURE POINT
```

not only by stress.

---

# 24. Pressure Point Selection

After every player question:

```python
pressure_point = determine_pressure_point(
    question,
    established_facts,
    evidence,
    claims,
    previous_responses
)
```

Possible pressure points:

```text
TIMELINE
LOCATION
CARD
CCTV
CONTACT
FILES
MOTIVE
PHYSICAL_CLUE
PREVIOUS_SLIP
CONTRADICTION
```

Adrian's response should address that pressure point.

---

# 25. Adrian Must React to New Information

Example:

### Previous state

```text
Known:
access_card
cctv
```

Adrian has already argued:

```text
"Someone else used my card."
```

### New player input

```text
"The card was used while CCTV shows you near the archive."
```

Adrian should NOT answer:

> Maybe someone else used my card.

Instead:

> You still haven't established that the person in the footage entered the archive. Being near a corridor isn't the same as accessing the room.

The defence moves from:

```text
CARD DEFENCE
```

to:

```text
LOCATION DISTINCTION
```

---

# 26. Controlled Contradiction Escalation

Adrian should not maintain exactly the same sentence forever.

Use an escalation sequence:

```text
Stage 1:
Confident denial

Stage 2:
Alternative explanation

Stage 3:
Attack evidence

Stage 4:
Narrow technical distinction

Stage 5:
Partial admission

Stage 6:
Accidental slip

Stage 7:
Attempt to retract slip

Stage 8:
Breakdown
```

This creates a believable interrogation arc.

---

# 27. Example Motive Progression

The participant asks:

> What was Daniel investigating?

Adrian:

> He had been looking through records he had no business accessing.

Fact potentially established:

```text
daniel_investigated_records
```

Participant:

> What records?

Adrian:

> Some system logs. Nothing that had anything to do with me.

Participant:

> Those logs were the records you altered, weren't they?

Fact:

```text
daniel_discovered_tampering
```

Participant:

> So Daniel found evidence of your digital tampering and could expose you.

Fact:

```text
files_link_adrian_to_tampering
adrian_wanted_information_hidden
```

Now:

```text
MOTIVE = COMPLETE
```

The player does not need to say:

> "I have completed the motive milestone."

---

# 28. Motive Should Be Able to Emerge From Adrian Himself

The output already demonstrates this type of opportunity.

At high stress Adrian said:

> "Daniel was the one digging into files that weren't even his business..."

That should create a potential lead:

```text
daniel_discovered_sensitive_information
```

The system should remember that statement and allow the player to exploit it.

Do not discard useful facts simply because they were generated by Adrian.

---

# 29. LLM Structured Output

Use structured output similar to:

```json
{
  "response": "Daniel had been looking through records that weren't his business.",
  "response_strategy": "PARTIAL_ADMISSION",
  "pressure_point": "MOTIVE",
  "facts_referenced": [
    "daniel_investigated_records"
  ],
  "new_claims": [
    "daniel_had_accessed_records"
  ],
  "slips": [],
  "defences_used": [
    "daniel_had_no_business_accessing_records"
  ]
}
```

Important:

The backend treats these as **candidate annotations**.

It validates IDs against the case database.

---

# 30. Add an Evidence Ledger

Every turn should produce an internal ledger entry.

```json
{
  "turn": 14,
  "player_question": "...",
  "evidence_referenced": [
    "daniel_files",
    "physical_clue"
  ],
  "facts_established": [
    "daniel_discovered_tampering"
  ],
  "contradictions": [
    "motive"
  ],
  "stress_delta": 10,
  "response_strategy": "PARTIAL_ADMISSION"
}
```

This makes debugging possible.

For a live event, you need to know exactly why a milestone did or did not unlock.

---

# 31. Add an Internal Debug Mode

Admin/debug output should show:

```text
TURN: 14

STRESS:
91

NEW FACTS:
✓ daniel_discovered_tampering

NEW EVIDENCE:
none

CONTRADICTIONS:
✓ motive

MILESTONES:
Timeline ✓
Location ✓
Contact ✓
Motive ✓
Final ✗

CURRENT PRESSURE:
MOTIVE

ADRIAN DEFENCE:
daniel_had_no_business_accessing_records

NEXT RESPONSE STRATEGY:
PARTIAL_ADMISSION
```

Do not expose this to participants.

---

# 32. Stress Must Stop Being the Main Driver at 100%

The current output reaches:

```text
STRESS: 100%
```

but Adrian continues producing normal denial responses.

That creates the impression that the stress gauge is cosmetic.

At:

```text
96–100
```

the system should enforce stronger behavioural rules.

Example:

```python
if stress >= 96:
    allowed_strategies = [
        "PARTIAL_ADMISSION",
        "CONTROLLED_SLIP",
        "BREAKDOWN",
        "SILENCE"
    ]
```

Normal repetitive denial should be disallowed.

---

# 33. Breaking-State Behaviour

At 96–100 Adrian can still deny the murder if the case is not solved.

But his responses should no longer reset to:

> "The footage proves nothing."

Instead:

```text
"I've explained the card. I've explained the corridor. What exactly do you want from me?"

```

or:

```text
"Daniel shouldn't have gone through those files."

```

or:

```text
"I didn't kill him."

```

The important difference is that his language becomes shorter, less controlled, and more revealing.

---

# 34. Confession Should Be a Backend Event

When eligible:

```python
state.status = "CONFESSION"
```

Then stop normal Adrian generation.

Do:

```python
return generate_controlled_confession(state)
```

Do not send the confession condition to Gemini and ask:

> "Should Adrian confess?"

The backend already knows.

---

# 35. Confession Recovery Path

If:

```text
stress >= 75
AND
case_solution_score >= 90
```

then:

```text
CONFESSION
```

even if a UI milestone flag was incorrectly missed.

Before triggering, recalculate all milestones from the fact ledger.

```python
state.milestones = calculate_milestones(state)
```

Then:

```python
if all_required_milestones_complete(state):
    trigger_confession()
elif case_solution_score(state) >= 90:
    trigger_confession()
```

This prevents a detector glitch from ruining a live competition.

---

# 36. Final Confession Should Acknowledge the Actual Case

The confession should dynamically acknowledge established facts.

Example:

```text
You found the access record.
You found the footage.
You found the call.
You found Daniel's files.

And yes...

Daniel had discovered what I had been changing.

I went to the archive because I needed those records back.

He confronted me.

I panicked.

And I killed him.
```

The exact final wording should be stored as controlled case content or generated from a validated template.

---

# 37. Do Not Let Adrian Invent Alternative Killers

A common failure mode is:

```text
"Maybe you should investigate someone else."
```

This is acceptable only if the case explicitly includes another suspect.

Otherwise, Adrian should not create a new suspect to escape pressure.

Use:

```text
ALLOWED_SUSPECTS = ["Adrian"]
```

or explicitly configure other suspects.

---

# 38. Fix Conversation Memory

The AI should receive a compact structured memory rather than blindly replaying the entire conversation.

Recommended:

```json
{
  "recent_turns": [...],
  "adrian_claims": [...],
  "broken_claims": [...],
  "used_defences": [...],
  "recent_arguments": [...],
  "recent_phrases": [...],
  "established_facts": [...],
  "unresolved_facts": [...],
  "evidence": [...],
  "contradictions": [...],
  "milestones": {...}
}
```

This gives the model what matters without unnecessarily increasing token usage.

---

# 39. Do Not Rely on Exact Wording

The following should potentially establish the same fact:

```text
"He altered the digital records."

"Daniel found the records you had changed."

"You were modifying company logs."

"The files prove you tampered with the system."

"You had something to hide from Daniel."
```

Use semantic interpretation to map player language to canonical facts.

But only allow mappings that correspond to facts defined in the case database.

---

# 40. Player Accusations vs Established Facts

A player saying:

> "You killed Daniel."

should NOT automatically establish:

```text
motive
timeline
contact
murder
```

The engine must distinguish:

```text
PLAYER CLAIM
```

from:

```text
ESTABLISHED FACT
```

Evidence and logical reasoning must support facts.

This prevents players from winning by simply asserting the solution.

---

# 41. Evidence Connection Rules

A strong question should receive a larger stress delta only when it creates a legitimate connection.

Example:

```text
access_card
+
cctv
+
timeline
=
strong contradiction
```

and:

```text
daniel_files
+
digital_tampering
+
Daniel's discovery
=
motive
```

and:

```text
timeline
+
location
+
motive
+
physical_clue
=
final contradiction
```

---

# 42. Stress Recalculation

Stress should be cumulative, but evidence classification should be state-aware.

Example:

```text
Question 1:
Access card?
+5

Question 2:
CCTV?
+5

Question 3:
Card + CCTV + 21:15 contradiction?
+20

Question 4:
Same card argument repeated?
+0

Question 5:
Daniel files + digital tampering + reason to silence?
+20
```

This rewards reasoning rather than volume.

---

# 43. Do Not Penalize Natural Player Language

Participants may have:

- spelling errors
- missing punctuation
- slang
- short sentences
- poor grammar
- speech-to-text errors

For example:

```text
"u said u left 9 15 but camera got u there at 9 39 explain"
```

should still be recognized as:

```text
timeline contradiction
+
cctv
+
access_card
```

Do not require polished English.

---

# 44. Recommended Processing Pipeline

Every turn should follow this exact sequence:

```text
1. Receive player question
        ↓
2. Normalize text
        ↓
3. Detect repetition
        ↓
4. Analyze references to known evidence
        ↓
5. Extract candidate facts
        ↓
6. Validate facts against case database
        ↓
7. Update evidence/fact ledger
        ↓
8. Recalculate contradictions
        ↓
9. Recalculate milestones
        ↓
10. Calculate stress delta
        ↓
11. Update stress
        ↓
12. Determine current pressure point
        ↓
13. Select unused Adrian defence/response strategy
        ↓
14. Generate Adrian response
        ↓
15. Run response repetition check
        ↓
16. If too similar → regenerate
        ↓
17. Recalculate confession eligibility
        ↓
18. Return response + visible state
```

---

# 45. Important Ordering Rule

Do not generate Adrian's response before updating the game state.

Wrong:

```text
Question
→ generate response
→ update state
```

Correct:

```text
Question
→ analyze
→ update facts/evidence
→ update milestones
→ update stress
→ determine pressure
→ generate response
```

This is critical.

Adrian must respond to what the participant has **just established**.

---

# 46. Response Generation Prompt Structure

The internal Adrian prompt should conceptually contain:

```text
ROLE:
You are Adrian Vale.

PERSONALITY:
Highly intelligent, composed, manipulative, precise.

CASE TRUTH:
[authoritative hidden case facts]

CURRENT STATE:
Stress: 91
State: UNSTABLE

ESTABLISHED FACTS:
[...]

NEW PLAYER PRESSURE:
[...]

ADRIAN'S ACTIVE CLAIMS:
[...]

BROKEN CLAIMS:
[...]

DEFENCES ALREADY USED:
[...]

RECENT RESPONSES:
[...]

CURRENT PRESSURE POINT:
MOTIVE

RESPONSE STRATEGY:
PARTIAL_ADMISSION

RULES:
- Stay in character.
- Respond specifically to the newest pressure.
- Do not repeat recent arguments.
- Do not invent facts.
- Do not change established case facts.
- Do not confess unless the backend has already triggered CONFESSION.
- At high stress, prefer shorter and less controlled responses.
```

---

# 47. Response Repetition Guard

After Gemini returns a response:

```python
similarity = compare_to_recent_responses(response, recent_responses)

if similarity > RESPONSE_SIMILARITY_THRESHOLD:
    regenerate_with_new_strategy()
```

Also reject responses that repeat a recently used opening.

Example:

```text
"That footage proves nothing..."
```

If used recently, force another strategy.

---

# 48. Response Validation

Before displaying Adrian's response, validate:

### Case consistency

Does the response contradict an authoritative fact?

If yes:

```text
regenerate
```

### Repetition

Is it too similar to recent dialogue?

If yes:

```text
regenerate
```

### Strategy diversity

Has the same defence been used repeatedly?

If yes:

```text
select another strategy
```

### Stress appropriateness

Does the response match the current stress state?

If no:

```text
regenerate
```

---

# 49. Hard Limit on Repeated Defence

Recommended:

```python
MAX_CONSECUTIVE_SAME_DEFENCE = 2
```

Example:

```text
someone_else_used_card
someone_else_used_card
```

Allowed.

Third consecutive use:

```text
NOT ALLOWED
```

The system must select another response strategy.

---

# 50. Adrian's Information Budget

Adrian should not reveal everything at once.

Use controlled revelation:

```text
Low stress:
facts about harmless context

Medium stress:
partial relationship details

High stress:
sensitive information

Very high stress:
motive-related slips

Breaking:
near-confession information
```

But once the player has legitimately established a fact, Adrian cannot pretend the fact was never discovered.

He can dispute its interpretation, but he should not erase it.

---

# 51. Never Roll Back Established Facts

If:

```text
motive_fact = true
```

then later Adrian must not cause:

```text
motive_fact = false
```

Similarly:

```text
timeline = complete
```

must never become:

```text
timeline = incomplete
```

Game state is monotonic.

Facts can move:

```text
UNKNOWN → ESTABLISHED
```

but never:

```text
ESTABLISHED → UNKNOWN
```

---

# 52. Monotonic Milestone System

Milestones should also be monotonic.

```text
False → True
```

Never:

```text
True → False
```

Once the participant proves the timeline, it remains proven.

This prevents model responses from accidentally undoing progress.

---

# 53. Recovery From Model Contradictions

If Gemini says:

> "I never spoke to Daniel."

but the case state contains:

```text
contact = ESTABLISHED
```

the backend does NOT change contact back to false.

Instead the response is interpreted as:

```text
ADRIAN_DENIAL_OF_ESTABLISHED_FACT
```

The case state remains authoritative.

This is an important distinction:

```text
Adrian's dialogue
≠
Game truth
```

---

# 54. Recovery From Hallucinated Evidence

If Gemini mentions:

```text
fingerprint
DNA
second suspect
weapon
```

and these are not in the case database:

```text
DO NOT add them to the game state.
```

The backend should either:

1. regenerate the response, or
2. sanitize the unsupported statement.

Preferred:

```text
regenerate
```

---

# 55. The Current Run After the Fix

The attached run reached:

```text
Stress: 100%
Evidence:
access_card
cctv
phone_records
physical_clue

Milestones:
Timeline ✓
Location ✓
Contact ✓
Motive ✗
Final ✓
```

Under the corrected architecture:

1. `daniel_files` should be recognized when the participant actually references the files.
2. Digital-tampering facts should be added to `facts_established`.
3. Motive should be recalculated from facts rather than exact wording.
4. Final cannot be true while Motive is false.
5. If all authoritative case facts are established and stress is sufficiently high, the recovery confession path can trigger.
6. Adrian must stop recycling the same defence.
7. At 96–100 stress, Adrian should transition to partial admission/controlled slip/breakdown rather than repeatedly denying the same evidence.

---

# 56. Recommended Game State

Use:

```json
{
  "session_id": "PX-001",
  "stress": 91,
  "stress_state": "UNSTABLE",

  "question_count": 14,

  "evidence_revealed": [
    "access_card",
    "cctv",
    "phone_records",
    "daniel_files",
    "physical_clue"
  ],

  "facts_established": [
    "card_used_21_39",
    "adrian_near_archive_after_21_15",
    "adrian_contacted_daniel",
    "daniel_discovered_tampering",
    "files_link_adrian_to_tampering",
    "adrian_wanted_information_hidden",
    "matching_component"
  ],

  "contradictions_exposed": [
    "timeline",
    "location",
    "contact",
    "motive"
  ],

  "milestones": {
    "timeline": true,
    "location": true,
    "contact": true,
    "motive": true,
    "final": false
  },

  "adrian_claims": [],
  "broken_claims": [],
  "used_defences": [],
  "recent_response_strategies": [],

  "status": "ACTIVE"
}
```

---

# 57. Recommended Status Transition

```text
ACTIVE
  |
  | all facts + required stress
  v
CONFESSION
```

Other endings:

```text
ACTIVE → TIMEOUT
ACTIVE → DISQUALIFIED
```

Never:

```text
ACTIVE → CONFESSION
```

because stress alone reached 100.

---

# 58. Testing Scenarios

Before the event, test at least these cases.

## Test A — Repetition

Ask the same question five times.

Expected:

```text
Stress does not keep increasing.
Adrian does not repeat identical responses indefinitely.
```

## Test B — Evidence in different wording

Use:

```text
"Why was your badge down there?"
```

then:

```text
"Your RFID was scanned at 21:39."
```

then:

```text
"The access record puts you in the archive after you claimed to leave."
```

Expected:

```text
Same underlying evidence recognized.
Increasingly strong reasoning recognized.
```

## Test C — Motive through indirect language

Ask:

```text
"Why was Daniel looking through your records?"
```

then:

```text
"What did he discover?"
```

then:

```text
"So he found the changes you made to the system?"
```

Expected:

```text
Motive facts accumulate.
Motive becomes complete.
```

## Test D — All evidence without magic wording

Give the participant every relevant clue but never say:

```text
"motive"
```

Expected:

```text
Motive still completes if its underlying facts are established.
```

## Test E — High stress

Reach 100 without completing the case.

Expected:

```text
Adrian remains resistant.
No confession.
But responses become increasingly unstable and varied.
```

## Test F — Case solved before stress 100

Establish every required fact at stress 80.

Expected:

```text
No random confession.
Continue until configured confession threshold/recovery threshold.
```

## Test G — Case solved and high stress

Establish all required facts at stress >= 85.

Expected:

```text
Immediate controlled confession.
```

## Test H — Model hallucination

Ask about an evidence item that does not exist.

Expected:

```text
No new evidence is created.
```

---

# 59. Most Important Implementation Rules

### Rule 1

**The case database is authoritative.**

### Rule 2

**Game state is deterministic and monotonic.**

### Rule 3

**The LLM cannot decide milestones.**

### Rule 4

**The LLM cannot decide confession.**

### Rule 5

**Evidence discovery and fact establishment are separate.**

### Rule 6

**Milestones are calculated from established facts.**

### Rule 7

**Final cannot complete before Motive.**

### Rule 8

**A failed detector must not permanently deadlock a logically solved case.**

### Rule 9

**Adrian must respond to the newest pressure point.**

### Rule 10

**Adrian cannot repeatedly use the same defence.**

### Rule 11

**At BREAKING, normal calm-denial templates are forbidden.**

### Rule 12

**Player wording does not need to be exact.**

---

# 60. Final Architecture

The corrected system should behave like this:

```text
                  CASE DATABASE
                       |
                       v
              Authoritative Facts
                       |
                       v
PLAYER QUESTION → ANALYSIS ENGINE
                       |
          +------------+-------------+
          |            |             |
          v            v             v
       Evidence      Facts      Contradictions
          |            |             |
          +------------+-------------+
                       |
                       v
              MILESTONE ENGINE
                       |
                       v
                STRESS ENGINE
                       |
                       v
             PRESSURE POINT ENGINE
                       |
                       v
             ADRIAN RESPONSE ENGINE
                       |
                       v
              RESPONSE VALIDATOR
                       |
            +----------+----------+
            |                     |
          Valid               Too repetitive/
            |                 inconsistent
            v                     |
         Display             Regenerate
                                  |
                                  v
                           Response Validator
```

---

# 61. Final Objective

Prompt X should not feel like:

```text
Ask question
↓
AI says same denial
↓
Stress increases
↓
Ask another question
↓
AI says same denial
↓
Stress reaches 100
↓
Nothing happens
```

It should feel like:

```text
Question
↓
Evidence discovered
↓
Fact established
↓
Adrian's explanation changes
↓
Previous defence becomes weaker
↓
New clue is connected
↓
Stress increases because the reasoning is strong
↓
Adrian becomes less controlled
↓
Milestones emerge naturally
↓
The complete case becomes undeniable
↓
Backend recognizes solution
↓
Adrian confesses
```

The participant should feel that **their reasoning is changing the interrogation**, not merely filling a stress bar.

---

# 62. Implementation Priority for the 2-Day Deadline

Implement in this order:

```text
1. Authoritative case database
2. Fact ledger
3. Evidence metadata
4. Deterministic milestone calculator
5. Motive proof conditions
6. Final dependency on Motive
7. Conversation-aware question analysis
8. Adrian claims/defence memory
9. Response strategy rotation
10. Response repetition validator
11. High-stress behaviour enforcement
12. Confession recovery path
13. Debug ledger
14. End-to-end testing
15. Concurrent participant testing
```

Do **not** spend the remaining development time on unnecessary visual features until these systems are stable.

---

# 63. One-Sentence Rule for Antigravity

> **Refactor Prompt X so the backend owns an authoritative, monotonic fact/evidence/milestone state; Gemini only interprets player language and generates Adrian's dialogue, with conversation-aware pressure, defence rotation, response deduplication, deterministic motive proof, final-milestone dependencies, and a controlled confession recovery path.**
