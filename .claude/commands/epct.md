---
description: Implement a feature following the EPCT workflow (Explore, Plan, Code, Test)
argument-hint: [feature description]
---

# EPCT Workflow: Explore → Plan → Code → Test

Implement the following feature using a structured 4-phase workflow: **$ARGUMENTS**

---

## Phase 1: EXPLORE

**Your mission**: Gather all necessary context before planning. This phase prevents hallucinations and ensures informed decisions.

### Step 1.1: External Research (if needed)
- Use WebSearch to find relevant documentation, best practices, or solutions for similar features
- Focus on: libraries, patterns, APIs, or technologies that might be relevant
- Document findings briefly

### Step 1.2: Codebase Exploration
**Required actions**:
1. Use Glob to identify relevant files based on the feature requirements
2. Use Grep to search for existing patterns, similar implementations, or related code
3. Read key files to understand:
   - Current architecture and patterns
   - Existing similar features
   - Data models and types
   - State management approach
   - Component structure

**Context checklist**:
- [ ] Understand the current architecture
- [ ] Identify files that will need modification
- [ ] Find similar existing implementations
- [ ] Understand data flow and state management
- [ ] Identify potential integration points

### Step 1.3: Summary
Write a brief summary (3-5 bullet points) of what you learned during exploration.

---

## Phase 2: PLAN

**CRITICAL**: You MUST stop coding and get user approval before proceeding to Phase 3.

### Step 2.1: Create Implementation Plan
Design a detailed plan including:
1. **Files to modify or create** (list each with purpose)
2. **Step-by-step implementation approach** (ordered tasks)
3. **Technical decisions** (architecture, patterns, libraries)
4. **Data model changes** (if applicable)
5. **Integration points** (how it connects to existing code)

### Step 2.2: Identify Uncertainties
**Challenge yourself**: What assumptions are you making? Where could you be wrong?

List questions about:
- Ambiguous requirements
- Multiple valid approaches (which to choose?)
- User preferences (UX, architecture, naming)
- Edge cases or constraints you're unsure about

### Step 2.3: Request Validation
Use the AskUserQuestion tool to:
1. Present your plan clearly
2. Ask specific questions about uncertainties
3. Offer choices for technical decisions where multiple valid approaches exist

**Example questions**:
- "Should this feature use the existing ExercisesContext or create a new context?"
- "For the UI, would you prefer approach A (inline form) or approach B (modal)?"
- "I'm unsure about [X] - what's your preference?"

**STOP HERE and wait for user approval before Phase 3.**

---

## Phase 3: CODE

**Prerequisites**: User has approved the plan from Phase 2.

### Step 3.1: Setup Task Tracking
Use TodoWrite to create a task list based on your approved plan. This helps track progress and ensures nothing is forgotten.

### Step 3.2: Implementation
Implement the complete feature following your approved plan:
1. Work through tasks sequentially
2. Update TodoWrite status as you progress (mark tasks in_progress → completed)
3. Make atomic, focused changes
4. Follow existing code patterns and conventions
5. Add necessary imports and types

### Step 3.3: Code Review
Before moving to Phase 4:
- Review your changes for consistency
- Ensure all planned tasks are completed
- Check for obvious errors or omissions

---

## Phase 4: TEST

**CRITICAL**: Only run tests that already exist. Do NOT create new test files.

### Step 4.1: Discover Available Tests
Read these configuration files to identify existing test commands:
1. Read `package.json` - check the "scripts" section
2. Read `tsconfig.json` or `eslint.config.mjs` - identify linting/type checking setup

### Step 4.2: Run Existing Tests
Execute ONLY the test commands found in Step 4.1, such as:
- `npm run lint` (if it exists)
- `npm run build` or `npm run type-check` (if they exist)
- Any other test commands defined in package.json

**DO NOT**:
- Create new test files
- Run test commands that don't exist in package.json
- Assume tests exist if they're not configured

### Step 4.3: Fix Issues
If tests fail:
1. Read the error output carefully
2. Fix the issues in your code
3. Re-run the tests
4. Repeat until all tests pass

### Step 4.4: Completion Summary
Provide a final summary:
- ✅ What was implemented
- ✅ What tests were run and their status
- ℹ️ Any important notes or follow-up items

---

## Execution Notes

- **Be systematic**: Complete each phase fully before moving to the next
- **Be explicit**: Don't assume - ask when uncertain
- **Be thorough**: The Explore phase prevents costly mistakes later
- **Be patient**: Waiting for user approval in Phase 2 is mandatory
- **Be realistic**: Only run tests that actually exist in the project
