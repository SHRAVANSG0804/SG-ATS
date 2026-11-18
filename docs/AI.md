# AI in Meridian ATS

## 1. AI inside the product: none (by design in v1)

The application contains **no AI agents and no AI-powered features**.

- **Client scope:** the brief lists "anything AI-powered" under *Won't have* for v1 (see the README roadmap).
- **Verifiable:** runtime dependencies in `package.json` are only `next`, `react`, `react-dom` and `server-only`. No code in `src/` calls an LLM or ML API.
- **Rule-based, not AI:** these features are deterministic code, not AI, and are not described as AI:
  - duplicate detection: exact match on the normalised phone number or email (`findDuplicates`, `src/lib/queries.ts`)
  - notice-period fit: arithmetic on notice days vs days to target date (`noticeFit`, `src/lib/domain.ts`)
  - skill match count and dashboard metrics: counting and ratios (`src/lib/queries.ts`)

### Candidate AI features for a later version (proposals, NOT built)

| Feature | Pattern | Human control |
|---|---|---|
| Resume parsing → pre-fill the candidate form | Single LLM call with structured (JSON) output | Recruiter reviews and edits every field before saving |
| Candidate ↔ job fit summary | Retrieval + generation, with the job and candidate record as context | Advisory text only; the recruiter decides the stage |
| Offer-drop risk flag | Classifier / LLM reasoning over notice period, CTC gap, competing-offer notes | Flag only; the Head of TA decides any action |

Before any of these: DPDP review (candidate data sent to a model provider), consent wording update, and an evaluation set.

## 2. AI used to build the product: Claude Code (AI coding agent)

The app was built with Claude Code (Anthropic) acting as a pair-programming agent; the student directed scope and made the decisions.

- **Evidence:** 9 of the 10 commits carry a `Co-Authored-By: Claude` trailer and a `Claude-Session` link. The other commit is the create-next-app scaffold.
- **Inputs:** the lab manual PDF, the client requirements document (`ATS_Requirement.docx`), and the student's instructions in chat.
- **Tools the agent used:** file read/write, shell (npm, git, Postgres), and a headless browser (Playwright) for testing and screenshots.
- **Instruction design:** the first prompt gave the agent the two documents, asked it to act professionally, build the ATS to those preferences and ask what to do next. Later prompts each asked for one change: real email/password logins with account switching, fixing the Vercel crash, and specific demo accounts.
- **Output:** code, documentation, tests and commits pushed to GitHub.
- **Human review / override points:**
  - The student chose the next phase, the retention period (12 months) and the demo accounts.
  - The student reported the Vercel production crash, which led to fix `409c3cf`.
  - The student interrupted a command during that investigation.
  - The student provided the GitHub repository and asked for the work to be pushed there; the agent then committed and pushed after each working feature (lab manual §5).

**Agentic patterns observed**

- **Tool use:** the agent edited files and ran the build, git and database tools itself.
- **Planning:** the work was phased: Must-haves first, then authentication, then deployment, with a roadmap in the README.
- **Reflection / evaluator–optimiser loop:** build → run the tests or take screenshots → fix → re-run. Examples:
  - a Tailwind build error
  - a clipped popover found in a screenshot
  - a stale-data bug found by the sign-in tests (`bf11e70`)
  - the 30-check suite in `tests/e2e`
- **Human-in-the-loop:** the agent asked multiple-choice questions at decision points, and the student approved or redirected.
