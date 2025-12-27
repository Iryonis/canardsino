---
description: Implement a feature following the APEX workflow (Analyse, Plan, Execute, eXamine) + Commit
argument-hint: [feature description]
---

# APEX Workflow: Analyse → Plan → Execute → eXamine → Commit

Implement the following feature with software engineering rigor: **$ARGUMENTS**

---

## Phase 1: ANALYSE

**Objective**: Deep understanding before any action. Prevent technical debt from the start.

### Step 1.1: Problem Analysis
Understand the feature requirements:
- What problem does this solve?
- Who is the user of this feature?
- What are the expected inputs/outputs?
- What are the edge cases?

### Step 1.2: Codebase Analysis
Use `explore-codebase` agent for fast discovery:
1. Find existing similar implementations
2. Identify architectural patterns in use
3. Understand data flow and state management
4. Map dependencies and integration points

**Analysis checklist**:
- [ ] Understand current architecture
- [ ] Identify files that will need modification
- [ ] Find reusable code/patterns
- [ ] Identify potential risks or conflicts

### Step 1.3: External Research (if needed)
- Use WebSearch for best practices, library docs
- Check for known issues or security concerns
- Document findings briefly

### Step 1.4: Analysis Summary
Write a structured summary:
```
## Analysis Summary

### Problem Statement
[What we're solving]

### Technical Context
[Relevant existing code, patterns, constraints]

### Key Decisions Needed
[Questions that will affect implementation]
```

---

## Phase 2: PLAN

**CRITICAL**: Get user approval before execution. A good plan prevents rework.

### Step 2.1: Architecture Design
Design the solution considering:
1. **Maintainability** - Will this be easy to modify later?
2. **Consistency** - Does it follow existing patterns?
3. **Simplicity** - Is this the simplest solution that works?
4. **Testability** - Can this be easily tested?

### Step 2.2: Implementation Plan
Create a detailed plan:
```
## Implementation Plan

### Files to Modify
- path/to/file.ts - [what changes and why]

### Files to Create
- path/to/new.ts - [purpose]

### Step-by-Step Approach
1. [First task]
2. [Second task]
...

### Technical Decisions
- [Decision 1]: [Chosen approach] because [reason]
```

### Step 2.3: Risk Assessment
Identify potential issues:
- Breaking changes?
- Performance implications?
- Security considerations?
- Migration needs?

### Step 2.4: Request Validation
Use AskUserQuestion to:
1. Present the plan clearly
2. Ask about uncertainties
3. Offer alternatives where relevant

**STOP HERE - Wait for user approval before Phase 3.**

---

## Phase 3: EXECUTE

**Prerequisites**: User has approved the plan.

### Step 3.1: Task Tracking
Use TodoWrite to create tasks from the approved plan.

### Step 3.2: Implementation
Execute the plan with engineering discipline:
1. **Atomic changes** - One logical change at a time
2. **Follow patterns** - Match existing code style
3. **No over-engineering** - Only what's needed
4. **Clean as you go** - Don't leave TODOs or dead code

### Step 3.3: Self-Review During Coding
As you code, continuously verify:
- [ ] Types are correct and meaningful
- [ ] Error handling is appropriate
- [ ] No hardcoded values that should be constants
- [ ] Imports are clean (no unused)

---

## Phase 4: eXAMINE

**Objective**: Rigorous quality verification. Think like a senior engineer reviewing a PR.

**IMPORTANT**: Follow the complete checklist in `.claude/rules/examine-checklist.md`

### Step 4.1: Run Automated Checks
Execute available quality tools:
```bash
npm run lint      # Code style
npm run build     # Type checking + build
npm run test      # If tests exist
```

Fix any issues before proceeding.

### Step 4.2: Code Quality Review
Review your changes critically:

**Maintainability**
- [ ] Code is self-documenting (clear names, obvious flow)
- [ ] No magic numbers or strings
- [ ] Functions have single responsibility
- [ ] No deep nesting (max 3 levels)

**Consistency**
- [ ] Follows project patterns (check `.claude/rules/`)
- [ ] Naming matches existing conventions
- [ ] File structure is consistent

**Robustness**
- [ ] Edge cases handled
- [ ] Error states managed gracefully
- [ ] No potential null/undefined issues

**Performance**
- [ ] No unnecessary re-renders (React)
- [ ] No N+1 queries or loops
- [ ] Expensive operations are optimized

### Step 4.3: Security Check
Verify no vulnerabilities introduced:
- [ ] No secrets in code
- [ ] User input is validated (Zod)
- [ ] API routes check authentication
- [ ] No XSS, injection, or OWASP top 10 issues

### Step 4.4: Final Verification
- Run the app and manually verify the feature works
- Check browser console for errors
- Verify no regressions in related features

### Step 4.5: Examination Summary
```
## eXamine Results

### Automated Checks
- Lint: ✅/❌
- Build: ✅/❌
- Tests: ✅/❌/N/A

### Quality Review
- Maintainability: [score/notes]
- Consistency: [score/notes]
- Robustness: [score/notes]

### Issues Found & Fixed
- [List any issues caught and resolved]
```

---

## Phase 5: COMMIT

**CRITICAL**: Always ask for user confirmation.

### Step 5.1: Changes Summary
Present all changes clearly:
```
## Changes Ready to Commit

### Files Modified
- path/to/file.ts - [description]

### Files Created
- path/to/new.ts - [description]

### Feature Summary
[2-3 sentences on what was implemented]
```

### Step 5.2: User Confirmation
Use AskUserQuestion:

**Question**: "Ready to commit these changes?"

**Options**:
1. **Commit and push** - Commit + push to remote
2. **Commit only** - Local commit, no push
3. **Review diff** - Show detailed changes first
4. **Request changes** - I want modifications before committing

**STOP HERE - Wait for user response.**

### Step 5.3: Handle Response

**If "Commit and push" or "Commit only"**:
- Use `/commit` skill
- Skip push if "Commit only" was chosen

**If "Review diff"**:
- Run `git diff` to show changes
- Ask again after showing

**If "Request changes"**:
- Ask what modifications are needed
- Implement changes
- Return to Step 5.1

### Step 5.4: Documentation Check
After commit, evaluate if CLAUDE.md needs updating:

**Update CLAUDE.md if you added**:
- [ ] New architectural pattern
- [ ] New convention or rule
- [ ] New important type/interface
- [ ] New API route pattern
- [ ] New hook or mutation pattern

If any box is checked, ask user:
"This feature introduced new patterns. Would you like me to update CLAUDE.md?"

### Step 5.5: Completion
```
## Feature Complete

✅ Commit: [hash] - [message]
✅ Push: [status]
📝 CLAUDE.md: [Updated/No changes needed]

### What was delivered
[Brief summary]

### Follow-up recommendations
[Any suggested next steps]
```

---

## Engineering Principles

Throughout all phases, maintain these standards:

- **KISS** - Keep It Simple, Stupid
- **DRY** - Don't Repeat Yourself (but don't over-abstract)
- **YAGNI** - You Aren't Gonna Need It
- **Clean Code** - Readable > Clever
- **Boy Scout Rule** - Leave code cleaner than you found it

## Execution Rules

- **Be rigorous**: Quality over speed
- **Be explicit**: Ask when uncertain
- **Be thorough**: The Analyse phase prevents costly mistakes
- **Be patient**: User approval at Phase 2 and Phase 5 is mandatory
- **Be critical**: eXamine like you're reviewing someone else's PR
- **Be respectful**: Never auto-commit without permission
